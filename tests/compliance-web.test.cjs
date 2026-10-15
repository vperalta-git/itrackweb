const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')

const root = path.resolve(__dirname, '..')
const fixtureNow = Date.parse('2026-10-16T04:00:00.000Z')
class FixtureDate extends Date {
  constructor(...args) { super(...(args.length ? args : [fixtureNow])) }
  static now() { return fixtureNow }
}

function createLoader({ overrides = {}, fetch = () => { throw new Error('Real network calls are forbidden in compliance fixtures') }, sessionUser = null } = {}) {
  const cache = new Map()
  const storage = new Map()
  const events = []
  const window = {
    location: { origin: 'https://fixture.example.test' },
    localStorage: { getItem: (key) => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value) },
    dispatchEvent: (event) => events.push(event.type),
  }
  function load(relative) {
    const filename = path.join(root, relative)
    if (cache.has(filename)) return cache.get(filename).exports
    const module = { exports: {} }
    cache.set(filename, module)
    const source = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText
    new Function('require', 'module', 'exports', 'window', 'fetch', 'Date', source)((name) => {
      if (Object.hasOwn(overrides, name)) return overrides[name]
      if (name === '@/lib/session') return {
        getSessionUser: () => sessionUser,
        loadSession: () => ({ token: 'fixture-token', user: sessionUser }),
      }
      if (name === '@/lib/api-base-url') return { API_BASE_URL: 'https://backend.fixture.invalid/api' }
      if (name === '@/lib/notification-preferences') return { requestWebNotificationRefresh() {} }
      if (name.startsWith('@/')) return load(name.slice(2) + '.ts')
      return require(name)
    }, module, module.exports, window, fetch, FixtureDate)
    return module.exports
  }
  return { load, storage, events }
}

test('inventory maps release/readiness/trip states and summaries exclude released units from current availability', async () => {
  const vehicle = (id, status = 'available', model = 'D-MAX') => ({ id, unitName: model, status, createdAt: '2026-10-01T00:00:00Z' })
  const responses = {
    '/vehicles': [vehicle('released-prep'), vehicle('released-stock', 'completed', 'MU-X'), vehicle('ready'), vehicle('legacy-completed'), vehicle('assigned'), vehicle('moving', 'available', 'MU-X'), vehicle('available')],
    '/unit-agent-allocations': [{ vehicleId: 'assigned', managerId: { id: 'm1', firstName: 'Manager' }, salesAgentId: { id: 'a1', firstName: 'Agent' } }],
    '/driver-allocations': [{ vehicleId: 'assigned', status: 'assigned' }, { vehicleId: 'moving', status: 'in_transit' }],
    '/preparations': [
      { vehicleId: 'released-prep', status: 'completed', readyForReleaseAt: '2026-10-15T00:00:00Z', completedAt: '2026-10-15T01:00:00Z' },
      { vehicleId: 'ready', status: 'ready_for_release', readyForReleaseAt: '2026-10-15T00:00:00Z' },
      { vehicleId: 'legacy-completed', status: 'completed' },
    ],
  }
  const { load, storage, events } = createLoader({ overrides: {
    '@/lib/api-client': { apiRequest: async (route) => {
      assert.ok(Object.hasOwn(responses, route), `Unexpected fixture API route: ${route}`)
      return responses[route]
    } },
  } })
  const inventory = load('lib/inventory-data.ts')
  const rows = await inventory.syncInventoryVehiclesFromBackend()
  const byId = new Map(rows.map((row) => [row.id, row]))
  assert.equal(byId.get('released-prep').status, 'released')
  assert.equal(byId.get('released-stock').status, 'released')
  assert.equal(byId.get('ready').status, 'ready-for-release')
  assert.equal(byId.get('legacy-completed').status, 'in-dispatch')
  assert.equal(byId.get('assigned').status, 'in-stockyard')
  assert.equal(byId.get('moving').status, 'in-transit')
  assert.equal(byId.get('assigned').assignedAgentId, 'a1')
  assert.equal(byId.get('assigned').managerId, 'm1')
  assert.deepEqual(inventory.summarizeInventory(rows), {
    current: 5, available: 1, allocated: 1, inTransit: 1, underPreparation: 2, released: 2,
    byModel: [{ model: 'D-MAX', count: 4 }, { model: 'MU-X', count: 1 }],
  })
  assert.equal(JSON.parse(storage.get(inventory.INVENTORY_STORAGE_KEY)).length, rows.length)
  assert.deepEqual(events, [inventory.INVENTORY_UPDATED_EVENT])
})

test('manager and sales-agent inventory visibility follows owner IDs and eligible shared stock', () => {
  const rows = [
    { id: 'mine', managerId: 'self', assignedAgentId: 'self', assignedAgent: 'Different name', status: 'in-transit' },
    { id: 'same-name-other-owner', managerId: 'other', assignedAgentId: 'other', assignedAgent: 'Fixture User', status: 'available' },
    { id: 'shared-available', managerId: null, assignedAgentId: null, status: 'available' },
    { id: 'shared-stockyard', managerId: null, assignedAgentId: null, status: 'in-stockyard' },
    { id: 'unassigned-moving', managerId: null, assignedAgentId: null, status: 'in-transit' },
    { id: 'unassigned-released', managerId: null, assignedAgentId: null, status: 'released' },
    { id: 'unassigned-preparing', managerId: null, assignedAgentId: null, status: 'in-dispatch' },
  ]
  const inventory = createLoader({ sessionUser: { id: 'self', firstName: 'Fixture', lastName: 'User' } }).load('lib/inventory-data.ts')
  for (const role of ['manager', 'sales-agent']) {
    assert.deepEqual(inventory.getVisibleInventoryVehicles(rows, role).map((row) => row.id), ['mine', 'shared-available', 'shared-stockyard'])
  }
  assert.equal(inventory.getVisibleInventoryVehicles(rows, 'admin'), rows)
  assert.equal(inventory.getVisibleInventoryVehicles(rows, 'supervisor'), rows)
  const anonymous = createLoader().load('lib/inventory-data.ts')
  assert.deepEqual(anonymous.getVisibleInventoryVehicles(rows, 'manager'), [])
})

test('API client unwraps actual data and preserves authentication, query escaping and JSON payloads', async () => {
  const payload = [{ id: 'v1', unitName: 'D-MAX' }]
  let called = false
  const client = createLoader({ fetch: async (url, init) => {
    called = true
    const requestUrl = new URL(url)
    assert.equal(requestUrl.origin, 'https://fixture.example.test')
    assert.equal(requestUrl.pathname, '/api/backend/vehicles')
    assert.equal(requestUrl.searchParams.get('search'), '[unit] & model')
    assert.equal(init.headers.get('Authorization'), 'Bearer fixture-token')
    assert.equal(init.headers.get('Content-Type'), 'application/json')
    assert.deepEqual(JSON.parse(init.body), { notes: 'fixture input' })
    return new Response(JSON.stringify({ success: true, data: payload }), { status: 200 })
  } }).load('lib/api-client.ts')
  assert.deepEqual(await client.apiRequest('/vehicles', { method: 'PATCH', query: { search: '[unit] & model' }, body: { notes: 'fixture input' } }), payload)
  assert.equal(called, true)
})

test('API client rejects HTTP-success failure envelopes and malformed responses with useful errors', async () => {
  for (const [body, message] of [
    [{ success: false, data: { id: 'must-not-escape' }, message: 'Validation rejected' }, /Validation rejected/],
    [{ success: true }, /unexpected response/],
    [null, /unexpected response/],
    ['<html>upstream failure</html>', /upstream failure/],
  ]) {
    const client = createLoader({ fetch: async () => new Response(typeof body === 'string' ? body : JSON.stringify(body), { status: 200 }) }).load('lib/api-client.ts')
    await assert.rejects(client.apiRequest('/vehicles'), message)
  }
  const failure = { success: false, message: 'Conduction number already exists.', details: ['Duplicate identifier'] }
  const client = createLoader({ fetch: async () => new Response(JSON.stringify(failure), { status: 409 }) }).load('lib/api-client.ts')
  await assert.rejects(client.apiRequest('/vehicles'), (error) => {
    assert.ok(error instanceof client.ApiError)
    assert.equal(error.status, 409)
    assert.equal(error.message, failure.message)
    assert.deepEqual(error.details, failure)
    return true
  })
})

const routeFixture = {
  id: 'trip', status: 'in-transit', routeProgress: 0.62, estimatedDuration: 30,
  pickupLocationDetails: { name: 'Origin', address: 'A', latitude: 14.5, longitude: 121 },
  destinationLocationDetails: { name: 'Destination', address: 'B', latitude: 14.6, longitude: 121.1 },
}

test('missing GPS never becomes a synthetic marker, distance, progress or ETA', () => {
  const tracking = createLoader().load('lib/driver-allocation-data.ts')
  assert.equal(tracking.getDriverAllocationLiveCoordinates(routeFixture), null)
  assert.equal(tracking.getDriverAllocationLiveCoordinates({ ...routeFixture, status: 'completed' }), null)
  assert.equal(tracking.getDriverAllocationProgress(routeFixture), 0)
  assert.equal(tracking.getDriverAllocationRemainingDistanceKm(routeFixture), null)
  assert.match(tracking.getDriverAllocationEtaLabel(routeFixture), /unavailable/i)
  assert.equal(tracking.getDriverAllocationGpsState(routeFixture).state, 'unavailable')
  assert.equal(tracking.getDriverAllocationLiveCoordinates({ ...routeFixture, currentLocation: { latitude: 95, longitude: 121 } }), null)
})

test('real GPS freshness distinguishes live, last-known, stale and invalid timestamps', () => {
  const tracking = createLoader().load('lib/driver-allocation-data.ts')
  const location = (ageSeconds) => ({ latitude: 14.55, longitude: 121.05, updatedAt: new Date(fixtureNow - ageSeconds * 1000).toISOString() })
  for (const [age, expected] of [[0, 'live'], [60, 'live'], [61, 'last-known'], [300, 'last-known'], [301, 'stale']]) {
    const currentLocation = location(age)
    const allocation = { ...routeFixture, currentLocation }
    const state = tracking.getDriverAllocationGpsState(allocation)
    assert.equal(state.state, expected, `GPS age ${age} seconds`)
    assert.equal(state.location.latitude, currentLocation.latitude)
    assert.deepEqual(tracking.getDriverAllocationLiveCoordinates(allocation), { latitude: currentLocation.latitude, longitude: currentLocation.longitude })
  }
  for (const updatedAt of [null, '', 'invalid timestamp', new Date(fixtureNow + 3600000).toISOString()]) {
    const state = tracking.getDriverAllocationGpsState({ ...routeFixture, currentLocation: { latitude: 14.55, longitude: 121.05, updatedAt } })
    assert.notEqual(state.state, 'live')
  }
})
