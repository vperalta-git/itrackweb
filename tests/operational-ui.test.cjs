const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')
const React = require('react')
const root = path.resolve(__dirname, '..')
function load(file, dependencies = {}) {
  const source = ts.transpileModule(fs.readFileSync(path.join(root, file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText
  const module = { exports: {} }
  new Function('require', 'module', 'exports', source)((name) => {
    if (Object.hasOwn(dependencies, name)) return dependencies[name]
    if (name === 'react' || name === 'react/jsx-runtime') return require(name)
    if (name.startsWith('@/') || name.startsWith('.')) return {}
    throw Error('Unexpected dependency: ' + name)
  }, module, module.exports)
  return module.exports
}
const enums = load('mobile/src/mobile/types/index.ts')
const access = load('mobile/src/mobile/navigation/access.ts', { '../types': enums })
const rbac = load('lib/rbac.ts')

test('web notification targets route to the right role and module, with record identifiers and valid missing-record listings', () => {
  const { notificationTargetHref } = load('lib/notification-routing.ts', { '@/lib/rbac': rbac })
  const cases = { driver_allocation: 'driver-allocation/live-tracking', preparation: 'preparation', test_drive_booking: 'test-drive',
    vehicle: 'vehicle-stocks/stock-list', unit_agent_allocation: 'unit-allocation' }
  for (const [entityType, route] of Object.entries(cases)) {
    const url = new URL(notificationTargetHref({ entityType, entityId: 'fixture-record', available: true }, 'supervisor'), 'https://example.test')
    assert.equal(url.pathname, `/supervisor/${route}`)
    assert.equal(url.searchParams.get(entityType === 'driver_allocation' ? 'allocation' : 'record'), 'fixture-record')
    const fallback = notificationTargetHref({ entityType, entityId: '', available: false }, 'supervisor')
    assert.equal(fallback, `/supervisor/${route}`)
  }
  assert.equal(notificationTargetHref({ entityType: 'unit_agent_allocation', available: false }, 'sales-agent'), '/sales-agent/vehicle-stocks/stock-list')
  const managerStock = new URL(notificationTargetHref({ entityType: 'unit_agent_allocation', entityId: 'allocation-1', vehicleId: 'vehicle-1', available: true }, 'manager'), 'https://example.test')
  assert.equal(managerStock.pathname, '/manager/vehicle-stocks/stock-list'); assert.equal(managerStock.searchParams.get('record'), 'vehicle-1')
})

test('mobile routes are role-aware and use existing detail parameter names', () => {
  const { notificationRoute } = load('mobile/src/mobile/navigation/notifications.ts', { '../types': enums, './access': access, 'react-native': {}, 'expo-router': {} })
  const target = { entityType: 'driver_allocation', entityId: 'trip-1', available: true }
  assert.deepEqual(notificationRoute(target, enums.UserRole.DRIVER), { pathname: '/(tabs)/(driver)/trip-detail', params: { tripId: 'trip-1' } })
  assert.deepEqual(notificationRoute(target, enums.UserRole.SUPERVISOR), { pathname: '/(tabs)/(supervisor)/driver-detail', params: { allocationId: 'trip-1' } })
  assert.deepEqual(notificationRoute({ entityType: 'test_drive_booking', entityId: 'b1', available: true }, enums.UserRole.ADMIN),
    { pathname: '/(tabs)/(admin)/test-drive-detail', params: { bookingId: 'b1' } })
  assert.deepEqual(notificationRoute({ entityType: 'preparation', entityId: 'p1', available: true }, enums.UserRole.DISPATCHER),
    { pathname: '/(tabs)/(dispatcher)/checklist', params: { preparationId: 'p1' } })
  assert.deepEqual(notificationRoute({ ...target, entityId: '', available: false }, enums.UserRole.DRIVER),
    { pathname: '/(tabs)/(driver)/dashboard', params: {} })
})

test('mobile password gate redirects every protected screen and allows only the password form until the server flag clears', () => {
  let mustChangePassword = true, pathname = '/dashboard'
  const { default: Layout } = load('mobile/app/(tabs)/_layout.tsx', {
    'react-native': { StyleSheet: { create: (value) => value } },
    'expo-router': { Redirect: 'Redirect', Slot: 'Slot', usePathname: () => pathname },
    '@/src/mobile/components': { AppSidebarShell: 'AppSidebarShell' },
    '@/src/mobile/context/AuthContext': { useAuth: () => ({ user: { mustChangePassword }, isLoading: false }) },
  })
  for (pathname of ['/dashboard', '/notifications', '/profile', '/trip-detail']) {
    const element = Layout(); assert.equal(element.type, 'Redirect'); assert.equal(element.props.href, '/(tabs)/profile/change-password')
  }
  pathname = '/profile/change-password'; assert.equal(Layout().type, 'Slot')
  mustChangePassword = false; pathname = '/dashboard'; assert.equal(Layout().type, 'AppSidebarShell')
})

test('restored mobile sessions use /auth/me instead of trusting a cached first-login flag', async () => {
  const writes = [], effects = [], saved = [], apiCalls = []
  const cached = { id: 'u1', name: 'Fixture', role: 'driver', mustChangePassword: false, createdAt: new Date() }
  const verified = { id: 'u1', firstName: 'Fixture', lastName: 'Driver', role: 'driver', isActive: true,
    email: 'fixture@example.test', phone: '', mustChangePassword: true, createdAt: new Date().toISOString() }
  let preloadCalls = 0
  const { AuthProvider } = load('mobile/src/mobile/context/AuthContext.tsx', {
    react: { ...React, useState: (initial) => [initial, (value) => writes.push(value)], useEffect: (effect) => effects.push(effect) },
    '../types': enums, 'react-native': { AppState: { addEventListener: () => ({ remove() {} }) } },
    '../lib/api': { setApiAuthToken: () => {}, onPasswordChangeRequired: () => {}, getResponseData: (response) => response.data,
      api: { get: async (url) => { apiCalls.push(url); return { data: verified } } } },
    '../lib/authStorage': { loadPersistedAuthSession: async () => ({ user: cached, token: 'fixture-token' }),
      persistAuthSession: async (session) => saved.push(session), clearPersistedAuthSession: async () => {} },
    '../data/users': { syncUserManagementRecordProfile: () => {} },
    '../data/bootstrap': { preloadMobileData: () => { preloadCalls++; return Promise.resolve() } },
  })
  AuthProvider({ children: null }); effects[0]()
  await new Promise(setImmediate)
  assert.deepEqual(apiCalls, ['/auth/me']); assert.equal(saved[0].user.mustChangePassword, true)
  assert.ok(!writes.some((value) => value && value.id === 'u1' && value.mustChangePassword === false))
  assert.equal(preloadCalls, 0)
})

test('notification record selection opens the correct listing dialog and cannot select a record outside its dataset', () => {
  let opened
  const { useNotificationRecord } = load('hooks/use-notification-record.ts', {
    react: { ...React, useRef: () => ({ current: '' }), useEffect: (effect) => effect() },
    'next/navigation': { useSearchParams: () => new URLSearchParams('record=target') },
  })
  useNotificationRecord([{ id: 'other' }, { id: 'target', label: 'Correct booking' }], (record) => { opened = record })
  assert.equal(opened.label, 'Correct booking')
  opened = undefined
  useNotificationRecord([{ id: 'other' }], (record) => { opened = record })
  assert.equal(opened, undefined)
})

test('mobile pagination clamps removed last pages and keeps pages small', () => {
  const { useListPagination } = load('mobile/src/mobile/components/ListPagination.tsx', {
    react: { ...React, useState: () => [3, () => {}], useEffect: (effect) => effect() }, 'react-native': {},
  })
  const items = Array.from({ length: 25 }, (_, id) => ({ id }))
  const last = useListPagination(items)
  assert.equal(last.items.length, 5); assert.equal(last.items[0].id, 20)
  const removed = useListPagination(items.slice(0, 4))
  assert.equal(removed.controls.page, 1); assert.equal(removed.items.length, 4)
})
