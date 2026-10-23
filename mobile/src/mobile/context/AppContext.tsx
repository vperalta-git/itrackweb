import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { AppState } from 'react-native';
import { openMobileNotification } from '../navigation/notifications';

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
  setRegisteredDevicePushToken,
} from '../data/notifications';
import {
  PushRegistrationStatus,
  ensureNotificationsRuntimeConfigured,
  registerDeviceForPushNotificationsAsync,
  supportsExpoNotificationsRuntime,
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
const NOTIFICATIONS_POLL_INTERVAL_MS = 8000;

const logNotificationsError = (context: string, error: unknown) => {
  console.error(`[notifications] ${context}`, error);
};

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

const buildPopupNotificationState = (
  notification: Pick<Notification, 'id' | 'title' | 'message' | 'type'>
): PopupNotificationState => ({
  id: notification.id,
  title: notification.title?.trim() || 'New notification',
  message:
    notification.message?.trim() ||
    'Open notifications to review the latest update.',
  type: notification.type ?? NotificationType.SYSTEM,
  notificationId: notification.id,
});

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
  const registrationInFlightRef = useRef(false);
  const activeUserRef = useRef(user);
  activeUserRef.current = user;
  const lastHandledResponseRef = useRef<string | null>(null);
  const seenNotificationIdsRef = useRef<Set<string>>(new Set());
  const registeredTokenRef = useRef<{
    userId: string;
    token: string;
  } | null>(null);
  const popupDismissTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );

  const unreadCount = notifications.filter((notification) => !notification.read).length;

  const syncNotificationsState = useCallback(
    (
      nextNotifications: Notification[],
      options?: {
        surfacePopup?: boolean;
      }
    ) => {
      setNotifications(nextNotifications);

      const previousSeenIds = seenNotificationIdsRef.current;
      const nextSeenIds = new Set(nextNotifications.map((notification) => notification.id));
      const newestNotification = nextNotifications.find(
        (notification) => !previousSeenIds.has(notification.id)
      );

      seenNotificationIdsRef.current = nextSeenIds;

      if (options?.surfacePopup && newestNotification) {
        setPopupNotification(buildPopupNotificationState(newestNotification));
      }
    },
    []
  );

  const refreshNotifications = async (
    options?: {
      surfacePopup?: boolean;
    }
  ) => {
    if (!user?.id) {
      setNotifications([]);
      seenNotificationIdsRef.current = new Set();
      return [];
    }

    setNotificationsLoading(true);

    try {
      const nextNotifications = await loadNotifications(user.id);

      syncNotificationsState(nextNotifications, {
        surfacePopup: options?.surfacePopup,
      });

      return nextNotifications;
    } catch (error) {
      logNotificationsError('Unable to refresh notifications.', error);
      return [];
    } finally {
      setNotificationsLoading(false);
    }
  };

  const registerForPushNotifications = async (requestPermission = true) => {
    if (!user?.id || user.mustChangePassword) {
      setPushNotifications(DEFAULT_PUSH_NOTIFICATIONS_STATE);
      return;
    }
    if (registrationInFlightRef.current) return;
    registrationInFlightRef.current = true;

    setPushNotifications({
      status: 'registering',
      message: 'Registering this device for push notifications.',
      token: null,
    });

    const registrationResult = await registerDeviceForPushNotificationsAsync(requestPermission);
    if (activeUserRef.current?.id !== user.id) { registrationInFlightRef.current = false; return; }

    if (registrationResult.status !== 'enabled') {
      setPushNotifications({
        status: registrationResult.status,
        message: registrationResult.message,
        token: null,
      });
      if (registrationResult.status === 'denied' && registeredTokenRef.current) {
        void unregisterPushNotificationToken(registeredTokenRef.current).catch(() => undefined);
        registeredTokenRef.current = null;
        setRegisteredDevicePushToken(null);
      }
      registrationInFlightRef.current = false;
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
      setRegisteredDevicePushToken(registrationResult.token);

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
    } finally {
      registrationInFlightRef.current = false;
    }
  };

  const removeNotification = async (id: string) => {
    if (!user?.id) {
      return;
    }

    try {
      await deleteNotificationRecord({
        notificationId: id,
        userId: user.id,
      });

      setNotifications((current) =>
        current.filter((notification) => notification.id !== id)
      );
    } catch (error) {
      logNotificationsError('Unable to delete a notification.', error);
    }
  };

  const markAsRead = async (id: string) => {
    if (!user?.id) {
      return;
    }

    try {
      const updatedNotification = await markNotificationAsRead({
        notificationId: id,
        userId: user.id,
      });

      setNotifications((current) =>
        current.map((notification) =>
          notification.id === id ? updatedNotification : notification
        )
      );
    } catch (error) {
      logNotificationsError('Unable to mark a notification as read.', error);
    }
  };

  const markAllAsRead = async () => {
    if (!user?.id) {
      return;
    }

    try {
      const updatedNotifications = await markAllNotificationsAsRead(user.id);

      setNotifications(updatedNotifications);
    } catch (error) {
      logNotificationsError('Unable to mark all notifications as read.', error);
    }
  };

  const clearAll = async () => {
    if (!user?.id) {
      return;
    }

    try {
      await clearNotificationRecords(user.id);
      setNotifications([]);
    } catch (error) {
      logNotificationsError('Unable to clear notifications.', error);
    }
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
    if (!supportsExpoNotificationsRuntime) {
      return;
    }

    ensureNotificationsRuntimeConfigured();

    const receivedSubscription =
      Notifications.addNotificationReceivedListener((receivedNotification) => {
        const { content } = receivedNotification.request;
        if (!user || user.mustChangePassword || content.data?.userId && content.data.userId !== user.id) return;
        const title = content.title?.trim() || 'New notification';
        const message =
          content.body?.trim() ||
          'Open notifications to review the latest update.';
        const notificationId =
          typeof content.data?.notificationId === 'string' &&
          content.data.notificationId.trim()
            ? content.data.notificationId
            : null;

        const popupId =
          receivedNotification.request.identifier ||
          `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

        if (notificationId) {
          seenNotificationIdsRef.current = new Set([
            ...seenNotificationIdsRef.current,
            notificationId,
          ]);
        }

        setPopupNotification({
          id: popupId,
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

        void refreshNotifications().catch((error) => {
          logNotificationsError(
            'Unable to refresh notifications after receiving one.',
            error
          );
        });
      });
    const handleResponse = (response: Notifications.NotificationResponse | null) => {
      if (!response || !user || user.mustChangePassword) return;
      const key = `${response.notification.request.identifier}:${response.actionIdentifier}`;
      if (lastHandledResponseRef.current === key) return;
      const data = response.notification.request.content.data;
      if (data?.userId && data.userId !== user.id) return;
      lastHandledResponseRef.current = key;
      void openMobileNotification(typeof data?.notificationId === 'string' ? data.notificationId : null, user.role);
      void Notifications.clearLastNotificationResponseAsync().catch(() => undefined);
    };
    const responseSubscription = Notifications.addNotificationResponseReceivedListener(handleResponse);
    void Notifications.getLastNotificationResponseAsync().then(handleResponse).catch(() => undefined);

    return () => {
      receivedSubscription.remove();
      responseSubscription.remove();
    };
  }, [user?.id, user?.mustChangePassword]);

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

      setRegisteredDevicePushToken(null);
    }

    if (!currentUserId || user?.mustChangePassword) {
      setNotifications([]);
      seenNotificationIdsRef.current = new Set();
      setNotificationsLoading(false);
      setPushNotifications(DEFAULT_PUSH_NOTIFICATIONS_STATE);
      dismissPopupNotification();
      return;
    }

    void refreshNotifications({ surfacePopup: false }).catch((error) => {
      logNotificationsError('Unable to refresh notifications after sign-in.', error);
    });
    void registerForPushNotifications().catch((error) => {
      logNotificationsError(
        'Unable to register this device for push notifications.',
        error
      );
    });
  }, [user?.id, user?.mustChangePassword]);

  useEffect(() => {
    if (!user || user.mustChangePassword) return;
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        void registerForPushNotifications(false);
        void refreshNotifications();
      }
    });
    const tokenSubscription = supportsExpoNotificationsRuntime
      ? Notifications.addPushTokenListener(() => { void registerForPushNotifications(false); }) : null;
    const retry = setInterval(() => {
      if (AppState.currentState === 'active' && !registeredTokenRef.current) void registerForPushNotifications(false);
    }, 60_000);
    return () => { subscription.remove(); tokenSubscription?.remove(); clearInterval(retry); };
  }, [user?.id, user?.mustChangePassword]);

  useEffect(() => {
    if (!user?.id || user.mustChangePassword) {
      return;
    }

    const intervalId = setInterval(() => {
      if (AppState.currentState !== 'active') return;
      void loadNotifications(user.id)
        .then((nextNotifications) => {
          syncNotificationsState(nextNotifications, {
            surfacePopup: true,
          });
        })
        .catch(() => {
          return;
        });
    }, NOTIFICATIONS_POLL_INTERVAL_MS);

    return () => {
      clearInterval(intervalId);
    };
  }, [syncNotificationsState, user?.id, user?.mustChangePassword]);

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
