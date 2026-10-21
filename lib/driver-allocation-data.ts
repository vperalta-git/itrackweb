'use client'

import { apiRequest } from '@/lib/api-client'
import {
  BackendDriverAllocation,
  BackendLiveLocation,
  BackendRouteStop,
  BackendUnitAgentAllocation,
  getEntityId,
  getFullName,
  getIsoDate,
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
  scheduledShipmentAt?: string | null
  actualStartTime?: string | null
  completedAt?: string | null
  currentLocation?: DriverAllocationLiveLocation | null
  stopRequest?: {
    status: 'none' | 'pending' | 'approved' | 'rejected'
    reason: string
    requestedAt?: string | null
    reviewedAt?: string | null
    reviewNotes?: string
  } | null
  pickupLocationDetails?: BackendRouteStop | null
  destinationLocationDetails?: BackendRouteStop | null
}

export interface DriverAllocationLiveLocation {
  latitude: number
  longitude: number
  accuracy?: number | null
  updatedAt?: string | null
}

export const DRIVER_ALLOCATIONS_STORAGE_KEY = 'itrack.driver.allocations'
export const DRIVER_ALLOCATIONS_UPDATED_EVENT = 'driver-allocations-updated'

const EARTH_RADIUS_KM = 6371
// Match the existing backend safety monitor: five minutes stale, two minutes
// to receive the first GPS fix after departure.
export const GPS_STALE_AFTER_MS = 300_000
export const GPS_FRESH_FOR_MS = 60_000
export const GPS_MISSING_AFTER_START_MS = 120_000

const toRadians = (value: number) => (value * Math.PI) / 180

const hasValidCoordinates = (
  value: BackendRouteStop | BackendLiveLocation | null | undefined
): value is { latitude: number; longitude: number } =>
  Boolean(
    value &&
      typeof value.latitude === 'number' &&
      typeof value.longitude === 'number' &&
      Number.isFinite(value.latitude) &&
      Number.isFinite(value.longitude) &&
      Math.abs(value.latitude) <= 90 && Math.abs(value.longitude) <= 180
  )

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
  const currentLocationPayload = allocation.currentLocation
  const currentLocation =
    currentLocationPayload &&
    typeof currentLocationPayload.latitude === 'number' &&
    typeof currentLocationPayload.longitude === 'number' &&
    Number.isFinite(currentLocationPayload.latitude) &&
    Number.isFinite(currentLocationPayload.longitude)
      ? {
          latitude: currentLocationPayload.latitude,
          longitude: currentLocationPayload.longitude,
          accuracy: currentLocationPayload.accuracy ?? null,
          updatedAt: currentLocationPayload.updatedAt ?? currentLocationPayload.timestamp ?? null,
        }
      : null

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
    scheduledShipmentAt: allocation.scheduledShipmentAt ?? null,
    actualStartTime: allocation.startTime ?? null,
    completedAt: allocation.endTime ?? null,
    currentLocation,
    stopRequest: allocation.stopRequest
      ? {
          status: allocation.stopRequest.status ?? 'none',
          reason: allocation.stopRequest.reason ?? '',
          requestedAt: allocation.stopRequest.requestedAt ?? null,
          reviewedAt: allocation.stopRequest.reviewedAt ?? null,
          reviewNotes: allocation.stopRequest.reviewNotes ?? '',
        }
      : null,
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
  pickupLocation: BackendRouteStop
  destinationLocation: BackendRouteStop
  notes?: string
  scheduledShipmentAt?: string | null
}) {
  await apiRequest('/driver-allocations', {
    method: 'POST',
    body: {
      managerId: input.managerId ?? null,
      vehicleId: input.vehicleId,
      driverId: input.driverId,
      pickupLocation: input.pickupLocation,
      destinationLocation: input.destinationLocation,
      scheduledShipmentAt: input.scheduledShipmentAt ?? null,
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
    pickupLocation: BackendRouteStop
    destinationLocation: BackendRouteStop
    status: DriverAllocationRecord['status']
    notes?: string
    scheduledShipmentAt?: string | null
  }
) {
  await apiRequest(`/driver-allocations/${id}`, {
    method: 'PATCH',
    body: {
      managerId: input.managerId ?? null,
      vehicleId: input.vehicleId,
      driverId: input.driverId,
      pickupLocation: input.pickupLocation,
      destinationLocation: input.destinationLocation,
      scheduledShipmentAt: input.scheduledShipmentAt ?? null,
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

export async function reviewDriverAllocationStopRequestRecord(
  id: string,
  input: {
    action: 'approve' | 'reject'
    reviewNotes?: string
  }
) {
  await apiRequest(`/driver-allocations/${id}/stop-request`, {
    method: 'PATCH',
    body: {
      action: input.action,
      reviewNotes: input.reviewNotes?.trim() ?? '',
    },
  })

  await syncInventoryVehiclesFromBackend()
  const nextAllocations = await syncDriverAllocationsFromBackend()
  requestWebNotificationRefresh()
  return nextAllocations
}

function getDistanceBetweenLocationsKm(
  origin: { latitude: number; longitude: number },
  destination: { latitude: number; longitude: number }
) {
  const latitudeDelta = toRadians(destination.latitude - origin.latitude)
  const longitudeDelta = toRadians(destination.longitude - origin.longitude)
  const originLatitude = toRadians(origin.latitude)
  const destinationLatitude = toRadians(destination.latitude)
  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(originLatitude) *
      Math.cos(destinationLatitude) *
      Math.sin(longitudeDelta / 2) ** 2

  return 2 * EARTH_RADIUS_KM * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine))
}

function getRouteDistanceKm(allocation: DriverAllocationRecord) {
  const pickup = allocation.pickupLocationDetails
  const destination = allocation.destinationLocationDetails

  if (!hasValidCoordinates(pickup) || !hasValidCoordinates(destination)) {
    return null
  }

  return getDistanceBetweenLocationsKm(pickup, destination)
}

function getLiveProgress(allocation: DriverAllocationRecord) {
  const destination = allocation.destinationLocationDetails
  const currentLocation = allocation.currentLocation
  const routeDistanceKm = getRouteDistanceKm(allocation)

  if (
    !hasValidCoordinates(currentLocation) ||
    !hasValidCoordinates(destination) ||
    routeDistanceKm === null ||
    routeDistanceKm <= 0
  ) {
    return null
  }

  const remainingDistanceKm = getDistanceBetweenLocationsKm(currentLocation, destination)
  return Math.min(Math.max(1 - remainingDistanceKm / routeDistanceKm, 0), 1)
}

export function getDriverAllocationProgress(allocation: DriverAllocationRecord) {
  switch (allocation.status) {
    case 'pending':
      return 0
    case 'assigned':
      return 0
    case 'in-transit': {
      const liveProgress = getLiveProgress(allocation)

      if (liveProgress !== null) {
        return liveProgress
      }

      return 0
    }
    case 'available':
    case 'completed':
      return 1
    default:
      return 0
  }
}

export function getDriverAllocationLiveCoordinates(allocation: DriverAllocationRecord) {
  if (hasValidCoordinates(allocation.currentLocation)) {
    return {
      latitude: allocation.currentLocation.latitude,
      longitude: allocation.currentLocation.longitude,
    }
  }

  return null
}

export function getDriverAllocationGpsState(allocation: DriverAllocationRecord, now = Date.now()) {
  const location = getDriverAllocationLiveCoordinates(allocation)
  if (!location) return { state: 'unavailable' as const, location: null, label: 'GPS unavailable' }
  const timestamp = new Date(allocation.currentLocation?.updatedAt ?? '').getTime()
  const age = now - timestamp
  if (!Number.isFinite(timestamp) || age < 0) {
    return { state: 'last-known' as const, location, label: 'Last known GPS · timestamp unavailable or invalid' }
  }
  if (age >= GPS_STALE_AFTER_MS) return { state: 'stale' as const, location, label: 'GPS Signal Lost · last known position' }
  if (age > GPS_FRESH_FOR_MS || allocation.status !== 'in-transit') {
    return { state: 'last-known' as const, location, label: 'Last known GPS position' }
  }
  return { state: 'live' as const, location, label: 'Live GPS position' }
}

export function getDriverAllocationTrackingHealth(allocation: DriverAllocationRecord, now = Date.now()) {
  const gps = getDriverAllocationGpsState(allocation, now)
  const timestamp = new Date(allocation.currentLocation?.updatedAt ?? '').getTime()
  const start = new Date(allocation.actualStartTime ?? '').getTime()
  const validTimestamp = Number.isFinite(timestamp) && timestamp <= now
  const validStart = Number.isFinite(start) && start <= now
  const issue = allocation.status !== 'in-transit' ? null
    : gps.state === 'stale' ? 'GPS Signal Lost'
      : gps.state === 'unavailable' || !validTimestamp ? 'Tracking Unavailable' : null
  const formatAge = (elapsed: number) => {
    const seconds = Math.max(0, Math.floor(elapsed / 1000))
    const [amount, unit] = seconds >= 86400 ? [Math.floor(seconds / 86400), 'day']
      : seconds >= 3600 ? [Math.floor(seconds / 3600), 'hour']
        : seconds >= 60 ? [Math.floor(seconds / 60), 'minute'] : [seconds, 'second']
    return `${amount} ${unit}${amount === 1 ? '' : 's'}`
  }
  return {
    issue,
    urgent: Boolean(issue) && (gps.state === 'stale' || !validStart || now - start >= GPS_MISSING_AFTER_START_MS),
    lastGpsAge: validTimestamp ? `${formatAge(now - timestamp)} ago` : 'Unknown — no valid GPS timestamp',
    trackingGap: validTimestamp ? `No valid GPS update for ${formatAge(now - timestamp)}`
      : validStart ? `No valid GPS update for ${formatAge(now - start)} since trip start`
        : 'GPS tracking unavailable; duration unknown',
  }
}

export function getDriverAllocationRemainingDistanceKm(allocation: DriverAllocationRecord) {
  if (allocation.status !== 'in-transit') {
    return null
  }

  const destination = allocation.destinationLocationDetails
  const currentLocation = allocation.currentLocation

  if (hasValidCoordinates(currentLocation) && hasValidCoordinates(destination)) {
    return Math.max(getDistanceBetweenLocationsKm(currentLocation, destination), 0)
  }

  return null
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
    // Live travel time comes exclusively from the server Directions response.
    // The stored estimatedDuration is a trip plan, not remaining road travel time.
    return getDriverAllocationGpsState(allocation).state === 'live'
      ? 'Unavailable — road estimate not loaded' : 'ETA Unavailable: GPS Tracking Lost'
  }

  return allocation.status === 'cancelled' ? 'Cancelled' : 'Pending'
}
