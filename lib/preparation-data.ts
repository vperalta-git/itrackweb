'use client'

import { apiRequest } from '@/lib/api-client'
import {
  BackendPreparation,
  BackendUnitAgentAllocation,
  formatDateTimeLabel,
  formatServiceLabel,
  getEntityId,
  getFullName,
  mapPreparationStatusToUi,
  mapUiPreparationStatusToBackend,
  mapUiServiceLabelToBackend,
} from '@/lib/backend-helpers'
import {
  isValidMobilePhoneNumber,
  MOBILE_PHONE_VALIDATION_MESSAGE,
  normalizeMobilePhoneNumber,
} from '@/lib/phone'
import { requestWebNotificationRefresh } from '@/lib/notification-preferences'
import { mapUserRoleToBackendRole, type SessionUser } from '@/lib/session'

export interface PreparationRequestRecord {
  id: string
  dateCreated: string
  dateCreatedIso: string
  conductionNumber: string
  unitName: string
  service: string
  salesAgent: string
  manager: string
  customerName: string
  contactNumber: string
  status: 'pending' | 'in-dispatch' | 'completed' | 'ready-for-release' | 'rejected'
  estimatedTime: string
  progress: number
  notes: string
  vehicleId: string
  requestedServices: string[]
  customRequests: string[]
  approvalStatus: string
  requestedByName: string
  requestedByRole: string
  completedAt?: string
  readyForReleaseAt?: string
  dispatcherChecklist: Array<{
    id: string
    label: string
    completed: boolean
  }>
}

const storageKey = 'itrack.preparations.records'
export const PREPARATIONS_UPDATED_EVENT = 'preparations-updated'

const estimateTime = (serviceCount: number) => {
  if (serviceCount >= 4) return '1 day'
  if (serviceCount >= 2) return '5 hours'
  return '3 hours'
}

const calculatePreparationProgress = (
  dispatcherChecklist: BackendPreparation['dispatcherChecklist']
) => {
  const checklist = dispatcherChecklist ?? []

  if (checklist.length === 0) {
    return 0
  }

  const completedCount = checklist.filter((item) => item.completed).length
  return Math.round((completedCount / checklist.length) * 100)
}

export function loadPreparationRecords() {
  if (typeof window === 'undefined') return [] as PreparationRequestRecord[]

  try {
    return JSON.parse(
      window.localStorage.getItem(storageKey) ?? '[]'
    ) as PreparationRequestRecord[]
  } catch {
    return []
  }
}

export function persistPreparationRecords(records: PreparationRequestRecord[]) {
  if (typeof window === 'undefined') return

  window.localStorage.setItem(storageKey, JSON.stringify(records))
  window.dispatchEvent(new Event(PREPARATIONS_UPDATED_EVENT))
}

const mapPreparation = (
  preparation: BackendPreparation,
  unitAllocationByVehicleId: Map<string, BackendUnitAgentAllocation>
): PreparationRequestRecord => {
  const vehicleId = getEntityId(preparation.vehicleId)
  const vehicle =
    preparation.vehicleId && typeof preparation.vehicleId === 'object'
      ? preparation.vehicleId
      : null
  const unitAllocation = unitAllocationByVehicleId.get(vehicleId)
  const requestedServices = preparation.requestedServices ?? []
  const customRequests = preparation.customRequests ?? []
  const serviceLabels = [...requestedServices.map(formatServiceLabel), ...customRequests]

  return {
    id: getEntityId(preparation),
    dateCreated: formatDateTimeLabel(preparation.createdAt),
    dateCreatedIso: preparation.createdAt ?? new Date(0).toISOString(),
    conductionNumber: vehicle?.conductionNumber ?? '',
    unitName: [vehicle?.unitName ?? '', vehicle?.variation ?? ''].join(' ').trim(),
    service: serviceLabels.join(', '),
    salesAgent: getFullName(unitAllocation?.salesAgentId) || (preparation.requestedByName ?? ''),
    manager: getFullName(unitAllocation?.managerId) || '',
    customerName: preparation.customerName ?? '',
    contactNumber: preparation.customerContactNo ?? '',
    status: mapPreparationStatusToUi(preparation.status) as PreparationRequestRecord['status'],
    estimatedTime: estimateTime(serviceLabels.length),
    progress: calculatePreparationProgress(preparation.dispatcherChecklist),
    notes: preparation.notes ?? '',
    vehicleId,
    requestedServices,
    customRequests,
    approvalStatus: preparation.approvalStatus ?? 'awaiting_approval',
    requestedByName: preparation.requestedByName ?? '',
    requestedByRole: preparation.requestedByRole ?? '',
    completedAt: preparation.completedAt ?? undefined,
    readyForReleaseAt: preparation.readyForReleaseAt ?? undefined,
    dispatcherChecklist: preparation.dispatcherChecklist ?? [],
  }
}

export async function syncPreparationRecordsFromBackend() {
  const [preparations, unitAllocations] = await Promise.all([
    apiRequest<BackendPreparation[]>('/preparations'),
    apiRequest<BackendUnitAgentAllocation[]>('/unit-agent-allocations'),
  ])

  const unitAllocationByVehicleId = new Map(
    unitAllocations.map((allocation) => [getEntityId(allocation.vehicleId), allocation])
  )

  const mappedPreparations = preparations
    .map((preparation) => mapPreparation(preparation, unitAllocationByVehicleId))
    .sort((left, right) => right.dateCreatedIso.localeCompare(left.dateCreatedIso))

  persistPreparationRecords(mappedPreparations)
  return mappedPreparations
}

export async function createPreparationRecord(input: {
  currentUser: SessionUser
  vehicleId: string
  requestedServices: string[]
  customRequests: string[]
  customerName: string
  contactNumber: string
  notes?: string
}) {
  const isApprover =
    input.currentUser.role === 'admin' || input.currentUser.role === 'supervisor'
  const serviceLabels = [...input.requestedServices, ...input.customRequests]
  const customerContactNo = normalizeMobilePhoneNumber(input.contactNumber)

  if (!isValidMobilePhoneNumber(customerContactNo)) {
    throw new Error(MOBILE_PHONE_VALIDATION_MESSAGE)
  }

  await apiRequest('/preparations', {
    method: 'POST',
    body: {
      vehicleId: input.vehicleId,
      requestedByUserId: input.currentUser.id,
      requestedServices: input.requestedServices.map(mapUiServiceLabelToBackend),
      customRequests: input.customRequests,
      customerName: input.customerName.trim(),
      customerContactNo,
      notes: input.notes?.trim() ?? '',
      status: isApprover ? 'in_dispatch' : 'pending',
      progress: 0,
      requestedByRole: mapUserRoleToBackendRole(input.currentUser.role),
      requestedByName: `${input.currentUser.firstName} ${input.currentUser.lastName}`.trim(),
      approvalStatus: isApprover ? 'approved' : 'awaiting_approval',
      approvedByRole: isApprover ? mapUserRoleToBackendRole(input.currentUser.role) : null,
      approvedByName: isApprover
        ? `${input.currentUser.firstName} ${input.currentUser.lastName}`.trim()
        : null,
      approvedAt: isApprover ? new Date().toISOString() : null,
      dispatcherChecklist: serviceLabels.map((label, index) => ({
        id: `dispatch-step-${index + 1}`,
        label,
        completed: false,
      })),
    },
  })

  const nextRecords = await syncPreparationRecordsFromBackend()
  requestWebNotificationRefresh()
  return nextRecords
}

export async function updatePreparationRecord(
  id: string,
  input: {
    requestedServices: string[]
    customRequests: string[]
    customerName: string
    contactNumber: string
    notes?: string
    vehicleId?: string
  }
) {
  const serviceLabels = [...input.requestedServices, ...input.customRequests]
  const customerContactNo = normalizeMobilePhoneNumber(input.contactNumber)

  if (!isValidMobilePhoneNumber(customerContactNo)) {
    throw new Error(MOBILE_PHONE_VALIDATION_MESSAGE)
  }

  await apiRequest(`/preparations/${id}`, {
    method: 'PATCH',
    body: {
      ...(input.vehicleId ? { vehicleId: input.vehicleId } : {}),
      requestedServices: input.requestedServices.map(mapUiServiceLabelToBackend),
      customRequests: input.customRequests,
      customerName: input.customerName.trim(),
      customerContactNo,
      notes: input.notes?.trim() ?? '',
      dispatcherChecklist: serviceLabels.map((label, index) => ({
        id: `dispatch-step-${index + 1}`,
        label,
        completed: false,
      })),
    },
  })

  const nextRecords = await syncPreparationRecordsFromBackend()
  requestWebNotificationRefresh()
  return nextRecords
}

export async function updatePreparationStatusRecord(
  id: string,
  input: {
    status: PreparationRequestRecord['status']
    progress: number
    approvalStatus?: string
    approvedByRole?: string | null
    approvedByName?: string | null
    approvedAt?: string | null
    completedAt?: string | null
    readyForReleaseAt?: string | null
  }
) {
  await apiRequest(`/preparations/${id}`, {
    method: 'PATCH',
    body: {
      status: mapUiPreparationStatusToBackend(input.status),
      progress: input.progress,
      approvalStatus: input.approvalStatus,
      approvedByRole: input.approvedByRole,
      approvedByName: input.approvedByName,
      approvedAt: input.approvedAt,
      completedAt: input.completedAt,
      readyForReleaseAt: input.readyForReleaseAt,
    },
  })

  const nextRecords = await syncPreparationRecordsFromBackend()
  requestWebNotificationRefresh()
  return nextRecords
}

export async function deletePreparationRecord(id: string) {
  await apiRequest(`/preparations/${id}`, {
    method: 'DELETE',
  })

  const nextRecords = await syncPreparationRecordsFromBackend()
  requestWebNotificationRefresh()
  return nextRecords
}
