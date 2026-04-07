import { format, parse } from 'date-fns';
import {
  TestDriveStatus,
  UserRole,
  VehicleStatus,
} from '@/src/mobile/types';
import { theme } from '../constants/theme';
import { api, getApiErrorMessage, getResponseData } from '../lib/api';
import { getVehicleStocks, loadVehicleStocks } from './vehicle-stocks';
import {
  getUnitAgentAllocations,
  loadUnitAgentAllocations,
} from './unit-agent-allocation';
import { toDate } from './shared';
import {
  areMobilePhoneNumbersEqual,
  normalizeMobilePhoneNumber,
} from '../utils/phone';

export type TestDriveVehicleOption = {
  id: string;
  unitName: string;
  variation: string;
  conductionNumber: string;
  bodyColor: string;
  status: VehicleStatus;
};

export type TestDriveBookingRecord = {
  id: string;
  vehicleId: string;
  unitName: string;
  variation: string;
  conductionNumber: string;
  bodyColor: string;
  customerName: string;
  customerPhone: string;
  scheduledDate: string;
  scheduledTime: string;
  notes: string;
  status: TestDriveStatus;
  createdAt: Date;
};

export type TestDriveDateTimeOption = {
  label: string;
  value: string;
  scheduledDate: string;
  scheduledTime: string;
};

type SaveTestDriveBookingInput = {
  id?: string;
  vehicleId: string;
  requestedByUserId?: string;
  customerName: string;
  customerPhone: string;
  scheduledDate: string;
  scheduledTime: string;
  notes: string;
  status?: TestDriveStatus;
};

type TestDriveBookingApiRecord = {
  id: string;
  customerName: string;
  customerPhone: string;
  scheduledDate: string;
  scheduledTime: string;
  notes: string;
  status: TestDriveStatus;
  createdAt: string;
  vehicleId?: {
    id: string;
    unitName: string;
    variation: string;
    conductionNumber: string;
    bodyColor: string;
    status: VehicleStatus;
  } | null;
};

const APPROVAL_ROLES: UserRole[] = [UserRole.ADMIN, UserRole.SUPERVISOR];
const APPROVED_STATUS_ACTION_ROLES = [
  UserRole.ADMIN,
  UserRole.SUPERVISOR,
  UserRole.MANAGER,
  UserRole.SALES_AGENT,
] as UserRole[];

const DATE_STORAGE_FORMAT = 'yyyy-MM-dd';
const DATE_TIME_STORAGE_FORMAT = 'yyyy-MM-dd hh:mm aa';
const SLOT_DAY_COUNT = 10;

export const TEST_DRIVE_VEHICLE_OPTIONS: TestDriveVehicleOption[] = [];

let testDriveBookings: TestDriveBookingRecord[] = [];

const setVehicleOptions = () => {
  const vehicles = getVehicleStocks().map((vehicle) => ({
    id: vehicle.id,
    unitName: vehicle.unitName,
    variation: vehicle.variation,
    conductionNumber: vehicle.conductionNumber,
    bodyColor: vehicle.bodyColor,
    status: vehicle.status,
  }));

  TEST_DRIVE_VEHICLE_OPTIONS.splice(0, TEST_DRIVE_VEHICLE_OPTIONS.length, ...vehicles);
};

const mapBookingRecord = (
  record: TestDriveBookingApiRecord
): TestDriveBookingRecord => ({
  id: record.id,
  vehicleId: record.vehicleId?.id ?? '',
  unitName: record.vehicleId?.unitName ?? '',
  variation: record.vehicleId?.variation ?? '',
  conductionNumber: record.vehicleId?.conductionNumber ?? '',
  bodyColor: record.vehicleId?.bodyColor ?? '',
  customerName: record.customerName,
  customerPhone: record.customerPhone,
  scheduledDate: record.scheduledDate,
  scheduledTime: record.scheduledTime,
  notes: record.notes ?? '',
  status: record.status,
  createdAt: toDate(record.createdAt),
});

export const TEST_DRIVE_TIME_OPTIONS = [
  '09:00 AM',
  '09:30 AM',
  '10:00 AM',
  '10:30 AM',
  '11:00 AM',
  '11:30 AM',
  '01:00 PM',
  '01:30 PM',
  '02:00 PM',
  '02:30 PM',
  '03:00 PM',
  '03:30 PM',
  '04:00 PM',
  '04:30 PM',
].map((time) => ({
  label: time,
  value: time,
}));

export const TEST_DRIVE_STATUS_OPTIONS = [
  {
    label: 'Pending',
    value: TestDriveStatus.PENDING,
  },
  {
    label: 'Approved',
    value: TestDriveStatus.APPROVED,
  },
  {
    label: 'Completed',
    value: TestDriveStatus.COMPLETED,
  },
  {
    label: 'Cancelled',
    value: TestDriveStatus.CANCELLED,
  },
  {
    label: 'No Show',
    value: TestDriveStatus.NO_SHOW,
  },
] as const;

const parseScheduleDate = (value: string) =>
  parse(value, DATE_STORAGE_FORMAT, new Date());

const getScheduleTimestamp = (booking: TestDriveBookingRecord) =>
  parse(
    `${booking.scheduledDate} ${booking.scheduledTime}`,
    DATE_TIME_STORAGE_FORMAT,
    new Date()
  ).getTime();

const sortBookingsBySchedule = (
  left: TestDriveBookingRecord,
  right: TestDriveBookingRecord
) => getScheduleTimestamp(left) - getScheduleTimestamp(right);

const getDateTimeOptionTimestamp = (option: TestDriveDateTimeOption) =>
  parse(
    `${option.scheduledDate} ${option.scheduledTime}`,
    DATE_TIME_STORAGE_FORMAT,
    new Date()
  ).getTime();

export const loadTestDriveBookings = async () => {
  await loadVehicleStocks();
  await loadUnitAgentAllocations();
  setVehicleOptions();

  const response = await api.get('/test-drive-bookings');
  testDriveBookings = (
    getResponseData<TestDriveBookingApiRecord[]>(response) ?? []
  ).map(mapBookingRecord);

  setVehicleOptions();
  return getTestDriveBookings();
};

export const findTestDriveVehicleById = (vehicleId: string | null) =>
  TEST_DRIVE_VEHICLE_OPTIONS.find((vehicle) => vehicle.id === vehicleId);

export const isVehicleAllocatedToAgent = (vehicleId: string) =>
  getUnitAgentAllocations().some((allocation) => allocation.unitId === vehicleId);

export const canScheduleVehicleForTestDrive = (vehicleId: string) => {
  const vehicle = findTestDriveVehicleById(vehicleId);

  if (!vehicle) {
    return false;
  }

  return (
    vehicle.status === VehicleStatus.AVAILABLE &&
    !isVehicleAllocatedToAgent(vehicleId)
  );
};

export const getEligibleTestDriveVehicles = (
  selectedVehicleId?: string | null
) =>
  TEST_DRIVE_VEHICLE_OPTIONS.filter((vehicle) => {
    if (vehicle.id === selectedVehicleId) {
      return true;
    }

    return canScheduleVehicleForTestDrive(vehicle.id);
  });

export const getEligibleTestDriveVehicleSummary = () => ({
  eligible: getEligibleTestDriveVehicles().length,
  total: TEST_DRIVE_VEHICLE_OPTIONS.length,
});

export const getTestDriveBookings = () =>
  [...testDriveBookings].sort(sortBookingsBySchedule);

export const getTestDriveBookingById = (bookingId: string) =>
  testDriveBookings.find((booking) => booking.id === bookingId) ?? null;

export const isTestDriveCustomerPhoneInUse = (
  phone: string,
  excludeBookingId?: string | null
) => {
  const normalizedPhoneNumber = normalizeMobilePhoneNumber(phone);

  return testDriveBookings.some(
    (booking) =>
      booking.id !== excludeBookingId &&
      areMobilePhoneNumbersEqual(booking.customerPhone, normalizedPhoneNumber)
  );
};

export const canAutoApproveTestDriveForRole = (role: UserRole) =>
  APPROVAL_ROLES.includes(role);

export const canManageTestDriveStatusForRole = (role: UserRole) =>
  canAutoApproveTestDriveForRole(role);

export const canApprovePendingTestDriveForRole = (role: UserRole) =>
  APPROVAL_ROLES.includes(role);

export const canCompleteApprovedTestDriveForRole = (role: UserRole) =>
  APPROVED_STATUS_ACTION_ROLES.includes(role);

export const getDefaultTestDriveStatusForRole = (role: UserRole) =>
  canAutoApproveTestDriveForRole(role)
    ? TestDriveStatus.APPROVED
    : TestDriveStatus.PENDING;

export const saveTestDriveBooking = async ({
  id,
  vehicleId,
  requestedByUserId,
  customerName,
  customerPhone,
  scheduledDate,
  scheduledTime,
  notes,
  status,
}: SaveTestDriveBookingInput) => {
  const vehicle = findTestDriveVehicleById(vehicleId);

  if (!vehicle) {
    throw new Error('Selected vehicle could not be found.');
  }

  const existingRecord = id
    ? testDriveBookings.find((booking) => booking.id === id)
    : undefined;
  const isKeepingCurrentVehicle = existingRecord?.vehicleId === vehicleId;

  if (!isKeepingCurrentVehicle && !canScheduleVehicleForTestDrive(vehicleId)) {
    throw new Error(
      'Only available units that are not assigned to an agent can be scheduled for test drive bookings.'
    );
  }

  const payload = {
    vehicleId,
    ...(requestedByUserId
      ? {
          requestedByUserId,
        }
      : {}),
    customerName,
    customerPhone: normalizeMobilePhoneNumber(customerPhone),
    scheduledDate,
    scheduledTime,
    notes,
    status: status ?? existingRecord?.status ?? TestDriveStatus.PENDING,
  };

  try {
    const response = id
      ? await api.patch(`/test-drive-bookings/${id}`, payload)
      : await api.post('/test-drive-bookings', payload);
    const savedRecord = mapBookingRecord(
      getResponseData<TestDriveBookingApiRecord>(response)
    );
    const existingIndex = testDriveBookings.findIndex(
      (booking) => booking.id === savedRecord.id
    );

    if (existingIndex === -1) {
      testDriveBookings = [savedRecord, ...testDriveBookings];
    } else {
      testDriveBookings = testDriveBookings.map((booking) =>
        booking.id === savedRecord.id ? savedRecord : booking
      );
    }

    return savedRecord;
  } catch (error) {
    throw new Error(
      getApiErrorMessage(
        error,
        'The test drive booking could not be saved right now.'
      )
    );
  }
};

export const deleteTestDriveBooking = async (bookingId: string) => {
  await api.delete(`/test-drive-bookings/${bookingId}`);
  testDriveBookings = testDriveBookings.filter(
    (booking) => booking.id !== bookingId
  );
};

export const updateTestDriveBookingStatus = async (
  bookingId: string,
  nextStatus: TestDriveStatus
) => {
  const existingBooking = testDriveBookings.find(
    (booking) => booking.id === bookingId
  );

  if (!existingBooking) {
    throw new Error('That test drive booking could not be found.');
  }

  const isApprovingPending =
    existingBooking.status === TestDriveStatus.PENDING &&
    nextStatus === TestDriveStatus.APPROVED;
  const isRejectingPending =
    existingBooking.status === TestDriveStatus.PENDING &&
    nextStatus === TestDriveStatus.CANCELLED;
  const isUpdatingApproved =
    existingBooking.status === TestDriveStatus.APPROVED &&
    [
      TestDriveStatus.COMPLETED,
      TestDriveStatus.CANCELLED,
      TestDriveStatus.NO_SHOW,
    ].includes(nextStatus);

  if (!isApprovingPending && !isRejectingPending && !isUpdatingApproved) {
    throw new Error('That status change is not allowed for this booking.');
  }

  const response = await api.patch(`/test-drive-bookings/${bookingId}`, {
    status: nextStatus,
  });
  const updatedBooking = mapBookingRecord(
    getResponseData<TestDriveBookingApiRecord>(response)
  );

  testDriveBookings = testDriveBookings.map((booking) =>
    booking.id === existingBooking.id ? updatedBooking : booking
  );

  return updatedBooking;
};

export const formatTestDriveStatusLabel = (status: TestDriveStatus) => {
  switch (status) {
    case TestDriveStatus.AVAILABLE:
      return 'Available';
    case TestDriveStatus.PENDING:
      return 'Pending';
    case TestDriveStatus.APPROVED:
      return 'Approved';
    case TestDriveStatus.COMPLETED:
      return 'Completed';
    case TestDriveStatus.CANCELLED:
      return 'Cancelled';
    case TestDriveStatus.NO_SHOW:
      return 'No Show';
    default:
      return 'Available';
  }
};

export const getTestDriveBadgeStatus = (status: TestDriveStatus) => {
  switch (status) {
    case TestDriveStatus.PENDING:
      return 'pending' as const;
    case TestDriveStatus.APPROVED:
      return 'confirmed' as const;
    case TestDriveStatus.COMPLETED:
      return 'completed' as const;
    case TestDriveStatus.CANCELLED:
      return 'cancelled' as const;
    case TestDriveStatus.NO_SHOW:
      return 'error' as const;
    default:
      return 'available' as const;
  }
};

export const getTestDriveStatusAccentColor = (status: TestDriveStatus) => {
  switch (status) {
    case TestDriveStatus.PENDING:
      return theme.colors.warning;
    case TestDriveStatus.APPROVED:
      return theme.colors.primary;
    case TestDriveStatus.COMPLETED:
      return theme.colors.success;
    case TestDriveStatus.CANCELLED:
      return theme.colors.error;
    case TestDriveStatus.NO_SHOW:
      return theme.colors.warning;
    default:
      return theme.colors.textSubtle;
  }
};

export const formatTestDriveSchedule = (
  scheduledDate: string,
  scheduledTime: string
) => {
  const parsedDate = parseScheduleDate(scheduledDate);
  const separator = ' - ';

  if (Number.isNaN(parsedDate.getTime())) {
    return `${scheduledDate}${separator}${scheduledTime}`;
  }

  return `${format(parsedDate, 'MMM d, yyyy')}${separator}${scheduledTime}`;
};

export const formatTestDriveCreatedDate = (date: Date) =>
  date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

export const formatTestDriveReference = (bookingId: string) =>
  `Booking #${bookingId.replace(/\D/g, '').padStart(3, '0') || '000'}`;

export const encodeTestDriveDateTimeValue = (
  scheduledDate: string,
  scheduledTime: string
) => `${scheduledDate}|${scheduledTime}`;

export const decodeTestDriveDateTimeValue = (value: string) => {
  const [scheduledDate = '', ...scheduledTimeParts] = value.split('|');

  return {
    scheduledDate,
    scheduledTime: scheduledTimeParts.join('|'),
  };
};

export const buildTestDriveDateTimeOptions = (
  selectedSlot?: {
    scheduledDate: string;
    scheduledTime: string;
  } | null
) => {
  const optionMap = new Map<string, TestDriveDateTimeOption>();
  const today = new Date();

  today.setHours(0, 0, 0, 0);

  for (let offset = 0; offset < SLOT_DAY_COUNT; offset += 1) {
    const slotDate = new Date(today);

    slotDate.setDate(today.getDate() + offset);

    const scheduledDate = format(slotDate, DATE_STORAGE_FORMAT);

    TEST_DRIVE_TIME_OPTIONS.forEach(({ value }) => {
      const optionValue = encodeTestDriveDateTimeValue(scheduledDate, value);

      optionMap.set(optionValue, {
        label: formatTestDriveSchedule(scheduledDate, value),
        value: optionValue,
        scheduledDate,
        scheduledTime: value,
      });
    });
  }

  if (selectedSlot?.scheduledDate && selectedSlot.scheduledTime) {
    const optionValue = encodeTestDriveDateTimeValue(
      selectedSlot.scheduledDate,
      selectedSlot.scheduledTime
    );

    optionMap.set(optionValue, {
      label: formatTestDriveSchedule(
        selectedSlot.scheduledDate,
        selectedSlot.scheduledTime
      ),
      value: optionValue,
      scheduledDate: selectedSlot.scheduledDate,
      scheduledTime: selectedSlot.scheduledTime,
    });
  }

  return [...optionMap.values()].sort(
    (left, right) =>
      getDateTimeOptionTimestamp(left) - getDateTimeOptionTimestamp(right)
  );
};
