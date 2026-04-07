'use client'

import { apiRequest } from '@/lib/api-client'
import {
  BackendDriverAllocation,
  BackendPreparation,
  BackendUnitAgentAllocation,
  BackendVehicle,
  getDaysSince,
  getEntityId,
  getFullName,
  getIsoDate,
  mapUiVehicleStatusToBackend,
  mapVehicleStatusToUi,
} from '@/lib/backend-helpers'

export interface InventoryVehicle {
  id: string
  unitName: string
  conductionNumber: string
  bodyColor: string
  variation: string
  assignedAgent: string
  manager: string
  ageInStorage: number
  status:
    | 'in-stockyard'
    | 'in-transit'
    | 'pending'
    | 'available'
    | 'in-dispatch'
    | 'released'
  dateAdded: string
  notes?: string
}

export const INVENTORY_STORAGE_KEY = 'itrack.inventory.vehicles'
export const INVENTORY_UPDATED_EVENT = 'inventory-updated'

const EMPTY_INVENTORY: InventoryVehicle[] = []

const safeParseVehicles = (raw: string | null) => {
  if (!raw) return EMPTY_INVENTORY

  try {
    return JSON.parse(raw) as InventoryVehicle[]
  } catch {
    return EMPTY_INVENTORY
  }
}

export function loadInventoryVehicles(): InventoryVehicle[] {
  if (typeof window === 'undefined') return EMPTY_INVENTORY
  return safeParseVehicles(window.localStorage.getItem(INVENTORY_STORAGE_KEY))
}

export function persistInventoryVehicles(vehicles: InventoryVehicle[]) {
  if (typeof window === 'undefined') return

  window.localStorage.setItem(INVENTORY_STORAGE_KEY, JSON.stringify(vehicles))
  window.dispatchEvent(new Event(INVENTORY_UPDATED_EVENT))
}

const mapVehicleRecord = (
  vehicle: BackendVehicle,
  allocationByVehicleId: Map<string, BackendUnitAgentAllocation>,
  latestDriverAllocationByVehicleId: Map<string, BackendDriverAllocation>,
  latestPreparationByVehicleId: Map<string, BackendPreparation>
): InventoryVehicle => {
  const id = getEntityId(vehicle)
  const allocation = allocationByVehicleId.get(id)
  const latestDriverAllocation = latestDriverAllocationByVehicleId.get(id)
  const latestPreparation = latestPreparationByVehicleId.get(id)
  const rawVehicleStatus = mapVehicleStatusToUi(vehicle.status) as InventoryVehicle['status']

  let derivedStatus = rawVehicleStatus

  if (latestPreparation?.status === 'ready_for_release') {
    derivedStatus = 'released'
  } else if (
    latestPreparation?.status === 'in_dispatch' ||
    latestPreparation?.status === 'completed'
  ) {
    derivedStatus = 'in-dispatch'
  } else if (
    latestDriverAllocation?.status === 'in_transit' ||
    latestDriverAllocation?.status === 'assigned'
  ) {
    derivedStatus = 'in-transit'
  } else if (latestDriverAllocation?.status === 'pending') {
    derivedStatus = 'pending'
  }

  return {
    id,
    unitName: vehicle.unitName ?? '',
    conductionNumber: vehicle.conductionNumber ?? '',
    bodyColor: vehicle.bodyColor ?? '',
    variation: vehicle.variation ?? '',
    assignedAgent: getFullName(allocation?.salesAgentId) || 'Unassigned',
    manager: getFullName(allocation?.managerId) || 'Unassigned',
    ageInStorage: getDaysSince(vehicle.createdAt),
    status: derivedStatus,
    dateAdded: getIsoDate(vehicle.createdAt),
    notes: vehicle.notes ?? '',
  }
}

const sortVehicles = (vehicles: InventoryVehicle[]) =>
  [...vehicles].sort((left, right) => right.dateAdded.localeCompare(left.dateAdded))

export async function syncInventoryVehiclesFromBackend() {
  const [vehicles, unitAgentAllocations, driverAllocations, preparations] = await Promise.all([
    apiRequest<BackendVehicle[]>('/vehicles'),
    apiRequest<BackendUnitAgentAllocation[]>('/unit-agent-allocations'),
    apiRequest<BackendDriverAllocation[]>('/driver-allocations'),
    apiRequest<BackendPreparation[]>('/preparations'),
  ])

  const allocationByVehicleId = new Map(
    unitAgentAllocations.map((allocation) => [getEntityId(allocation.vehicleId), allocation])
  )
  const latestDriverAllocationByVehicleId = new Map<string, BackendDriverAllocation>()
  const latestPreparationByVehicleId = new Map<string, BackendPreparation>()

  driverAllocations.forEach((allocation) => {
    const vehicleId = getEntityId(allocation.vehicleId)
    if (!vehicleId) return

    const current = latestDriverAllocationByVehicleId.get(vehicleId)
    const currentTime = new Date(current?.updatedAt ?? current?.createdAt ?? 0).getTime()
    const nextTime = new Date(allocation.updatedAt ?? allocation.createdAt ?? 0).getTime()

    if (!current || nextTime >= currentTime) {
      latestDriverAllocationByVehicleId.set(vehicleId, allocation)
    }
  })

  preparations.forEach((preparation) => {
    const vehicleId = getEntityId(preparation.vehicleId)
    if (!vehicleId) return

    const current = latestPreparationByVehicleId.get(vehicleId)
    const currentTime = new Date(current?.updatedAt ?? current?.createdAt ?? 0).getTime()
    const nextTime = new Date(preparation.updatedAt ?? preparation.createdAt ?? 0).getTime()

    if (!current || nextTime >= currentTime) {
      latestPreparationByVehicleId.set(vehicleId, preparation)
    }
  })

  const mappedVehicles = sortVehicles(
    vehicles.map((vehicle) =>
      mapVehicleRecord(
        vehicle,
        allocationByVehicleId,
        latestDriverAllocationByVehicleId,
        latestPreparationByVehicleId
      )
    )
  )

  persistInventoryVehicles(mappedVehicles)
  return mappedVehicles
}

export async function createInventoryVehicleRecord(input: {
  unitName: string
  variation: string
  conductionNumber: string
  bodyColor: string
  status: InventoryVehicle['status']
  notes?: string
}) {
  await apiRequest('/vehicles', {
    method: 'POST',
    body: {
      unitName: input.unitName,
      variation: input.variation,
      conductionNumber: input.conductionNumber,
      bodyColor: input.bodyColor,
      status: mapUiVehicleStatusToBackend(input.status),
      notes: input.notes?.trim() ?? '',
    },
  })

  return syncInventoryVehiclesFromBackend()
}

export async function updateInventoryVehicleRecord(
  id: string,
  input: {
    unitName: string
    variation: string
    conductionNumber: string
    bodyColor: string
    status: InventoryVehicle['status']
    notes?: string
  }
) {
  await apiRequest(`/vehicles/${id}`, {
    method: 'PATCH',
    body: {
      unitName: input.unitName,
      variation: input.variation,
      conductionNumber: input.conductionNumber,
      bodyColor: input.bodyColor,
      status: mapUiVehicleStatusToBackend(input.status),
      notes: input.notes?.trim() ?? '',
    },
  })

  return syncInventoryVehiclesFromBackend()
}

export async function deleteInventoryVehicleRecord(id: string) {
  await apiRequest(`/vehicles/${id}`, {
    method: 'DELETE',
  })

  return syncInventoryVehiclesFromBackend()
}
