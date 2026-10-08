const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')
const { webcrypto } = require('node:crypto')
global.crypto ??= webcrypto
process.env.AUTH_SESSION_SECRET = 'isolated-test-signing-secret-not-a-production-value'
const { NextResponse } = require('next/server')
const root = path.resolve(__dirname, '..')
const cache = new Map()
let cookieValue
function load(relative) {
  const filename = path.join(root, relative)
  if (cache.has(filename)) return cache.get(filename).exports
  const module = { exports: {} }; cache.set(filename, module)
  const source = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
  new Function('require', 'module', 'exports', source)(name => {
    if (name === 'next/headers') return { cookies: async () => ({ get: () => cookieValue ? { value: cookieValue } : undefined }) }
    if (name.startsWith('@/')) return load(name.slice(2) + '.ts')
    return require(name)
  }, module, module.exports)
  return module.exports
}
const session = load('lib/server-auth-session.ts')
const rbac = load('lib/rbac.ts')
const roles = load('lib/session.ts')
const login = load('app/api/auth/login/route.ts')
const refresh = load('app/api/auth/session/route.ts')
const middleware = load('proxy.ts')
const cookieName = load('lib/auth-constants.ts').SERVER_SESSION_COOKIE_NAME
const request = body => new Request('https://example.test/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
const response = (status, data, message) => new Response(JSON.stringify({ success: status < 400, data, message }), { status, headers: { 'Content-Type': 'application/json' } })
const cookieFrom = res => res.cookies.get(cookieName)?.value
const credentials = { email: 'mock@example.test', password: 'mock-credential' } // Injected backend responses; no real accounts or credentials.
const backendRoles = ['admin', 'supervisor', 'manager', 'sales_agent', 'dispatcher', 'driver']

test('successful login creates a verified cookie in one call for every web role; mobile roles are denied web access', async () => {
  for (const role of backendRoles) {
    const calls = []
    global.fetch = async (url, init) => { calls.push(url); assert.equal(JSON.parse(init.body).email, credentials.email); return response(200, { token: 'mock-token', user: { id: 'mock-user', role, mustChangePassword: false } }) }
    const res = await login.POST(request({ ...credentials, userId: 'attacker', routeRole: 'admin', remember: true }))
    assert.equal(calls.length, 1)
    assert.ok(calls[0].endsWith('/auth/login'))
    if (['driver', 'dispatcher'].includes(role)) { assert.equal(res.status, 403); assert.equal(cookieFrom(res), undefined); continue }
    assert.equal(res.status, 200)
    const value = cookieFrom(res)
    const verified = await session.verifySignedSessionValue(value)
    assert.equal(verified.userId, 'mock-user')
    assert.equal(verified.routeRole, role === 'sales_agent' ? 'sales-agent' : role)
    assert.equal(verified.mustChangePassword, false)
    assert.equal(verified.backendToken, 'mock-token')
    assert.equal(res.cookies.get(cookieName).httpOnly, true)
    assert.equal(res.cookies.get(cookieName).sameSite, 'lax')
    assert.deepEqual(await session.verifySignedSessionValue(value), verified) // Object equality checked below on refresh.
  }
})

test('invalid credentials and service failures do not mint cookies or collapse to false authentication failures', async () => {
  for (const [upstream, expected] of [[401, 401], [403, 403], [503, 502]]) {
    global.fetch = async () => response(upstream, null, 'Rejected')
    const res = await login.POST(request(credentials))
    assert.equal(res.status, expected); assert.equal(cookieFrom(res), undefined)
  }
  global.fetch = async () => { throw new TypeError('network') }
  assert.equal((await login.POST(request(credentials))).status, 503)
  assert.equal((await login.POST(request({ email: 7, password: [] }))).status, 400)
})

test('first login enforces password change, permits profile and logout, then refreshes from verified backend state', async () => {
  global.fetch = async () => response(200, { token: 'mock-token', user: { id: 'mock-user', role: 'manager', mustChangePassword: true } })
  const result = await login.POST(request(credentials)); cookieValue = cookieFrom(result)
  const routeRequest = pathname => ({ nextUrl: new URL('https://example.test' + pathname), url: 'https://example.test' + pathname, cookies: { get: () => ({ value: cookieValue }) } })
  const blocked = await middleware.proxy(routeRequest('/manager/dashboard'))
  assert.equal(new URL(blocked.headers.get('location')).pathname, '/manager/profile')
  assert.equal((await middleware.proxy(routeRequest('/manager/profile'))).status, 200)
  global.fetch = async url => { assert.ok(url.endsWith('/auth/me')); return response(200, { id: 'mock-user', role: 'manager', mustChangePassword: false }) }
  const refreshed = await refresh.POST(request({ token: 'mock-token', userId: 'mock-user', routeRole: 'manager', mustChangePassword: true }))
  cookieValue = cookieFrom(refreshed)
  assert.equal((await session.verifySignedSessionValue(cookieValue)).mustChangePassword, false)
  assert.equal((await middleware.proxy(routeRequest('/manager/dashboard'))).status, 200)
  assert.deepEqual(await session.verifySignedSessionValue(cookieValue), await session.verifySignedSessionValue(cookieValue))
})

test('refresh cannot trust a client password flag, identity, or elevated role; missing endpoint is a deployment error', async () => {
  global.fetch = async () => response(200, { id: 'mock-user', role: 'manager', mustChangePassword: true })
  const result = await refresh.POST(request({ token: 'mock-token', userId: 'mock-user', routeRole: 'manager', mustChangePassword: false }))
  assert.equal((await session.verifySignedSessionValue(cookieFrom(result))).mustChangePassword, true)
  assert.equal((await refresh.POST(request({ token: 'mock-token', userId: 'mock-user', routeRole: 'admin' }))).status, 403)
  global.fetch = async () => response(404, null, 'Route not found')
  assert.equal((await refresh.POST(request({ token: 'mock-token', userId: 'mock-user', routeRole: 'manager' }))).status, 502)
})

test('signed cookies reject tampering, malformed encoding, expiry and missing production secrets', async () => {
  const { value } = await session.createSignedSessionValue({ userId: 'mock-user', routeRole: 'admin', remember: false })
  assert.equal(await session.verifySignedSessionValue(value + '.extra'), null)
  assert.equal(await session.verifySignedSessionValue('zz.' + value.split('.')[1]), null)
  assert.equal(await session.verifySignedSessionValue(value.replace('admin', 'manager').slice(0, -1) + 'z'), null)
  const originalNow = Date.now; Date.now = () => originalNow() + 13 * 3600000
  try { assert.equal(await session.verifySignedSessionValue(value), null) } finally { Date.now = originalNow }
  const env = { ...process.env }
  process.env.NODE_ENV = 'production'; delete process.env.AUTH_SESSION_SECRET; delete process.env.NEXTAUTH_SECRET
  try { await assert.rejects(session.createSignedSessionValue({ userId: 'mock-user', routeRole: 'admin', remember: false }), /AUTH_SESSION_SECRET/); assert.equal(session.getServerSessionCookieOptions(true).secure, true) }
  finally { process.env.NODE_ENV = env.NODE_ENV || 'test'; process.env.AUTH_SESSION_SECRET = env.AUTH_SESSION_SECRET; if (env.NEXTAUTH_SECRET) process.env.NEXTAUTH_SECRET = env.NEXTAUTH_SECRET }
})

test('role-specific dashboard redirection and unauthorized entry preserve existing permissions', async () => {
  for (const role of rbac.roles) {
    const { value } = await session.createSignedSessionValue({ userId: 'mock-user', routeRole: role, remember: false })
    const req = pathname => ({ url: 'https://example.test' + pathname, nextUrl: Object.assign(new URL('https://example.test' + pathname), { clone() { return new URL(this.href) } }), cookies: { get: () => ({ value }) } })
    assert.equal(new URL((await middleware.proxy(req('/login'))).headers.get('location')).pathname, `/${role}/dashboard`)
    assert.equal((await middleware.proxy(req(`/${role}/dashboard`))).status, 200)
    assert.equal(rbac.canRoleAccessPath(role, 'users'), ['admin', 'supervisor'].includes(role))
    assert.equal(rbac.canRoleAccessPath(role, 'driver-allocation/live-tracking'), true)
  }
  const denied = await middleware.proxy({ url: 'https://example.test/admin/dashboard', nextUrl: new URL('https://example.test/admin/dashboard'), cookies: { get: () => undefined } })
  assert.equal(new URL(denied.headers.get('location')).pathname, '/login')
  assert.equal(roles.mapBackendRoleToRouteRole('unknown'), null)
})

test('logout revokes backend token before clearing cookie; failures remain retryable', async () => {
  cookieValue = (await session.createSignedSessionValue({ userId: 'mock-user', routeRole: 'admin', backendToken: 'mock-token', remember: true })).value
  let revoked = false
  global.fetch = async (url, init) => { assert.ok(url.endsWith('/auth/logout')); assert.equal(init.headers.Authorization, 'Bearer mock-token'); revoked = true; return response(200, null) }
  const result = await refresh.DELETE()
  assert.equal(revoked, true); assert.equal(result.status, 200); assert.equal(result.cookies.get(cookieName).maxAge, 0)
  global.fetch = async () => response(503, null)
  assert.equal((await refresh.DELETE()).status, 503)
  global.fetch = async () => response(401, null)
  assert.equal((await refresh.DELETE()).status, 200)
})


test('all server requests resolve the same configured API origin', () => {
  const base = load('lib/api-base-url.ts')
  const previous = { backend: process.env.BACKEND_URL, public: process.env.NEXT_PUBLIC_API_URL }
  try {
    process.env.BACKEND_URL = 'https://private.example.test/'
    process.env.NEXT_PUBLIC_API_URL = 'https://public.example.test/api'
    assert.equal(base.getBackendApiBaseUrl(), 'https://private.example.test/api')
    process.env.BACKEND_URL = ' '
    assert.equal(base.getBackendApiBaseUrl(), 'https://public.example.test/api')
  } finally {
    for (const [key, value] of [['BACKEND_URL', previous.backend], ['NEXT_PUBLIC_API_URL', previous.public]]) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value
    }
  }
})
