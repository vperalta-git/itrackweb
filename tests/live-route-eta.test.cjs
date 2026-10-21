const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')
const root = path.resolve(__dirname, '..')
const now = Date.parse('2026-10-22T04:00:00Z')
class FixtureDate extends Date {
  constructor(...args) { super(...(args.length ? args : [now])) }
  static now() { return now }
}
function load(relative, { dependencies = {}, fetch = () => { throw new Error('Real API requests are forbidden') }, append = '' } = {}) {
  const source = ts.transpileModule(fs.readFileSync(path.join(root, relative), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText
  const module = { exports: {} }
  new Function('require', 'module', 'exports', 'fetch', 'process', 'Date', source + append)((name) => {
    if (Object.hasOwn(dependencies, name)) return dependencies[name]
    if (name.startsWith('@/components/') || name === 'lucide-react') return new Proxy({}, { get: (_, key) => key === '__esModule' ? true : String(key) })
    if (name.startsWith('@/')) return {}
    return require(name)
  }, module, module.exports, fetch, { env: { MAPBOX_ACCESS_TOKEN: 'fixture-token' } }, FixtureDate)
  return module.exports
}
const points = [{ latitude: 14.535, longitude: 120.982 }, { latitude: 14.574, longitude: 121.081 }]
const geometry = [[120.982, 14.535], [121.02, 14.55], [121.081, 14.574]]
const routeResponse = (traffic = true) => ({ code: 'Ok', routes: [
  { duration: 2700, distance: 13500, geometry: { coordinates: geometry }, legs: [{ annotation: { congestion_numeric: traffic ? [70, 25] : [null, null] } }] },
  { duration: 600, distance: 8000, geometry: { coordinates: geometry } },
] })

test('server returns provider road duration and recommended geometry; traffic, coverage fallback and existing OSRM are labeled and cached', async () => {
  const calls = []
  const server = load('lib/server-map-routes.ts', { fetch: async (url) => {
    calls.push(new URL(url))
    return Response.json(routeResponse())
  } })
  const [first, duplicate] = await Promise.all([server.resolveRouteData(points), server.resolveRouteData(points)])
  assert.equal(calls.length, 1)
  assert.equal(first, duplicate)
  assert.match(calls[0].pathname, /driving-traffic/)
  assert.equal(calls[0].searchParams.get('depart_at'), 'now')
  assert.equal(calls[0].searchParams.get('alternatives'), 'false')
  assert.equal(first.durationSeconds, 2700, 'use road duration without a speed assumption or time multiplier')
  assert.equal(first.distanceKm, 13.5)
  assert.deepEqual(first.coordinates, geometry)
  assert.equal(first.source, 'mapbox-traffic')
  assert.equal(first.trafficAware, true)
  const uncovered = load('lib/server-map-routes.ts', { fetch: async () => Response.json(routeResponse(false)) })
  assert.equal((await uncovered.resolveRouteData(points)).source, 'mapbox-driving')
  const fallbackCalls = []
  const fallback = load('lib/server-map-routes.ts', { fetch: async (url) => {
    fallbackCalls.push(String(url))
    return String(url).includes('driving-traffic') ? new Response('', { status: 422 }) : Response.json(routeResponse(false))
  } })
  assert.equal((await fallback.resolveRouteData(points)).trafficAware, false)
  assert.match(fallbackCalls[1], /mapbox\/driving\//)
  const osrm = load('lib/server-map-routes.ts', { fetch: async (url) => String(url).includes('mapbox.com')
    ? new Response('', { status: 503 }) : Response.json(routeResponse(false)) })
  assert.equal((await osrm.resolveRouteData(points)).source, 'osrm')
  const unavailable = load('lib/server-map-routes.ts', { fetch: async () => new Response('', { status: 503 }) })
  assert.equal(await unavailable.resolveRouteData(points), null, 'outages must not invent an ETA')
})

test('live ETA, arrival, distance and map share one result; jitter is throttled and stale GPS hides current ETA without losing last-known data', async () => {
  const tracking = load('lib/driver-allocation-data.ts')
  const allocation = { id: 'eta-trip', status: 'in-transit', assignedDriver: 'Driver', unitName: 'D-MAX', variation: '',
    currentLocation: { ...points[0], updatedAt: new Date(now).toISOString() }, destinationLocationDetails: points[1],
    estimatedDuration: 10, routeProgress: 0.59 }
  let requests = 0
  const eta = load('lib/live-route-eta.ts', { dependencies: { '@/lib/driver-allocation-data': tracking }, fetch: async () => {
    requests++
    return Response.json({ coordinates: geometry, durationSeconds: 2700, distanceKm: 13.5,
      source: 'mapbox-traffic', trafficAware: true, calculatedAt: new Date(now).toISOString() })
  } })
  const [estimate, duplicate] = await Promise.all([eta.requestLiveRoadEstimate(allocation, now), eta.requestLiveRoadEstimate(allocation, now)])
  assert.equal(requests, 1)
  assert.equal(estimate, duplicate)
  assert.equal(eta.formatRoadTravelTime(estimate.durationSeconds), '45 mins')
  assert.equal(eta.formatRoadTravelTime(20), 'Less than 1 min')
  const jitter = { ...allocation, currentLocation: { ...allocation.currentLocation, latitude: points[0].latitude + 0.0001 } }
  await eta.requestLiveRoadEstimate(jitter, now + 30000)
  assert.equal(requests, 1, 'small GPS inaccuracies must not cause rerouting')
  const moved = { ...allocation, currentLocation: { ...allocation.currentLocation, latitude: points[0].latitude + 0.003 } }
  assert.equal(eta.getCurrentRoadEstimate(moved, estimate, now + 30000), null)
  await eta.requestLiveRoadEstimate(moved, now + 35000)
  assert.equal(requests, 2, 'meaningful movement refreshes the road estimate after throttling')
  const page = load('app/(dashboard)/allocation/drivers/tracking/page.tsx', {
    dependencies: { 'next/navigation': {}, '@/lib/driver-allocation-data': tracking, '@/lib/live-route-eta': eta },
    append: '\nexports.mapDriver = mapAllocationToTrackingDriver;',
  })
  const live = page.mapDriver(allocation, now, estimate)
  assert.equal(live.eta, '45 mins')
  assert.equal(live.distanceLeft, '13.5 km')
  assert.equal(live.expectedArrival, new Date(now + 2700 * 1000).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }))
  assert.deepEqual(live.routeEstimate.coordinates, geometry)
  const stale = { ...allocation, currentLocation: { ...allocation.currentLocation, updatedAt: new Date(now - 5 * 86400000).toISOString() } }
  const staleView = page.mapDriver(stale, now, estimate)
  assert.equal(await eta.requestLiveRoadEstimate(stale, now), null)
  assert.equal(requests, 2, 'stale GPS must not trigger routing requests')
  assert.equal(staleView.eta, 'ETA Unavailable: GPS Tracking Lost')
  assert.equal(staleView.expectedArrival, null)
  assert.match(staleView.lastKnownEta, /45 mins \(calculated/)
  assert.match(staleView.distanceLeft, /Last known: 13.5 km/)
  assert.deepEqual(staleView.coordinates, { lat: points[0].latitude, lng: points[0].longitude })
  assert.equal(staleView.status, 'in-transit')
  const resumed = { ...allocation, currentLocation: { ...allocation.currentLocation, updatedAt: new Date(now + 100000).toISOString() } }
  await eta.requestLiveRoadEstimate(resumed, now + 100000)
  assert.equal(requests, 3, 'fresh GPS resumes routing automatically')
  assert.equal(eta.getCurrentRoadEstimate(allocation, estimate, now + 100000), null, 'expired estimates are not current')
})
