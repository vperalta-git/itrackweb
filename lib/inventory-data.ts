'use client'

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

export const inventorySeed: InventoryVehicle[] = [
  {
    id: '1',
    unitName: 'mu-X',
    conductionNumber: 'ABC1234',
    bodyColor: 'Silky White Pearl',
    variation: 'LS-E 4x2 AT',
    assignedAgent: 'Juan Dela Cruz',
    manager: 'Carlos Garcia',
    ageInStorage: 18,
    status: 'available',
    dateAdded: '2024-01-15',
    notes: 'Ready for showroom display.',
  },
  {
    id: '2',
    unitName: 'D-Max',
    conductionNumber: 'TRN5566',
    bodyColor: 'Obsidian Gray',
    variation: 'LS 4x4 MT',
    assignedAgent: 'Pedro Reyes',
    manager: 'Carlos Garcia',
    ageInStorage: 22,
    status: 'pending',
    dateAdded: '2024-01-18',
    notes: 'Awaiting driver acceptance for delivery.',
  },
  {
    id: '3',
    unitName: 'mu-X',
    conductionNumber: 'LAG8821',
    bodyColor: 'Sapphire Blue',
    variation: 'RZ4E 4x2 AT',
    assignedAgent: 'Anna Lim',
    manager: 'Carlos Garcia',
    ageInStorage: 16,
    status: 'in-dispatch',
    dateAdded: '2024-01-20',
    notes: 'Undergoing preparation before release.',
  },
  {
    id: '4',
    unitName: 'Traviz',
    conductionNumber: 'STK4401',
    bodyColor: 'Splash White',
    variation: 'L Utility Van',
    assignedAgent: 'Mike Santos',
    manager: 'Maria Santos',
    ageInStorage: 14,
    status: 'in-stockyard',
    dateAdded: '2024-01-22',
    notes: 'Still parked in Laguna stockyard.',
  },
  {
    id: '5',
    unitName: 'D-Max',
    conductionNumber: 'DRV1020',
    bodyColor: 'Valencia Orange',
    variation: 'LT 4x2 AT',
    assignedAgent: 'Juan Dela Cruz',
    manager: 'Carlos Garcia',
    ageInStorage: 4,
    status: 'in-transit',
    dateAdded: '2024-01-25',
    notes: 'Driver is on the way to Isuzu Pasig.',
  },
  {
    id: '6',
    unitName: 'NLR',
    conductionNumber: 'NLR4021',
    bodyColor: 'White',
    variation: '4-Wheeler Aluminum Van',
    assignedAgent: 'Liza Cruz',
    manager: 'Maria Santos',
    ageInStorage: 11,
    status: 'available',
    dateAdded: '2024-01-28',
    notes: 'Already delivered to Isuzu Pasig.',
  },
  {
    id: '7',
    unitName: 'mu-X',
    conductionNumber: 'REL7744',
    bodyColor: 'Cosmic Black',
    variation: 'LS-A 4x4 AT',
    assignedAgent: 'Anna Lim',
    manager: 'Carlos Garcia',
    ageInStorage: 2,
    status: 'released',
    dateAdded: '2024-02-01',
    notes: 'Released to customer.',
  },
  {
    id: '8',
    unitName: 'NPR',
    conductionNumber: 'PEN3344',
    bodyColor: 'White',
    variation: '6-Wheeler',
    assignedAgent: 'Pedro Reyes',
    manager: 'Carlos Garcia',
    ageInStorage: 9,
    status: 'pending',
    dateAdded: '2024-02-03',
    notes: 'Driver allocation still pending.',
  },
]

export function loadInventoryVehicles(): InventoryVehicle[] {
  if (typeof window === 'undefined') return inventorySeed

  const stored = window.localStorage.getItem(INVENTORY_STORAGE_KEY)
  if (!stored) return inventorySeed

  try {
    return JSON.parse(stored) as InventoryVehicle[]
  } catch {
    return inventorySeed
  }
}

export function persistInventoryVehicles(vehicles: InventoryVehicle[]) {
  if (typeof window === 'undefined') return

  window.localStorage.setItem(INVENTORY_STORAGE_KEY, JSON.stringify(vehicles))
  window.dispatchEvent(new Event(INVENTORY_UPDATED_EVENT))
}
