'use client'

import { apiRequest } from '@/lib/api-client'
import { BackendNotification, getEntityId, getRelativeTime } from '@/lib/backend-helpers'

export interface AppNotification {
  id: string
  title: string
  message: string
  time: string
  read: boolean
  type: string
  createdAt: string
}

const mapNotification = (notification: BackendNotification): AppNotification => ({
  id: getEntityId(notification),
  title: notification.title ?? '',
  message: notification.message ?? '',
  time: getRelativeTime(notification.createdAt),
  read: Boolean(notification.read),
  type: notification.type ?? 'system',
  createdAt: notification.createdAt ?? new Date().toISOString(),
})

export async function fetchNotifications(userId: string) {
  const notifications = await apiRequest<BackendNotification[]>('/notifications', {
    query: { userId },
  })

  return notifications.map(mapNotification)
}

export async function markNotificationRead(id: string, userId: string) {
  const notification = await apiRequest<BackendNotification>(`/notifications/${id}/read`, {
    method: 'PATCH',
    body: { userId },
  })

  return mapNotification(notification)
}

export async function markAllNotificationsRead(userId: string) {
  const notifications = await apiRequest<BackendNotification[]>('/notifications/read-all', {
    method: 'PATCH',
    body: { userId },
  })

  return notifications.map(mapNotification)
}

export async function deleteNotificationRecord(id: string, userId: string) {
  await apiRequest(`/notifications/${id}`, {
    method: 'DELETE',
    body: { userId },
  })
}

export async function clearNotifications(userId: string) {
  await apiRequest('/notifications', {
    method: 'DELETE',
    body: { userId },
  })
}

export async function createNotificationRecord(input: {
  userId: string
  title: string
  message: string
  type?: string
  data?: Record<string, unknown>
}) {
  return apiRequest<BackendNotification>('/notifications', {
    method: 'POST',
    body: {
      userId: input.userId,
      title: input.title,
      message: input.message,
      type: input.type ?? 'system',
      ...(input.data ? { data: input.data } : {}),
    },
  })
}
