'use client'

import type { Role } from '@/lib/rbac'
import { getSessionUserFullName, getSessionUser, getRoleLabel, type UserRole } from '@/lib/session'
import type { SystemUser } from '@/lib/user-data'

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
  const role = value === 'sales_agent' ? 'sales-agent' : value === 'dispatcher' ? 'dispatch' : value
  return typeof role === 'string' && Object.hasOwn(auditRoleColors, role) ? role as UserRole : undefined
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

export function resolveAuditActor(log: AuditLogEntry, users: SystemUser[]) {
  // Prefer captured identity and role. Resolve legacy entries only when the
  // directory contains exactly one matching account.
  const matches = users.filter((user) => log.userId ? user.id === log.userId
    : log.userEmail ? user.email.toLowerCase() === log.userEmail.toLowerCase()
      : `${user.firstName} ${user.lastName}`.trim() === log.user || user.email.toLowerCase() === log.user.toLowerCase())
  const account = matches.length === 1 ? matches[0] : undefined
  const role = normalizeAuditRole(log.role) ?? normalizeAuditRole(account?.role)
  return {
    roleKey: role,
    role: role ? getRoleLabel(role) : 'Unknown',
    userEmail: log.userEmail ?? account?.email ?? '',
    userAvatarUrl: account?.avatarUrl ?? '',
  }
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
      userId: sessionUser?.id,
      userEmail: sessionUser?.email,
      role: sessionUser?.role,
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
