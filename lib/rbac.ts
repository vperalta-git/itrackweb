import { ROUTE_ROLE_COOKIE_NAME } from '@/lib/auth-constants'

export const roles = ['admin', 'supervisor', 'manager', 'sales-agent'] as const

export type Role = (typeof roles)[number]

const DEFAULT_ROLE: Role = 'admin'
const sharedAccessiblePaths = [
  'dashboard',
  'vehicle-stocks/stock-list',
  'preparation',
  'test-drive',
  'reports/history',
  'settings',
  'profile',
] as const
const adminAccessiblePaths = [
  ...sharedAccessiblePaths,
  'vehicle-stocks/unit-setup',
  'unit-allocation',
  'driver-allocation/allocation',
  'driver-allocation/live-tracking',
  'users',
  'reports/audit',
  'reports/vehicles',
] as const
const limitedAccessiblePaths = [
  ...sharedAccessiblePaths,
  'driver-allocation/live-tracking',
] as const
const dashboardPathAliases = {
  '/inventory': '/vehicle-stocks/stock-list',
  '/unit-setup': '/vehicle-stocks/unit-setup',
  '/allocation/units': '/unit-allocation',
  '/allocation/drivers': '/driver-allocation/allocation',
  '/allocation/drivers/tracking': '/driver-allocation/live-tracking',
} as const
const accessiblePathsByRole: Record<Role, readonly string[]> = {
  admin: adminAccessiblePaths,
  supervisor: adminAccessiblePaths,
  manager: limitedAccessiblePaths,
  'sales-agent': limitedAccessiblePaths,
}

function normalizeDashboardPath(path = '') {
  const trimmedPath = path.trim()

  if (!trimmedPath) {
    return ''
  }

  const normalizedPath = `/${trimmedPath.replace(/^\/+/, '').replace(/\/+$/, '')}`
  return normalizedPath === '/' ? '' : normalizedPath
}

export function isValidRole(value: string): value is Role {
  return roles.includes(value as Role)
}

export function getCurrentUserRole(): Role {
  if (typeof document === 'undefined') return DEFAULT_ROLE

  const cookie = document.cookie
    .split('; ')
    .find((entry) => entry.startsWith(`${ROUTE_ROLE_COOKIE_NAME}=`))

  if (!cookie) return DEFAULT_ROLE

  const role = decodeURIComponent(cookie.split('=').slice(1).join('='))
  return isValidRole(role) ? role : DEFAULT_ROLE
}

export function getCanonicalDashboardPath(path = '') {
  const normalizedPath = normalizeDashboardPath(path)

  if (!normalizedPath) {
    return ''
  }

  return dashboardPathAliases[normalizedPath as keyof typeof dashboardPathAliases] ?? normalizedPath
}

export function resolveDashboardPathForRole(role: Role, path = '') {
  const normalizedPath = getCanonicalDashboardPath(path).replace(/^\/+/, '')

  if (!normalizedPath) {
    return 'dashboard'
  }

  if (normalizedPath === 'allocation') {
    return role === 'admin' || role === 'supervisor'
      ? 'unit-allocation'
      : 'driver-allocation/live-tracking'
  }

  if (normalizedPath === 'vehicle-stocks') {
    return 'vehicle-stocks/stock-list'
  }

  if (normalizedPath === 'driver-allocation') {
    return role === 'admin' || role === 'supervisor'
      ? 'driver-allocation/allocation'
      : 'driver-allocation/live-tracking'
  }

  if (normalizedPath === 'reports') {
    return 'reports/history'
  }

  if (normalizedPath === 'reports/allocations') {
    return 'reports/vehicles'
  }

  if (normalizedPath === 'inventory/add') {
    return 'vehicle-stocks/stock-list'
  }

  if (normalizedPath === 'preparation/new') {
    return 'preparation'
  }

  return normalizedPath
}

export function canRoleAccessPath(role: Role, path = '') {
  const resolvedPath = resolveDashboardPathForRole(role, path)
  return accessiblePathsByRole[role].includes(resolvedPath)
}

export function getAuthorizedDashboardPath(role: Role, path = '') {
  const resolvedPath = resolveDashboardPathForRole(role, path)

  if (accessiblePathsByRole[role].includes(resolvedPath)) {
    return resolvedPath
  }

  if (resolvedPath.startsWith('vehicle-stocks/')) {
    return 'vehicle-stocks/stock-list'
  }

  if (resolvedPath.startsWith('driver-allocation/')) {
    return accessiblePathsByRole[role].includes('driver-allocation/live-tracking')
      ? 'driver-allocation/live-tracking'
      : 'dashboard'
  }

  if (resolvedPath.startsWith('reports/')) {
    return 'reports/history'
  }

  return 'dashboard'
}

export function buildRolePath(role: Role, path = '') {
  const normalizedPath = resolveDashboardPathForRole(role, path).replace(/^\/+/, '')
  return normalizedPath ? `/${role}/${normalizedPath}` : `/${role}`
}

export function getDefaultRolePath(path = 'dashboard') {
  return buildRolePath(getCurrentUserRole(), path)
}

export function getRoleFromPathname(pathname: string) {
  const [firstSegment] = pathname.split('/').filter(Boolean)
  return firstSegment && isValidRole(firstSegment) ? firstSegment : getCurrentUserRole()
}

export function stripRoleFromPathname(pathname: string) {
  const segments = pathname.split('/').filter(Boolean)
  const strippedPath =
    segments.length > 0 && isValidRole(segments[0])
      ? `/${segments.slice(1).join('/')}`
      : pathname

  return getCanonicalDashboardPath(strippedPath) || '/'
}

export const legacyDashboardPaths = [
  '/dashboard',
  '/inventory',
  '/vehicle-stocks',
  '/preparation',
  '/allocation',
  '/unit-allocation',
  '/driver-allocation',
  '/users',
  '/unit-setup',
  '/reports',
  '/settings',
  '/profile',
  '/test-drive',
] as const

export function isLegacyDashboardPath(pathname: string) {
  const normalizedPath = normalizeDashboardPath(pathname)

  if (!normalizedPath) {
    return false
  }

  return legacyDashboardPaths.some(
    (path) => normalizedPath === path || normalizedPath.startsWith(`${path}/`)
  )
}
