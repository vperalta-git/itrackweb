import { Vehicle, VehicleStatus } from '../types';
import { theme } from '../constants/theme';
import { api, getResponseData } from '../lib/api';
import { toDate } from './shared';

type SaveVehicleStockInput = {
  id?: string;
  unitName: string;
  variation: string;
  conductionNumber: string;
  bodyColor: string;
  status: VehicleStatus;
  notes: string;
};

type VehicleApiRecord = {
  id: string;
  unitName: string;
  variation: string;
  conductionNumber: string;
  bodyColor: string;
  status: VehicleStatus;
  notes?: string;
  createdAt: string;
  imageUrl?: string | null;
  location?: {
    latitude: number;
    longitude: number;
  } | null;
};

export const VEHICLE_STOCK_FORM_STATUSES = [
  VehicleStatus.AVAILABLE,
  VehicleStatus.IN_STOCKYARD,
] as const;

const vehicleStockFormStatusSet = new Set<VehicleStatus>(
  VEHICLE_STOCK_FORM_STATUSES
);

export const VEHICLE_STATUS_OPTIONS = [
  { label: 'Available', value: VehicleStatus.AVAILABLE },
  { label: 'In Stockyard', value: VehicleStatus.IN_STOCKYARD },
  { label: 'In Transit', value: VehicleStatus.IN_TRANSIT },
  { label: 'Under Preparation', value: VehicleStatus.UNDER_PREPARATION },
  { label: 'Maintenance', value: VehicleStatus.MAINTENANCE },
  { label: 'Completed', value: VehicleStatus.COMPLETED },
] as const;

export const VEHICLE_STOCK_FORM_STATUS_OPTIONS = VEHICLE_STATUS_OPTIONS.filter(
  (option) => vehicleStockFormStatusSet.has(option.value)
);

let vehicleStocks: Vehicle[] = [];

const mapVehicleRecord = (record: VehicleApiRecord): Vehicle => ({
  id: record.id,
  unitName: record.unitName,
  variation: record.variation,
  conductionNumber: record.conductionNumber,
  bodyColor: record.bodyColor,
  status: record.status,
  location: record.location ?? undefined,
  notes: record.notes?.trim() ?? '',
  createdAt: toDate(record.createdAt),
  image: record.imageUrl ?? undefined,
});

const sortVehicleStocksNewestFirst = (left: Vehicle, right: Vehicle) =>
  right.createdAt.getTime() - left.createdAt.getTime();

export const normalizeVehicleStockConductionNumber = (value: string) =>
  value
    .toUpperCase()
    .replace(/\s+/g, '')
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 7);

export const loadVehicleStocks = async () => {
  const response = await api.get('/vehicles');
  vehicleStocks = (getResponseData<VehicleApiRecord[]>(response) ?? []).map(
    mapVehicleRecord
  );

  return getVehicleStocks();
};

export const getVehicleStocks = () =>
  [...vehicleStocks].sort(sortVehicleStocksNewestFirst);

export const findVehicleStockById = (vehicleId: string | null) =>
  vehicleStocks.find((vehicle) => vehicle.id === vehicleId) ?? null;

export const getVehicleStockById = (vehicleId: string) =>
  findVehicleStockById(vehicleId);

export const saveVehicleStock = async ({
  id,
  unitName,
  variation,
  conductionNumber,
  bodyColor,
  status,
  notes,
}: SaveVehicleStockInput) => {
  if (!vehicleStockFormStatusSet.has(status)) {
    throw new Error('Vehicle status must be Available or In Stockyard.');
  }

  const payload = {
    unitName: unitName.trim(),
    variation: variation.trim(),
    conductionNumber: normalizeVehicleStockConductionNumber(conductionNumber),
    bodyColor: bodyColor.trim(),
    status,
    notes: notes.trim(),
  };

  const response = id
    ? await api.patch(`/vehicles/${id}`, payload)
    : await api.post('/vehicles', payload);
  const savedVehicle = mapVehicleRecord(getResponseData<VehicleApiRecord>(response));
  const existingIndex = vehicleStocks.findIndex((vehicle) => vehicle.id === savedVehicle.id);

  if (existingIndex === -1) {
    vehicleStocks = [savedVehicle, ...vehicleStocks];
  } else {
    vehicleStocks = vehicleStocks.map((vehicle) =>
      vehicle.id === savedVehicle.id ? savedVehicle : vehicle
    );
  }

  return savedVehicle;
};

export const isVehicleStockFormStatusAllowed = (status: VehicleStatus) =>
  vehicleStockFormStatusSet.has(status);

export const deleteVehicleStock = async (vehicleId: string) => {
  await api.delete(`/vehicles/${vehicleId}`);
  vehicleStocks = vehicleStocks.filter((vehicle) => vehicle.id !== vehicleId);
};

export const formatVehicleStatusLabel = (status: VehicleStatus) => {
  switch (status) {
    case VehicleStatus.AVAILABLE:
      return 'Available';
    case VehicleStatus.IN_STOCKYARD:
      return 'In Stockyard';
    case VehicleStatus.IN_TRANSIT:
      return 'In Transit';
    case VehicleStatus.UNDER_PREPARATION:
      return 'Under Preparation';
    case VehicleStatus.MAINTENANCE:
      return 'Maintenance';
    case VehicleStatus.COMPLETED:
      return 'Completed';
    default:
      return 'Unknown';
  }
};

export const getVehicleStatusBadgeStatus = (status: VehicleStatus) => {
  switch (status) {
    case VehicleStatus.AVAILABLE:
      return 'available' as const;
    case VehicleStatus.IN_TRANSIT:
      return 'in_transit' as const;
    case VehicleStatus.MAINTENANCE:
      return 'maintenance' as const;
    case VehicleStatus.COMPLETED:
      return 'completed' as const;
    default:
      return 'inactive' as const;
  }
};

export const formatVehicleCreatedDate = (date: Date) =>
  date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

export const formatVehicleStockReference = (vehicleId: string) =>
  `Stock #${vehicleId.replace(/\D/g, '').padStart(3, '0') || '000'}`;

export const getVehicleStatusAccentColor = (status: VehicleStatus) => {
  switch (status) {
    case VehicleStatus.AVAILABLE:
      return theme.colors.success;
    case VehicleStatus.IN_TRANSIT:
      return theme.colors.info;
    case VehicleStatus.MAINTENANCE:
      return theme.colors.error;
    case VehicleStatus.IN_STOCKYARD:
      return theme.colors.primary;
    default:
      return theme.colors.textSubtle;
  }
};
