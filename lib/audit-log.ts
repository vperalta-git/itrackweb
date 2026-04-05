'use client'

import type { Role } from '@/lib/rbac'

export type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'LOGOUT' | 'EXPORT'

export interface AuditLogEntry {
  id: string
  user: string
  action: AuditAction
  module: string
  description: string
  timestamp: string
}

const STORAGE_KEY = 'itrack.audit.logs'

const roleDisplayNames: Record<Role, string> = {
  admin: 'Administrator',
  supervisor: 'Supervisor',
  manager: 'Manager',
  'sales-agent': 'Sales Agent',
}

export function getAuditActor(role: Role) {
  return roleDisplayNames[role]
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
    timestamp: new Date().toISOString().slice(0, 19).replace('T', ' '),
  }

  const currentLogs = getStoredAuditLogs()
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify([nextEntry, ...currentLogs]))
  window.dispatchEvent(new Event('audit-log-updated'))
}
