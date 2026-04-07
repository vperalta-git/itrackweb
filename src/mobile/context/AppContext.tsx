import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';

import { Notification } from '../types';
import { NotificationType } from '../types';
import { useAuth } from './AuthContext';
import {
  clearNotificationRecords,
  deleteNotificationRecord,
  loadNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  registerPushNotificationToken,
  unregisterPushNotificationToken,
} from '../data/notifications';
import {
  PushRegistrationStatus,
  registerDeviceForPushNotificationsAsync,
} from '../lib/pushNotifications';
import { getApiErrorMessage } from '../lib/api';

type PushNotificationsState = {
  status: PushRegistrationStatus;
  message: string;
  token: string | null;
};

type PopupNotificationState = {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  notificationId: string | null;
};

interface AppContextType {
  notifications: Notification[];
  unreadCount: number;
  notificationsLoading: boolean;
  pushNotifications: PushNotificationsState;
  popupNotification: PopupNotificationState | null;
  refreshNotifications: () => Promise<Notification[]>;
  registerForPushNotifications: () => Promise<void>;
  dismissPopupNotification: () => void;
  removeNotification: (id: string) => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  clearAll: () => Promise<void>;
  isDarkMode: boolean;
  setIsDarkMode: (isDark: boolean) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
}

const DEFAULT_PUSH_NOTIFICATIONS_STATE: PushNotificationsState = {
  status: 'idle',
  message: '',
  token: null,
};

const POPUP_AUTO_DISMISS_MS = 4500;
const NOTIFICATIONS_POLL_INTERVAL_MS = 30000;

const normalizeNotificationType = (value: unknown): NotificationType => {
  switch (String(value ?? '').trim().toLowerCase()) {
    case NotificationType.VEHICLE:
      return NotificationType.VEHICLE;
    case NotificationType.DRIVER:
      return NotificationType.DRIVER;
    case NotificationType.ALERT:
      return NotificationType.ALERT;
    case NotificationType.MESSAGE:
      return NotificationType.MESSAGE;
    case NotificationType.SYSTEM:
    default:
      return NotificationType.SYSTEM;
  }
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [pushNotifications, setPushNotifications] = useState<PushNotificationsState>(
    DEFAULT_PUSH_NOTIFICATIONS_STATE
  );
  const [popupNotification, setPopupNotification] =
    useState<PopupNotificationState | null>(null);
  const previousUserIdRef = useRef<string | null>(null);
  const registeredTokenRef = useRef<{
    userId: string;
    token: string;
  } | null>(null);
  const popupDismissTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );

  const unreadCount = notifications.filter((notification) => !notification.read).length;

  const refreshNotifications = async () => {
    if (!user?.id) {
      setNotifications([]);
      return [];
    }

    setNotificationsLoading(true);

    try {
      const nextNotifications = await loadNotifications(user.id);

      setNotifications(nextNotifications);

      return nextNotifications;
    } finally {
      setNotificationsLoading(false);
    }
  };

  const registerForPushNotifications = async () => {
    if (!user?.id) {
      setPushNotifications(DEFAULT_PUSH_NOTIFICATIONS_STATE);
      return;
    }

    setPushNotifications({
      status: 'registering',
      message: 'Registering this device for push notifications.',
      token: null,
    });

    const registrationResult = await registerDeviceForPushNotificationsAsync();

    if (registrationResult.status !== 'enabled') {
      setPushNotifications({
        status: registrationResult.status,
        message: registrationResult.message,
        token: null,
      });
      return;
    }

    try {
      await registerPushNotificationToken({
        userId: user.id,
        token: registrationResult.token,
        platform: registrationResult.platform,
        deviceName: registrationResult.deviceName,
        projectId: registrationResult.projectId,
      });

      registeredTokenRef.current = {
        userId: user.id,
        token: registrationResult.token,
      };

      setPushNotifications({
        status: 'enabled',
        message: registrationResult.message,
        token: registrationResult.token,
      });
    } catch (error) {
      setPushNotifications({
        status: 'error',
        message: getApiErrorMessage(
          error,
          'Push token could not be saved on the server.'
        ),
        token: null,
      });
    }
  };

  const removeNotification = async (id: string) => {
    if (!user?.id) {
      return;
    }

    await deleteNotificationRecord({
      notificationId: id,
      userId: user.id,
    });

    setNotifications((current) =>
      current.filter((notification) => notification.id !== id)
    );
  };

  const markAsRead = async (id: string) => {
    if (!user?.id) {
      return;
    }

    const updatedNotification = await markNotificationAsRead({
      notificationId: id,
      userId: user.id,
    });

    setNotifications((current) =>
      current.map((notification) =>
        notification.id === id ? updatedNotification : notification
      )
    );
  };

  const markAllAsRead = async () => {
    if (!user?.id) {
      return;
    }

    const updatedNotifications = await markAllNotificationsAsRead(user.id);

    setNotifications(updatedNotifications);
  };

  const clearAll = async () => {
    if (!user?.id) {
      return;
    }

    await clearNotificationRecords(user.id);
    setNotifications([]);
  };

  const dismissPopupNotification = () => {
    if (popupDismissTimeoutRef.current) {
      clearTimeout(popupDismissTimeoutRef.current);
      popupDismissTimeoutRef.current = null;
    }

    setPopupNotification(null);
  };

  useEffect(() => {
    if (popupDismissTimeoutRef.current) {
      clearTimeout(popupDismissTimeoutRef.current);
      popupDismissTimeoutRef.current = null;
    }

    if (!popupNotification) {
      return;
    }

    popupDismissTimeoutRef.current = setTimeout(() => {
      setPopupNotification(null);
      popupDismissTimeoutRef.current = null;
    }, POPUP_AUTO_DISMISS_MS);

    return () => {
      if (popupDismissTimeoutRef.current) {
        clearTimeout(popupDismissTimeoutRef.current);
        popupDismissTimeoutRef.current = null;
      }
    };
  }, [popupNotification]);

  useEffect(() => {
    const receivedSubscription =
      Notifications.addNotificationReceivedListener((receivedNotification) => {
        const { content } = receivedNotification.request;
        const title = content.title?.trim() || 'New notification';
        const message =
          content.body?.trim() ||
          'Open notifications to review the latest update.';
        const notificationId =
          typeof content.data?.notificationId === 'string' &&
          content.data.notificationId.trim()
            ? content.data.notificationId
            : null;

        setPopupNotification({
          id:
            receivedNotification.request.identifier ||
            `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          title,
          message,
          type: normalizeNotificationType(
            content.data?.notificationType ?? content.data?.type
          ),
          notificationId,
        });

        if (!user?.id) {
          return;
        }

        void refreshNotifications();
      });
    const responseSubscription =
      Notifications.addNotificationResponseReceivedListener((response) => {
        if (!user?.id) {
          return;
        }

        const notificationId = response.notification.request.content.data
          ?.notificationId;

        if (typeof notificationId === 'string' && notificationId.trim()) {
          void markAsRead(notificationId);
        } else {
          void refreshNotifications();
        }

        router.push('/(tabs)/notifications');
      });

    return () => {
      receivedSubscription.remove();
      responseSubscription.remove();
    };
  }, [user?.id]);

  useEffect(() => {
    const previousUserId = previousUserIdRef.current;
    const currentUserId = user?.id ?? null;
    const previousRegistration = registeredTokenRef.current;

    previousUserIdRef.current = currentUserId;

    if (
      previousRegistration &&
      previousUserId &&
      previousUserId !== currentUserId &&
      previousRegistration.userId === previousUserId
    ) {
      registeredTokenRef.current = null;

      void unregisterPushNotificationToken(previousRegistration).catch((error) => {
        console.error('Unable to remove the previous push token:', error);
      });
    }

    if (!currentUserId) {
      setNotifications([]);
      setNotificationsLoading(false);
      setPushNotifications(DEFAULT_PUSH_NOTIFICATIONS_STATE);
      dismissPopupNotification();
      return;
    }

    void refreshNotifications();
    void registerForPushNotifications();
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) {
      return;
    }

    const intervalId = setInterval(() => {
      void loadNotifications(user.id)
        .then((nextNotifications) => {
          setNotifications(nextNotifications);
        })
        .catch(() => {
          return;
        });
    }, NOTIFICATIONS_POLL_INTERVAL_MS);

    return () => {
      clearInterval(intervalId);
    };
  }, [user?.id]);

  const value: AppContextType = {
    notifications,
    unreadCount,
    notificationsLoading,
    pushNotifications,
    popupNotification,
    refreshNotifications,
    registerForPushNotifications,
    dismissPopupNotification,
    removeNotification,
    markAsRead,
    markAllAsRead,
    clearAll,
    isDarkMode,
    setIsDarkMode,
    isLoading,
    setIsLoading,
  };

  return (
    <AppContext.Provider value={value}>{children}</AppContext.Provider>
  );
};

export const useApp = (): AppContextType => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
