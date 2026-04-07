import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

const hasExpoNotificationsApis =
  typeof Notifications.getPermissionsAsync === 'function' &&
  typeof Notifications.getExpoPushTokenAsync === 'function' &&
  typeof Notifications.addNotificationReceivedListener === 'function';

export const supportsExpoNotificationsRuntime =
  Platform.OS !== 'web' &&
  hasExpoNotificationsApis &&
  Constants.executionEnvironment !== 'storeClient' &&
  Constants.appOwnership !== 'expo';

let isNotificationHandlerConfigured = false;

export const ensureNotificationsRuntimeConfigured = () => {
  if (
    !supportsExpoNotificationsRuntime ||
    isNotificationHandlerConfigured
  ) {
    return;
  }

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });

  isNotificationHandlerConfigured = true;
};

export type PushRegistrationStatus =
  | 'idle'
  | 'registering'
  | 'enabled'
  | 'denied'
  | 'unsupported'
  | 'missing_project_id'
  | 'error';

export type PushRegistrationResult =
  | {
      status: 'enabled';
      token: string;
      platform: 'android' | 'ios' | 'web' | 'unknown';
      deviceName: string;
      projectId: string | null;
      message: string;
    }
  | {
      status:
        | 'denied'
        | 'unsupported'
        | 'missing_project_id'
        | 'error';
      token: null;
      message: string;
    };

type ExpoExtraConfig = {
  expoPushProjectId?: string | null;
  eas?: {
    projectId?: string | null;
  };
};

const resolveExpoProjectId = () => {
  const extra = (Constants.expoConfig?.extra ?? {}) as ExpoExtraConfig;

  return (
    extra.expoPushProjectId ||
    extra.eas?.projectId ||
    Constants.easConfig?.projectId ||
    process.env.EXPO_PUBLIC_EAS_PROJECT_ID?.trim() ||
    null
  );
};

const resolvePushPlatform = (): 'android' | 'ios' | 'web' | 'unknown' => {
  if (Platform.OS === 'android') {
    return 'android';
  }

  if (Platform.OS === 'ios') {
    return 'ios';
  }

  if (Platform.OS === 'web') {
    return 'web';
  }

  return 'unknown';
};

const ensureAndroidNotificationChannel = async () => {
  if (Platform.OS !== 'android') {
    return;
  }

  await Notifications.setNotificationChannelAsync('itrack-alerts', {
    name: 'I-TRACK Alerts',
    description: 'Dispatch, preparation, and test drive alerts for I-TRACK.',
    importance: Notifications.AndroidImportance.MAX,
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    showBadge: true,
    enableLights: true,
    enableVibrate: true,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#ef4444',
    sound: 'default',
  });
};

export const registerDeviceForPushNotificationsAsync =
  async (): Promise<PushRegistrationResult> => {
    try {
      if (!supportsExpoNotificationsRuntime) {
        return {
          status: 'unsupported',
          token: null,
          message:
            'Remote push notifications are not available in Expo Go for this app. Use a development build to test device registration and delivery.',
        };
      }

      ensureNotificationsRuntimeConfigured();
      await ensureAndroidNotificationChannel();

      if (!Device.isDevice) {
        return {
          status: 'unsupported',
          token: null,
          message:
            'Push notifications require a physical device. Emulators can still use the in-app inbox.',
        };
      }

      const existingPermissions = await Notifications.getPermissionsAsync();
      let finalStatus = existingPermissions.status;

      if (finalStatus !== 'granted') {
        const requestedPermissions =
          await Notifications.requestPermissionsAsync();

        finalStatus = requestedPermissions.status;
      }

      if (finalStatus !== 'granted') {
        return {
          status: 'denied',
          token: null,
          message:
            'Notification permission is denied. Enable it in the device settings to receive push alerts.',
        };
      }

      const projectId = resolveExpoProjectId();

      if (!projectId) {
        return {
          status: 'missing_project_id',
          token: null,
          message:
            'Set EXPO_PUBLIC_EAS_PROJECT_ID or extra.eas.projectId before registering Expo push notifications.',
        };
      }

      const expoPushToken = await Notifications.getExpoPushTokenAsync({
        projectId,
      });

      return {
        status: 'enabled',
        token: expoPushToken.data,
        platform: resolvePushPlatform(),
        deviceName:
          Device.deviceName?.trim() ||
          Device.modelName?.trim() ||
          'Mobile device',
        projectId,
        message: 'Push notifications are enabled on this device.',
      };
    } catch (error) {
      return {
        status: 'error',
        token: null,
        message:
          error instanceof Error && error.message.trim()
            ? error.message
            : 'Unable to register this device for push notifications.',
      };
    }
  };
