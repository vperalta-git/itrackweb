'use client'

import { apiRequest } from '@/lib/api-client'
import {
  BackendUnitAgentAllocation,
  getEntityId,
  getFullName,
} from '@/lib/backend-helpers'
import { syncInventoryVehiclesFromBackend } from '@/lib/inventory-data'

export interface UnitAllocationRecord {
  id: string
  unitName: string
  conductionNumber: string
  bodyColor: string
  variation: string
  assignedTo: string
  manager: string
  managerId: string
  salesAgentId: string
  vehicleId: string
  status: string
}

export const UNIT_ALLOCATIONS_STORAGE_KEY = 'itrack.unit.allocations'
export const UNIT_ALLOCATIONS_UPDATED_EVENT = 'unit-allocations-updated'

export function loadUnitAllocations() {
  if (typeof window === 'undefined') return [] as UnitAllocationRecord[]

  try {
    return JSON.parse(
      window.localStorage.getItem(UNIT_ALLOCATIONS_STORAGE_KEY) ?? '[]'
    ) as UnitAllocationRecord[]
  } catch {
    return []
  }
}

export function persistUnitAllocations(allocations: UnitAllocationRecord[]) {
  if (typeof window === 'undefined') return

  window.localStorage.setItem(UNIT_ALLOCATIONS_STORAGE_KEY, JSON.stringify(allocations))
  window.dispatchEvent(new Event(UNIT_ALLOCATIONS_UPDATED_EVENT))
}

const mapAllocation = (allocation: BackendUnitAgentAllocation): UnitAllocationRecord => {
  const vehicle =
    allocation.vehicleId && typeof allocation.vehicleId === 'object' ? allocation.vehicleId : null

  return {
    id: getEntityId(allocation),
    unitName: vehicle?.unitName ?? '',
    conductionNumber: vehicle?.conductionNumber ?? '',
    bodyColor: vehicle?.bodyColor ?? '',
    variation: vehicle?.variation ?? '',
    assignedTo: getFullName(allocation.salesAgentId),
    manager: getFullName(allocation.managerId),
    managerId: getEntityId(allocation.managerId),
    salesAgentId: getEntityId(allocation.salesAgentId),
    vehicleId: getEntityId(allocation.vehicleId),
    status: allocation.status ?? 'assigned',
  }
}

const sortAllocations = (allocations: UnitAllocationRecord[]) =>
  [...allocations].sort((left, right) => left.conductionNumber.localeCompare(right.conductionNumber))

export async function syncUnitAllocationsFromBackend() {
  const allocations = await apiRequest<BackendUnitAgentAllocation[]>('/unit-agent-allocations')
  const mappedAllocations = sortAllocations(allocations.map(mapAllocation))
  persistUnitAllocations(mappedAllocations)
  return mappedAllocations
}

export async function createUnitAllocationRecord(input: {
  managerId: string
  salesAgentId: string
  vehicleId: string
}) {
  await apiRequest('/unit-agent-allocations', {
    method: 'POST',
    body: {
      managerId: input.managerId,
      salesAgentId: input.salesAgentId,
      vehicleId: input.vehicleId,
      status: 'assigned',
    },
  })

  await syncInventoryVehiclesFromBackend()
  return syncUnitAllocationsFromBackend()
}

export async function updateUnitAllocationRecord(
  id: string,
  input: {
    managerId: string
    salesAgentId: string
    vehicleId: string
    status?: string
  }
) {
  await apiRequest(`/unit-agent-allocations/${id}`, {
    method: 'PATCH',
    body: {
      managerId: input.managerId,
      salesAgentId: input.salesAgentId,
      vehicleId: input.vehicleId,
      status: input.status ?? 'assigned',
    },
  })

  await syncInventoryVehiclesFromBackend()
  return syncUnitAllocationsFromBackend()
}

export async function deleteUnitAllocationRecord(id: string) {
  await apiRequest(`/unit-agent-allocations/${id}`, {
    method: 'DELETE',
  })

  await syncInventoryVehiclesFromBackend()
  return syncUnitAllocationsFromBackend()
}
