// Focused, offline smoke check: node tests/live-tracking-smoke.cjs
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')
const React = require('react')
const root = path.resolve(__dirname, '..')
const now = Date.parse('2026-10-22T04:00:00Z')

function load(relative, dependencies, append = '') {
  const source = ts.transpileModule(fs.readFileSync(path.join(root, relative), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText
  const module = { exports: {} }
  new Function('require', 'module', 'exports', source + append)((name) => {
    if (Object.hasOwn(dependencies, name)) return dependencies[name]
    if (name.startsWith('@/components/') || name === 'lucide-react') return new Proxy({}, { get: (_, key) => key === '__esModule' ? true : String(key) })
    if (name.startsWith('@/')) throw new Error(`Unexpected dependency: ${name}`)
    return require(name)
  }, module, module.exports)
  return module.exports
}

const forbidden = () => { throw new Error('Smoke tests must not contact live services') }
const tracking = load('lib/driver-allocation-data.ts', {
  '@/lib/api-client': { apiRequest: forbidden }, '@/lib/backend-helpers': {},
  '@/lib/inventory-data': {}, '@/lib/notification-preferences': {},
})
const roadEta = load('lib/live-route-eta.ts', { '@/lib/driver-allocation-data': tracking })
const monitoring = load('lib/delivery-monitoring.ts', {
  '@/lib/driver-allocation-data': tracking, '@/lib/live-route-eta': roadEta,
  '@/lib/notifications-data': {}, '@/lib/notification-preferences': {},
})
const allocation = {
  id: 'trip-1', assignedDriver: 'Alex Driver', driverPhone: '', status: 'in-transit',
  unitName: 'D-MAX', variation: 'LS', conductionNumber: 'UNIT-001', salesAgent: 'Agent', manager: 'Manager',
  pickupLocation: 'Pickup', destination: 'Destination', actualStartTime: new Date(now - 10 * 60000).toISOString(),
  routeProgress: 0.59, estimatedDuration: 30,
  pickupLocationDetails: { latitude: 14.5, longitude: 121 },
  destinationLocationDetails: { latitude: 14.6, longitude: 121.1 },
  currentLocation: { latitude: 14.55, longitude: 121.05, updatedAt: new Date(now - 5 * 86400000).toISOString() },
}
assert.equal(tracking.getDriverAllocationTrackingHealth(allocation, now).issue, 'GPS Signal Lost')
assert.equal(tracking.getDriverAllocationTrackingHealth(allocation, now).lastGpsAge, '5 days ago')
const noGps = { ...allocation, currentLocation: null }
assert.equal(tracking.getDriverAllocationTrackingHealth(noGps, now).urgent, true)
assert.equal(tracking.getDriverAllocationTrackingHealth({ ...noGps, actualStartTime: new Date(now - 60_000).toISOString() }, now).urgent, false)
assert.equal(tracking.getDriverAllocationTrackingHealth({ ...noGps, actualStartTime: new Date(now - 120_000).toISOString() }, now).urgent, true)
assert.equal(tracking.getDriverAllocationTrackingHealth({ ...allocation, status: 'completed' }, now).issue, null)
for (const updatedAt of ['', 'invalid', new Date(now + 3600000).toISOString()]) {
  assert.equal(tracking.getDriverAllocationTrackingHealth({ ...allocation, currentLocation: { ...allocation.currentLocation, updatedAt } }, now).issue, 'Tracking Unavailable')
}
const recovered = { ...allocation, currentLocation: { ...allocation.currentLocation, updatedAt: new Date(now).toISOString() } }
assert.equal(tracking.getDriverAllocationTrackingHealth(recovered, now).issue, null)
assert.equal(tracking.getDriverAllocationTrackingHealth(recovered, now).urgent, false)

let states
const stateWrites = new Map()
let stateIndex
const page = load('app/(dashboard)/allocation/drivers/tracking/page.tsx', {
  react: { ...React, useEffect() {}, useMemo: (callback) => callback(), useRef: () => ({ current: null }),
    useState: () => { const index = stateIndex++; return [states[index], value => stateWrites.set(index, value)] } },
  'next/navigation': { usePathname: () => '/admin/driver-allocation/live-tracking', useSearchParams: () => new URLSearchParams() },
  '@/lib/driver-allocation-data': tracking,
  '@/lib/live-route-eta': roadEta,
  '@/lib/delivery-monitoring': monitoring,
  '@/lib/session': {}, '@/lib/user-data': {},
  '@/lib/map-location': { buildRouteMapEmbedUrl: () => '/fixture-map' },
  '@/lib/rbac': { getRoleFromPathname: () => 'admin', buildRolePath: (_, target) => `/admin/${target}` },
  '@/lib/role-scope': { matchesScopedAgent: () => true, matchesScopedManager: () => true },
}, '\nexports.mapDriver = mapAllocationToTrackingDriver;')

function walk(element, predicate) {
  if (!element || typeof element !== 'object') return []
  return [...(predicate(element) ? [element] : []), ...React.Children.toArray(element.props?.children).flatMap(child => walk(child, predicate))]
}
function text(element) {
  if (typeof element === 'string' || typeof element === 'number') return String(element)
  return React.Children.toArray(element?.props?.children).map(text).join(' ').replace(/\s+/g, ' ').trim()
}
function render(record) {
  const driver = record ? page.mapDriver(record, now) : null
  stateIndex = 0
  states = [record ? [record] : [], '', 'all', null, now, null, {}, 'active', [], false, driver]
  return page.default().props.children.type()
}
const lostTree = render(allocation)
const banner = walk(lostTree, node => node.props?.role === 'alert')[0]
assert.match(text(banner), /URGENT: 1 active delivery has lost GPS tracking/)
assert.match(text(banner), /Alex Driver.*5 days/)
assert.match(banner.props.className, /border-red-600/)
const table = walk(lostTree, node => node.type === 'DriverMonitoringTable')[0]
assert.equal(table.props.drivers[0].urgent, true)
assert.equal(table.props.drivers[0].lastGpsAge, '5 days ago')
assert.match(table.props.drivers[0].eta, /ETA Unavailable: GPS Tracking Lost/)
assert.equal(table.props.drivers[0].progress, 59)
assert.equal(walk(lostTree, node => node.type === 'RouteMapFrame').length, 0)
walk(banner, node => node.type === 'button')[0].props.onClick()
assert.equal(stateWrites.get(10).id, allocation.id)
assert.equal(stateWrites.get(9), true, 'urgent selection opens details modal')
assert.equal(stateWrites.get(7), 'active')
assert.equal(stateWrites.get(1), '')
assert.equal(stateWrites.get(2), 'all')
const recoveredTree = render(recovered)
assert.equal(walk(recoveredTree, node => node.props?.role === 'alert').length, 0)
assert.equal(walk(recoveredTree, node => node.type === 'DriverMonitoringTable')[0].props.drivers[0].gpsState, 'live')
assert.equal(walk(recoveredTree, node => node.type === 'DriverMonitoringTable')[0].props.drivers[0].urgent, false)
assert.equal(walk(render(noGps), node => node.type === 'DriverMonitoringTable')[0].props.drivers[0].coordinates, null)
assert.equal(walk(render(null), node => node.type === 'DriverMonitoringTable')[0].props.drivers.length, 0)
const monitoringTable = load('components/driver-monitoring-table.tsx', {
  react: { ...React, useState: () => [null, () => {}] },
})
const tableTree = monitoringTable.DriverMonitoringTable({ ...table.props, open: true })
const dataTable = walk(tableTree, node => node.type === 'DataTable')[0]
assert.equal(dataTable.props.data[0].delivery.urgent, true)
assert.match(dataTable.props.getRowClassName(dataTable.props.data[0]), /border-red-600/)
const gpsColumn = dataTable.props.columns.find(column => column.id === 'gpsLabel')
assert.match(text(gpsColumn.cell({ row: { original: dataTable.props.data[0] } })), /URGENT: GPS unavailable/)
assert.equal(walk(tableTree, node => node.type === 'DeliveryDelayHistory').length, 1)
assert.match(text(lostTree), /Active Deliveries/)
assert.match(text(lostTree), /Delayed Deliveries/)
assert.match(text(lostTree), /GPS Disconnected \/ Untrackable/)
assert.match(text(lostTree), /Completed Deliveries/)
walk(lostTree, node => node.type === 'button' && text(node).includes('Completed Deliveries'))[0].props.onClick()
assert.equal(stateWrites.get(7), 'completed')

async function backendSmoke() {
  const source = fs.readFileSync(path.join(root, 'backend/src/services/driverSafetyMonitorService.js'), 'utf8')
    .replace(/import\s+[\s\S]*?from\s*['"][^'"]+['"];\s*/g, '').replace(/export const /g, 'const ')
  const trip = { ...allocation, id: 'server-trip', status: 'in_transit', startTime: allocation.actualStartTime, estimatedDuration: 0, aiState: {} }
  let alerts = 0
  let resolved = 0
  const repository = {
    find: () => ({ populate: async () => [trip] }),
    findByIdAndUpdate: async (_, update) => {
      for (const [key, value] of Object.entries(update.$set)) trip.aiState[key.split('.')[1]] = value
    },
  }
  const dependencies = {
    DriverAllocation: repository,
    recordSeriousDeliveryDelay: async () => {},
    Notification: { updateMany: async (filter) => {
      assert.deepEqual(filter['data.entityId'].$in, [trip.id])
      resolved++
    } },
    DRIVER_AI_THRESHOLDS: { safetyMonitor: { gpsLostAfterSeconds: 300, gpsMissingAfterTripStartSeconds: 120, etaGraceMinutes: 10, etaGraceRatio: 0.25, shipmentStartGraceMinutes: 10, alertCooldownSeconds: 900 } },
    notifyDriverGpsConnectionLost: async () => { alerts++ }, notifyDriverEtaOverdue: forbidden, notifyDriverShipmentStartOverdue: forbidden,
  }
  const scan = new Function(...Object.keys(dependencies), source + '\nreturn scanDriverSafetyAlerts;')(...Object.values(dependencies))
  await scan(new Date(now)); await scan(new Date(now + 60000))
  assert.equal(alerts, 1, 'one notification per outage during repeated refreshes')
  trip.currentLocation = recovered.currentLocation
  await scan(new Date(now))
  assert.equal(trip.aiState.lastGpsLostNotifiedAt, null)
  assert.equal(resolved, 1, 'recovery resolves warnings while preserving notification history')
  await scan(new Date(now + 300000))
  assert.equal(alerts, 2, 'valid recovery rearms a later outage')
  trip.currentLocation = { latitude: 200, longitude: 121, updatedAt: new Date(now).toISOString() }
  trip.aiState.lastGpsLostNotifiedAt = null
  await scan(new Date(now))
  assert.equal(alerts, 3, 'invalid coordinates cannot masquerade as a healthy GPS fix')
  trip.currentLocation = null
  trip.startTime = new Date(now - 60000).toISOString()
  await scan(new Date(now))
  assert.ok(trip.aiState.lastGpsLostNotifiedAt, 'missing GPS is not valid recovery during the grace period')
  assert.equal(resolved, 1)
  const notifications = load('lib/notifications-data.ts', {
    '@/lib/api-client': { apiRequest: async () => [{ id: 'n1', data: { entityType: 'driver_allocation', entityId: trip.id, safetyAlertType: 'gps_connection_lost' } }] },
    '@/lib/backend-helpers': { getEntityId: record => record.id, getRelativeTime: () => 'now' },
  })
  const [notification] = await notifications.fetchNotifications('admin')
  assert.equal(notification.trackingAllocationId, trip.id)
  assert.equal(notification.priority, 'high')
  assert.equal(notifications.isUrgentTrackingNotification(notification), true)
  assert.equal(notifications.isUrgentTrackingNotification({ ...notification, resolvedAt: new Date(now).toISOString() }), false)
}

backendSmoke().then(() => console.log('Live tracking smoke passed: detection, grace period, recovery, alert visibility, driver selection, table/modal details and last-known metrics, and notification deduplication.')).catch(error => { console.error(error); process.exitCode = 1 })
