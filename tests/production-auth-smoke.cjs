// Exercises the built Next.js server over HTTP using a local backend fixture.
const assert = require('node:assert/strict')
const http = require('node:http')
const { spawn } = require('node:child_process')
const { randomBytes } = require('node:crypto')
const path = require('node:path')
const root = path.resolve(__dirname, '..')
const listen = server => new Promise(resolve => server.listen(0, '127.0.0.1', () => resolve(server.address().port)))
async function run() {
  let apiCalls = [], next
  const backend = http.createServer(async (req, res) => {
    let body = ''; for await (const part of req) body += part
    apiCalls.push(req.url)
    res.setHeader('Content-Type', 'application/json')
    if (req.url === '/api/auth/login') {
      const input = JSON.parse(body)
      if (input.password === 'invalid-fixture') { res.writeHead(401); return res.end(JSON.stringify({ success: false, message: 'Invalid email or password.' })) }
      return res.end(JSON.stringify({ success: true, data: { token: 'fixture-api-token', user: { id: 'fixture-user', role: 'manager', firstName: 'Fixture', lastName: 'Account', mustChangePassword: input.email === 'first-login@example.test' } } }))
    }
    if (req.url === '/api/auth/logout') return res.end(JSON.stringify({ success: true, data: null }))
    // Reproduce the production API that does not implement /auth/me.
    res.writeHead(404); res.end(JSON.stringify({ success: false, message: 'Route not found' }))
  })
  try {
    const backendPort = await listen(backend)
    const portProbe = http.createServer(); const webPort = await listen(portProbe); await new Promise(resolve => portProbe.close(resolve))
    next = spawn(process.execPath, [require.resolve('next/dist/bin/next'), 'start', '-p', String(webPort), '-H', '127.0.0.1'], {
      cwd: root, windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'],
      env: { ...process.env, NODE_ENV: 'production', AUTH_SESSION_SECRET: randomBytes(32).toString('hex'), BACKEND_URL: `http://127.0.0.1:${backendPort}/api` },
    })
    let serverError = ''; next.stderr.on('data', chunk => { serverError += chunk.toString() })
    const origin = `http://127.0.0.1:${webPort}`
    let ready = false
    for (let attempt = 0; attempt < 100; attempt++) {
      try { if ((await fetch(origin + '/login')).ok) { ready = true; break } } catch {}
      if (next.exitCode !== null) throw new Error('Next.js server exited before readiness')
      await new Promise(resolve => setTimeout(resolve, 200))
    }
    assert.ok(ready, 'production server starts')
    const login = input => fetch(origin + '/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input) })
    const bad = await login({ email: 'existing@example.test', password: 'invalid-fixture' }); assert.equal(bad.status, 401); assert.equal(bad.headers.get('set-cookie'), null)
    apiCalls = []
    const good = await login({ email: 'existing@example.test', password: 'valid-fixture', remember: true }); assert.equal(good.status, 200)
    const setCookie = good.headers.get('set-cookie'); assert.match(setCookie, /HttpOnly/i); assert.match(setCookie, /Secure/i); assert.match(setCookie, /SameSite=lax/i)
    const cookie = setCookie.split(';')[0]
    assert.deepEqual(apiCalls, ['/api/auth/login'])
    const dashboard = await fetch(origin + '/manager/dashboard', { headers: { Cookie: cookie }, redirect: 'manual' }); assert.equal(dashboard.status, 200)
    assert.equal((await fetch(origin + '/manager/dashboard', { headers: { Cookie: cookie }, redirect: 'manual' })).status, 200)
    const wrongRole = await fetch(origin + '/admin/dashboard', { headers: { Cookie: cookie }, redirect: 'manual' }); assert.equal(new URL(wrongRole.headers.get('location'), origin).pathname, '/manager/dashboard')
    const first = await login({ email: 'first-login@example.test', password: 'valid-fixture' }); assert.equal(first.status, 200)
    const firstCookie = first.headers.get('set-cookie').split(';')[0]
    const blocked = await fetch(origin + '/manager/dashboard', { headers: { Cookie: firstCookie }, redirect: 'manual' }); assert.equal(new URL(blocked.headers.get('location'), origin).pathname, '/manager/profile')
    assert.equal((await fetch(origin + '/manager/profile', { headers: { Cookie: firstCookie }, redirect: 'manual' })).status, 200)
    const logout = await fetch(origin + '/api/auth/session', { method: 'DELETE', headers: { Cookie: cookie } }); assert.equal(logout.status, 200); assert.match(logout.headers.get('set-cookie'), /Max-Age=0/i)
    assert.ok(apiCalls.includes('/api/auth/logout'))
    const anonymous = await fetch(origin + '/manager/dashboard', { redirect: 'manual' }); assert.equal(new URL(anonymous.headers.get('location'), origin).pathname, '/login')
    console.log('Production HTTP smoke passed: login against a backend without /auth/me, invalid credentials, Secure/HttpOnly cookie, refresh, role redirect, first-login profile access, logout and anonymous denial.')
  } finally {
    if (next && next.exitCode === null) { next.kill(); await new Promise(resolve => next.once('exit', resolve)) }
    await new Promise(resolve => backend.close(resolve))
  }
}
run().catch(error => { console.error(error.message); process.exitCode = 1 })
