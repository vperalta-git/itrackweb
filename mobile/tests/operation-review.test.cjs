const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const React = require('react');
const root = path.resolve(__dirname, '..');
function load(file, overrides) {
  const module = { exports: {} };
  const source = ts.transpileModule(fs.readFileSync(path.join(root, file), 'utf8'), {
    fileName: file, compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText;
  new Function('require', 'module', 'exports', '__DEV__', source)(name => {
    if (Object.hasOwn(overrides, name)) return overrides[name];
    if (name === 'react' || name === 'react/jsx-runtime') return require(name);
    throw new Error(`Unexpected dependency: ${name}`);
  }, module, module.exports, false);
  return module.exports;
}
const enums = load('src/mobile/types/index.ts', {});
function elements(node, found = []) {
  if (!node || typeof node !== 'object') return found;
  if (Array.isArray(node)) { node.forEach(child => elements(child, found)); return found; }
  found.push(node); elements(node.props?.children, found); return found;
}
function hooks() {
  let index = 0;
  const state = [];
  return {
    reset() { index = 0; },
    react: { ...React,
      useState(initial) { const i = index++; if (!(i in state)) state[i] = typeof initial === 'function' ? initial() : initial; return [state[i], value => { state[i] = typeof value === 'function' ? value(state[i]) : value; }]; },
      useRef(initial) { const i = index++; return state[i] ??= { current: initial }; },
      useMemo: factory => factory(), useEffect() {},
    },
  };
}
const native = alerts => ({ Alert: { alert: (...args) => alerts.push(args) }, StyleSheet: { create: value => value }, View: 'View', Text: 'Text', TouchableOpacity: 'TouchableOpacity', ScrollView: 'ScrollView', RefreshControl: 'RefreshControl' });

test('pending stop review is visible, requires a reason, prevents duplicate submission and updates the reviewed record', async () => {
  for (const action of ['approve', 'reject']) {
    const h = hooks(), alerts = [], requests = [], prompts = [];
    let updated;
    const allocation = { id: 'trip', driverName: 'Fixture driver', status: 'in_transit', stopRequest: { status: 'pending', reason: 'Unsafe road conditions' } };
    const Card = load('src/mobile/components/TripStopRequestCard.tsx', {
      react: h.react, 'react-native': native(alerts), './Button': { Button: 'Button' },
      '../constants/theme': { useTheme: () => ({ colors: {} }) }, '../types': enums,
      '../lib/api': { getApiErrorMessage: error => error.message },
      '../lib/actionReason': { requestActionReason: async (label, options) => { prompts.push({ label, options }); return 'Safety review completed'; } },
      '../data/driver-allocation': { reviewDriverAllocationStopRequest: async (id, decision, reason) => {
        requests.push({ id, decision, reason });
        return { ...allocation, status: decision === 'approve' ? 'cancelled' : 'in_transit', stopRequest: { ...allocation.stopRequest, status: decision === 'approve' ? 'approved' : 'rejected' } };
      } },
    }).TripStopRequestCard;
    const render = props => { h.reset(); return elements(Card({ allocation, canReview: true, onReviewed: record => { updated = record; }, ...props })); };
    const buttons = render().filter(node => node.type === 'Button');
    assert.deepEqual(buttons.map(node => node.props.title), ['Approve Stop', 'Reject Stop']);
    const button = buttons[action === 'approve' ? 0 : 1];
    button.props.onPress(); button.props.onPress();
    await new Promise(setImmediate);
    assert.equal(prompts.length, 1); assert.equal(requests.length, 1);
    assert.match(prompts[0].label, /Unsafe road conditions/);
    assert.equal(prompts[0].options.confirmLabel, button.props.title, 'the same dialog collects the review reason and confirms the action');
    assert.deepEqual(requests[0], { id: 'trip', decision: action, reason: 'Safety review completed' });
    assert.equal(updated.status, action === 'approve' ? 'cancelled' : 'in_transit');
    assert.equal(render({ allocation: updated }).filter(node => node.type === 'Button').length, 0);
    assert.equal(render({ canReview: false }).filter(node => node.type === 'Button').length, 0, 'ordinary roles cannot review');
    assert.equal(render({ allocation: { ...allocation, status: 'completed' } }).filter(node => node.type === 'Button').length, 0);
    assert.equal(alerts.length, 1);
  }
});

test('canceling a stop review sends no request and shows no error', async () => {
  const h = hooks(), alerts = [];
  const Card = load('src/mobile/components/TripStopRequestCard.tsx', {
    react: h.react, 'react-native': native(alerts), './Button': { Button: 'Button' }, '../types': enums,
    '../constants/theme': { useTheme: () => ({ colors: {} }) }, '../lib/api': { getApiErrorMessage: error => error.message },
    '../lib/actionReason': { requestActionReason: async () => null },
    '../data/driver-allocation': { reviewDriverAllocationStopRequest: () => assert.fail('Cancelled review must not reach the API') },
  }).TripStopRequestCard;
  h.reset();
  elements(Card({ allocation: { id: 'trip', status: 'in_transit', stopRequest: { status: 'pending', reason: 'Fixture' } }, canReview: true })).find(node => node.type === 'Button').props.onPress();
  await new Promise(setImmediate);
  assert.deepEqual(alerts, []);
});

test('mobile deletion carries one encoded audit reason, preserves linked records on server rejection and never reprompts in the interceptor', async () => {
  const axios = require('axios');
  const client = load('src/mobile/lib/api.ts', {
    axios, 'expo-constants': { expoConfig: { extra: { apiUrl: 'https://fixture.example.test/api' } } }, 'react-native': { Platform: { OS: 'android' } },
    './actionReason': { requestActionReason: () => assert.fail('Deletion already collected its reason') },
  });
  const rows = [{ id: 'unit', unitName: 'Fixture', status: 'available', createdAt: '2026-10-26T00:00:00Z' }];
  let blocked = true, deletes = 0;
  client.api.defaults.adapter = async config => {
    if (config.method === 'delete') {
      deletes++;
      assert.equal(decodeURIComponent(config.headers.get('X-Action-Reason')), 'Duplicate stock — checked');
      if (blocked) throw new axios.AxiosError('Request failed with status code 409', 'ERR_BAD_REQUEST', config, null, { status: 409, data: { message: 'This vehicle has allocation, shipment, preparation, or booking history and cannot be deleted.' } });
    }
    return { config, status: 200, statusText: 'OK', headers: {}, data: { data: rows } };
  };
  const stock = load('src/mobile/data/vehicle-stocks.ts', {
    '../types': enums, '../constants/theme': { theme: { colors: {} } }, '../lib/api': client,
    './shared': { toDate: value => new Date(value) },
  });
  await stock.loadVehicleStocks();
  for (const reason of ['', 'abc', 'x'.repeat(1001)]) await assert.rejects(stock.deleteVehicleStock('unit', reason), /5 and 1000/);
  assert.equal(deletes, 0);
  await assert.rejects(stock.deleteVehicleStock('unit', '  Duplicate stock — checked  '), error => {
    assert.match(client.getApiErrorMessage(error), /history and cannot be deleted/); return true;
  });
  assert.equal(stock.getVehicleStocks().length, 1, 'a protected stock record remains visible');
  blocked = false;
  await stock.deleteVehicleStock('unit', 'Duplicate stock — checked');
  assert.equal(stock.getVehicleStocks().length, 0);
  assert.equal(deletes, 2);
});

test('vehicle detail cancellation is silent and successful deletion passes the same reason to the API', async () => {
  for (const reason of [null, 'Duplicate stock entry']) {
    const h = hooks(), alerts = [], requests = [], prompts = [];
    const vehicle = { id: 'unit', unitName: 'Isuzu D-Max', variation: 'Fixture', conductionNumber: 'FIX123', status: 'available', createdAt: new Date() };
    const Page = load('app/(tabs)/(admin)/vehicle-detail.tsx', {
      react: h.react, 'react-native': native(alerts), '@expo/vector-icons': { Ionicons: 'Ionicons' },
      'expo-router': { useRouter: () => ({ dismiss() {} }), useNavigation: () => ({}), useLocalSearchParams: () => ({ vehicleId: 'unit' }) },
      '@/src/mobile/components': new Proxy({}, { get: (_, name) => name }), '@/src/mobile/context/AuthContext': { useAuth: () => ({ user: { role: 'admin' } }) },
      '@/src/mobile/constants/theme': { theme: { colors: {}, spacing: {}, radius: {}, fonts: { family: {} } } },
      '@/src/mobile/navigation/access': { getModuleAccess: () => ({ canDelete: true }) }, '@/src/mobile/types': enums,
      '@/src/mobile/data/vehicle-stocks': { findVehicleStockById: () => vehicle, formatVehicleCreatedDate: () => '', formatVehicleStatusLabel: () => '', formatVehicleStockReference: () => '', getVehicleStatusBadgeStatus: () => '', deleteVehicleStock: async (...args) => requests.push(args) },
      '@/src/mobile/utils/shareExport': {}, '@/src/mobile/lib/api': { getApiErrorMessage: error => error.message },
      '@/src/mobile/lib/actionReason': { requestActionReason: async (label, options) => { prompts.push(options); return reason; } },
    }).default;
    h.reset();
    const tree = elements(Page());
    const deletion = tree.find(node => node.type === 'TouchableOpacity' && elements(node).some(child => child.type === 'Text' && child.props.children === 'Delete Vehicle'));
    assert.ok(deletion);
    await deletion.props.onPress();
    assert.equal(prompts[0].confirmLabel, 'Delete');
    assert.deepEqual(requests, reason ? [['unit', reason]] : []);
    assert.equal(alerts.length, reason ? 1 : 0);
  }
});

test('a successful stop review updates the shared allocation cache even when the stock refresh fails', async () => {
  const requests = [], updates = [];
  const record = {
    id: 'trip', status: 'cancelled', createdAt: '2026-10-26T00:00:00Z',
    stopRequest: { status: 'approved', reason: 'Safety concern', reviewNotes: 'Contacted driver and approved' },
    vehicleId: { id: 'unit' }, driverId: { id: 'driver' },
    pickupLocation: { name: 'Pickup', address: 'A', latitude: 14.5, longitude: 121 },
    destinationLocation: { name: 'Destination', address: 'B', latitude: 14.6, longitude: 121.1 },
  };
  const allocation = load('src/mobile/data/driver-allocation.ts', {
    '../types': enums, '../constants/theme': { theme: { colors: {} } },
    '../lib/api': { api: { patch: async (url, payload) => { requests.push({ url, payload }); return { data: record }; } }, getResponseData: response => response.data },
    './users': { getUserManagementRecords: () => [] },
    './vehicle-stocks': { getVehicleStocks: () => [], loadVehicleStocks: async () => { throw new Error('Fixture stock refresh unavailable'); } },
    './unit-agent-allocation': {}, './shared': { toDate: value => value ? new Date(value) : null },
  });
  allocation.subscribeDriverAllocations(() => updates.push(allocation.getDriverAllocations()[0]));
  const saved = await allocation.reviewDriverAllocationStopRequest('trip', 'approve', 'Contacted driver and approved');
  await new Promise(setImmediate);
  assert.deepEqual(requests, [{ url: '/driver-allocations/trip/stop-request', payload: { action: 'approve', reviewNotes: 'Contacted driver and approved' } }]);
  assert.equal(saved.status, 'cancelled');
  assert.equal(updates.length, 1);
  assert.equal(updates[0].stopRequest.status, 'approved');
  assert.equal(updates[0].stopRequest.reviewNotes, 'Contacted driver and approved');
});
