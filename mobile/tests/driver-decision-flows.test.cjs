const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const React = require('react');
const root = path.resolve(__dirname, '..');
function load(file, overrides = {}) {
  const module = { exports: {} };
  const source = ts.transpileModule(fs.readFileSync(path.join(root, file), 'utf8'), {
    fileName: file, compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText;
  new Function('require', 'module', 'exports', source)(name => {
    if (Object.hasOwn(overrides, name)) return overrides[name];
    if (name === 'react' || name === 'react/jsx-runtime') return require(name);
    throw new Error(`Unexpected dependency: ${name}`);
  }, module, module.exports);
  return module.exports;
}
const enums = load('src/mobile/types/index.ts');
function elements(node, found = []) {
  if (!node || typeof node !== 'object') return found;
  if (Array.isArray(node)) { node.forEach(child => elements(child, found)); return found; }
  found.push(node); elements(node.props?.children, found); return found;
}
function hooks() {
  const state = [];
  let index = 0;
  return { reset: () => { index = 0; }, react: { ...React,
    useState(initial) { const i = index++; if (!(i in state)) state[i] = typeof initial === 'function' ? initial() : initial; return [state[i], value => { state[i] = typeof value === 'function' ? value(state[i]) : value; }]; },
    useRef(initial) { const i = index++; return state[i] ??= { current: initial }; },
    useMemo: factory => factory(), useCallback: callback => callback,
  } };
}
function dashboard({ status = 'in_transit', reason = 'Engine overheated while on the road', withinRadius = false } = {}) {
  const h = hooks(), alerts = [], requests = [], prompts = [], lifecycle = [];
  let stored = { id: 'trip', driverId: 'driver', driverName: 'Fixture Driver', unitName: 'Isuzu NMR', status, stopRequest: { status: 'none' }, rejectionRequest: { status: 'none' } };
  const api = {
    getDriverAllocationDashboardRecord: () => ['pending', 'assigned', 'in_transit'].includes(stored.status) ? stored : null,
    findDriverAllocationLocation: () => null, getDriverAllocationLiveLocation: () => null,
    getDriverAllocationInitialRegion: () => ({ latitude: 14.5, longitude: 121, latitudeDelta: 0.1, longitudeDelta: 0.1 }),
    getDriverAllocationRoute: () => [], getDriverAllocationRemainingDistanceMeters: () => 10000,
    getDriverAllocationDestinationRadiusMeters: () => withinRadius ? 100 : 10000,
    canDriverCompleteAllocationTrip: () => withinRadius, formatDriverAllocationEta: () => '15 mins',
    notifyDriverAllocationCompletionRequest: () => assert.fail('Notify Admin/Supervisor must request cancellation, not completion'),
    requestDriverAllocationStop: async (id, value) => { requests.push({ type: 'stop', id, reason: value }); stored = { ...stored, stopRequest: { status: 'pending', reason: value } }; return stored; },
    requestDriverAllocationRejection: async (id, value) => { requests.push({ type: 'rejection', id, reason: value }); stored = { ...stored, rejectionRequest: { status: 'pending', reason: value } }; return stored; },
    acceptDriverAllocation: async () => { lifecycle.push('accept'); stored = { ...stored, status: 'assigned' }; },
    startDriverAllocationTrip: async () => { lifecycle.push('start'); stored = { ...stored, status: 'in_transit' }; },
    completeDriverAllocationTrip: async () => { lifecycle.push('complete'); stored = { ...stored, status: 'completed' }; },
  };
  const Page = load('app/(tabs)/(driver)/dashboard.tsx', {
    react: h.react, 'expo-router': { useFocusEffect() {} },
    'react-native': { AppState: {}, Alert: { alert: (...args) => alerts.push(args) }, View: 'View', Text: 'Text', SafeAreaView: 'SafeAreaView', StyleSheet: { create: value => value } },
    '@expo/vector-icons': { Ionicons: 'Ionicons' }, '@/src/mobile/components': new Proxy({}, { get: (_, name) => name }),
    '@/src/mobile/components/TripStopRequestCard': { DriverRequestReviewCard: 'DriverRequestReviewCard' },
    '@/src/mobile/constants/theme': { theme: { colors: {}, spacing: {}, radius: {}, shadows: {}, fonts: { family: {} } } },
    '@/src/mobile/context/AuthContext': { useAuth: () => ({ user: { id: 'driver', name: 'Fixture Driver' } }) },
    '@/src/mobile/types': enums, '@/src/mobile/data/driver-allocation': api,
    '@/src/mobile/hooks': { useDriverAllocationLiveRouteMetrics: () => ({ distanceKm: 10, etaLabel: '15 mins' }), useDriverRealtimeLocation: () => ({ currentLocation: null, trackingStatus: 'tracking' }) },
    '@/src/mobile/lib/actionReason': { requestActionReason: async (label, options) => { prompts.push({ label, options }); return reason; } },
    '@/src/mobile/lib/api': { getApiErrorMessage: error => error.message },
  }).default;
  const render = () => { h.reset(); return elements(Page()); };
  const button = title => render().find(node => node.type === 'Button' && node.props.title === title);
  const review = (type, approved) => { const field = type === 'stop' ? 'stopRequest' : 'rejectionRequest'; stored = { ...stored, status: approved ? 'cancelled' : stored.status, [field]: { ...stored[field], status: approved ? 'approved' : 'rejected', reviewNotes: approved ? 'Approved by supervisor' : 'Admin arranged assistance; continue' } }; };
  return { render, button, review, get record() { return stored; }, requests, prompts, alerts, lifecycle };
}

test('the actual Notify Admin/Supervisor button requests reasoned cancellation and never completes the trip', async () => {
  for (const withinRadius of [false, true]) {
    const screen = dashboard({ withinRadius });
    const notify = screen.button('Notify Admin/Supervisor');
    assert.ok(notify, 'cancellation is available anywhere on the delivery route');
    const pending = notify.props.onPress();
    await notify.props.onPress();
    await pending;
    assert.equal(screen.prompts.length, 1, 'rapid taps open one reason dialog');
    assert.equal(screen.prompts[0].options.confirmLabel, 'Submit Cancellation Request');
    assert.deepEqual(screen.requests, [{ type: 'stop', id: 'trip', reason: 'Engine overheated while on the road' }]);
    assert.equal(screen.record.status, 'in_transit', 'sending the request must not cancel or complete the trip');
    assert.equal(screen.button('Cancellation Approval Pending').props.disabled, true);
    if (withinRadius) { const end = screen.button('End Trip'); assert.equal(end.props.disabled, true); await end.props.onPress(); }
    assert.deepEqual(screen.lifecycle, []);
    assert.equal(screen.alerts.length, 1, 'one submission result, without a second confirmation alert');
    screen.review('stop', false);
    assert.ok(screen.button('Notify Admin/Supervisor'));
    assert.equal(screen.record.status, 'in_transit');
    screen.review('stop', true);
    assert.equal(screen.button('Notify Admin/Supervisor'), undefined);
    assert.equal(screen.record.status, 'cancelled');
  }
});

test('Reject Booking before acceptance stays pending until review, prevents acceptance, and denial restores acceptance', async () => {
  const screen = dashboard({ status: 'pending', reason: 'Unable to take the scheduled delivery' });
  await screen.button('Reject Booking').props.onPress();
  assert.deepEqual(screen.requests, [{ type: 'rejection', id: 'trip', reason: 'Unable to take the scheduled delivery' }]);
  assert.equal(screen.prompts[0].options.confirmLabel, 'Submit Rejection Request');
  assert.equal(screen.record.status, 'pending');
  assert.equal(screen.button('Rejection Approval Pending').props.disabled, true);
  const accept = screen.button('Accept Booking');
  assert.equal(accept.props.disabled, true);
  await accept.props.onPress();
  assert.deepEqual(screen.lifecycle, []);
  screen.review('rejection', false);
  assert.equal(screen.button('Accept Booking').props.disabled, false);
  await screen.button('Accept Booking').props.onPress();
  assert.deepEqual(screen.lifecycle, ['accept']);
  assert.equal(screen.record.status, 'assigned');
});

test('approved rejection removes the booking only after review; dismissing either reason prompt submits nothing', async () => {
  const rejection = dashboard({ status: 'pending' });
  await rejection.button('Reject Booking').props.onPress();
  assert.equal(rejection.record.status, 'pending');
  rejection.review('rejection', true);
  assert.equal(rejection.record.status, 'cancelled');
  assert.equal(rejection.button('Accept Booking'), undefined);
  for (const [status, title] of [['pending', 'Reject Booking'], ['in_transit', 'Notify Admin/Supervisor']]) {
    const screen = dashboard({ status, reason: null });
    await screen.button(title).props.onPress();
    assert.deepEqual(screen.requests, []); assert.deepEqual(screen.alerts, []);
    assert.equal(screen.record.status, status);
  }
});

test('admin review card approves or denies booking rejection using the rejection endpoint and required review notes', async () => {
  for (const approved of [true, false]) {
    const h = hooks(), requests = [];
    let updated;
    const allocation = { id: 'trip', driverName: 'Fixture Driver', status: 'pending', rejectionRequest: { status: 'pending', reason: 'Driver is unavailable for this schedule' } };
    const Card = load('src/mobile/components/TripStopRequestCard.tsx', {
      react: h.react, 'react-native': { Alert: { alert() {} }, StyleSheet: { create: value => value }, View: 'View', Text: 'Text' },
      './Button': { Button: 'Button' }, '../types': enums, '../constants/theme': { useTheme: () => ({ colors: {} }) },
      '../lib/actionReason': { requestActionReason: async () => 'Reviewed with the driver' }, '../lib/api': { getApiErrorMessage: error => error.message },
      '../data/driver-allocation': { reviewDriverAllocationStopRequest: () => assert.fail('Wrong request endpoint'), reviewDriverAllocationRejection: async (id, action, notes) => { requests.push({ id, action, notes }); return { ...allocation, status: action === 'approve' ? 'cancelled' : 'pending', rejectionRequest: { ...allocation.rejectionRequest, status: action === 'approve' ? 'approved' : 'rejected' } }; } },
    }).DriverRequestReviewCard;
    h.reset();
    const tree = elements(Card({ allocation, requestType: 'rejection', canReview: true, onReviewed: value => { updated = value; } }));
    const button = tree.find(node => node.type === 'Button' && node.props.title === (approved ? 'Approve Rejection' : 'Deny Rejection'));
    assert.ok(button); button.props.onPress(); await new Promise(setImmediate);
    assert.deepEqual(requests, [{ id: 'trip', action: approved ? 'approve' : 'reject', notes: 'Reviewed with the driver' }]);
    assert.equal(updated.status, approved ? 'cancelled' : 'pending');
    h.reset();
    assert.equal(elements(Card({ allocation, requestType: 'rejection', canReview: false })).filter(node => node.type === 'Button').length, 0);
  }
});
