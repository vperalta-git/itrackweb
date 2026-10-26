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
    fileName: file,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText;
  new Function('require', 'module', 'exports', source)(name => {
    if (Object.hasOwn(overrides, name)) return overrides[name];
    if (name === 'react' || name === 'react/jsx-runtime') return require(name);
    throw new Error(`Unexpected dependency: ${name}`);
  }, module, module.exports);
  return module.exports;
}

function elements(node, found = []) {
  if (!node || typeof node !== 'object') return found;
  if (Array.isArray(node)) { node.forEach(child => elements(child, found)); return found; }
  found.push(node);
  elements(node.props?.children, found);
  return found;
}

function harness({ editable = null, save = async () => ({ unitName: 'Fixture unit', driverName: 'Fixture driver', status: 'pending' }) } = {}) {
  const hooks = [], effects = [], alerts = [], calls = [];
  let index = 0, dirty = false, tree;
  const changed = (before, after) => !before || after.some((value, i) => !Object.is(value, before[i]));
  const hooksReact = {
    ...React,
    useState(initial) {
      const i = index++;
      if (!(i in hooks)) hooks[i] = typeof initial === 'function' ? initial() : initial;
      return [hooks[i], value => {
        const next = typeof value === 'function' ? value(hooks[i]) : value;
        if (!Object.is(next, hooks[i])) { hooks[i] = next; dirty = true; }
      }];
    },
    useRef(initial) { const i = index++; return hooks[i] ??= { current: initial }; },
    useMemo(factory, deps) {
      const i = index++;
      if (!hooks[i] || changed(hooks[i].deps, deps)) hooks[i] = { deps, value: factory() };
      return hooks[i].value;
    },
    useEffect(effect, deps) {
      const i = index++;
      if (!hooks[i] || changed(hooks[i].deps, deps)) {
        hooks[i]?.cleanup?.();
        hooks[i] = { deps };
        effects.push(() => { hooks[i].cleanup = effect(); });
      }
    },
  };
  const locations = [
    { value: 'pickup', label: 'Stockyard', hint: 'Pickup address', location: { latitude: 14.5, longitude: 121 } },
    { value: 'destination', label: 'Dealership', hint: 'Delivery address', location: { latitude: 14.6, longitude: 121.1 } },
  ];
  const navigation = { addListener: () => () => {}, dispatch() {} };
  const theme = { colors: {}, spacing: {}, radius: {}, fonts: { family: { sans: 'system' } } };
  const Page = load('app/(tabs)/(admin)/driver-allocation-form.tsx', {
    react: hooksReact,
    'react-native': { Alert: { alert: (...args) => alerts.push(args) }, StyleSheet: { create: styles => styles }, Text: 'Text', View: 'View', TouchableOpacity: 'TouchableOpacity' },
    '@expo/vector-icons': { Ionicons: 'Ionicons' },
    'expo-router': { router: { dismiss() {} }, useNavigation: () => navigation, useLocalSearchParams: () => editable ? { mode: 'edit', allocationId: editable.id } : {} },
    'react-native-date-picker': 'DatePicker',
    '@/src/mobile/components': new Proxy({}, { get: (_, name) => name }),
    '@/src/mobile/constants/theme': { useTheme: () => theme },
    '@/src/mobile/data/driver-allocation': {
      DRIVER_ALLOCATION_LOCATION_OPTIONS: locations,
      findDriverAllocationRecord: () => editable,
      findDriverAllocationUnit: id => id ? { conductionNumber: 'FIX123' } : null,
      findDriverAllocationDriver: id => id ? { phone: '09123456789' } : null,
      findDriverAllocationLocation: id => locations.find(location => location.value === id),
      getSelectableUnitOptions: () => [{ value: 'unit', label: 'Fixture unit' }],
      getSelectableDriverOptions: () => [{ value: 'driver', label: 'Fixture driver' }],
      loadDriverAllocations: async () => {},
      registerDriverAllocationLocationOptions() {},
      formatDriverAllocationStatusLabel: value => value,
      saveDriverAllocation: async input => { calls.push(input); return save(input); },
    },
    '@/src/mobile/utils/mapboxGeocoding': { reverseGeocodeMapboxLocation: async point => locations.find(location => location.location.latitude === point.latitude), searchMapboxAddresses: async () => [] },
  }).default;
  function render() {
    for (let pass = 0; pass < 20; pass++) {
      index = 0; dirty = false; tree = elements(Page());
      while (effects.length) effects.shift()();
      if (!dirty) return tree;
    }
    assert.fail('Form did not settle');
  }
  const find = (type, match = () => true) => render().find(node => node.type === type && match(node.props));
  const picker = () => find('DatePicker');
  const submit = () => find('Button', props => ['Add Allocation', 'Save Changes'].includes(props.title));
  async function complete() {
    find('Select', props => props.label === 'Select Unit *').props.onValueChange('unit');
    find('Select', props => props.label === 'Select Driver *').props.onValueChange('driver');
    await find('MapViewComponent').props.onMapPress(locations[0].location);
    await find('MapViewComponent').props.onMapPress(locations[1].location);
    render();
  }
  return { render, find, picker, submit, complete, alerts, calls };
}

test('new allocation uses the selected Date directly, and cancel keeps the existing schedule', async () => {
  const form = harness();
  const initial = form.picker().props.date;
  assert.ok(initial instanceof Date && !Number.isNaN(initial.getTime()));
  form.find('TouchableOpacity', props => props.accessibilityLabel === 'Select shipment date and time').props.onPress();
  assert.equal(form.picker().props.open, true);
  form.picker().props.onCancel();
  assert.equal(form.picker().props.open, false);
  assert.equal(form.picker().props.date.getTime(), initial.getTime());
  const selected = new Date('2026-10-28T15:45:00+08:00');
  form.picker().props.onConfirm(selected);
  assert.equal(form.picker().props.open, false);
  await form.complete();
  await form.submit().props.onPress();
  assert.equal(form.calls.length, 1);
  assert.equal(form.calls[0].scheduledShipmentAt.toISOString(), '2026-10-28T07:45:00.000Z');
  assert.deepEqual([form.calls[0].unitId, form.calls[0].driverId, form.calls[0].pickupId, form.calls[0].destinationId], ['unit', 'driver', 'pickup', 'destination']);
  assert.equal(form.alerts.at(-1)[0], 'Allocation Added');
});

test('existing allocation preserves its shipment instant when editing other details', async () => {
  const savedDate = new Date('2026-10-29T01:30:27.000Z');
  const form = harness({ editable: { id: 'existing', unitId: 'unit', driverId: 'driver', pickupId: 'pickup', destinationId: 'destination', scheduledShipmentAt: savedDate } });
  assert.equal(form.picker().props.date.getTime(), savedDate.getTime());
  form.picker().props.onCancel();
  await form.submit().props.onPress();
  assert.equal(form.calls[0].id, 'existing');
  assert.equal(form.calls[0].scheduledShipmentAt.getTime(), savedDate.getTime());
  assert.equal(form.alerts.at(-1)[0], 'Allocation Updated');
});

test('incomplete assignment is rejected, and only one save can be in flight', async () => {
  let finish;
  const form = harness({ save: () => new Promise(resolve => { finish = resolve; }) });
  await form.submit().props.onPress();
  assert.equal(form.calls.length, 0);
  assert.match(form.find('Select', props => props.label === 'Select Driver *').props.error, /Select an available driver/);
  await form.complete();
  const submit = form.submit().props.onPress;
  const pending = submit();
  assert.equal(form.submit().props.loading, true);
  assert.equal(form.submit().props.disabled, true);
  await submit();
  assert.equal(form.calls.length, 1, 'rapid taps cannot create duplicate bookings');
  finish({ unitName: 'Fixture unit', driverName: 'Fixture driver', status: 'pending' });
  await pending;
  assert.equal(form.submit().props.loading, false);
});

test('failed save preserves chosen driver and schedule for retry', async () => {
  const form = harness({ save: async () => { throw new Error('Fixture connection failure'); } });
  const selected = new Date('2026-10-28T07:45:00.000Z');
  form.picker().props.onConfirm(selected);
  await form.complete();
  await form.submit().props.onPress();
  assert.equal(form.alerts.at(-1)[0], 'Unable to save allocation');
  assert.equal(form.submit().props.loading, false);
  assert.equal(form.find('Select', props => props.label === 'Select Driver *').props.value, 'driver');
  assert.equal(form.picker().props.date.getTime(), selected.getTime());
  await form.submit().props.onPress();
  assert.equal(form.calls.length, 2);
});

test('mobile allocation API serializes the selected schedule to ISO for both creating and editing', async () => {
  const requests = [];
  const locations = [
    { value: 'pickup', label: 'Stockyard', hint: 'Pickup address', location: { latitude: 14.5, longitude: 121 } },
    { value: 'destination', label: 'Dealership', hint: 'Delivery address', location: { latitude: 14.6, longitude: 121.1 } },
  ];
  const record = {
    id: 'allocation', status: 'pending', createdAt: '2026-10-26T01:00:00Z',
    scheduledShipmentAt: '2026-10-28T16:15:00.000Z',
    pickupLocation: { name: 'Stockyard', address: 'Pickup address', ...locations[0].location },
    destinationLocation: { name: 'Dealership', address: 'Delivery address', ...locations[1].location },
  };
  const request = method => async (url, payload) => { requests.push({ method, url, payload }); return { data: record }; };
  const allocation = load('src/mobile/data/driver-allocation.ts', {
    '../constants/theme': { theme: { colors: {} } },
    '../types': load('src/mobile/types/index.ts', {}),
    '../lib/api': { api: { post: request('POST'), patch: request('PATCH') }, getResponseData: response => response.data },
    './users': { getUserManagementRecords: () => [] },
    './vehicle-stocks': { getVehicleStocks: () => [], loadVehicleStocks: async () => [] },
    './unit-agent-allocation': { findUnitAgentAllocationByUnitId: () => ({ managerId: 'manager' }) },
    './shared': { toDate: value => value ? new Date(value) : null },
  });
  allocation.registerDriverAllocationLocationOptions(locations);
  const input = { unitId: 'unit', driverId: 'driver', pickupId: 'pickup', destinationId: 'destination', scheduledShipmentAt: new Date('2026-10-29T00:15:00+08:00') };
  await allocation.saveDriverAllocation(input);
  await allocation.saveDriverAllocation({ ...input, id: 'allocation' });
  assert.deepEqual(requests.map(({ method, url }) => ({ method, url })), [
    { method: 'POST', url: '/driver-allocations' }, { method: 'PATCH', url: '/driver-allocations/allocation' },
  ]);
  for (const { payload } of requests) {
    assert.equal(payload.scheduledShipmentAt, '2026-10-28T16:15:00.000Z', 'local midnight schedule keeps the same instant in UTC');
    assert.equal(payload.driverId, 'driver');
    assert.equal(payload.vehicleId, 'unit');
    assert.equal(payload.managerId, 'manager');
  }
});
