'use client'

import { apiRequest } from '@/lib/api-client'
import {
  BackendPopulatedUser,
  buildEmployeeId,
  getDepartmentFromBackendRole,
  getDisplayDate,
  getEntityId,
  getFullName,
  getIsoDate,
  getRelativeTime,
} from '@/lib/backend-helpers'
import {
  isValidMobilePhoneNumber,
  MOBILE_PHONE_VALIDATION_MESSAGE,
  normalizeMobilePhoneNumber,
} from '@/lib/phone'
import { requestWebNotificationRefresh } from '@/lib/notification-preferences'
import { mapBackendRoleToUserRole, mapUserRoleToBackendRole, type UserRole } from '@/lib/session'

export interface SystemUser {
  id: string
  employeeId: string
  firstName: string
  lastName: string
  email: string
  phone: string
  role: UserRole
  department: string
  status: 'active' | 'inactive'
  lastLogin: string
  createdAt: string
  bio?: string
  avatarUrl?: string | null
  managerId?: string | null
  managerName?: string | null
}

export const USERS_STORAGE_KEY = 'itrack.system.users'
export const USERS_UPDATED_EVENT = 'users-updated'
const USER_LAST_LOGIN_STORAGE_KEY = 'itrack.system.user-last-login'

const EMPTY_USERS: SystemUser[] = []

const safeParseUsers = (raw: string | null) => {
  if (!raw) return EMPTY_USERS

  try {
    return JSON.parse(raw) as SystemUser[]
  } catch {
    return EMPTY_USERS
  }
}

const safeParseLastLoginMap = (raw: string | null) => {
  if (!raw) return {} as Record<string, string>

  try {
    return JSON.parse(raw) as Record<string, string>
  } catch {
    return {} as Record<string, string>
  }
}

function loadUserLastLoginMap() {
  if (typeof window === 'undefined') return {} as Record<string, string>
  return safeParseLastLoginMap(window.localStorage.getItem(USER_LAST_LOGIN_STORAGE_KEY))
}

function persistUserLastLoginMap(map: Record<string, string>) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(USER_LAST_LOGIN_STORAGE_KEY, JSON.stringify(map))
}

export function loadUsers(): SystemUser[] {
  if (typeof window === 'undefined') return EMPTY_USERS
  return safeParseUsers(window.localStorage.getItem(USERS_STORAGE_KEY))
}

export function persistUsers(users: SystemUser[]) {
  if (typeof window === 'undefined') return

  window.localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users))
  window.dispatchEvent(new Event(USERS_UPDATED_EVENT))
}

export function mapBackendUserToSystemUser(user: BackendPopulatedUser): SystemUser {
  const id = getEntityId(user)
  const fallbackLastLoginAt = loadUserLastLoginMap()[id] ?? null
  const lastLoginAt =
    user.lastLoginAt ??
    user.last_login_at ??
    user.lastLogin ??
    user.last_login ??
    user.lastSeenAt ??
    user.lastSeen ??
    user.lastActiveAt ??
    fallbackLastLoginAt

  const formattedLastLogin =
    lastLoginAt && !Number.isNaN(new Date(lastLoginAt).getTime())
      ? getRelativeTime(lastLoginAt) || getDisplayDate(lastLoginAt)
      : 'Never'

  return {
    id,
    employeeId: buildEmployeeId(id),
    firstName: user.firstName ?? '',
    lastName: user.lastName ?? '',
    email: user.email ?? '',
    phone: user.phone ?? '',
    role: mapBackendRoleToUserRole(user.role ?? 'admin'),
    department: getDepartmentFromBackendRole(user.role),
    status: user.isActive === false ? 'inactive' : 'active',
    lastLogin: formattedLastLogin,
    createdAt: getIsoDate(user.createdAt),
    bio: user.bio ?? '',
    avatarUrl: user.avatarUrl ?? null,
    managerId: getEntityId(user.managerId),
    managerName: getFullName(user.managerId),
  }
}

const sortUsers = (users: SystemUser[]) =>
  [...users].sort((left, right) => right.createdAt.localeCompare(left.createdAt))

export async function syncUsersFromBackend() {
  const users = await apiRequest<BackendPopulatedUser[]>('/users')
  const mappedUsers = sortUsers(users.map(mapBackendUserToSystemUser))
  persistUsers(mappedUsers)
  return mappedUsers
}

export async function createUserRecord(input: {
  firstName: string
  lastName: string
  email: string
  phone: string
  role: UserRole
  password?: string
  bio?: string
  managerId?: string | null
  sendCredentialsEmail?: boolean
}) {
  const phone = normalizeMobilePhoneNumber(input.phone)

  if (!isValidMobilePhoneNumber(phone)) {
    throw new Error(MOBILE_PHONE_VALIDATION_MESSAGE)
  }

  const createdUser = await apiRequest<BackendPopulatedUser>('/users', {
    method: 'POST',
    body: {
      firstName: input.firstName.trim(),
      lastName: input.lastName.trim(),
      email: input.email.trim().toLowerCase(),
      phone,
      role: mapUserRoleToBackendRole(input.role),
      bio: input.bio?.trim() ?? '',
      managerId: input.role === 'sales-agent' ? input.managerId ?? null : null,
      ...(input.password ? { password: input.password } : {}),
      ...(input.sendCredentialsEmail ? { sendCredentialsEmail: true } : {}),
    },
  })

  const nextUser = mapBackendUserToSystemUser(createdUser)
  const currentUsers = loadUsers().filter((user) => user.id !== nextUser.id)
  persistUsers(sortUsers([nextUser, ...currentUsers]))
  requestWebNotificationRefresh()
  return nextUser
}

export async function updateUserRecord(
  id: string,
  input: {
    firstName: string
    lastName: string
    email: string
    phone: string
    role: UserRole
    status: 'active' | 'inactive'
    bio?: string
    avatarUrl?: string | null
    skipPhoneValidation?: boolean
  }
) {
  const trimmedPhone = input.phone.trim()
  const normalizedPhone = normalizeMobilePhoneNumber(trimmedPhone)
  const phone = input.skipPhoneValidation
    ? isValidMobilePhoneNumber(normalizedPhone)
      ? normalizedPhone
      : trimmedPhone
    : normalizedPhone

  if (!input.skipPhoneValidation && !isValidMobilePhoneNumber(phone)) {
    throw new Error(MOBILE_PHONE_VALIDATION_MESSAGE)
  }

  const updatedUser = await apiRequest<BackendPopulatedUser>(`/users/${id}`, {
    method: 'PATCH',
    body: {
      firstName: input.firstName.trim(),
      lastName: input.lastName.trim(),
      email: input.email.trim().toLowerCase(),
      phone,
      role: mapUserRoleToBackendRole(input.role),
      isActive: input.status === 'active',
      bio: input.bio?.trim() ?? '',
      avatarUrl: input.avatarUrl ?? null,
    },
  })

  const nextUser = mapBackendUserToSystemUser(updatedUser)
  const currentUsers = loadUsers().filter((user) => user.id !== nextUser.id)
  persistUsers(sortUsers([nextUser, ...currentUsers]))
  requestWebNotificationRefresh()
  return nextUser
}

export async function deleteUserRecord(id: string) {
  await apiRequest(`/users/${id}`, {
    method: 'DELETE',
  })

  persistUsers(loadUsers().filter((user) => user.id !== id))
  const nextLastLoginMap = { ...loadUserLastLoginMap() }
  delete nextLastLoginMap[id]
  persistUserLastLoginMap(nextLastLoginMap)
  requestWebNotificationRefresh()
}

export function recordUserLastLogin(userId: string, at = new Date().toISOString()) {
  if (!userId || typeof window === 'undefined') return

  const nextLastLoginMap = {
    ...loadUserLastLoginMap(),
    [userId]: at,
  }

  persistUserLastLoginMap(nextLastLoginMap)

  const nextUsers = loadUsers().map((user) =>
    user.id === userId
      ? {
          ...user,
          lastLogin: getRelativeTime(at) || getDisplayDate(at),
        }
      : user
  )

  persistUsers(nextUsers)
}
