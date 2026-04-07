import { theme } from '../constants/theme';
import { AllocationStatus, VehicleStatus } from '../types';
import { api, getResponseData } from '../lib/api';
import { getUserManagementRecords, loadUserManagementRecords } from './users';
import { getVehicleStocks, loadVehicleStocks } from './vehicle-stocks';
import { findUnitAgentAllocationByUnitId } from './unit-agent-allocation';
import { toDate } from './shared';

export interface DriverAllocationLocation {
  latitude: number;
  longitude: number;
}

export interface DriverAllocationUnitOption {
  label: string;
  value: string;
  unitName: string;
  variation: string;
  conductionNumber: string;
  status: VehicleStatus;
}

export interface DriverAllocationDriverOption {
  label: string;
  value: string;
  phone: string;
  licenseNumber: string;
}

export interface DriverAllocationManagerOption {
  label: string;
  value: string;
}

export interface DriverAllocationLocationOption {
  label: string;
  value: string;
  hint: string;
  location: DriverAllocationLocation;
}

export interface DriverAllocationRecord {
  id: string;
  managerId: string;
  managerName: string;
  unitId: string;
  unitName: string;
  variation: string;
  conductionNumber: string;
  driverId: string;
  driverName: string;
  driverPhone: string;
  pickupId: string;
  pickupLabel: string;
  destinationId: string;
  destinationLabel: string;
  eta: string;
  routeProgress?: number;
  actualDuration?: number | null;
  status: AllocationStatus;
  startTime?: Date | null;
  endTime?: Date | null;
  createdAt: Date;
}

type SaveDriverAllocationInput = {
  id?: string;
  unitId: string;
  driverId: string;
  pickupId: string;
  destinationId: string;
};

type DriverAllocationApiRecord = {
  id: string;
  status: AllocationStatus;
  routeProgress?: number | null;
  estimatedDuration?: number | null;
  actualDuration?: number | null;
  startTime?: string | null;
  endTime?: string | null;
  createdAt: string;
  managerId?: {
    id: string;
    firstName: string;
    lastName: string;
  } | null;
  driverId?: {
    id: string;
    firstName: string;
    lastName: string;
    phone: string;
  } | null;
  vehicleId?: {
    id: string;
    unitName: string;
    variation: string;
    conductionNumber: string;
    status: VehicleStatus;
  } | null;
  pickupLocation: {
    name: string;
    address: string;
    latitude: number;
    longitude: number;
  };
  destinationLocation: {
    name: string;
    address: string;
    latitude: number;
    longitude: number;
  };
};

const ACTIVE_ALLOCATION_STATUSES = [
  AllocationStatus.PENDING,
  AllocationStatus.ASSIGNED,
  AllocationStatus.IN_TRANSIT,
] as AllocationStatus[];
const COMPLETED_ALLOCATION_STATUSES = new Set<AllocationStatus>([
  AllocationStatus.COMPLETED,
  AllocationStatus.DELIVERED,
]);
const DEFAULT_IN_TRANSIT_PROGRESS = 0.62;
const TRIP_START_PROGRESS = 0.18;
const EARTH_RADIUS_KM = 6371;

export const DRIVER_ALLOCATION_DRIVER_OPTIONS: DriverAllocationDriverOption[] = [];
export const DRIVER_ALLOCATION_MANAGER_OPTIONS: DriverAllocationManagerOption[] = [];
export const DRIVER_ALLOCATION_LOCATION_OPTIONS: DriverAllocationLocationOption[] = [];

let driverAllocationRecords: DriverAllocationRecord[] = [];
let driverAllocationUnitOptions: DriverAllocationUnitOption[] = [];

const toRadians = (value: number) => (value * Math.PI) / 180;

const setArrayContents = <T>(target: T[], items: T[]) => {
  target.splice(0, target.length, ...items);
};

const getFullName = (person?: { firstName: string; lastName: string } | null) =>
  `${person?.firstName ?? ''} ${person?.lastName ?? ''}`.trim();

const buildLocationValue = (location: DriverAllocationLocation) =>
  `geo:${location.latitude.toFixed(6)},${location.longitude.toFixed(6)}`;

const mapLocationOption = (location: {
  name: string;
  address: string;
  latitude: number;
  longitude: number;
}): DriverAllocationLocationOption => ({
  label: location.name,
  value: buildLocationValue(location),
  hint: location.address,
  location: {
    latitude: location.latitude,
    longitude: location.longitude,
  },
});

const registerLocationOptions = (locations: DriverAllocationLocationOption[]) => {
  const merged = new Map<string, DriverAllocationLocationOption>(
    DRIVER_ALLOCATION_LOCATION_OPTIONS.map((location) => [location.value, location])
  );

  locations.forEach((location) => {
    merged.set(location.value, location);
  });

  setArrayContents(
    DRIVER_ALLOCATION_LOCATION_OPTIONS,
    Array.from(merged.values())
  );
};

const refreshOptionCaches = () => {
  const users = getUserManagementRecords();
  const vehicles = getVehicleStocks();

  setArrayContents(
    DRIVER_ALLOCATION_DRIVER_OPTIONS,
    users
      .filter((user) => user.role === 'driver' && user.isActive)
      .map((user) => ({
        label: `${user.firstName} ${user.lastName}`.trim(),
        value: user.id,
        phone: user.phone,
        licenseNumber: `DL-${user.id.replace(/\D/g, '').padStart(4, '0') || '0000'}`,
      }))
  );

  setArrayContents(
    DRIVER_ALLOCATION_MANAGER_OPTIONS,
    users
      .filter((user) => user.role === 'manager' && user.isActive)
      .map((user) => ({
        label: `${user.firstName} ${user.lastName}`.trim(),
        value: user.id,
      }))
  );

  driverAllocationUnitOptions = vehicles.map((vehicle) => ({
    label: `${vehicle.unitName} - ${vehicle.variation}`,
    value: vehicle.id,
    unitName: vehicle.unitName,
    variation: vehicle.variation,
    conductionNumber: vehicle.conductionNumber,
    status: vehicle.status,
  }));
};

const sortDriverAllocationRecordsNewestFirst = (
  left: DriverAllocationRecord,
  right: DriverAllocationRecord
) => right.createdAt.getTime() - left.createdAt.getTime();

const mapDriverAllocationRecord = (
  record: DriverAllocationApiRecord
): DriverAllocationRecord => {
  const pickupLocation = mapLocationOption(record.pickupLocation);
  const destinationLocation = mapLocationOption(record.destinationLocation);

  registerLocationOptions([pickupLocation, destinationLocation]);

  return {
    id: record.id,
    managerId: record.managerId?.id ?? '',
    managerName: getFullName(record.managerId),
    unitId: record.vehicleId?.id ?? '',
    unitName: record.vehicleId?.unitName ?? '',
    variation: record.vehicleId?.variation ?? '',
    conductionNumber: record.vehicleId?.conductionNumber ?? '',
    driverId: record.driverId?.id ?? '',
    driverName: getFullName(record.driverId),
    driverPhone: record.driverId?.phone ?? '',
    pickupId: pickupLocation.value,
    pickupLabel: pickupLocation.label,
    destinationId: destinationLocation.value,
    destinationLabel: destinationLocation.label,
    eta:
      record.status === AllocationStatus.COMPLETED
        ? 'Completed'
        : `${record.estimatedDuration ?? 25} mins`,
    routeProgress: record.routeProgress ?? undefined,
    actualDuration: record.actualDuration ?? null,
    status: record.status,
    startTime: record.startTime ? toDate(record.startTime) : null,
    endTime: record.endTime ? toDate(record.endTime) : null,
    createdAt: toDate(record.createdAt),
  };
};

const isActiveDriverAllocationStatus = (status: AllocationStatus) =>
  ACTIVE_ALLOCATION_STATUSES.includes(status);

const isCompletedDriverAllocationStatus = (status: AllocationStatus) =>
  COMPLETED_ALLOCATION_STATUSES.has(status);

const getPendingFilterStatuses = (statusFilter: string) =>
  statusFilter === AllocationStatus.PENDING
    ? new Set<AllocationStatus>([
        AllocationStatus.PENDING,
        AllocationStatus.ASSIGNED,
      ])
    : new Set<AllocationStatus>([statusFilter as AllocationStatus]);

export const registerDriverAllocationLocationOptions = (
  locations: DriverAllocationLocationOption[]
) => {
  registerLocationOptions(locations);
};

export const loadDriverAllocations = async () => {
  await loadUserManagementRecords();
  await loadVehicleStocks();
  refreshOptionCaches();

  const response = await api.get('/driver-allocations');
  driverAllocationRecords = (
    getResponseData<DriverAllocationApiRecord[]>(response) ?? []
  ).map(mapDriverAllocationRecord);

  refreshOptionCaches();
  return getDriverAllocations();
};

export const getDriverAllocations = () =>
  [...driverAllocationRecords].sort(sortDriverAllocationRecordsNewestFirst);

export const getDriverAllocationHistoryRecords = (driverId?: string | null) =>
  [...driverAllocationRecords]
    .filter((record) =>
      driverId ? record.driverId === driverId : true
    )
    .filter((record) => isCompletedDriverAllocationStatus(record.status))
    .sort((left, right) => {
      const leftDate = left.endTime ?? left.createdAt;
      const rightDate = right.endTime ?? right.createdAt;

      return rightDate.getTime() - leftDate.getTime();
    });

export const getDriverAllocationDashboardRecord = (
  driverId?: string | null
) => {
  if (driverId) {
    return (
      getDriverAllocations().find(
        (record) =>
          record.driverId === driverId &&
          isActiveDriverAllocationStatus(record.status)
      ) ?? null
    );
  }

  return (
    getDriverAllocations().find((record) =>
      isActiveDriverAllocationStatus(record.status)
    ) ?? null
  );
};

export const getDriverAllocationRouteDistanceKm = (
  allocation: DriverAllocationRecord
) => {
  const pickup = findDriverAllocationLocation(allocation.pickupId);
  const destination = findDriverAllocationLocation(allocation.destinationId);

  if (!pickup || !destination) {
    return null;
  }

  const latitudeDelta = toRadians(destination.location.latitude - pickup.location.latitude);
  const longitudeDelta = toRadians(
    destination.location.longitude - pickup.location.longitude
  );
  const pickupLatitude = toRadians(pickup.location.latitude);
  const destinationLatitude = toRadians(destination.location.latitude);
  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(pickupLatitude) *
      Math.cos(destinationLatitude) *
      Math.sin(longitudeDelta / 2) ** 2;

  return (
    2 *
    EARTH_RADIUS_KM *
    Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine))
  );
};

const getDriverAllocationTravelProgress = (
  allocation: DriverAllocationRecord
) => {
  switch (allocation.status) {
    case AllocationStatus.COMPLETED:
    case AllocationStatus.DELIVERED:
      return 1;
    case AllocationStatus.IN_TRANSIT:
      return Math.min(
        Math.max(allocation.routeProgress ?? DEFAULT_IN_TRANSIT_PROGRESS, 0),
        1
      );
    default:
      return 0;
  }
};

export const getDriverAllocationRemainingDistanceKm = (
  allocation: DriverAllocationRecord
) => {
  if (allocation.status !== AllocationStatus.IN_TRANSIT) {
    return null;
  }

  const totalDistanceKm = getDriverAllocationRouteDistanceKm(allocation);

  if (totalDistanceKm === null) {
    return null;
  }

  return Math.max(
    totalDistanceKm * (1 - getDriverAllocationTravelProgress(allocation)),
    0
  );
};

export const formatDriverAllocationRemainingDistance = (
  allocation: DriverAllocationRecord
) => {
  const remainingDistanceKm = getDriverAllocationRemainingDistanceKm(allocation);

  if (remainingDistanceKm === null) {
    return null;
  }

  return `${remainingDistanceKm.toFixed(1)} km left`;
};

export const getDriverAllocationLiveLocation = (
  allocation: DriverAllocationRecord
) => {
  const pickup = findDriverAllocationLocation(allocation.pickupId);
  const destination = findDriverAllocationLocation(allocation.destinationId);

  if (!pickup || !destination) {
    return null;
  }

  const progress = getDriverAllocationTravelProgress(allocation);

  return {
    latitude:
      pickup.location.latitude +
      (destination.location.latitude - pickup.location.latitude) * progress,
    longitude:
      pickup.location.longitude +
      (destination.location.longitude - pickup.location.longitude) * progress,
  };
};

const saveMappedAllocation = (record: DriverAllocationRecord) => {
  const existingIndex = driverAllocationRecords.findIndex(
    (allocation) => allocation.id === record.id
  );

  if (existingIndex === -1) {
    driverAllocationRecords = [record, ...driverAllocationRecords];
  } else {
    driverAllocationRecords = driverAllocationRecords.map((allocation) =>
      allocation.id === record.id ? record : allocation
    );
  }

  return record;
};

export const saveDriverAllocation = async ({
  id,
  unitId,
  driverId,
  pickupId,
  destinationId,
}: SaveDriverAllocationInput) => {
  const pickup = findDriverAllocationLocation(pickupId);
  const destination = findDriverAllocationLocation(destinationId);
  const unitAgentAllocation = findUnitAgentAllocationByUnitId(unitId);

  if (!pickup) {
    throw new Error('Selected pickup location could not be found.');
  }

  if (!destination) {
    throw new Error('Selected destination location could not be found.');
  }

  if (pickupId === destinationId) {
    throw new Error('Pickup and destination must be different locations.');
  }

  const payload = {
    managerId: unitAgentAllocation?.managerId || undefined,
    vehicleId: unitId,
    driverId,
    pickupLocation: {
      name: pickup.label,
      address: pickup.hint,
      latitude: pickup.location.latitude,
      longitude: pickup.location.longitude,
    },
    destinationLocation: {
      name: destination.label,
      address: destination.hint,
      latitude: destination.location.latitude,
      longitude: destination.location.longitude,
    },
    estimatedDuration: 25,
  };

  const response = id
    ? await api.patch(`/driver-allocations/${id}`, payload)
    : await api.post('/driver-allocations', payload);
  await loadVehicleStocks();
  const savedRecord = mapDriverAllocationRecord(
    getResponseData<DriverAllocationApiRecord>(response)
  );

  saveMappedAllocation(savedRecord);
  refreshOptionCaches();

  return savedRecord;
};

const patchDriverAllocation = async (
  allocationId: string,
  payload: Partial<{
    status: AllocationStatus;
    routeProgress: number;
    eta: string;
  }>
) => {
  const response = await api.patch(`/driver-allocations/${allocationId}`, payload);
  await loadVehicleStocks();
  const savedRecord = mapDriverAllocationRecord(
    getResponseData<DriverAllocationApiRecord>(response)
  );

  saveMappedAllocation(savedRecord);
  refreshOptionCaches();
  return savedRecord;
};

export const acceptDriverAllocation = async (allocationId: string) =>
  patchDriverAllocation(allocationId, {
    status: AllocationStatus.ASSIGNED,
  });

export const startDriverAllocationTrip = async (allocationId: string) =>
  patchDriverAllocation(allocationId, {
    status: AllocationStatus.IN_TRANSIT,
    routeProgress: TRIP_START_PROGRESS,
  });

export const completeDriverAllocationTrip = async (allocationId: string) =>
  patchDriverAllocation(allocationId, {
    status: AllocationStatus.COMPLETED,
    routeProgress: 1,
  });

export const deleteDriverAllocation = async (allocationId: string) => {
  await api.delete(`/driver-allocations/${allocationId}`);
  await loadVehicleStocks();
  driverAllocationRecords = driverAllocationRecords.filter(
    (record) => record.id !== allocationId
  );
  refreshOptionCaches();
};

export const formatDriverAllocationStatusLabel = (status: AllocationStatus) => {
  switch (status) {
    case AllocationStatus.PENDING:
    case AllocationStatus.ASSIGNED:
      return 'Pending';
    case AllocationStatus.IN_TRANSIT:
      return 'In Transit';
    case AllocationStatus.COMPLETED:
      return 'Completed';
    case AllocationStatus.DELIVERED:
      return 'Delivered';
    case AllocationStatus.CANCELLED:
      return 'Cancelled';
  }

  return 'Unknown';
};

export const getDriverAllocationBadgeStatus = (status: AllocationStatus) => {
  switch (status) {
    case AllocationStatus.PENDING:
    case AllocationStatus.ASSIGNED:
      return 'pending';
    case AllocationStatus.IN_TRANSIT:
      return 'in_transit';
    case AllocationStatus.COMPLETED:
      return 'completed';
    case AllocationStatus.CANCELLED:
      return 'cancelled';
    default:
      return 'inactive';
  }
};

export const getDriverAllocationStatusAccentColor = (
  status: AllocationStatus
) => {
  switch (status) {
    case AllocationStatus.PENDING:
    case AllocationStatus.ASSIGNED:
      return theme.colors.warning;
    case AllocationStatus.IN_TRANSIT:
      return theme.colors.info;
    case AllocationStatus.COMPLETED:
      return theme.colors.success;
    default:
      return theme.colors.textSubtle;
  }
};

export const formatDriverAllocationCreatedDate = (date: Date) =>
  date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

export const formatDriverAllocationHistoryDateTime = (
  allocation: DriverAllocationRecord
) =>
  (allocation.endTime ?? allocation.startTime ?? allocation.createdAt).toLocaleString(
    'en-US',
    {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }
  );

export const getDriverAllocationDurationMinutes = (
  allocation: DriverAllocationRecord
) => {
  if (typeof allocation.actualDuration === 'number') {
    return allocation.actualDuration;
  }

  if (allocation.startTime && allocation.endTime) {
    return Math.max(
      1,
      Math.round(
        (allocation.endTime.getTime() - allocation.startTime.getTime()) / 60000
      )
    );
  }

  return null;
};

export const formatDriverAllocationDuration = (
  allocation: DriverAllocationRecord
) => {
  const duration = getDriverAllocationDurationMinutes(allocation);

  if (duration === null) {
    return 'Duration unavailable';
  }

  return `${duration} min${duration === 1 ? '' : 's'}`;
};

export const formatDriverAllocationReference = (allocationId: string) =>
  `Dispatch #${allocationId.replace(/\D/g, '').padStart(3, '0') || '000'}`;

export const matchesDriverAllocationStatusFilter = (
  statusFilter: string,
  status: AllocationStatus
) =>
  statusFilter === 'all' || getPendingFilterStatuses(statusFilter).has(status);

export const findDriverAllocationRecord = (allocationId: string | null) =>
  driverAllocationRecords.find((record) => record.id === allocationId) ?? null;

export const findDriverAllocationUnit = (unitId: string | null) =>
  driverAllocationUnitOptions.find((unit) => unit.value === unitId) ?? null;

export const findDriverAllocationDriver = (driverId: string | null) =>
  DRIVER_ALLOCATION_DRIVER_OPTIONS.find((driver) => driver.value === driverId) ??
  null;

export const findDriverAllocationManager = (managerId: string | null) =>
  DRIVER_ALLOCATION_MANAGER_OPTIONS.find((manager) => manager.value === managerId) ??
  null;

export const findDriverAllocationLocation = (locationId: string | null) =>
  DRIVER_ALLOCATION_LOCATION_OPTIONS.find((location) => location.value === locationId) ??
  null;

export const getDriverAllocationUnitStockStatusByConductionNumber = (
  conductionNumber: string
) => {
  const latestRecord =
    [...driverAllocationRecords]
      .filter((item) => item.conductionNumber === conductionNumber)
      .sort(sortDriverAllocationRecordsNewestFirst)[0] ?? null;

  if (!latestRecord || !isActiveDriverAllocationStatus(latestRecord.status)) {
    return null;
  }

  return latestRecord.status === AllocationStatus.IN_TRANSIT
    ? VehicleStatus.IN_TRANSIT
    : VehicleStatus.IN_STOCKYARD;
};

export const findNearestDriverAllocationLocation = (
  target: DriverAllocationLocation
) =>
  DRIVER_ALLOCATION_LOCATION_OPTIONS.reduce<
    DriverAllocationLocationOption | null
  >((closest, location) => {
    if (!closest) {
      return location;
    }

    const closestDistance =
      (closest.location.latitude - target.latitude) ** 2 +
      (closest.location.longitude - target.longitude) ** 2;
    const nextDistance =
      (location.location.latitude - target.latitude) ** 2 +
      (location.location.longitude - target.longitude) ** 2;

    return nextDistance < closestDistance ? location : closest;
  }, null);

export const getSelectableDriverOptions = (currentDriverId?: string | null) => {
  refreshOptionCaches();

  const activeDriverIds = new Set(
    driverAllocationRecords
      .filter((record) => isActiveDriverAllocationStatus(record.status))
      .filter((record) => record.driverId !== currentDriverId)
      .map((record) => record.driverId)
  );

  return DRIVER_ALLOCATION_DRIVER_OPTIONS.filter(
    (driver) => !activeDriverIds.has(driver.value)
  );
};

export const getSelectableUnitOptions = (currentUnitId?: string | null) => {
  refreshOptionCaches();

  const activeUnitIds = new Set(
    driverAllocationRecords
      .filter((record) => isActiveDriverAllocationStatus(record.status))
      .filter((record) => record.unitId !== currentUnitId)
      .map((record) => record.unitId)
  );

  return driverAllocationUnitOptions.filter(
    (unit) =>
      (unit.status === VehicleStatus.IN_STOCKYARD ||
        unit.value === currentUnitId) &&
      !activeUnitIds.has(unit.value)
  );
};

export const getDriverAllocationRoute = (
  pickupId: string | null,
  destinationId: string | null
) => {
  const pickup = findDriverAllocationLocation(pickupId);
  const destination = findDriverAllocationLocation(destinationId);

  if (!pickup || !destination) {
    return [];
  }

  return [[pickup.location, destination.location]];
};

export const getDriverAllocationInitialRegion = (
  pickupId: string | null,
  destinationId: string | null
) => {
  const pickup = findDriverAllocationLocation(pickupId);
  const destination = findDriverAllocationLocation(destinationId);

  if (!pickup && !destination) {
    return {
      latitude: 14.5995,
      longitude: 120.9842,
      latitudeDelta: 0.18,
      longitudeDelta: 0.18,
    };
  }

  if (pickup && !destination) {
    return {
      latitude: pickup.location.latitude,
      longitude: pickup.location.longitude,
      latitudeDelta: 0.08,
      longitudeDelta: 0.08,
    };
  }

  if (!pickup && destination) {
    return {
      latitude: destination.location.latitude,
      longitude: destination.location.longitude,
      latitudeDelta: 0.08,
      longitudeDelta: 0.08,
    };
  }

  return {
    latitude: (pickup!.location.latitude + destination!.location.latitude) / 2,
    longitude:
      (pickup!.location.longitude + destination!.location.longitude) / 2,
    latitudeDelta: Math.max(
      Math.abs(pickup!.location.latitude - destination!.location.latitude) * 1.8,
      0.08
    ),
    longitudeDelta: Math.max(
      Math.abs(pickup!.location.longitude - destination!.location.longitude) *
        1.8,
      0.08
    ),
  };
};

export const resetDriverAllocationData = () => {
  driverAllocationRecords = [];
  driverAllocationUnitOptions = [];
  setArrayContents(DRIVER_ALLOCATION_DRIVER_OPTIONS, []);
  setArrayContents(DRIVER_ALLOCATION_MANAGER_OPTIONS, []);
  setArrayContents(DRIVER_ALLOCATION_LOCATION_OPTIONS, []);
};
