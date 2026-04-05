'use client'

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
  status: 'pending' | 'in-transit' | 'available' | 'completed' | 'cancelled'
}

export const DRIVER_ALLOCATIONS_STORAGE_KEY = 'itrack.driver.allocations'
export const DRIVER_ALLOCATIONS_UPDATED_EVENT = 'driver-allocations-updated'

export const driverAllocationSeed: DriverAllocationRecord[] = [
  {
    id: '1',
    date: '2024-02-05',
    unitName: 'D-Max',
    conductionNumber: 'DRV1020',
    bodyColor: 'Valencia Orange',
    variation: 'LT 4x2 AT',
    salesAgent: 'Juan Dela Cruz',
    manager: 'Carlos Garcia',
    assignedDriver: 'Roberto Cruz',
    driverPhone: '+63 917 123 4567',
    pickupLocation: 'Isuzu Laguna Stockyard',
    destination: 'Isuzu Pasig',
    status: 'in-transit',
  },
  {
    id: '2',
    date: '2024-02-05',
    unitName: 'NPR',
    conductionNumber: 'PEN3344',
    bodyColor: 'White',
    variation: '6-Wheeler',
    salesAgent: 'Pedro Reyes',
    manager: 'Carlos Garcia',
    assignedDriver: 'Miguel Santos',
    driverPhone: '+63 918 234 5678',
    pickupLocation: 'Isuzu Pasig',
    destination: 'Customer Location, Mandaluyong',
    status: 'pending',
  },
  {
    id: '3',
    date: '2024-02-04',
    unitName: 'mu-X',
    conductionNumber: 'LAG8821',
    bodyColor: 'Sapphire Blue',
    variation: 'RZ4E 4x2 AT',
    salesAgent: 'Anna Lim',
    manager: 'Carlos Garcia',
    assignedDriver: 'Antonio Reyes',
    driverPhone: '+63 919 345 6789',
    pickupLocation: 'Isuzu Laguna Stockyard',
    destination: 'Customer Location, Quezon City',
    status: 'completed',
  },
  {
    id: '4',
    date: '2024-02-06',
    unitName: 'mu-X',
    conductionNumber: 'REL7744',
    bodyColor: 'Cosmic Black',
    variation: 'LS-A 4x4 AT',
    salesAgent: 'Mike Santos',
    manager: 'Maria Santos',
    assignedDriver: 'Jose Garcia',
    driverPhone: '+63 920 456 7890',
    pickupLocation: 'Isuzu Pasig',
    destination: 'Ready for agent turnover',
    status: 'pending',
  },
]

export function loadDriverAllocations(): DriverAllocationRecord[] {
  if (typeof window === 'undefined') return driverAllocationSeed

  const stored = window.localStorage.getItem(DRIVER_ALLOCATIONS_STORAGE_KEY)
  if (!stored) return driverAllocationSeed

  try {
    return JSON.parse(stored) as DriverAllocationRecord[]
  } catch {
    return driverAllocationSeed
  }
}

export function persistDriverAllocations(allocations: DriverAllocationRecord[]) {
  if (typeof window === 'undefined') return

  window.localStorage.setItem(DRIVER_ALLOCATIONS_STORAGE_KEY, JSON.stringify(allocations))
  window.dispatchEvent(new Event(DRIVER_ALLOCATIONS_UPDATED_EVENT))
}
