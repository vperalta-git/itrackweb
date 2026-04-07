'use client'

import { apiRequest } from '@/lib/api-client'
import {
  BackendPopulatedUser,
  BackendTestDriveBooking,
  BackendUnitAgentAllocation,
  BackendVehicle,
  getDisplayDate,
  getDisplayTime,
  getEntityId,
  getFullName,
  getIsoDate,
} from '@/lib/backend-helpers'
import {
  isValidMobilePhoneNumber,
  MOBILE_PHONE_VALIDATION_MESSAGE,
  normalizeMobilePhoneNumber,
} from '@/lib/phone'
import { type Role } from '@/lib/rbac'
import { type SessionUser } from '@/lib/session'

export interface TestDriveRequestRecord {
  id: string
  requestNumber: string
  customerName: string
  customerPhone: string
  vehicleStockNumber: string
  vehicleName: string
  scheduledDate: string
  scheduledTime: string
  salesAgent: string
  manager: string
  requestedByName: string
  requestedByRole: Role
  status: 'pending' | 'approved' | 'completed' | 'cancelled' | 'no-show'
  notes: string
  vehicleId: string
  requestedByUserId: string
}

const storageKey = 'itrack.test-drive.records'
export const TEST_DRIVE_UPDATED_EVENT = 'test-drive-updated'

const toRouteRole = (value: string): Role => {
  if (value === 'sales_agent') return 'sales-agent'
  if (value === 'supervisor' || value === 'manager' || value === 'admin') return value
  return 'sales-agent'
}

const buildRequestNumber = (id: string, createdAt?: string) => {
  const year = createdAt ? new Date(createdAt).getFullYear() : new Date().getFullYear()
  return `TD-${year}-${id.slice(-4).toUpperCase().padStart(4, '0')}`
}

export function loadTestDriveRecords() {
  if (typeof window === 'undefined') return [] as TestDriveRequestRecord[]

  try {
    return JSON.parse(window.localStorage.getItem(storageKey) ?? '[]') as TestDriveRequestRecord[]
  } catch {
    return []
  }
}

export function persistTestDriveRecords(records: TestDriveRequestRecord[]) {
  if (typeof window === 'undefined') return

  window.localStorage.setItem(storageKey, JSON.stringify(records))
  window.dispatchEvent(new Event(TEST_DRIVE_UPDATED_EVENT))
}

const mapBooking = (
  booking: BackendTestDriveBooking,
  unitAllocationByVehicleId: Map<string, BackendUnitAgentAllocation>,
  usersById: Map<string, BackendPopulatedUser>
): TestDriveRequestRecord => {
  const id = getEntityId(booking)
  const vehicleId = getEntityId(booking.vehicleId)
  const vehicle =
    booking.vehicleId && typeof booking.vehicleId === 'object' ? booking.vehicleId : null
  const unitAllocation = unitAllocationByVehicleId.get(vehicleId)
  const requester = usersById.get(getEntityId(booking.requestedByUserId))

  return {
    id,
    requestNumber: buildRequestNumber(id, booking.createdAt),
    customerName: booking.customerName ?? '',
    customerPhone: booking.customerPhone ?? '',
    vehicleStockNumber: vehicle?.conductionNumber ?? '',
    vehicleName: [vehicle?.unitName ?? '', vehicle?.variation ?? ''].join(' ').trim(),
    scheduledDate: getDisplayDate(booking.scheduledDate),
    scheduledTime: booking.scheduledTime ? getDisplayTime(booking.scheduledTime) : '',
    salesAgent: getFullName(unitAllocation?.salesAgentId) || 'Unassigned',
    manager: getFullName(unitAllocation?.managerId) || '',
    requestedByName: getFullName(requester) || 'Unknown',
    requestedByRole: toRouteRole(requester?.role ?? 'sales_agent'),
    status: (booking.status ?? 'pending') as TestDriveRequestRecord['status'],
    notes: booking.notes ?? '',
    vehicleId,
    requestedByUserId: getEntityId(booking.requestedByUserId),
  }
}

export async function syncTestDriveRecordsFromBackend() {
  const [bookings, unitAllocations, users] = await Promise.all([
    apiRequest<BackendTestDriveBooking[]>('/test-drive-bookings'),
    apiRequest<BackendUnitAgentAllocation[]>('/unit-agent-allocations'),
    apiRequest<BackendPopulatedUser[]>('/users'),
  ])

  const unitAllocationByVehicleId = new Map(
    unitAllocations.map((allocation) => [getEntityId(allocation.vehicleId), allocation])
  )
  const usersById = new Map(users.map((user) => [getEntityId(user), user]))

  const mappedRecords = bookings
    .map((booking) => mapBooking(booking, unitAllocationByVehicleId, usersById))
    .sort((left, right) => right.id.localeCompare(left.id))

  persistTestDriveRecords(mappedRecords)
  return mappedRecords
}

export async function syncTestDriveVehiclesFromBackend() {
  const [vehicles, unitAllocations] = await Promise.all([
    apiRequest<BackendVehicle[]>('/vehicles', {
      query: { status: 'available' },
    }),
    apiRequest<BackendUnitAgentAllocation[]>('/unit-agent-allocations'),
  ])

  const allocatedVehicleIds = new Set(
    unitAllocations.map((allocation) => getEntityId(allocation.vehicleId))
  )

  return vehicles
    .filter((vehicle) => !allocatedVehicleIds.has(getEntityId(vehicle)))
    .map((vehicle) => ({
      id: getEntityId(vehicle),
      vehicleStockNumber: vehicle.conductionNumber ?? '',
      vehicleName: [vehicle.unitName ?? '', vehicle.variation ?? ''].join(' ').trim(),
      status: vehicle.status ?? 'available',
      allocatedTo: null,
    }))
}

export async function createTestDriveRecord(input: {
  currentUser: SessionUser
  vehicleId: string
  customerName: string
  customerPhone: string
  scheduledAt: string
  notes?: string
}) {
  const schedule = new Date(input.scheduledAt)
  const isApprover =
    input.currentUser.role === 'admin' || input.currentUser.role === 'supervisor'
  const customerPhone = normalizeMobilePhoneNumber(input.customerPhone)

  if (!isValidMobilePhoneNumber(customerPhone)) {
    throw new Error(MOBILE_PHONE_VALIDATION_MESSAGE)
  }

  await apiRequest('/test-drive-bookings', {
    method: 'POST',
    body: {
      vehicleId: input.vehicleId,
      requestedByUserId: input.currentUser.id,
      customerName: input.customerName.trim(),
      customerPhone,
      scheduledDate: getIsoDate(schedule.toISOString()),
      scheduledTime: schedule.toISOString().slice(11, 16),
      notes: input.notes?.trim() ?? '',
      status: isApprover ? 'approved' : 'pending',
    },
  })

  return syncTestDriveRecordsFromBackend()
}

export async function updateTestDriveRecord(
  id: string,
  input: {
    vehicleId: string
    customerName: string
    customerPhone: string
    scheduledAt: string
    notes?: string
  }
) {
  const schedule = new Date(input.scheduledAt)
  const customerPhone = normalizeMobilePhoneNumber(input.customerPhone)

  if (!isValidMobilePhoneNumber(customerPhone)) {
    throw new Error(MOBILE_PHONE_VALIDATION_MESSAGE)
  }

  await apiRequest(`/test-drive-bookings/${id}`, {
    method: 'PATCH',
    body: {
      vehicleId: input.vehicleId,
      customerName: input.customerName.trim(),
      customerPhone,
      scheduledDate: getIsoDate(schedule.toISOString()),
      scheduledTime: schedule.toISOString().slice(11, 16),
      notes: input.notes?.trim() ?? '',
    },
  })

  return syncTestDriveRecordsFromBackend()
}

export async function updateTestDriveStatusRecord(
  id: string,
  status: TestDriveRequestRecord['status']
) {
  await apiRequest(`/test-drive-bookings/${id}`, {
    method: 'PATCH',
    body: { status },
  })

  return syncTestDriveRecordsFromBackend()
}

export async function deleteTestDriveRecord(id: string) {
  await apiRequest(`/test-drive-bookings/${id}`, {
    method: 'DELETE',
  })

  return syncTestDriveRecordsFromBackend()
}
