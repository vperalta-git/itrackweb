import { getDepartmentFromRole, mapBackendRoleToUserRole, type UserRole } from '@/lib/session'

export type BackendPopulatedUser = {
  id?: string
  _id?: string
  firstName?: string
  lastName?: string
  email?: string
  phone?: string
  bio?: string
  avatarUrl?: string | null
  role?: string
  isActive?: boolean
  managerId?: string | BackendPopulatedUser | null
  createdAt?: string
  updatedAt?: string
}

export type BackendVehicle = {
  id?: string
  _id?: string
  unitName?: string
  variation?: string
  conductionNumber?: string
  bodyColor?: string
  status?: string
  notes?: string
  createdAt?: string
  updatedAt?: string
}

export type BackendRouteStop = {
  name: string
  address: string
  latitude: number
  longitude: number
}

export type BackendUnitAgentAllocation = {
  id?: string
  _id?: string
  managerId?: string | BackendPopulatedUser | null
  salesAgentId?: string | BackendPopulatedUser | null
  vehicleId?: string | BackendVehicle | null
  status?: string
  createdAt?: string
  updatedAt?: string
}

export type BackendDriverAllocation = {
  id?: string
  _id?: string
  managerId?: string | BackendPopulatedUser | null
  vehicleId?: string | BackendVehicle | null
  driverId?: string | BackendPopulatedUser | null
  status?: string
  pickupLocation?: BackendRouteStop | null
  destinationLocation?: BackendRouteStop | null
  estimatedDuration?: number
  actualDuration?: number | null
  startTime?: string | null
  endTime?: string | null
  routeProgress?: number | null
  notes?: string
  createdAt?: string
  updatedAt?: string
}

export type BackendPreparation = {
  id?: string
  _id?: string
  vehicleId?: string | BackendVehicle | null
  requestedByUserId?: string | BackendPopulatedUser | null
  requestedServices?: string[]
  customRequests?: string[]
  customerName?: string
  customerContactNo?: string
  notes?: string
  status?: string
  progress?: number
  requestedByRole?: string
  requestedByName?: string
  approvalStatus?: string
  approvedByRole?: string | null
  approvedByName?: string | null
  approvedAt?: string | null
  dispatcherId?: string | BackendPopulatedUser | null
  dispatcherChecklist?: Array<{
    id: string
    label: string
    completed: boolean
  }>
  completedAt?: string | null
  readyForReleaseAt?: string | null
  createdAt?: string
  updatedAt?: string
}

export type BackendTestDriveBooking = {
  id?: string
  _id?: string
  vehicleId?: string | BackendVehicle | null
  requestedByUserId?: string | BackendPopulatedUser | null
  customerName?: string
  customerPhone?: string
  scheduledDate?: string
  scheduledTime?: string
  notes?: string
  status?: string
  createdAt?: string
  updatedAt?: string
}

export type BackendNotification = {
  id?: string
  _id?: string
  title?: string
  message?: string
  type?: string
  read?: boolean
  createdAt?: string
}

const vehicleStatusMap: Record<string, string> = {
  available: 'available',
  in_stockyard: 'in-stockyard',
  in_transit: 'in-transit',
  under_preparation: 'in-dispatch',
  completed: 'released',
  maintenance: 'pending',
}

const uiVehicleStatusMap: Record<string, string> = {
  available: 'available',
  'in-stockyard': 'in_stockyard',
  'in-transit': 'in_transit',
  'in-dispatch': 'under_preparation',
  released: 'completed',
  pending: 'maintenance',
}

const allocationStatusMap: Record<string, string> = {
  pending: 'pending',
  assigned: 'assigned',
  in_transit: 'in-transit',
  delivered: 'available',
  completed: 'completed',
  cancelled: 'cancelled',
}

const uiAllocationStatusMap: Record<string, string> = {
  pending: 'pending',
  assigned: 'assigned',
  'in-transit': 'in_transit',
  available: 'delivered',
  completed: 'completed',
  cancelled: 'cancelled',
}

const preparationStatusMap: Record<string, string> = {
  pending: 'pending',
  in_dispatch: 'in-dispatch',
  completed: 'ready-for-release',
  ready_for_release: 'completed',
  rejected: 'rejected',
}

const uiPreparationStatusMap: Record<string, string> = {
  pending: 'pending',
  'in-dispatch': 'in_dispatch',
  completed: 'ready_for_release',
  'ready-for-release': 'completed',
  rejected: 'rejected',
}

const serviceLabels: Record<string, string> = {
  accessories: 'Accessories',
  carwash: 'Carwash',
  ceramic_coating: 'Ceramic Coating',
  custom_request: 'Custom Request',
  detailing: 'Detailing',
  inspection: 'Inspection',
  maintenance: 'Maintenance',
  painting: 'Painting',
  rust_proof: 'Rust Proof',
  tinting: 'Tinting',
}

const uiServiceToBackend: Record<string, string> = {
  Accessories: 'accessories',
  Carwash: 'carwash',
  'Ceramic Coating': 'ceramic_coating',
  Detailing: 'detailing',
  Inspection: 'inspection',
  Maintenance: 'maintenance',
  Painting: 'painting',
  'Rust Proof': 'rust_proof',
  Tinting: 'tinting',
}

const routeCoordinateMap: Record<string, { latitude: number; longitude: number }> = {
  'Central Stockyard, Manila': { latitude: 14.5995, longitude: 120.9842 },
  'Ayala Center, Makati': { latitude: 14.5515, longitude: 121.0246 },
  'North Hub, Quezon City': { latitude: 14.676, longitude: 121.0437 },
  'BGC Showroom, Taguig': { latitude: 14.5547, longitude: 121.0244 },
  'Isuzu Laguna Stockyard': { latitude: 14.2349, longitude: 121.1368 },
  'Isuzu Pasig': { latitude: 14.575, longitude: 121.085 },
  'Customer Location, Quezon City': { latitude: 14.676, longitude: 121.0437 },
  'Customer Location, Mandaluyong': { latitude: 14.5794, longitude: 121.0359 },
  'Customer Location, Pasig': { latitude: 14.5764, longitude: 121.0851 },
  'Ready for agent turnover': { latitude: 14.575, longitude: 121.085 },
}

export function getEntityId(value: unknown): string {
  if (!value) return ''
  if (typeof value === 'string') return value
  if (typeof value === 'object') {
    const entity = value as { id?: string; _id?: string }
    return entity.id ?? entity._id ?? ''
  }

  return ''
}

export function getFullName(value: unknown) {
  if (!value || typeof value !== 'object') return ''

  const user = value as { firstName?: string; lastName?: string }
  return `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim()
}

export function getIsoDate(value?: string | null) {
  return value ? value.slice(0, 10) : ''
}

export function getDisplayDate(value?: string | null) {
  if (!value) return ''

  return new Intl.DateTimeFormat('en-PH', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  }).format(new Date(value))
}

export function getDisplayTime(value: string) {
  const candidate = value.includes('T') ? value : `1970-01-01T${value}`

  return new Intl.DateTimeFormat('en-PH', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(new Date(candidate))
}

export function getRelativeTime(value?: string | null) {
  if (!value) return ''

  const diffMs = Date.now() - new Date(value).getTime()
  const diffMinutes = Math.max(1, Math.floor(diffMs / 60000))

  if (diffMinutes < 60) return `${diffMinutes} min ago`

  const diffHours = Math.floor(diffMinutes / 60)
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`

  const diffDays = Math.floor(diffHours / 24)
  return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`
}

export function getDaysSince(value?: string | null) {
  if (!value) return 0

  const diffMs = Date.now() - new Date(value).getTime()
  return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)))
}

export function mapVehicleStatusToUi(status?: string) {
  return vehicleStatusMap[status ?? ''] ?? 'available'
}

export function mapUiVehicleStatusToBackend(status: string) {
  return uiVehicleStatusMap[status] ?? 'available'
}

export function mapAllocationStatusToUi(status?: string) {
  return allocationStatusMap[status ?? ''] ?? 'pending'
}

export function mapUiAllocationStatusToBackend(status: string) {
  return uiAllocationStatusMap[status] ?? 'pending'
}

export function mapPreparationStatusToUi(status?: string) {
  return preparationStatusMap[status ?? ''] ?? 'pending'
}

export function mapUiPreparationStatusToBackend(status: string) {
  return uiPreparationStatusMap[status] ?? 'pending'
}

export function formatServiceLabel(value: string) {
  return serviceLabels[value] ?? value
}

export function mapUiServiceLabelToBackend(value: string) {
  return uiServiceToBackend[value] ?? 'custom_request'
}

export function getDepartmentFromBackendRole(role?: string) {
  return getDepartmentFromRole(mapBackendRoleToUserRole(role ?? 'admin'))
}

export function buildEmployeeId(id: string) {
  return `EMP-${id.slice(-4).toUpperCase().padStart(4, '0')}`
}

export function getRoleLabelFromBackendRole(role?: string) {
  const userRole: UserRole = mapBackendRoleToUserRole(role ?? 'admin')
  switch (userRole) {
    case 'sales-agent':
      return 'Sales Agent'
    case 'dispatch':
      return 'Dispatch'
    case 'driver':
      return 'Driver'
    case 'admin':
      return 'Administrator'
    default:
      return userRole.charAt(0).toUpperCase() + userRole.slice(1)
  }
}

export function makeRouteStop(label: string): BackendRouteStop {
  const normalizedLabel = label.trim()
  const matchedKey = Object.keys(routeCoordinateMap).find(
    (candidate) => candidate.toLowerCase() === normalizedLabel.toLowerCase()
  )
  const coordinates = matchedKey ? routeCoordinateMap[matchedKey] : null

  if (!coordinates) {
    throw new Error('Please choose a saved pickup and destination location from the list.')
  }

  return {
    name: matchedKey ?? normalizedLabel,
    address: matchedKey ?? normalizedLabel,
    latitude: coordinates.latitude,
    longitude: coordinates.longitude,
  }
}
