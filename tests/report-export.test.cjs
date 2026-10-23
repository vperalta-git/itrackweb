const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')

const root = path.resolve(__dirname, '..')
const sessionUser = { firstName: 'Ana', lastName: '<Tester>', email: 'fixture@example.test' }

function createLoader(overrides = {}) {
  const cache = new Map()
  function load(relative) {
    const filename = path.join(root, relative)
    if (cache.has(filename)) return cache.get(filename).exports
    const module = { exports: {} }
    cache.set(filename, module)
    const source = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
    }).outputText
    new Function('require', 'module', 'exports', source)((name) => {
      if (Object.hasOwn(overrides, name)) return overrides[name]
      if (name === '@/lib/session') return {
        getSessionUser: () => sessionUser,
        getSessionUserFullName: (user) => `${user.firstName} ${user.lastName}`,
      }
      if (name === '@/lib/api-client') return { apiRequest: () => { throw new Error('Network calls are forbidden in report fixtures') } }
      if (name.endsWith('.png')) return { default: { src: '/fixture-logo.png' } }
      if (name.startsWith('@/components/') || name === 'lucide-react' || name === 'recharts') {
        return new Proxy({}, { get: (_, key) => key })
      }
      if (name.startsWith('@/')) return load(name.slice(2) + '.ts')
      return require(name)
    }, module, module.exports)
    return module.exports
  }
  return load
}

test('shared print helper prints escaped preparation metadata, selected filters, and A4 page rules after saving the export audit', async () => {
  const originalWindow = global.window
  const originalDocument = global.document
  let html = ''
  let prints = 0
  const audits = []
  const frame = {
    style: {}, setAttribute() {}, remove() {},
    contentDocument: { readyState: 'complete' },
    contentWindow: {
      document: { images: [], open() {}, close() {}, write(value) { html = value } },
      focus() {}, print() { assert.equal(audits.length, prints + 1); prints += 1 },
    },
  }
  global.window = { setTimeout: () => 0 }
  global.document = { createElement: () => frame, body: { appendChild() {} } }
  try {
    const { exportPdfReport } = createLoader({
      sonner: { toast: { error: (message) => assert.fail(message) } },
      '@/lib/api-client': { apiRequest: async (url, options) => {
        assert.equal(url, '/audit-events'); assert.equal(options.body.action, 'EXPORT'); audits.push(options.body)
      } },
    })('lib/export-pdf.ts')
    for (const layout of ['table', 'cards']) {
      exportPdfReport({
        title: 'Fixture <report>', subtitle: 'Year: 2026; Model: Truck & Bus', layout,
        columns: [{ header: 'Vehicle', value: (row) => row.label }],
        rows: Array.from({ length: 45 }, (_, index) => ({ label: `Unit ${index + 1} <safe>` })),
      })
      await new Promise(setImmediate)
      assert.match(html, /Prepared by:<\/strong> Ana &lt;Tester&gt;/)
      assert.match(html, /Date prepared:<\/strong>/)
      assert.match(html, /Time prepared:<\/strong>/)
      assert.ok(html.includes(Intl.DateTimeFormat().resolvedOptions().timeZone))
      assert.match(html, /Fixture &lt;report&gt;/)
      assert.match(html, /Year: 2026; Model: Truck &amp; Bus/)
      assert.match(html, /Unit 45 &lt;safe&gt;/)
      assert.match(html, /size: A4/)
      assert.match(html, /display: table-header-group/)
      assert.match(html, /break-inside: avoid/)
      assert.doesNotMatch(html, /Audit trail:/)
    }
    assert.equal(prints, 2)
    assert.equal(audits.length, 2)
  } finally {
    global.window = originalWindow
    global.document = originalDocument
  }
})

function fixtureSnapshot() {
  const snapshot = { users: [], vehicles: [], unitAllocations: [], driverAllocations: [], preparations: [], testDriveBookings: [] }
  for (let index = 1; index <= 7; index += 1) {
    const agent = { id: `agent-${index}`, firstName: `Agent${index}`, lastName: 'Fixture' }
    for (const released of [false, true]) {
      const id = `${released ? 'released' : 'stock'}-${index}`
      const vehicle = {
        id, unitName: 'Isuzu Truck', variation: `Variant ${index}`, conductionNumber: id,
        status: released ? 'completed' : 'available', createdAt: '2025-01-01T08:00:00.000Z',
      }
      snapshot.vehicles.push(vehicle)
      snapshot.unitAllocations.push({ id: `allocation-${id}`, vehicleId: vehicle, salesAgentId: agent, status: released ? 'completed' : 'assigned', createdAt: '2026-01-01T08:00:00.000Z' })
      if (released) snapshot.preparations.push({
        id: `preparation-${id}`, vehicleId: vehicle, status: 'completed', approvalStatus: 'approved',
        createdAt: '2026-01-01T08:00:00.000Z', readyForReleaseAt: '2026-01-02T08:00:00.000Z', completedAt: '2026-01-03T08:00:00.000Z',
      })
    }
  }
  const stock = snapshot.vehicles[0]
  snapshot.preparations.push({ id: 'ready-only', vehicleId: stock, status: 'ready_for_release', approvalStatus: 'approved', readyForReleaseAt: '2026-01-02T08:00:00.000Z' })
  snapshot.preparations.push({ id: 'legacy-checklist', vehicleId: snapshot.vehicles[2], status: 'completed', approvalStatus: 'approved', completedAt: '2026-01-02T08:00:00.000Z' })
  const otherVehicle = { id: 'wrong-model', unitName: 'Other Model', conductionNumber: 'wrong-model', createdAt: '2026-01-01T08:00:00.000Z' }
  snapshot.vehicles.push(otherVehicle)
  snapshot.unitAllocations.push({ id: 'wrong-model-allocation', vehicleId: otherVehicle, createdAt: '2026-01-01T08:00:00.000Z' })
  snapshot.unitAllocations.push({ id: 'wrong-year-allocation', vehicleId: stock, createdAt: '2025-01-01T08:00:00.000Z' })
  snapshot.preparations.push({ id: 'wrong-year-release', vehicleId: snapshot.vehicles[1], status: 'completed', approvalStatus: 'approved', readyForReleaseAt: '2025-01-01T08:00:00.000Z', completedAt: '2025-01-02T08:00:00.000Z' })
  return snapshot
}

test('release reports distinguish readiness and legacy checklist completion from release, and use actual completion time', () => {
  const { deriveReleaseHistoryRecords, deriveReportsDashboardData } = createLoader()('lib/report-data.ts')
  const snapshot = fixtureSnapshot()
  const records = deriveReleaseHistoryRecords(snapshot)
  assert.equal(records.find((record) => record.id === 'VH-ready-only').status, 'ready-for-pickup')
  assert.equal(records.find((record) => record.id === 'VH-ready-only').releasedAt, 'Not released')
  assert.equal(records.find((record) => record.id === 'VH-legacy-checklist').status, 'ready-for-pickup')
  const released = records.find((record) => record.id === 'VH-preparation-released-1')
  assert.equal(released.status, 'released')
  assert.equal(released.vehicleId, 'released-1')
  assert.equal(released.releasedAtIso, '2026-01-03T08:00:00.000Z')
  const dashboard = deriveReportsDashboardData(snapshot)
  assert.equal(dashboard.currentInventory, 8)
  assert.equal(dashboard.currentInventoryAvailable, 6)
  assert.equal(dashboard.inventoryByModel.reduce((sum, row) => sum + row.count, 0), 8)
})

test('analytics export button exports full selected report beyond top five and excludes other filters and released stock', () => {
  const snapshot = fixtureSnapshot()
  const state = [snapshot, '2026', 'isuzu-truck', null]
  let options
  const load = createLoader({
    react: { useState: () => [state.shift(), () => {}], useMemo: (factory) => factory(), useEffect() {} },
    '@/lib/export-pdf': { exportPdfReport: (value) => { options = value } },
  })
  const page = load('app/(dashboard)/reports/vehicles/page.tsx').default()
  const elements = []
  function visit(element) {
    if (!element || typeof element !== 'object') return
    if (Array.isArray(element)) return element.forEach(visit)
    elements.push(element)
    visit(element.props?.children)
  }
  visit(page)
  const exportButton = elements.find((element) => element.type === 'Button' && element.props.onClick)
  assert.ok(exportButton)
  assert.equal(exportButton.props.disabled, false)
  exportButton.props.onClick()
  assert.match(options.subtitle, /Year: 2026; Model: Isuzu Truck/)
  assert.equal(options.rows.find((row) => row.item === 'Current stock').value, '7')
  assert.equal(options.rows.find((row) => row.item === 'Vehicles released').value, '7')
  assert.equal(options.rows.find((row) => row.item === 'Total allocations').value, '14')
  assert.equal(options.rows.filter((row) => row.section === 'Agent performance').length, 7)
  assert.equal(options.rows.filter((row) => row.section === 'Units released by model').length, 7)
  assert.equal(options.rows.filter((row) => row.section === 'Release detail').length, 7)
  assert.equal(options.rows.filter((row) => row.section === 'Current stock detail').length, 7)
  assert.ok(options.rows.some((row) => row.item === 'Agent7 Fixture'))
  assert.doesNotMatch(JSON.stringify(options.rows), /Other Model|wrong-model|wrong-year-allocation/)
})
