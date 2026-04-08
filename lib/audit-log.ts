'use client'

import type { Role } from '@/lib/rbac'
import { getSessionUserFullName, getSessionUser } from '@/lib/session'

export type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'LOGOUT' | 'EXPORT'

export interface AuditLogEntry {
  id: string
  user: string
  action: AuditAction
  module: string
  description: string
  timestamp: string
}

export const STORAGE_KEY = 'itrack.audit.logs'
export const AUDIT_LOG_UPDATED_EVENT = 'audit-log-updated'

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

  const raw = window.localStorage.getItem(STORAGE_KEY)
  if (!raw) return []

  try {
    return JSON.parse(raw) as AuditLogEntry[]
  } catch {
    return []
  }
}

export function logAuditEvent(input: Omit<AuditLogEntry, 'id' | 'timestamp'>) {
  if (typeof window === 'undefined') return

  const nextEntry: AuditLogEntry = {
    ...input,
    id: `AUD-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: new Date().toISOString(),
  }

  const currentLogs = getStoredAuditLogs()
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify([nextEntry, ...currentLogs]))
  window.dispatchEvent(new Event(AUDIT_LOG_UPDATED_EVENT))
}
