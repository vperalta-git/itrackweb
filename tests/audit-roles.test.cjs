const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')

const labels = { admin: 'Administrator', supervisor: 'Supervisor', manager: 'Manager', 'sales-agent': 'Sales Agent', dispatch: 'Dispatch', driver: 'Driver' }
function fixture(session = null, request = async () => []) {
  const storage = new Map()
  const events = []
  const module = { exports: {} }
  const source = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../lib/audit-log.ts'), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText
  new Function('require', 'module', 'exports', 'window', source)((name) => {
    if (name === '@/lib/session') return { getSessionUser: () => session, getRoleLabel: role => labels[role] }
    if (name === '@/lib/api-client') return { apiRequest: request }
    throw new Error(`Unexpected dependency ${name}`)
  }, module, module.exports, {
    localStorage: { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value) },
    dispatchEvent: event => events.push(event.type),
  })
  return { audit: module.exports, storage, events }
}
const oldLog = { id: 'old-1', user: 'Vionne Ulrich Peralta', action: 'UPDATE', module: 'Preparation', description: 'Marked vehicle as ready for release.', timestamp: '2026-04-23T03:35:00Z' }
const historical = { userId: 'original-account', name: oldLog.user, email: 'owner@example.test', role: 'admin', recordedAt: '2026-04-23T02:00:00Z' }

test('legacy actor names recover roles from normalized current names, historical login aliases and deleted accounts', () => {
  const { audit } = fixture()
  const renamed = { id: historical.userId, firstName: 'Vionne', lastName: 'Peralta', email: historical.email, role: 'admin', avatarUrl: '/avatar.png' }
  const actor = audit.resolveAuditActor(oldLog, [renamed], [historical])
  assert.equal(actor.role, 'Administrator')
  assert.equal(actor.userId, historical.userId)
  assert.equal(actor.userEmail, historical.email)
  assert.equal(actor.userAvatarUrl, renamed.avatarUrl)
  assert.equal(audit.resolveAuditActor(oldLog, [], [historical]).role, 'Administrator')
  assert.equal(audit.resolveAuditActor({ ...oldLog, user: '  VIONNE   ULRICH  PERALTA  ' }, [], [historical]).role, 'Administrator')
  assert.equal(audit.resolveAuditActor(oldLog, [{ ...renamed, firstName: ' Vionne  Ulrich ', lastName: ' Peralta ' }]).role, 'Administrator')
  for (const [input, expected] of [['Administrator', 'admin'], [' Admin ', 'admin'], ['Sales Agent', 'sales-agent'], ['sales_agent', 'sales-agent'], ['Dispatcher', 'dispatch']]) {
    assert.equal(audit.normalizeAuditRole(input), expected)
  }
})

test('captured and historical roles survive later changes; ambiguous accounts cannot inherit the viewing admin role', () => {
  const viewer = { id: 'viewer', firstName: 'P', lastName: 'M', email: 'viewer@example.test', role: 'admin' }
  const { audit } = fixture(viewer)
  const later = { ...historical, role: 'sales_agent', recordedAt: '2026-05-01T00:00:00Z' }
  assert.equal(audit.resolveAuditActor(oldLog, [], [historical, later]).role, 'Administrator')
  assert.equal(audit.resolveAuditActor({ ...oldLog, role: 'manager' }, [], [historical, later]).role, 'Manager')
  const ambiguous = { ...historical, userId: 'another-account', email: 'other@example.test', role: 'driver' }
  assert.equal(audit.resolveAuditActor(oldLog, [], [historical, ambiguous]).roleKey, undefined)
  assert.equal(audit.resolveAuditActor({ ...oldLog, user: 'Unmatched Person' }, []).role, 'Role not recorded')
  assert.equal(audit.resolveAuditActor({ ...oldLog, userId: 'deleted-account' }, [viewer]).roleKey, undefined)
})

test('recovered legacy identity is persisted without modifying event history and new events normalize backend roles', () => {
  const { audit, storage, events } = fixture()
  storage.set(audit.STORAGE_KEY, JSON.stringify([oldLog]))
  const repaired = audit.repairStoredAuditActors([], [historical])
  assert.equal(repaired[0].role, 'admin')
  assert.equal(repaired[0].userId, historical.userId)
  assert.equal(repaired[0].timestamp, oldLog.timestamp)
  assert.equal(repaired[0].description, oldLog.description)
  assert.equal(audit.resolveAuditActor(audit.getStoredAuditLogs()[0], []).role, 'Administrator')
  audit.repairStoredAuditActors([], [])
  assert.deepEqual(events, [audit.AUDIT_LOG_UPDATED_EVENT], 'already repaired logs must not cause refresh loops')
  const logged = fixture({ id: 'agent', firstName: 'Sales', lastName: 'Agent', email: 'agent@example.test', backendRole: 'sales_agent' })
  logged.audit.logAuditEvent({ user: 'Sales Agent', action: 'CREATE', module: 'Preparation', description: 'Created preparation.' })
  assert.equal(logged.audit.getStoredAuditLogs()[0].role, 'sales-agent')
})

test('existing authentication and deleted-user APIs supply role history independently', async () => {
  const { audit } = fixture(null, async (route) => {
    if (route === '/auth/events') throw new Error('Temporarily unavailable')
    assert.equal(route, '/users/audit-events')
    return [{ deletedUserId: historical.userId, name: historical.name, email: historical.email, role: 'admin', createdAt: '2026-05-01T00:00:00Z' }]
  })
  const history = await audit.fetchAuditActorHistory()
  assert.equal(history[0].userId, historical.userId)
  assert.equal(audit.resolveAuditActor(oldLog, [], history).role, 'Administrator')
})
