export const roles = ['admin', 'supervisor', 'manager', 'sales-agent'] as const

export type Role = (typeof roles)[number]

const DEFAULT_ROLE: Role = 'admin'

export function isValidRole(value: string): value is Role {
  return roles.includes(value as Role)
}

export function getCurrentUserRole(): Role {
  return DEFAULT_ROLE
}

export function buildRolePath(role: Role, path = '') {
  const normalizedPath = path.replace(/^\/+/, '')
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

  if (segments.length > 0 && isValidRole(segments[0])) {
    return `/${segments.slice(1).join('/')}` || '/'
  }

  return pathname
}

export const legacyDashboardPaths = [
  '/dashboard',
  '/inventory',
  '/preparation',
  '/allocation',
  '/users',
  '/reports',
  '/settings',
  '/profile',
  '/test-drive',
] as const

export function isLegacyDashboardPath(pathname: string) {
  return legacyDashboardPaths.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`)
  )
}
