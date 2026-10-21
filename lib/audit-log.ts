'use client'

import type { Role } from '@/lib/rbac'
import { getSessionUserFullName, getSessionUser, getRoleLabel, type UserRole } from '@/lib/session'
import type { SystemUser } from '@/lib/user-data'
import { apiRequest } from '@/lib/api-client'

export type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'LOGOUT' | 'EXPORT' | 'APPROVE' | 'REJECT'

export interface AuditLogEntry {
  id: string
  user: string
  userId?: string
  userEmail?: string
  role?: UserRole
  action: AuditAction
  module: string
  description: string
  timestamp: string
}

export const STORAGE_KEY = 'itrack.audit.logs'
export const AUDIT_LOG_UPDATED_EVENT = 'audit-log-updated'

export const auditRoleColors: Record<UserRole, string> = {
  admin: 'bg-destructive/10 text-destructive border-destructive/20',
  supervisor: 'bg-secondary text-secondary-foreground border-border',
  manager: 'bg-primary/10 text-primary border-primary/20',
  'sales-agent': 'bg-success/10 text-success border-success/20',
  dispatch: 'bg-info/10 text-info border-info/20',
  driver: 'bg-warning/10 text-warning border-warning/20',
}

export function normalizeAuditRole(value: unknown): UserRole | undefined {
  if (typeof value !== 'string') return undefined
  const key = value.trim().toLowerCase().replace(/[\s_]+/g, '-')
  const role = key === 'administrator' ? 'admin' : key === 'dispatcher' ? 'dispatch' : key
  return typeof role === 'string' && Object.hasOwn(auditRoleColors, role) ? role as UserRole : undefined
}

export type AuditActorHistory = {
  userId?: string
  name: string
  email?: string
  role?: string
  recordedAt?: string
}

const normalizeActorIdentity = (value?: string) =>
  (value ?? '').normalize('NFKC').trim().replace(/\s+/g, ' ').toLowerCase()

type BackendActorEvent = {
  userId?: string | null
  deletedUserId?: string
  name?: string
  email?: string
  role?: string
  createdAt?: string
}

export async function fetchAuditActorHistory(): Promise<AuditActorHistory[]> {
  const results = await Promise.allSettled([
    apiRequest<BackendActorEvent[]>('/auth/events'),
    apiRequest<BackendActorEvent[]>('/users/audit-events'),
  ])
  return results.flatMap((result) => result.status === 'fulfilled' && Array.isArray(result.value)
    ? result.value.map((event) => ({
        userId: event.userId ?? event.deletedUserId,
        name: event.name ?? '', email: event.email, role: event.role, recordedAt: event.createdAt,
      })) : [])
}

const isAuditLog = (value: unknown): value is AuditLogEntry => {
  if (!value || typeof value !== 'object') return false
  const entry = value as Record<string, unknown>
  return ['id', 'user', 'module', 'description', 'timestamp'].every((key) => typeof entry[key] === 'string') &&
    ['userId', 'userEmail'].every((key) => entry[key] === undefined || typeof entry[key] === 'string') &&
    typeof entry.action === 'string' &&
    ['CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'EXPORT', 'APPROVE', 'REJECT'].includes(String(entry.action)) &&
    !Number.isNaN(new Date(String(entry.timestamp)).getTime())
}

export function resolveAuditActor(log: AuditLogEntry, users: SystemUser[], history: AuditActorHistory[] = []) {
  let sessionUser = null
  try { sessionUser = getSessionUser() } catch { /* Storage can be unavailable. */ }
  const accounts: Array<Pick<SystemUser, 'id' | 'firstName' | 'lastName' | 'email' | 'role' | 'avatarUrl'>> = [...users]
  if (sessionUser && !accounts.some((user) => user.id === sessionUser.id)) {
    accounts.push(sessionUser)
  }
  const identities: AuditActorHistory[] = [
    ...history,
    ...accounts.map((user) => ({ userId: user.id, name: `${user.firstName} ${user.lastName}`, email: user.email, role: user.role })),
  ]
  const actorName = normalizeActorIdentity(log.user)
  const actorEmail = normalizeActorIdentity(log.userEmail)
  const matches = identities.filter((actor) => log.userId ? actor.userId === log.userId
    : actorEmail ? normalizeActorIdentity(actor.email) === actorEmail
      : normalizeActorIdentity(actor.name) === actorName || normalizeActorIdentity(actor.email) === actorName)
  // Recover historical names through their stable account ID/email, including
  // accounts that have since been renamed or removed from the current directory.
  const ids = new Set(matches.map((actor) => actor.userId).filter(Boolean))
  const emails = new Set(matches.map((actor) => normalizeActorIdentity(actor.email)).filter(Boolean))
  const uniqueIdentity = ids.size === 1 || (ids.size === 0 && emails.size <= 1)
  const account = uniqueIdentity ? accounts.find((user) => ids.size ? ids.has(user.id) : emails.has(normalizeActorIdentity(user.email))) : undefined
  const eventTime = new Date(log.timestamp).getTime()
  const historicalMatches = history.filter((actor) => normalizeAuditRole(actor.role) &&
    (matches.includes(actor) || (uniqueIdentity && (actor.userId ? ids.has(actor.userId) : emails.has(normalizeActorIdentity(actor.email))))))
  const preceding = historicalMatches.filter((actor) => actor.recordedAt && new Date(actor.recordedAt).getTime() <= eventTime)
    .sort((left, right) => new Date(right.recordedAt!).getTime() - new Date(left.recordedAt!).getTime())
  const matchingRoles = new Set(matches.map((actor) => normalizeAuditRole(actor.role)).filter((role): role is UserRole => Boolean(role)))
  const historicalRoles = new Set(historicalMatches.map((actor) => normalizeAuditRole(actor.role)).filter((role): role is UserRole => Boolean(role)))
  const role = normalizeAuditRole(log.role) ??
    (uniqueIdentity && preceding.length ? normalizeAuditRole(preceding[0].role) : undefined) ??
    (uniqueIdentity && historicalRoles.size === 1 ? [...historicalRoles][0] : undefined) ??
    (matchingRoles.size === 1 ? [...matchingRoles][0] : undefined)
  return {
    roleKey: role,
    role: role ? getRoleLabel(role) : 'Role not recorded',
    userId: log.userId || (uniqueIdentity && ids.size === 1 ? [...ids][0] : undefined),
    userEmail: log.userEmail || account?.email || (uniqueIdentity && emails.size === 1 ? [...emails][0] : ''),
    userAvatarUrl: account?.avatarUrl ?? '',
  }
}

export function repairStoredAuditActors(users: SystemUser[], history: AuditActorHistory[]) {
  const logs = getStoredAuditLogs()
  // Newer local snapshots can also identify the actor of older browser entries.
  const snapshots = [...history, ...logs.filter((log) => normalizeAuditRole(log.role)).map((log) => ({
    userId: log.userId, name: log.user, email: log.userEmail, role: log.role, recordedAt: log.timestamp,
  }))]
  let repaired = false
  const entries = logs.map((log) => {
    if (normalizeAuditRole(log.role)) return log
    const actor = resolveAuditActor(log, users, snapshots)
    if (!actor.roleKey) return log
    repaired = true
    return { ...log, role: actor.roleKey, userId: actor.userId, userEmail: actor.userEmail }
  })
  if (repaired && typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries))
      window.dispatchEvent(new Event(AUDIT_LOG_UPDATED_EVENT))
    } catch { /* Recovered roles can still be displayed when storage is full. */ }
  }
  return entries
}

const roleDisplayNames: Record<Role, string> = {
  admin: 'Administrator',
  supervisor: 'Supervisor',
  manager: 'Manager',
  'sales-agent': 'Sales Agent',
}

export function getAuditActor(role: Role) {
  const sessionUser = getSessionUser()
  const fullName = getSessionUserFullName(sessionUser)
  return fullName || sessionUser?.email || roleDisplayNames[role]
}

export function getStoredAuditLogs(): AuditLogEntry[] {
  if (typeof window === 'undefined') return []

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    const entries: unknown = raw ? JSON.parse(raw) : []
    return Array.isArray(entries) ? entries.filter(isAuditLog) : []
  } catch {
    return []
  }
}

export function logAuditEvent(input: Omit<AuditLogEntry, 'id' | 'timestamp'>) {
  if (typeof window === 'undefined') return

  try {
    const sessionUser = getSessionUser()
    const nextEntry: AuditLogEntry = {
      ...input,
      userId: sessionUser?.id || input.userId,
      userEmail: sessionUser?.email || input.userEmail,
      role: normalizeAuditRole(sessionUser?.role) ?? normalizeAuditRole(sessionUser?.backendRole) ?? normalizeAuditRole(input.role),
      id: `AUD-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      timestamp: new Date().toISOString(),
    }
    const currentLogs = getStoredAuditLogs()
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify([nextEntry, ...currentLogs]))
  } catch {
    // Storage may be disabled or full; the completed action must still succeed.
    return
  }
  window.dispatchEvent(new Event(AUDIT_LOG_UPDATED_EVENT))
}
