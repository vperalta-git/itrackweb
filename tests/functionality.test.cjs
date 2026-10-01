const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const ts = require('typescript')
function load(name) {
  const code = ts.transpileModule(fs.readFileSync(`${__dirname}/../lib/${name}.ts`, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText
  const module = { exports: {} }
  new Function('module', 'exports', code)(module, module.exports)
  return module.exports
}
const { getChecklistCompletion } = load('checklist-progress')
const { validTrackingPoint, remainingRouteKey, formatRemainingRouteDistance } = load('tracking-metrics')
const { createScriptLoader } = load('mapbox-script-loader')
test('checklist completion: empty, incomplete, partial, full', () => {
  for (const [items, completed, progress] of [[[], 0, 0], [[false], 0, 0], [[true, false, false], 1, 33], [[true, true], 2, 100]]) {
    assert.deepEqual(getChecklistCompletion(items.map(completed => ({ completed }))), { completed, total: items.length, progress })
  }
})
test('remaining route snapshot keys and labels preserve units and unknown values', () => {
  const start = { lat: 14.5, lng: 121 }, end = { lat: 14.6, lng: 121.2 }
  assert.equal(remainingRouteKey(start, end), '14.500000,121.000000;14.600000,121.200000')
  assert.notEqual(remainingRouteKey(start, end), remainingRouteKey(end, end))
  assert.equal(remainingRouteKey(null, end), null)
  for (const value of [null, undefined, NaN, -1]) assert.equal(formatRemainingRouteDistance(value, true), 'Distance unavailable')
  assert.equal(formatRemainingRouteDistance(38, true), '38.0 km left')
  assert.equal(formatRemainingRouteDistance(0, true), '0.0 km left')
  assert.equal(formatRemainingRouteDistance(38, false), '38.0 km dispatch route (GPS unavailable)')
  assert.equal(validTrackingPoint({ lat: NaN, lng: 121 }), null)
  assert.equal(validTrackingPoint({ lat: 91, lng: 121 }), null)
})
test('script failure resets shared promise; retries load once and reuse global', async () => {
  let script, value, appended = 0
  global.document = {
    getElementById: () => script,
    createElement: () => {
      const listeners = {}
      return { addEventListener: (name, fn) => { listeners[name] = fn }, removeEventListener: name => { delete listeners[name] }, remove: () => { script = null }, emit: name => listeners[name]() }
    },
    body: { appendChild: node => { script = node; appended++ } }
  }
  const load = createScriptLoader('map', '/map.js', () => value, 50)
  const failed = load()
  assert.equal(load(), failed)
  script.emit('error')
  await assert.rejects(failed, /Unable to load/)
  const success = load()
  value = { Map: true }
  script.emit('load')
  assert.equal(await success, value)
  assert.equal(await load(), value)
  assert.equal(appended, 2)
  delete global.document
})
test('script timeout and missing global allow retry', async () => {
  let script
  global.document = { getElementById: () => script, createElement: () => {
    const listeners = {}
    return { addEventListener: (name, fn) => { listeners[name] = fn }, removeEventListener: name => { delete listeners[name] }, remove: () => { script = null }, emit: name => listeners[name]() }
  }, body: { appendChild: node => { script = node } } }
  const load = createScriptLoader('map', '/map.js', () => undefined, 5)
  await assert.rejects(load(), /timed out/)
  const next = load()
  script.emit('load')
  await assert.rejects(next, /did not initialize/)
  delete global.document
})
