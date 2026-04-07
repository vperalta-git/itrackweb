import { AllocationStatus } from '../types';
import { theme } from '../constants/theme';
import { api, getResponseData } from '../lib/api';
import { getUserManagementRecords, loadUserManagementRecords } from './users';
import { getVehicleStocks, loadVehicleStocks } from './vehicle-stocks';
import { toDate } from './shared';

export interface AllocationManagerOption {
  label: string;
  value: string;
}

export interface AllocationSalesAgentOption {
  label: string;
  value: string;
  managerId: string | null;
}

export interface AllocationUnitOption {
  label: string;
  value: string;
  unitName: string;
  variation: string;
}

export interface UnitAgentAllocationRecord {
  id: string;
  managerId: string;
  managerName: string;
  salesAgentId: string;
  salesAgentName: string;
  unitId: string;
  unitName: string;
  unitVariation: string;
  status: AllocationStatus;
  createdAt: Date;
}

type SaveUnitAgentAllocationInput = {
  id?: string;
  managerId: string;
  salesAgentId: string;
  unitId: string;
};

type AllocationApiRecord = {
  id: string;
  status: AllocationStatus;
  createdAt: string;
  managerId?: {
    id: string;
    firstName: string;
    lastName: string;
  } | null;
  salesAgentId?: {
    id: string;
    firstName: string;
    lastName: string;
    managerId?: string | { id: string } | null;
  } | null;
  vehicleId?: {
    id: string;
    unitName: string;
    variation: string;
  } | null;
};

export const ALLOCATION_MANAGER_OPTIONS: AllocationManagerOption[] = [];
export const ALLOCATION_SALES_AGENT_OPTIONS: AllocationSalesAgentOption[] = [];

let unitAgentAllocations: UnitAgentAllocationRecord[] = [];

const sortAllocationsNewestFirst = (
  left: UnitAgentAllocationRecord,
  right: UnitAgentAllocationRecord
) => right.createdAt.getTime() - left.createdAt.getTime();

const setArrayContents = <T>(target: T[], items: T[]) => {
  target.splice(0, target.length, ...items);
};

const getFullName = (person?: { firstName: string; lastName: string } | null) =>
  `${person?.firstName ?? ''} ${person?.lastName ?? ''}`.trim();

const refreshAllocationOptions = () => {
  const users = getUserManagementRecords();
  const vehicles = getVehicleStocks();

  setArrayContents(
    ALLOCATION_MANAGER_OPTIONS,
    users
      .filter((user) => user.role === 'manager' && user.isActive)
      .map((user) => ({
        label: `${user.firstName} ${user.lastName}`.trim(),
        value: user.id,
      }))
  );

  setArrayContents(
    ALLOCATION_SALES_AGENT_OPTIONS,
    users
      .filter((user) => user.role === 'sales_agent' && user.isActive)
      .map((user) => ({
        label: `${user.firstName} ${user.lastName}`.trim(),
        value: user.id,
        managerId: user.managerId ?? null,
      }))
  );

  return vehicles.map((vehicle) => ({
    label: `${vehicle.unitName} - ${vehicle.variation}`,
    value: vehicle.id,
    unitName: vehicle.unitName,
    variation: vehicle.variation,
  }));
};

const mapAllocationRecord = (
  record: AllocationApiRecord
): UnitAgentAllocationRecord => ({
  id: record.id,
  managerId: record.managerId?.id ?? '',
  managerName: getFullName(record.managerId),
  salesAgentId: record.salesAgentId?.id ?? '',
  salesAgentName: getFullName(record.salesAgentId),
  unitId: record.vehicleId?.id ?? '',
  unitName: record.vehicleId?.unitName ?? '',
  unitVariation: record.vehicleId?.variation ?? '',
  status: record.status,
  createdAt: toDate(record.createdAt),
});

export const loadUnitAgentAllocations = async () => {
  await loadUserManagementRecords();
  await loadVehicleStocks();
  refreshAllocationOptions();

  const response = await api.get('/unit-agent-allocations');
  unitAgentAllocations = (
    getResponseData<AllocationApiRecord[]>(response) ?? []
  ).map(mapAllocationRecord);

  refreshAllocationOptions();
  return getUnitAgentAllocations();
};

export const formatAllocationStatusLabel = (status: AllocationStatus) => {
  switch (status) {
    case AllocationStatus.ASSIGNED:
      return 'Assigned';
    case AllocationStatus.PENDING:
      return 'Pending';
    case AllocationStatus.COMPLETED:
      return 'Completed';
    case AllocationStatus.IN_TRANSIT:
      return 'In Transit';
    case AllocationStatus.DELIVERED:
      return 'Delivered';
    case AllocationStatus.CANCELLED:
      return 'Cancelled';
  }

  return 'Unknown';
};

export const getAllocationBadgeStatus = (status: AllocationStatus) => {
  switch (status) {
    case AllocationStatus.ASSIGNED:
      return 'assigned';
    case AllocationStatus.PENDING:
      return 'pending';
    case AllocationStatus.COMPLETED:
      return 'completed';
    case AllocationStatus.CANCELLED:
      return 'cancelled';
    default:
      return 'inactive';
  }
};

export const getAllocationStatusAccentColor = (status: AllocationStatus) => {
  switch (status) {
    case AllocationStatus.ASSIGNED:
      return theme.colors.primary;
    case AllocationStatus.PENDING:
      return theme.colors.warning;
    case AllocationStatus.COMPLETED:
      return theme.colors.success;
    default:
      return theme.colors.textSubtle;
  }
};

export const formatAllocationCreatedDate = (date: Date) =>
  date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

export const formatAllocationReference = (allocationId: string) =>
  `Allocation #${allocationId.replace(/\D/g, '').padStart(3, '0') || '000'}`;

export const getUnitAgentAllocations = () =>
  [...unitAgentAllocations].sort(sortAllocationsNewestFirst);

export const getSalesAgentsForManager = (managerId: string | null) =>
  ALLOCATION_SALES_AGENT_OPTIONS.filter(
    (agent) => agent.managerId === managerId || !agent.managerId
  ).map((agent) => ({
    label: agent.label,
    value: agent.value,
  }));

export const findManagerOption = (managerId: string | null) =>
  ALLOCATION_MANAGER_OPTIONS.find((manager) => manager.value === managerId);

export const findSalesAgentOption = (salesAgentId: string | null) =>
  ALLOCATION_SALES_AGENT_OPTIONS.find((agent) => agent.value === salesAgentId);

export const findUnitOption = (unitId: string | null) =>
  refreshAllocationOptions().find((unit) => unit.value === unitId) ?? null;

export const getSelectableAllocationUnits = (currentUnitId?: string | null) =>
  refreshAllocationOptions()
    .filter((unit) => {
      if (unit.value === currentUnitId) {
        return true;
      }

      return !unitAgentAllocations.some(
        (allocation) => allocation.unitId === unit.value
      );
    })
    .map((unit) => ({
      label: unit.label,
      value: unit.value,
    }));

export const findUnitAgentAllocationByUnitId = (unitId: string | null) =>
  unitAgentAllocations.find((allocation) => allocation.unitId === unitId) ?? null;

export const findUnitAgentAllocationRecord = (allocationId: string | null) =>
  unitAgentAllocations.find((allocation) => allocation.id === allocationId) ?? null;

export const saveUnitAgentAllocation = async ({
  id,
  managerId,
  salesAgentId,
  unitId,
}: SaveUnitAgentAllocationInput) => {
  const payload = {
    managerId,
    salesAgentId,
    vehicleId: unitId,
    status: AllocationStatus.ASSIGNED,
  };

  const response = id
    ? await api.patch(`/unit-agent-allocations/${id}`, payload)
    : await api.post('/unit-agent-allocations', payload);
  const savedRecord = mapAllocationRecord(
    getResponseData<AllocationApiRecord>(response)
  );
  const existingIndex = unitAgentAllocations.findIndex(
    (allocation) => allocation.id === savedRecord.id
  );

  if (existingIndex === -1) {
    unitAgentAllocations = [savedRecord, ...unitAgentAllocations];
  } else {
    unitAgentAllocations = unitAgentAllocations.map((allocation) =>
      allocation.id === savedRecord.id ? savedRecord : allocation
    );
  }

  refreshAllocationOptions();
  return savedRecord;
};

export const deleteUnitAgentAllocation = async (allocationId: string) => {
  await api.delete(`/unit-agent-allocations/${allocationId}`);
  unitAgentAllocations = unitAgentAllocations.filter(
    (allocation) => allocation.id !== allocationId
  );
};
