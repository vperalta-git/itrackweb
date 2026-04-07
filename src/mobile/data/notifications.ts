import { Notification, NotificationType } from '../types';
import { api, getResponseData } from '../lib/api';
import { getResponseMessage } from '../lib/api';
import { toDate } from './shared';

type NotificationApiRecord = {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, unknown>;
  read: boolean;
  readAt?: string | null;
  createdAt: string;
};

export type PushNotificationTokenRegistrationInput = {
  userId: string;
  token: string;
  platform: 'android' | 'ios' | 'web' | 'unknown';
  deviceName: string;
  projectId?: string | null;
};

const mapNotificationRecord = (
  record: NotificationApiRecord
): Notification => ({
  id: record.id,
  userId: record.userId,
  type: record.type ?? NotificationType.SYSTEM,
  title: record.title,
  message: record.message,
  data: record.data,
  read: Boolean(record.read),
  readAt: record.readAt ? toDate(record.readAt) : undefined,
  createdAt: toDate(record.createdAt),
});

export const loadNotifications = async (userId: string) => {
  const response = await api.get('/notifications', {
    params: {
      userId,
    },
  });

  return (getResponseData<NotificationApiRecord[]>(response) ?? []).map(
    mapNotificationRecord
  );
};

export const markNotificationAsRead = async ({
  notificationId,
  userId,
}: {
  notificationId: string;
  userId: string;
}) => {
  const response = await api.patch(`/notifications/${notificationId}/read`, {
    userId,
  });

  return mapNotificationRecord(getResponseData<NotificationApiRecord>(response));
};

export const markAllNotificationsAsRead = async (userId: string) => {
  const response = await api.patch('/notifications/read-all', {
    userId,
  });

  return (getResponseData<NotificationApiRecord[]>(response) ?? []).map(
    mapNotificationRecord
  );
};

export const deleteNotificationRecord = async ({
  notificationId,
  userId,
}: {
  notificationId: string;
  userId: string;
}) => {
  await api.delete(`/notifications/${notificationId}`, {
    data: {
      userId,
    },
  });
};

export const clearNotificationRecords = async (userId: string) => {
  await api.delete('/notifications', {
    data: {
      userId,
    },
  });
};

export const registerPushNotificationToken = async (
  payload: PushNotificationTokenRegistrationInput
) => {
  await api.post('/notifications/push-token', payload);
};

export const sendTestNotification = async (userId: string) => {
  const response = await api.post('/notifications/test', {
    userId,
  });

  return (
    getResponseMessage(response) ||
    getResponseData<NotificationApiRecord | null>(response)?.title ||
    'Test notification sent.'
  );
};

export const unregisterPushNotificationToken = async ({
  userId,
  token,
}: {
  userId: string;
  token: string;
}) => {
  await api.delete('/notifications/push-token', {
    data: {
      userId,
      token,
    },
  });
};
