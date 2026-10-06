import { format, isValid, parse } from 'date-fns';
import {
  PreparationStatus,
  ServiceType,
  UserRole,
  VehicleStatus,
} from '@/src/mobile/types';
import { api, getApiErrorMessage, getResponseData } from '../lib/api';
import { getVehicleStocks, loadVehicleStocks } from './vehicle-stocks';
import { toDate } from './shared';
import { normalizeMobilePhoneNumber } from '../utils/phone';

export type DispatcherChecklistStep = {
  id: string;
  label: string;
  completed: boolean;
};

export type PreparationApprovalStatus =
  | 'awaiting_approval'
  | 'approved'
  | 'rejected';

export type PreparationVehicleOption = {
  id: string;
  unitName: string;
  variation: string;
  conductionNumber: string;
  bodyColor: string;
  status: VehicleStatus;
};

export type PreparationRecord = {
  id: string;
  vehicleId: string;
  unitName: string;
  variation: string;
  conductionNumber: string;
  bodyColor: string;
  requestedServices: ServiceType[];
  customRequests: string[];
  customerName: string;
  customerContactNo: string;
  notes: string;
  status: PreparationStatus;
  createdAt: string;
  progress: number;
  requestedByRole: UserRole;
  requestedByName: string;
  approvalStatus: PreparationApprovalStatus;
  approvedByRole?: UserRole;
  approvedByName?: string;
  approvedAt?: string;
  dispatcherId?: string;
  dispatcherName?: string;
  dispatcherChecklist: DispatcherChecklistStep[];
  completedAt?: string;
  readyForReleaseAt?: string;
};

type SavePreparationRecordInput = {
  id?: string;
  vehicleId: string;
  requestedByUserId?: string;
  requestedServices: ServiceType[];
  customRequests: string[];
  customerName: string;
  customerContactNo: string;
  notes: string;
  requestedByRole: UserRole;
  requestedByName: string;
  dispatcherId?: string;
  dispatcherName?: string;
  approvalStatus?: PreparationApprovalStatus;
  approvedByRole?: UserRole;
  approvedByName?: string;
  approvedAt?: Date | string;
  status?: PreparationStatus;
  progress?: number;
  dispatcherChecklist?: DispatcherChecklistStep[];
  completedAt?: Date | string;
  readyForReleaseAt?: Date | string;
};

type PreparationApiRecord = {
  id: string;
  requestedServices: ServiceType[];
  customRequests: string[];
  customerName: string;
  customerContactNo: string;
  notes: string;
  status: PreparationStatus;
  progress: number;
  requestedByRole: UserRole;
  requestedByName: string;
  approvalStatus: PreparationApprovalStatus;
  approvedByRole?: UserRole | null;
  approvedByName?: string | null;
  approvedAt?: string | null;
  completedAt?: string | null;
  readyForReleaseAt?: string | null;
  createdAt: string;
  dispatcherChecklist: DispatcherChecklistStep[];
  dispatcherId?: {
    id: string;
    firstName: string;
    lastName: string;
  } | null;
  vehicleId?: {
    id: string;
    unitName: string;
    variation: string;
    conductionNumber: string;
    bodyColor: string;
    status: VehicleStatus;
  } | null;
};

const DATE_DISPLAY_FORMAT = 'MMMM d, yyyy';

const PREPARATION_SERVICE_LABELS: Record<ServiceType, string> = {
  [ServiceType.CARWASH]: 'Carwash',
  [ServiceType.TINTING]: 'Tinting',
  [ServiceType.CERAMIC_COATING]: 'Ceramic Coating',
  [ServiceType.ACCESSORIES]: 'Accessories',
  [ServiceType.RUST_PROOF]: 'Rust Proof',
  [ServiceType.CUSTOM_REQUEST]: 'Custom Request',
  [ServiceType.DETAILING]: 'Detailing',
  [ServiceType.INSPECTION]: 'Inspection',
  [ServiceType.MAINTENANCE]: 'Maintenance',
  [ServiceType.PAINTING]: 'Painting',
};

export const PREPARATION_SERVICE_OPTIONS = [
  {
    label: PREPARATION_SERVICE_LABELS[ServiceType.DETAILING],
    value: ServiceType.DETAILING,
  },
  {
    label: PREPARATION_SERVICE_LABELS[ServiceType.TINTING],
    value: ServiceType.TINTING,
  },
  {
    label: PREPARATION_SERVICE_LABELS[ServiceType.CERAMIC_COATING],
    value: ServiceType.CERAMIC_COATING,
  },
  {
    label: PREPARATION_SERVICE_LABELS[ServiceType.ACCESSORIES],
    value: ServiceType.ACCESSORIES,
  },
  {
    label: PREPARATION_SERVICE_LABELS[ServiceType.RUST_PROOF],
    value: ServiceType.RUST_PROOF,
  },
  {
    label: PREPARATION_SERVICE_LABELS[ServiceType.CUSTOM_REQUEST],
    value: ServiceType.CUSTOM_REQUEST,
  },
] as const;

export const PREPARATION_VEHICLE_OPTIONS: PreparationVehicleOption[] = [];

let preparationRecords: PreparationRecord[] = [];
const lockedPreparationStatuses = new Set<PreparationStatus>([
  PreparationStatus.IN_DISPATCH,
  PreparationStatus.COMPLETED,
  PreparationStatus.READY_FOR_RELEASE,
]);

const formatDisplayDate = (value = new Date()) =>
  format(value, DATE_DISPLAY_FORMAT);

const parsePreparationDate = (value?: Date | string | null) => {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return value;
  }

  const parsedValue = new Date(value);

  if (!Number.isNaN(parsedValue.getTime())) {
    return parsedValue;
  }

  const displayDate = parse(value, DATE_DISPLAY_FORMAT, new Date());
  return isValid(displayDate) ? displayDate : null;
};

const toApiDateString = (value?: Date | string | null, fallback = new Date()) =>
  (parsePreparationDate(value) ?? fallback).toISOString();

const toPreparationVehicleOption = (
  vehicle: ReturnType<typeof getVehicleStocks>[number]
): PreparationVehicleOption => ({
  id: vehicle.id,
  unitName: vehicle.unitName,
  variation: vehicle.variation,
  conductionNumber: vehicle.conductionNumber,
  bodyColor: vehicle.bodyColor,
  status: vehicle.status,
});

const setVehicleOptions = () => {
  const vehicles = getVehicleStocks()
    .filter((vehicle) => vehicle.status === VehicleStatus.AVAILABLE)
    .map(toPreparationVehicleOption);

  PREPARATION_VEHICLE_OPTIONS.splice(0, PREPARATION_VEHICLE_OPTIONS.length, ...vehicles);
};

const buildChecklistStepId = (label: string) =>
  label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'dispatcher-step';

const getPreparationServiceLabel = (service: ServiceType) =>
  PREPARATION_SERVICE_LABELS[service] ?? service;

const getLegacyDispatcherChecklistLabel = (service: ServiceType) => {
  switch (service) {
    case ServiceType.DETAILING:
      return 'Confirm detailing and interior cleanliness';
    case ServiceType.TINTING:
      return 'Inspect tint application and film quality';
    case ServiceType.CERAMIC_COATING:
      return 'Inspect ceramic coating finish';
    case ServiceType.ACCESSORIES:
      return 'Verify accessory installation and fitment';
    case ServiceType.RUST_PROOF:
      return 'Validate rust proof application';
    case ServiceType.CARWASH:
      return 'Confirm exterior and interior wash';
    case ServiceType.INSPECTION:
      return 'Complete dispatcher inspection';
    case ServiceType.MAINTENANCE:
      return 'Verify maintenance clearance';
    case ServiceType.PAINTING:
      return 'Check paint finish and panel condition';
    case ServiceType.CUSTOM_REQUEST:
      return 'Review custom request completion';
    default:
      return null;
  }
};

type DispatcherChecklistTemplate = {
  label: string;
  aliases: string[];
};

const buildDispatcherChecklistTemplates = (
  services: ServiceType[],
  customRequests: string[]
) => {
  const templates: DispatcherChecklistTemplate[] = [];

  services.forEach((service) => {
    if (service === ServiceType.CUSTOM_REQUEST) {
      const trimmedCustomRequests = customRequests
        .map((request) => request.trim())
        .filter(Boolean);

      if (trimmedCustomRequests.length) {
        trimmedCustomRequests.forEach((request) => {
          templates.push({
            label: request,
            aliases: [`Validate custom request: ${request}`],
          });
        });

        return;
      }
    }

    const legacyLabel = getLegacyDispatcherChecklistLabel(service);
    templates.push({
      label: getPreparationServiceLabel(service),
      aliases: legacyLabel ? [legacyLabel] : [],
    });
  });

  const dedupedTemplates = templates.filter(
    (template, index, collection) =>
      collection.findIndex((entry) => entry.label === template.label) === index
  );

  if (dedupedTemplates.length) {
    return dedupedTemplates;
  }

  return [
    {
      label: 'Review approved vehicle prep endorsement',
      aliases: [],
    },
  ];
};

const buildDispatcherChecklist = (
  services: ServiceType[],
  customRequests: string[],
  existingChecklist: DispatcherChecklistStep[] = []
) =>
  buildDispatcherChecklistTemplates(services, customRequests).map(
    ({ label, aliases }) => {
      const existingStep =
        existingChecklist.find((step) => step.label === label) ??
        existingChecklist.find((step) => aliases.includes(step.label));

      return {
        id: existingStep?.id ?? buildChecklistStepId(label),
        label,
        completed: existingStep?.completed ?? false,
      };
    }
  );

const getChecklistProgressFromSteps = (
  checklist: DispatcherChecklistStep[]
) => {
  if (!checklist.length) {
    return 0;
  }

  const completedCount = checklist.filter((step) => step.completed).length;

  return Math.round((completedCount / checklist.length) * 100);
};

const getRecordSortValue = (record: PreparationRecord) =>
  Number(record.id.replace(/\D/g, '')) || 0;

const getStatusRank = (status: PreparationStatus) => {
  switch (status) {
    case PreparationStatus.PENDING:
      return 0;
    case PreparationStatus.IN_DISPATCH:
      return 1;
    case PreparationStatus.READY_FOR_RELEASE:
      return 2;
    case PreparationStatus.COMPLETED:
      return 3;
    case PreparationStatus.REJECTED:
      return 4;
    default:
      return 5;
  }
};

const sortPreparationRecords = (
  left: PreparationRecord,
  right: PreparationRecord
) =>
  getStatusRank(left.status) - getStatusRank(right.status) ||
  getRecordSortValue(right) - getRecordSortValue(left);

const findPreparationVehicleById = (
  vehicleId: string | null
): PreparationVehicleOption | null => {
  if (!vehicleId) {
    return null;
  }

  const availableVehicleOption =
    PREPARATION_VEHICLE_OPTIONS.find((vehicle) => vehicle.id === vehicleId) ?? null;

  if (availableVehicleOption) {
    return availableVehicleOption;
  }

  const anyVehicleRecord = getVehicleStocks().find((vehicle) => vehicle.id === vehicleId);

  return anyVehicleRecord ? toPreparationVehicleOption(anyVehicleRecord) : null;
};

const buildDispatcherScopeMatcher = (
  dispatcherId?: string | null
) => (record: PreparationRecord) =>
  !dispatcherId || !record.dispatcherId || record.dispatcherId === dispatcherId;

const getFullName = (person?: { firstName: string; lastName: string } | null) =>
  `${person?.firstName ?? ''} ${person?.lastName ?? ''}`.trim();

const mapPreparationRecord = (record: PreparationApiRecord): PreparationRecord => ({
  id: record.id,
  vehicleId: record.vehicleId?.id ?? '',
  unitName: record.vehicleId?.unitName ?? '',
  variation: record.vehicleId?.variation ?? '',
  conductionNumber: record.vehicleId?.conductionNumber ?? '',
  bodyColor: record.vehicleId?.bodyColor ?? '',
  requestedServices: record.requestedServices ?? [],
  customRequests: record.customRequests ?? [],
  customerName: record.customerName,
  customerContactNo: record.customerContactNo,
  notes: record.notes ?? '',
  status: record.status,
  createdAt: formatDisplayDate(toDate(record.createdAt)),
  progress: record.progress ?? 0,
  requestedByRole: record.requestedByRole,
  requestedByName: record.requestedByName,
  approvalStatus: record.approvalStatus,
  approvedByRole: record.approvedByRole ?? undefined,
  approvedByName: record.approvedByName ?? undefined,
  approvedAt: record.approvedAt ? formatDisplayDate(toDate(record.approvedAt)) : undefined,
  dispatcherId: record.dispatcherId?.id ?? undefined,
  dispatcherName: record.dispatcherId ? getFullName(record.dispatcherId) : undefined,
  dispatcherChecklist: buildDispatcherChecklist(
    record.requestedServices ?? [],
    record.customRequests ?? [],
    record.dispatcherChecklist ?? []
  ),
  completedAt: record.completedAt
    ? formatDisplayDate(toDate(record.completedAt))
    : undefined,
  readyForReleaseAt: record.readyForReleaseAt
    ? formatDisplayDate(toDate(record.readyForReleaseAt))
    : undefined,
});

const upsertPreparationRecord = (record: PreparationRecord) => {
  const existingIndex = preparationRecords.findIndex((item) => item.id === record.id);

  if (existingIndex === -1) {
    preparationRecords = [record, ...preparationRecords];
  } else {
    preparationRecords = preparationRecords.map((item) =>
      item.id === record.id ? record : item
    );
  }

  return record;
};

export const loadPreparationRecords = async () => {
  await loadVehicleStocks();
  setVehicleOptions();

  const response = await api.get('/preparations');
  preparationRecords = (getResponseData<PreparationApiRecord[]>(response) ?? []).map(
    mapPreparationRecord
  );

  setVehicleOptions();
  return getPreparationRecords();
};

export const getPreparationRecords = () =>
  [...preparationRecords].sort(sortPreparationRecords);

export const findPreparationRecordById = (id: string): PreparationRecord | null =>
  preparationRecords.find((record) => record.id === id) ?? null;

export const getPreparationRecordById = (id: string): PreparationRecord | null =>
  findPreparationRecordById(id);

export const getPreparationVehicleById = (
  vehicleId: string
): PreparationVehicleOption | null =>
  findPreparationVehicleById(vehicleId);

export const canAutoApprovePreparationForRole = (role: UserRole) =>
  role === UserRole.ADMIN || role === UserRole.SUPERVISOR;

export const isPreparationEditable = (status: PreparationStatus) =>
  !lockedPreparationStatuses.has(status);

const resolvePreparationStatus = (
  approvalStatus: PreparationApprovalStatus,
  existingStatus?: PreparationStatus,
  explicitStatus?: PreparationStatus
) => {
  if (explicitStatus) {
    return explicitStatus;
  }

  if (existingStatus) {
    return existingStatus;
  }

  switch (approvalStatus) {
    case 'approved':
      return PreparationStatus.IN_DISPATCH;
    case 'rejected':
      return PreparationStatus.REJECTED;
    default:
      return PreparationStatus.PENDING;
  }
};

export const savePreparationRecord = async ({
  id,
  vehicleId,
  requestedByUserId,
  requestedServices,
  customRequests,
  customerName,
  customerContactNo,
  notes,
  requestedByRole,
  requestedByName,
  dispatcherId,
  approvalStatus,
  approvedByRole,
  approvedByName,
  approvedAt,
  status,
  progress,
  dispatcherChecklist: providedDispatcherChecklist,
  completedAt,
  readyForReleaseAt,
}: SavePreparationRecordInput) => {
  const vehicle = findPreparationVehicleById(vehicleId);

  if (!vehicle) {
    throw new Error('Selected vehicle could not be found.');
  }

  const existingRecord = id
    ? preparationRecords.find((record) => record.id === id)
    : undefined;
  const resolvedApprovalStatus =
    approvalStatus ??
    existingRecord?.approvalStatus ??
    (canAutoApprovePreparationForRole(requestedByRole)
      ? 'approved'
      : 'awaiting_approval');
  const dispatcherChecklist = buildDispatcherChecklist(
    requestedServices,
    customRequests,
    providedDispatcherChecklist ?? existingRecord?.dispatcherChecklist
  );
  const checklistProgress = getChecklistProgressFromSteps(dispatcherChecklist);
  const nextStatus = resolvePreparationStatus(
    resolvedApprovalStatus,
    existingRecord?.status,
    status
  );
  const nextProgress =
    nextStatus === PreparationStatus.COMPLETED ||
    nextStatus === PreparationStatus.READY_FOR_RELEASE
      ? 100
      : nextStatus === PreparationStatus.PENDING ||
          nextStatus === PreparationStatus.REJECTED
        ? 0
        : progress ?? checklistProgress;
  const nextCompletedAt =
    nextStatus === PreparationStatus.COMPLETED
      ? toApiDateString(completedAt ?? existingRecord?.completedAt ?? new Date())
      : null;
  const nextReadyForReleaseAt =
    nextStatus === PreparationStatus.READY_FOR_RELEASE
      ? toApiDateString(
          readyForReleaseAt ?? existingRecord?.readyForReleaseAt ?? new Date()
        )
      : nextStatus === PreparationStatus.COMPLETED
        ? toApiDateString(
            readyForReleaseAt ??
              existingRecord?.readyForReleaseAt ??
              existingRecord?.completedAt ??
              new Date()
          )
        : null;

  const payload = {
    vehicleId,
    ...(requestedByUserId
      ? {
          requestedByUserId,
        }
      : {}),
    requestedServices,
    customRequests,
    customerName: customerName.trim(),
    customerContactNo: normalizeMobilePhoneNumber(customerContactNo),
    notes: notes.trim(),
    status: nextStatus,
    progress: nextProgress,
    requestedByRole,
    requestedByName: requestedByName.trim(),
    approvalStatus: resolvedApprovalStatus,
    approvedByRole:
      resolvedApprovalStatus === 'approved' ? approvedByRole ?? requestedByRole : null,
    approvedByName:
      resolvedApprovalStatus === 'approved'
        ? approvedByName?.trim() ?? requestedByName.trim()
        : null,
    approvedAt:
      resolvedApprovalStatus === 'approved'
        ? toApiDateString(approvedAt ?? existingRecord?.approvedAt ?? new Date())
        : null,
    dispatcherId: resolvedApprovalStatus === 'approved' ? dispatcherId ?? null : null,
    dispatcherChecklist,
    completedAt: nextCompletedAt,
    readyForReleaseAt: nextReadyForReleaseAt,
  };

  try {
    const response = id
      ? await api.patch(`/preparations/${id}`, payload)
      : await api.post('/preparations', payload);
    const savedRecord = mapPreparationRecord(
      getResponseData<PreparationApiRecord>(response)
    );

    upsertPreparationRecord(savedRecord);
    return savedRecord;
  } catch (error) {
    throw new Error(
      getApiErrorMessage(
        error,
        'The preparation request could not be saved right now.'
      )
    );
  }
};

export const deletePreparationRecord = async (preparationId: string) => {
  await api.delete(`/preparations/${preparationId}`);
  preparationRecords = preparationRecords.filter(
    (record) => record.id !== preparationId
  );
};

export const getDispatcherChecklistProgress = (
  record: Pick<PreparationRecord, 'dispatcherChecklist'>
) => getChecklistProgressFromSteps(record.dispatcherChecklist);

export const getPendingDispatcherPreparations = (dispatcherId?: string | null) =>
  getPreparationRecords().filter(
    (record) =>
      record.approvalStatus === 'approved' &&
      record.status === PreparationStatus.IN_DISPATCH &&
      buildDispatcherScopeMatcher(dispatcherId)(record)
  );

export const getCompletedDispatcherPreparations = (
  dispatcherId?: string | null
) =>
  getPreparationRecords().filter(
    (record) =>
      record.approvalStatus === 'approved' &&
      (record.status === PreparationStatus.COMPLETED ||
        record.status === PreparationStatus.READY_FOR_RELEASE) &&
      buildDispatcherScopeMatcher(dispatcherId)(record)
  );

export const getDispatcherDashboardSummary = (
  dispatcherId?: string | null
) => {
  const activePreparations = getPendingDispatcherPreparations(dispatcherId);
  const completedPreparations =
    getCompletedDispatcherPreparations(dispatcherId);

  return {
    total: activePreparations.length,
    inDispatch: activePreparations.length,
    completed: completedPreparations.filter(
      (record) => record.status === PreparationStatus.COMPLETED
    ).length,
    readyForRelease: completedPreparations.filter(
      (record) => record.status === PreparationStatus.READY_FOR_RELEASE
    ).length,
    nextPreparation: activePreparations[0] ?? null,
  };
};

export const toggleDispatcherChecklistStep = async (
  preparationId: string,
  stepId: string
): Promise<PreparationRecord> => {
  const existingRecord = findPreparationRecordById(preparationId);

  if (!existingRecord) {
    throw new Error('Selected preparation request could not be found.');
  }

  const dispatcherChecklist = existingRecord.dispatcherChecklist.map((step) =>
    step.id === stepId ? { ...step, completed: !step.completed } : step
  );
  const checklistProgress = getChecklistProgressFromSteps(dispatcherChecklist);

  return savePreparationRecord({
    ...existingRecord,
    id: existingRecord.id,
    requestedServices: existingRecord.requestedServices,
    customRequests: existingRecord.customRequests,
    customerName: existingRecord.customerName,
    customerContactNo: existingRecord.customerContactNo,
    notes: existingRecord.notes,
    requestedByRole: existingRecord.requestedByRole,
    requestedByName: existingRecord.requestedByName,
    dispatcherId: existingRecord.dispatcherId,
    dispatcherName: existingRecord.dispatcherName,
    approvalStatus: existingRecord.approvalStatus,
    approvedByRole: existingRecord.approvedByRole,
    approvedByName: existingRecord.approvedByName,
    approvedAt: existingRecord.approvedAt,
    status: PreparationStatus.IN_DISPATCH,
    progress: checklistProgress,
    dispatcherChecklist,
    completedAt: undefined,
    readyForReleaseAt: undefined,
  }).then((savedRecord) => {
    const patchedRecord = {
      ...savedRecord,
      dispatcherChecklist,
      progress: checklistProgress,
      status: PreparationStatus.IN_DISPATCH,
      completedAt: undefined,
      readyForReleaseAt: undefined,
    };

    upsertPreparationRecord(patchedRecord);
    return patchedRecord;
  });
};

export const completeDispatcherChecklist = async (
  preparationId: string
): Promise<PreparationRecord> => {
  const existingRecord = findPreparationRecordById(preparationId);

  if (!existingRecord) {
    throw new Error('Selected preparation request could not be found.');
  }

  const dispatcherChecklist = existingRecord.dispatcherChecklist.map((step) => ({
    ...step,
    completed: true,
  }));

  const savedRecord = await savePreparationRecord({
    ...existingRecord,
    id: existingRecord.id,
    requestedServices: existingRecord.requestedServices,
    customRequests: existingRecord.customRequests,
    customerName: existingRecord.customerName,
    customerContactNo: existingRecord.customerContactNo,
    notes: existingRecord.notes,
    requestedByRole: existingRecord.requestedByRole,
    requestedByName: existingRecord.requestedByName,
    dispatcherId: existingRecord.dispatcherId,
    dispatcherName: existingRecord.dispatcherName,
    approvalStatus: existingRecord.approvalStatus,
    approvedByRole: existingRecord.approvedByRole,
    approvedByName: existingRecord.approvedByName,
    approvedAt: existingRecord.approvedAt,
    status: PreparationStatus.READY_FOR_RELEASE,
    progress: 100,
    dispatcherChecklist,
    completedAt: undefined,
    readyForReleaseAt: new Date(),
  });

  const patchedRecord = {
    ...savedRecord,
    dispatcherChecklist,
    completedAt: undefined,
    readyForReleaseAt: formatDisplayDate(),
  };

  upsertPreparationRecord(patchedRecord);
  return patchedRecord;
};

export const confirmPreparationReadyForRelease = async (
  preparationId: string
): Promise<PreparationRecord> => {
  const existingRecord = findPreparationRecordById(preparationId);

  if (!existingRecord) {
    throw new Error('Selected preparation request could not be found.');
  }

  const checklistProgress = getChecklistProgressFromSteps(
    existingRecord.dispatcherChecklist
  );

  if (checklistProgress < 100) {
    throw new Error(
      'Complete every dispatcher checklist item before marking this unit ready for release.'
    );
  }

  return savePreparationRecord({
    ...existingRecord,
    id: existingRecord.id,
    requestedServices: existingRecord.requestedServices,
    customRequests: existingRecord.customRequests,
    customerName: existingRecord.customerName,
    customerContactNo: existingRecord.customerContactNo,
    notes: existingRecord.notes,
    requestedByRole: existingRecord.requestedByRole,
    requestedByName: existingRecord.requestedByName,
    dispatcherId: existingRecord.dispatcherId,
    dispatcherName: existingRecord.dispatcherName,
    approvalStatus: existingRecord.approvalStatus,
    approvedByRole: existingRecord.approvedByRole,
    approvedByName: existingRecord.approvedByName,
    approvedAt: existingRecord.approvedAt,
    status: PreparationStatus.READY_FOR_RELEASE,
    progress: 100,
    dispatcherChecklist: existingRecord.dispatcherChecklist,
    completedAt: undefined,
    readyForReleaseAt: new Date(),
  });
};

export const approvePreparationRequest = async (
  preparationId: string,
  approverRole: UserRole,
  approverName: string
): Promise<PreparationRecord> => {
  const existingRecord = findPreparationRecordById(preparationId);

  if (!existingRecord) {
    throw new Error('Selected preparation request could not be found.');
  }

  return savePreparationRecord({
    ...existingRecord,
    id: existingRecord.id,
    requestedServices: existingRecord.requestedServices,
    customRequests: existingRecord.customRequests,
    customerName: existingRecord.customerName,
    customerContactNo: existingRecord.customerContactNo,
    notes: existingRecord.notes,
    requestedByRole: existingRecord.requestedByRole,
    requestedByName: existingRecord.requestedByName,
    dispatcherId: existingRecord.dispatcherId,
    dispatcherName: existingRecord.dispatcherName,
    approvalStatus: 'approved',
    approvedByRole: approverRole,
    approvedByName: approverName.trim(),
    approvedAt: new Date(),
    status: PreparationStatus.IN_DISPATCH,
    progress: 0,
  });
};

export const getDispatcherChecklistCompletionText = (
  record: Pick<PreparationRecord, 'dispatcherChecklist'>
) => {
  const checklistCount = record.dispatcherChecklist.length;

  if (!checklistCount) {
    return 'No checklist steps generated yet';
  }

  const completedCount = record.dispatcherChecklist.filter(
    (step) => step.completed
  ).length;

  return `${completedCount}/${checklistCount} steps completed`;
};

export const getNextDispatcherChecklistLabel = (
  record: Pick<PreparationRecord, 'dispatcherChecklist'>
) =>
  record.dispatcherChecklist.find((step) => !step.completed)?.label ??
  'All checklist steps completed';

export const rejectPreparationRequest = async (
  preparationId: string
): Promise<PreparationRecord> => {
  const existingRecord = findPreparationRecordById(preparationId);

  if (!existingRecord) {
    throw new Error('Selected preparation request could not be found.');
  }

  return savePreparationRecord({
    ...existingRecord,
    id: existingRecord.id,
    requestedServices: existingRecord.requestedServices,
    customRequests: existingRecord.customRequests,
    customerName: existingRecord.customerName,
    customerContactNo: existingRecord.customerContactNo,
    notes: existingRecord.notes,
    requestedByRole: existingRecord.requestedByRole,
    requestedByName: existingRecord.requestedByName,
    approvalStatus: 'rejected',
    status: PreparationStatus.REJECTED,
    progress: 0,
  });
};

export const markPreparationCompleted = async (
  preparationId: string
): Promise<PreparationRecord> => {
  const existingRecord = findPreparationRecordById(preparationId);

  if (!existingRecord) {
    throw new Error('Selected preparation request could not be found.');
  }

  return savePreparationRecord({
    ...existingRecord,
    id: existingRecord.id,
    requestedServices: existingRecord.requestedServices,
    customRequests: existingRecord.customRequests,
    customerName: existingRecord.customerName,
    customerContactNo: existingRecord.customerContactNo,
    notes: existingRecord.notes,
    requestedByRole: existingRecord.requestedByRole,
    requestedByName: existingRecord.requestedByName,
    dispatcherId: existingRecord.dispatcherId,
    dispatcherName: existingRecord.dispatcherName,
    approvalStatus: existingRecord.approvalStatus,
    approvedByRole: existingRecord.approvedByRole,
    approvedByName: existingRecord.approvedByName,
    approvedAt: existingRecord.approvedAt,
    status: PreparationStatus.COMPLETED,
    progress: 100,
    completedAt: new Date(),
    readyForReleaseAt:
      parsePreparationDate(existingRecord.readyForReleaseAt) ?? new Date(),
  });
};

export const formatPreparationRoleLabel = (role: UserRole) => {
  switch (role) {
    case UserRole.ADMIN:
      return 'Admin';
    case UserRole.SUPERVISOR:
      return 'Supervisor';
    case UserRole.MANAGER:
      return 'Manager';
    case UserRole.SALES_AGENT:
      return 'Sales Agent';
    case UserRole.DISPATCHER:
      return 'Dispatcher';
    case UserRole.DRIVER:
      return 'Driver';
    default:
      return 'User';
  }
};

export const getPreparationRecordRequesterLabel = (record: PreparationRecord) =>
  `${formatPreparationRoleLabel(record.requestedByRole)} - ${record.requestedByName}`;

export const getPreparationApprovalLabel = (record: PreparationRecord) => {
  if (record.approvalStatus === 'rejected') {
    return 'Rejected by admin or supervisor';
  }

  if (record.approvalStatus !== 'approved') {
    return 'Awaiting admin or supervisor approval';
  }

  if (!record.approvedByRole || !record.approvedByName) {
    return 'Approved for dispatcher processing';
  }

  return `${formatPreparationRoleLabel(record.approvedByRole)} - ${record.approvedByName}`;
};

export const getPreparationRecordCompletionLabel = (record: PreparationRecord) =>
  record.status === PreparationStatus.READY_FOR_RELEASE
    ? record.readyForReleaseAt ?? record.completedAt
      ? `Ready for release ${record.readyForReleaseAt ?? record.completedAt}`
      : 'Ready for release'
    : record.completedAt
      ? `Completed ${record.completedAt}`
      : record.readyForReleaseAt
        ? `Completed ${record.readyForReleaseAt}`
        : 'Pending dispatcher completion';

export const getPreparationStatusLabel = (status: PreparationStatus) => {
  switch (status) {
    case PreparationStatus.PENDING:
      return 'Pending';
    case PreparationStatus.IN_DISPATCH:
      return 'In Dispatch';
    case PreparationStatus.COMPLETED:
      return 'Completed';
    case PreparationStatus.READY_FOR_RELEASE:
      return 'Ready for Release';
    case PreparationStatus.REJECTED:
      return 'Rejected';
  }
};

export const getPreparationBadgeStatus = (status: PreparationStatus) => {
  switch (status) {
    case PreparationStatus.PENDING:
      return 'pending';
    case PreparationStatus.IN_DISPATCH:
      return 'active';
    case PreparationStatus.COMPLETED:
      return 'completed';
    case PreparationStatus.READY_FOR_RELEASE:
      return 'assigned';
    case PreparationStatus.REJECTED:
      return 'cancelled';
  }
};

export const formatRequestedServices = (
  services: ServiceType[],
  customRequests: string[] = []
) =>
  services
    .map((service) => {
      const label = getPreparationServiceLabel(service);

      if (service === ServiceType.CUSTOM_REQUEST && customRequests.length) {
        return `${label} (${customRequests.length})`;
      }

      return label;
    })
    .join(', ');
