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
import { createNotificationRecord } from '@/lib/notifications-data'
import { requestWebNotificationRefresh } from '@/lib/notification-preferences'
import { mapUserRoleToBackendRole, type SessionUser } from '@/lib/session'
import { loadUsers, syncUsersFromBackend, type SystemUser } from '@/lib/user-data'

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
const COMPLETION_NOTIFIED_STORAGE_KEY = 'itrack.preparations.completion-notified'

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

function loadCompletionNotificationMap() {
  if (typeof window === 'undefined') return {} as Record<string, string>

  try {
    return JSON.parse(
      window.localStorage.getItem(COMPLETION_NOTIFIED_STORAGE_KEY) ?? '{}'
    ) as Record<string, string>
  } catch {
    return {} as Record<string, string>
  }
}

function persistCompletionNotificationMap(map: Record<string, string>) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(COMPLETION_NOTIFIED_STORAGE_KEY, JSON.stringify(map))
}

const isPreparationComplete = (record: PreparationRequestRecord) =>
  record.approvalStatus === 'approved' &&
  record.progress >= 100 &&
  (record.status === 'completed' || record.status === 'ready-for-release')

async function notifyApproversOfCompletedPreparations(records: PreparationRequestRecord[]) {
  const completionNotificationMap = loadCompletionNotificationMap()
  const pendingCompletedRecords = records.filter(
    (record) => isPreparationComplete(record) && !completionNotificationMap[record.id]
  )

  if (pendingCompletedRecords.length === 0) {
    return
  }

  const users =
    loadUsers().length > 0 ? loadUsers() : await syncUsersFromBackend().catch(() => [] as SystemUser[])
  const approvers = users.filter(
    (user) =>
      user.status === 'active' && (user.role === 'admin' || user.role === 'supervisor')
  )

  if (approvers.length === 0) {
    return
  }

  for (const record of pendingCompletedRecords) {
    const title = 'Vehicle Preparation Complete'
    const message = `Preparation for ${record.conductionNumber} is now 100% complete and ready for admin/supervisor review.`

    await Promise.allSettled(
      approvers.map((user) =>
        createNotificationRecord({
          userId: user.id,
          title,
          message,
          type: 'preparation',
          data: {
            preparationId: record.id,
            vehicleId: record.vehicleId,
            conductionNumber: record.conductionNumber,
            status: record.status,
          },
        })
      )
    )

    completionNotificationMap[record.id] = new Date().toISOString()
  }

  persistCompletionNotificationMap(completionNotificationMap)
  requestWebNotificationRefresh()
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
  await notifyApproversOfCompletedPreparations(mappedPreparations)
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
  console.log('[Preparation][Frontend] Updating preparation status.', {
    id,
    status: input.status,
    progress: input.progress,
    approvalStatus: input.approvalStatus ?? null,
    completedAt: input.completedAt ?? null,
    readyForReleaseAt: input.readyForReleaseAt ?? null,
  })

  if (input.status === 'completed') {
    console.log('[Preparation][Frontend] SMS handoff to backend is being triggered by this status update.', {
      id,
      status: input.status,
    })
  }

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
  console.log('[Preparation][Frontend] Preparation status update completed.', {
    id,
    status: input.status,
    recordsCount: nextRecords.length,
  })
  if (input.status === 'completed') {
    console.log('[Preparation][Frontend] Backend accepted the update. SMS processing should now be running in the backend logs.', {
      id,
    })
  }
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
