const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')
const now = Date.parse('2026-10-22T04:00:00Z')
function load(file, dependencies = {}, windowFixture = {}) {
  const source = ts.transpileModule(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText
  const module = { exports: {} }
  new Function('require', 'module', 'exports', 'window', source)((name) => dependencies[name] ?? {}, module, module.exports, windowFixture)
  return module.exports
}
const tracking = load('lib/driver-allocation-data.ts')
const eta = load('lib/live-route-eta.ts', { '@/lib/driver-allocation-data': tracking })
const dependencies = { '@/lib/driver-allocation-data': tracking, '@/lib/live-route-eta': eta }
const monitoring = load('lib/delivery-monitoring.ts', dependencies)
const trip = { id: 'trip', status: 'in-transit', assignedDriver: 'Driver', conductionNumber: 'UNIT-1',
  actualStartTime: new Date(now - 10 * 60000).toISOString(), estimatedDuration: 20,
  currentLocation: { latitude: 14.5, longitude: 121, updatedAt: new Date(now).toISOString() },
  destinationLocationDetails: { latitude: 14.6, longitude: 121.1 } }
const estimate = { origin: { latitude: 14.5, longitude: 121 }, destination: trip.destinationLocationDetails,
  durationSeconds: 2700, distanceKm: 13.5, calculatedAt: new Date(now).toISOString(), source: 'mapbox-traffic', trafficAware: true, coordinates: [[121, 14.5], [121.1, 14.6]] }

test('GPS health and ETA reliability reflect real timestamps and routing provenance without inferring phone disconnection', () => {
  assert.equal(monitoring.getGpsHealthIndicator(trip, now).label, 'Live')
  assert.equal(monitoring.getGpsHealthIndicator({ ...trip, status: 'assigned' }, now).label, 'Live', 'GPS health is independent of active delivery status')
  const recent = { ...trip, currentLocation: { ...trip.currentLocation, updatedAt: new Date(now - 90000).toISOString() } }
  assert.equal(monitoring.getGpsHealthIndicator(recent, now).label, 'Stale GPS')
  assert.equal(tracking.getDriverAllocationTrackingHealth(recent, now).issue, null, 'retain the existing five-minute urgent threshold')
  const stale = { ...trip, currentLocation: { ...trip.currentLocation, updatedAt: new Date(now - 600000).toISOString() } }
  assert.equal(monitoring.getGpsHealthIndicator(stale, now).label, 'Stale GPS')
  assert.equal(monitoring.getGpsHealthIndicator({ ...trip, currentLocation: null }, now).label, 'Tracking Unavailable')
  assert.equal(monitoring.getGpsHealthIndicator({ ...trip, currentLocation: { ...trip.currentLocation, updatedAt: 'invalid' } }, now).label, 'Tracking Unavailable')
  assert.equal(monitoring.getEtaReliability(trip, estimate, now).label, 'Traffic-aware ETA')
  assert.equal(monitoring.getEtaReliability(trip, { ...estimate, source: 'osrm', trafficAware: false }, now).label, 'Road-based ETA')
  assert.equal(monitoring.getEtaReliability(stale, estimate, now).label, 'Last Known ETA')
  assert.equal(monitoring.getEtaReliability(stale, undefined, now).label, 'ETA Unavailable')
  assert.equal(monitoring.getEtaReliability(trip, estimate, now).calculatedAt, estimate.calculatedAt)
})

test('summary counts distinct delivery records and keeps delivery lifecycle independent of GPS health', () => {
  const stale = { ...trip, id: 'stale', currentLocation: { ...trip.currentLocation, updatedAt: new Date(now - 600000).toISOString() } }
  const records = [trip, trip, stale, { ...trip, id: 'waiting', status: 'pending', currentLocation: null },
    { ...trip, id: 'assigned', status: 'assigned' }, { ...trip, id: 'delivered', status: 'available' },
    { ...trip, id: 'completed', status: 'completed' }, { ...trip, id: 'cancelled', status: 'cancelled' }]
  assert.deepEqual(monitoring.summarizeDeliveries(records, { trip: estimate, stale: estimate }, now), { active: 4, delayed: 1, untrackable: 1, completed: 2, delayAssessable: 1 })
  assert.deepEqual(monitoring.summarizeDeliveries([], {}, now), { active: 0, delayed: 0, untrackable: 0, completed: 0, delayAssessable: 0 })
  assert.equal(monitoring.matchesDeliveryMonitoringFilter(stale, 'untrackable', estimate, now), true)
  assert.equal(monitoring.matchesDeliveryMonitoringFilter(stale, 'delayed', estimate, now), false)
  assert.equal(monitoring.matchesDeliveryMonitoringFilter({ ...trip, status: 'completed' }, 'completed', undefined, now), true)
})

test('delay compares the recorded trip plan with reliable arrival, clears on recovery, and remains unavailable without the required data', () => {
  const delay = monitoring.getDeliveryDelay(trip, estimate, now)
  assert.equal(delay.label, 'Delayed by 35 minutes')
  assert.equal(delay.significant, true)
  assert.equal(delay.plannedArrivalAt, new Date(now + 10 * 60000).toISOString())
  assert.equal(delay.calculatedArrivalAt, new Date(now + 45 * 60000).toISOString())
  assert.equal(monitoring.getDeliveryDelay(trip, { ...estimate, durationSeconds: 300 }, now).state, 'on-time')
  for (const duration of [undefined, null, 0, -5, NaN]) {
    assert.equal(monitoring.getDeliveryDelay({ ...trip, estimatedDuration: duration, scheduledShipmentAt: trip.actualStartTime }, estimate, now).label, 'Delay status unavailable')
  }
  assert.equal(monitoring.getDeliveryDelay({ ...trip, actualStartTime: null }, estimate, now).state, 'unavailable')
  assert.equal(monitoring.getDeliveryDelay({ ...trip, currentLocation: null }, estimate, now).state, 'unavailable')
  assert.equal(monitoring.getDeliveryDelay(trip, { ...estimate, calculatedAt: new Date(now - 120000).toISOString() }, now).state, 'unavailable')
})

test('significant delay notifications are separate from GPS alerts and deduplicated across refreshes and reloads', async () => {
  const storage = new Map()
  const windowFixture = { localStorage: { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value) } }
  const notifications = []
  const mocks = { ...dependencies,
    '@/lib/notifications-data': { createNotificationRecord: async (notification) => { notifications.push(notification) } },
    '@/lib/notification-preferences': { requestWebNotificationRefresh() {} },
  }
  const current = load('lib/delivery-monitoring.ts', mocks, windowFixture)
  await Promise.all([current.notifySignificantDeliveryDelay(trip, estimate, 'admin', now), current.notifySignificantDeliveryDelay(trip, estimate, 'admin', now)])
  await current.notifySignificantDeliveryDelay(trip, estimate, 'admin', now)
  assert.equal(notifications.length, 1)
  assert.equal(notifications[0].data.safetyAlertType, 'delivery_delay')
  assert.equal(notifications[0].userId, 'admin')
  const reloaded = load('lib/delivery-monitoring.ts', mocks, windowFixture)
  await reloaded.notifySignificantDeliveryDelay(trip, estimate, 'admin', now)
  await reloaded.notifySignificantDeliveryDelay({ ...trip, currentLocation: null }, estimate, 'admin', now)
  assert.equal(notifications.length, 1)
})
