import {
  ROUTE_ROLE_COOKIE_NAME,
  SESSION_COOKIE_NAME,
  SESSION_STORAGE_KEY,
} from '@/lib/auth-constants'
import { isValidRole, type Role } from '@/lib/rbac'

export type BackendRole =
  | 'admin'
  | 'supervisor'
  | 'manager'
  | 'sales_agent'
  | 'dispatcher'
  | 'driver'

export type UserRole = Role | 'dispatch' | 'driver'

export interface SessionUser {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string
  bio: string
  avatarUrl: string | null
  backendRole: BackendRole
  role: UserRole
  routeRole: Role | null
  managerId: string | null
  managerName: string | null
}

export interface AuthSession {
  token: string
  remember: boolean
  user: SessionUser
}

type BackendUserShape = {
  id?: string
  _id?: string
  firstName?: string
  lastName?: string
  email?: string
  phone?: string
  bio?: string
  avatarUrl?: string | null
  role?: string
  managerId?:
    | string
    | {
        id?: string
        _id?: string
        firstName?: string
        lastName?: string
      }
    | null
}

const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30

const roleLabels: Record<UserRole, string> = {
  admin: 'Administrator',
  supervisor: 'Supervisor',
  manager: 'Manager',
  'sales-agent': 'Sales Agent',
  dispatch: 'Dispatch',
  driver: 'Driver',
}

const departmentByRole: Record<UserRole, string> = {
  admin: 'IT Department',
  supervisor: 'Operations',
  manager: 'Sales Department',
  'sales-agent': 'Sales Department',
  dispatch: 'Operations',
  driver: 'Operations',
}

const safeParseJson = <T,>(raw: string | null): T | null => {
  if (!raw) return null

  try {
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

const getEntityId = (value: BackendUserShape['managerId'] | BackendUserShape) => {
  if (!value) return ''
  if (typeof value === 'string') return value
  return value.id ?? value._id ?? ''
}

const getUserFullName = (
  value:
    | {
        firstName?: string
        lastName?: string
      }
    | null
    | undefined
) => `${value?.firstName ?? ''} ${value?.lastName ?? ''}`.trim()

const writeCookie = (name: string, value: string, remember: boolean) => {
  if (typeof document === 'undefined') return

  const parts = [`${name}=${encodeURIComponent(value)}`, 'Path=/', 'SameSite=Lax']
  if (remember) {
    parts.push(`Max-Age=${COOKIE_MAX_AGE_SECONDS}`)
  }

  document.cookie = parts.join('; ')
}

const clearCookie = (name: string) => {
  if (typeof document === 'undefined') return
  document.cookie = `${name}=; Path=/; Max-Age=0; SameSite=Lax`
}

const getCookieValue = (name: string) => {
  if (typeof document === 'undefined') return null

  const prefix = `${name}=`
  const cookie = document.cookie
    .split('; ')
    .find((entry) => entry.startsWith(prefix))

  if (!cookie) return null
  return decodeURIComponent(cookie.slice(prefix.length))
}

export function mapBackendRoleToUserRole(role: string): UserRole {
  switch (role) {
    case 'admin':
    case 'supervisor':
    case 'manager':
      return role
    case 'sales_agent':
      return 'sales-agent'
    case 'dispatcher':
      return 'dispatch'
    case 'driver':
      return 'driver'
    default:
      return 'admin'
  }
}

export function mapUserRoleToBackendRole(role: UserRole): BackendRole {
  switch (role) {
    case 'sales-agent':
      return 'sales_agent'
    case 'dispatch':
      return 'dispatcher'
    default:
      return role
  }
}

export function mapBackendRoleToRouteRole(role: string): Role | null {
  const mappedRole = mapBackendRoleToUserRole(role)
  return isValidRole(mappedRole) ? mappedRole : null
}

export function getRoleLabel(role: UserRole) {
  return roleLabels[role]
}

export function getDepartmentFromRole(role: UserRole) {
  return departmentByRole[role]
}

export function getSessionUserFullName(
  user: Pick<SessionUser, 'firstName' | 'lastName'> | null | undefined
) {
  return `${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim()
}

export function mapAuthUserFromBackend(user: BackendUserShape): SessionUser {
  const backendRole = (user.role ?? 'admin') as BackendRole
  const routeRole = mapBackendRoleToRouteRole(backendRole)
  const managerValue =
    user.managerId && typeof user.managerId === 'object' ? user.managerId : null

  return {
    id: getEntityId(user),
    firstName: user.firstName ?? '',
    lastName: user.lastName ?? '',
    email: user.email ?? '',
    phone: user.phone ?? '',
    bio: user.bio ?? '',
    avatarUrl: user.avatarUrl ?? null,
    backendRole,
    role: mapBackendRoleToUserRole(backendRole),
    routeRole,
    managerId: getEntityId(user.managerId),
    managerName: getUserFullName(managerValue),
  }
}

export function loadSession(): AuthSession | null {
  if (typeof window === 'undefined') return null
  return safeParseJson<AuthSession>(window.localStorage.getItem(SESSION_STORAGE_KEY))
}

export function getSessionUser() {
  return loadSession()?.user ?? null
}

export function saveSession(session: AuthSession) {
  if (typeof window === 'undefined') return

  window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session))
  writeCookie(SESSION_COOKIE_NAME, '1', session.remember)

  if (session.user.routeRole) {
    writeCookie(ROUTE_ROLE_COOKIE_NAME, session.user.routeRole, session.remember)
    return
  }

  clearCookie(ROUTE_ROLE_COOKIE_NAME)
}

export function clearSession() {
  if (typeof window !== 'undefined') {
    window.localStorage.removeItem(SESSION_STORAGE_KEY)
  }

  clearCookie(SESSION_COOKIE_NAME)
  clearCookie(ROUTE_ROLE_COOKIE_NAME)
}

export function updateSessionUser(nextUser: Partial<SessionUser>) {
  const currentSession = loadSession()
  if (!currentSession) return null

  const nextSession: AuthSession = {
    ...currentSession,
    user: {
      ...currentSession.user,
      ...nextUser,
    },
  }

  saveSession(nextSession)
  return nextSession
}

export function getCurrentRouteRoleFromSession() {
  return loadSession()?.user.routeRole ?? null
}

export function getCurrentRouteRoleCookie() {
  const cookieValue = getCookieValue(ROUTE_ROLE_COOKIE_NAME)
  return cookieValue && isValidRole(cookieValue) ? cookieValue : null
}
