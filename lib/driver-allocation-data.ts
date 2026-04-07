'use client'

import { apiRequest } from '@/lib/api-client'
import {
  BackendDriverAllocation,
  BackendRouteStop,
  BackendUnitAgentAllocation,
  getEntityId,
  getFullName,
  getIsoDate,
  makeRouteStop,
  mapAllocationStatusToUi,
  mapUiAllocationStatusToBackend,
} from '@/lib/backend-helpers'
import { syncInventoryVehiclesFromBackend } from '@/lib/inventory-data'
import { requestWebNotificationRefresh } from '@/lib/notification-preferences'

export interface DriverAllocationRecord {
  id: string
  date: string
  unitName: string
  conductionNumber: string
  bodyColor: string
  variation: string
  salesAgent: string
  manager: string
  assignedDriver: string
  driverPhone: string
  pickupLocation: string
  destination: string
  status: 'pending' | 'assigned' | 'in-transit' | 'available' | 'completed' | 'cancelled'
  managerId?: string | null
  driverId?: string | null
  vehicleId?: string | null
  notes?: string
  routeProgress?: number | null
  estimatedDuration?: number | null
  pickupLocationDetails?: BackendRouteStop | null
  destinationLocationDetails?: BackendRouteStop | null
}

export const DRIVER_ALLOCATIONS_STORAGE_KEY = 'itrack.driver.allocations'
export const DRIVER_ALLOCATIONS_UPDATED_EVENT = 'driver-allocations-updated'
export const DEFAULT_IN_TRANSIT_PROGRESS = 0.62

const EARTH_RADIUS_KM = 6371

const toRadians = (value: number) => (value * Math.PI) / 180

const EMPTY_DRIVER_ALLOCATIONS: DriverAllocationRecord[] = []

const safeParseAllocations = (raw: string | null) => {
  if (!raw) return EMPTY_DRIVER_ALLOCATIONS

  try {
    return JSON.parse(raw) as DriverAllocationRecord[]
  } catch {
    return EMPTY_DRIVER_ALLOCATIONS
  }
}

export function loadDriverAllocations(): DriverAllocationRecord[] {
  if (typeof window === 'undefined') return EMPTY_DRIVER_ALLOCATIONS
  return safeParseAllocations(window.localStorage.getItem(DRIVER_ALLOCATIONS_STORAGE_KEY))
}

export function persistDriverAllocations(allocations: DriverAllocationRecord[]) {
  if (typeof window === 'undefined') return

  window.localStorage.setItem(DRIVER_ALLOCATIONS_STORAGE_KEY, JSON.stringify(allocations))
  window.dispatchEvent(new Event(DRIVER_ALLOCATIONS_UPDATED_EVENT))
}

const mapDriverAllocationRecord = (
  allocation: BackendDriverAllocation,
  unitAllocationByVehicleId: Map<string, BackendUnitAgentAllocation>
): DriverAllocationRecord => {
  const vehicleId = getEntityId(allocation.vehicleId)
  const unitAllocation = unitAllocationByVehicleId.get(vehicleId)
  const vehicle =
    allocation.vehicleId && typeof allocation.vehicleId === 'object' ? allocation.vehicleId : null
  const driver =
    allocation.driverId && typeof allocation.driverId === 'object' ? allocation.driverId : null

  return {
    id: getEntityId(allocation),
    date: getIsoDate(allocation.createdAt),
    unitName: vehicle?.unitName ?? '',
    conductionNumber: vehicle?.conductionNumber ?? '',
    bodyColor: vehicle?.bodyColor ?? '',
    variation: vehicle?.variation ?? '',
    salesAgent: getFullName(unitAllocation?.salesAgentId) || 'Unassigned',
    manager:
      getFullName(unitAllocation?.managerId) ||
      getFullName(allocation.managerId) ||
      'Unassigned',
    assignedDriver: getFullName(driver),
    driverPhone: driver?.phone ?? '',
    pickupLocation:
      allocation.pickupLocation?.name ?? allocation.pickupLocation?.address ?? '',
    destination:
      allocation.destinationLocation?.name ?? allocation.destinationLocation?.address ?? '',
    status: mapAllocationStatusToUi(allocation.status) as DriverAllocationRecord['status'],
    managerId: getEntityId(unitAllocation?.managerId ?? allocation.managerId),
    driverId: getEntityId(allocation.driverId),
    vehicleId,
    notes: allocation.notes ?? '',
    routeProgress: allocation.routeProgress ?? null,
    estimatedDuration: allocation.estimatedDuration ?? null,
    pickupLocationDetails: allocation.pickupLocation ?? null,
    destinationLocationDetails: allocation.destinationLocation ?? null,
  }
}

const sortAllocations = (allocations: DriverAllocationRecord[]) =>
  [...allocations].sort((left, right) => right.date.localeCompare(left.date))

export async function syncDriverAllocationsFromBackend() {
  const [allocations, unitAgentAllocations] = await Promise.all([
    apiRequest<BackendDriverAllocation[]>('/driver-allocations'),
    apiRequest<BackendUnitAgentAllocation[]>('/unit-agent-allocations'),
  ])

  const unitAllocationByVehicleId = new Map(
    unitAgentAllocations.map((allocation) => [getEntityId(allocation.vehicleId), allocation])
  )

  const mappedAllocations = sortAllocations(
    allocations.map((allocation) =>
      mapDriverAllocationRecord(allocation, unitAllocationByVehicleId)
    )
  )

  persistDriverAllocations(mappedAllocations)
  return mappedAllocations
}

export async function createDriverAllocationRecord(input: {
  managerId?: string | null
  vehicleId: string
  driverId: string
  pickupLocation: string
  destination: string
  notes?: string
}) {
  await apiRequest('/driver-allocations', {
    method: 'POST',
    body: {
      managerId: input.managerId ?? null,
      vehicleId: input.vehicleId,
      driverId: input.driverId,
      pickupLocation: makeRouteStop(input.pickupLocation),
      destinationLocation: makeRouteStop(input.destination),
      notes: input.notes?.trim() ?? '',
      status: 'pending',
    },
  })

  await syncInventoryVehiclesFromBackend()
  const nextAllocations = await syncDriverAllocationsFromBackend()
  requestWebNotificationRefresh()
  return nextAllocations
}

export async function updateDriverAllocationRecord(
  id: string,
  input: {
    managerId?: string | null
    vehicleId: string
    driverId: string
    pickupLocation: string
    destination: string
    status: DriverAllocationRecord['status']
    notes?: string
  }
) {
  await apiRequest(`/driver-allocations/${id}`, {
    method: 'PATCH',
    body: {
      managerId: input.managerId ?? null,
      vehicleId: input.vehicleId,
      driverId: input.driverId,
      pickupLocation: makeRouteStop(input.pickupLocation),
      destinationLocation: makeRouteStop(input.destination),
      status: mapUiAllocationStatusToBackend(input.status),
      notes: input.notes?.trim() ?? '',
    },
  })

  await syncInventoryVehiclesFromBackend()
  const nextAllocations = await syncDriverAllocationsFromBackend()
  requestWebNotificationRefresh()
  return nextAllocations
}

export async function deleteDriverAllocationRecord(id: string) {
  await apiRequest(`/driver-allocations/${id}`, {
    method: 'DELETE',
  })

  await syncInventoryVehiclesFromBackend()
  const nextAllocations = await syncDriverAllocationsFromBackend()
  requestWebNotificationRefresh()
  return nextAllocations
}

export function getDriverAllocationProgress(allocation: DriverAllocationRecord) {
  switch (allocation.status) {
    case 'pending':
      return 0
    case 'assigned':
      return 0.15
    case 'in-transit':
      return Math.min(
        Math.max(allocation.routeProgress ?? DEFAULT_IN_TRANSIT_PROGRESS, 0),
        1
      )
    case 'available':
    case 'completed':
      return 1
    default:
      return 0
  }
}

export function getDriverAllocationLiveCoordinates(allocation: DriverAllocationRecord) {
  const pickup = allocation.pickupLocationDetails
  const destination = allocation.destinationLocationDetails

  if (!pickup || !destination) {
    return null
  }

  const progress = getDriverAllocationProgress(allocation)

  return {
    latitude:
      pickup.latitude + (destination.latitude - pickup.latitude) * progress,
    longitude:
      pickup.longitude + (destination.longitude - pickup.longitude) * progress,
  }
}

export function getDriverAllocationRemainingDistanceKm(allocation: DriverAllocationRecord) {
  if (allocation.status !== 'in-transit') {
    return null
  }

  const pickup = allocation.pickupLocationDetails
  const destination = allocation.destinationLocationDetails

  if (!pickup || !destination) {
    return null
  }

  const latitudeDelta = toRadians(destination.latitude - pickup.latitude)
  const longitudeDelta = toRadians(destination.longitude - pickup.longitude)
  const pickupLatitude = toRadians(pickup.latitude)
  const destinationLatitude = toRadians(destination.latitude)
  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(pickupLatitude) *
      Math.cos(destinationLatitude) *
      Math.sin(longitudeDelta / 2) ** 2
  const totalDistanceKm =
    2 *
    EARTH_RADIUS_KM *
    Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine))

  return Math.max(totalDistanceKm * (1 - getDriverAllocationProgress(allocation)), 0)
}

export function getDriverAllocationRemainingDistanceLabel(allocation: DriverAllocationRecord) {
  const remainingDistanceKm = getDriverAllocationRemainingDistanceKm(allocation)
  return remainingDistanceKm === null ? null : `${remainingDistanceKm.toFixed(1)} km left`
}

export function getDriverAllocationEtaLabel(allocation: DriverAllocationRecord) {
  if (allocation.status === 'pending') {
    return 'Awaiting driver acceptance'
  }

  if (allocation.status === 'assigned') {
    return 'Driver accepted assignment'
  }

  if (allocation.status === 'available') {
    return 'On site'
  }

  if (allocation.status === 'completed') {
    return 'Completed'
  }

  if (allocation.status === 'in-transit') {
    const estimatedDuration = allocation.estimatedDuration ?? 25
    const remainingMinutes = Math.max(
      1,
      Math.round(estimatedDuration * (1 - getDriverAllocationProgress(allocation)))
    )

    return `${remainingMinutes} mins`
  }

  return 'Pending'
}
