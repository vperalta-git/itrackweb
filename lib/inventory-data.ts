'use client'

import { apiRequest } from '@/lib/api-client'
import {
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
  allocationByVehicleId: Map<string, BackendUnitAgentAllocation>
): InventoryVehicle => {
  const id = getEntityId(vehicle)
  const allocation = allocationByVehicleId.get(id)

  return {
    id,
    unitName: vehicle.unitName ?? '',
    conductionNumber: vehicle.conductionNumber ?? '',
    bodyColor: vehicle.bodyColor ?? '',
    variation: vehicle.variation ?? '',
    assignedAgent: getFullName(allocation?.salesAgentId) || 'Unassigned',
    manager: getFullName(allocation?.managerId) || 'Unassigned',
    ageInStorage: getDaysSince(vehicle.createdAt),
    status: mapVehicleStatusToUi(vehicle.status) as InventoryVehicle['status'],
    dateAdded: getIsoDate(vehicle.createdAt),
    notes: vehicle.notes ?? '',
  }
}

const sortVehicles = (vehicles: InventoryVehicle[]) =>
  [...vehicles].sort((left, right) => right.dateAdded.localeCompare(left.dateAdded))

export async function syncInventoryVehiclesFromBackend() {
  const [vehicles, unitAgentAllocations] = await Promise.all([
    apiRequest<BackendVehicle[]>('/vehicles'),
    apiRequest<BackendUnitAgentAllocation[]>('/unit-agent-allocations'),
  ])

  const allocationByVehicleId = new Map(
    unitAgentAllocations.map((allocation) => [getEntityId(allocation.vehicleId), allocation])
  )

  const mappedVehicles = sortVehicles(
    vehicles.map((vehicle) => mapVehicleRecord(vehicle, allocationByVehicleId))
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
