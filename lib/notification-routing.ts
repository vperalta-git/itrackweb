'use client'
import { apiRequest } from '@/lib/api-client'
import { buildRolePath, type Role } from '@/lib/rbac'

export type NotificationTarget = { entityType: string; entityId: string; available: boolean; message: string; vehicleId?: string }
export function notificationTargetHref(target: NotificationTarget, role: Role) {
  const routes: Record<string, string> = {
    driver_allocation: 'driver-allocation/live-tracking', preparation: 'preparation',
    test_drive_booking: 'test-drive', unit_agent_allocation: role === 'admin' || role === 'supervisor' ? 'unit-allocation' : 'vehicle-stocks/stock-list',
    vehicle: 'vehicle-stocks/stock-list',
  }
  const path = buildRolePath(role, routes[target.entityType] ?? 'dashboard')
  const recordId = target.entityType === 'unit_agent_allocation' && role !== 'admin' && role !== 'supervisor' ? target.vehicleId : target.entityId
  return target.available && recordId ? `${path}?${target.entityType === 'driver_allocation' ? 'allocation' : 'record'}=${encodeURIComponent(recordId)}&notice=${Date.now()}` : path
}
export const fetchNotificationTarget = (id: string) => apiRequest<NotificationTarget>(`/notifications/${encodeURIComponent(id)}/target`)
