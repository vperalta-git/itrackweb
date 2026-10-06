import React, { useEffect, useRef, useState } from 'react';
import { Stack, router } from 'expo-router';
import {
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AuthProvider, useAuth } from '@/src/mobile/context/AuthContext';
import { AppProvider, useApp } from '@/src/mobile/context/AppContext';
import { ErrorBoundary } from '@/src/mobile/components/ErrorBoundary';
import { StartupLoadingScreen } from '@/src/mobile/components';
import { NotificationType } from '@/src/mobile/types';
import { useTheme } from '@/src/mobile/constants/theme';

const MIN_STARTUP_SCREEN_MS = 1600;
const STARTUP_EXIT_DURATION_MS = 520;
const POPUP_EXIT_DURATION_MS = 180;

const getPopupPresentation = (type: NotificationType, colors: ReturnType<typeof useTheme>['colors']) => {
  switch (type) {
    case NotificationType.VEHICLE:
      return {
        icon: 'car-sport-outline' as const,
        iconColor: colors.info,
        iconTint: colors.infoLight,
      };
    case NotificationType.DRIVER:
      return {
        icon: 'person-outline' as const,
        iconColor: colors.primary,
        iconTint: colors.primarySurface,
      };
    case NotificationType.ALERT:
      return {
        icon: 'alert-circle-outline' as const,
        iconColor: colors.warning,
        iconTint: colors.warningLight,
      };
    case NotificationType.MESSAGE:
      return {
        icon: 'mail-outline' as const,
        iconColor: colors.primaryDark,
        iconTint: colors.surfaceMuted,
      };
    case NotificationType.SYSTEM:
    default:
      return {
        icon: 'notifications-outline' as const,
        iconColor: colors.textSubtle,
        iconTint: colors.surfaceMuted,
      };
  }
};

function ForegroundNotificationPopup() {
  const { popupNotification, dismissPopupNotification, markAsRead } = useApp();
  const theme = useTheme();
  const popupVisibility = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(popupVisibility, {
      toValue: popupNotification ? 1 : 0,
      duration: popupNotification ? 220 : POPUP_EXIT_DURATION_MS,
      easing: popupNotification ? Easing.out(Easing.cubic) : Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [popupNotification, popupVisibility]);

  if (!popupNotification) {
    return null;
  }

  const presentation = getPopupPresentation(
    popupNotification.type,
    theme.colors
  );
  const popupTranslateY = popupVisibility.interpolate({
    inputRange: [0, 1],
    outputRange: [-18, 0],
  });

  const handleOpenNotifications = () => {
    if (popupNotification.notificationId) {
      void markAsRead(popupNotification.notificationId);
    }

    dismissPopupNotification();
    router.push('/(tabs)/notifications');
  };

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[
        styles.popupShell,
        {
          opacity: popupVisibility,
          transform: [{ translateY: popupTranslateY }],
        },
      ]}
    >
      <Pressable
        style={[
          styles.popupCard,
          {
            backgroundColor: theme.colors.surfaceRaised,
            borderColor: theme.colors.borderStrong,
            shadowColor: theme.colors.black,
          },
        ]}
      >
        <Pressable
          onPress={handleOpenNotifications}
          style={styles.popupContentPressable}
        >
          <View
            style={[
              styles.popupIconWrap,
              {
                backgroundColor: presentation.iconTint,
                borderColor: theme.colors.border,
              },
            ]}
          >
            <Ionicons
              name={presentation.icon}
              size={18}
              color={presentation.iconColor}
            />
          </View>

          <View style={styles.popupCopy}>
            <Text
              style={[
                styles.popupTitle,
                {
                  color: theme.colors.text,
                  fontFamily: theme.fonts.family.sans,
                },
              ]}
              numberOfLines={1}
            >
              {popupNotification.title}
            </Text>
            <Text
              style={[
                styles.popupMessage,
                {
                  color: theme.colors.textMuted,
                  fontFamily: theme.fonts.family.sans,
                },
              ]}
              numberOfLines={2}
            >
              {popupNotification.message}
            </Text>
          </View>
        </Pressable>

        <Pressable
          onPress={dismissPopupNotification}
          hitSlop={10}
          style={styles.popupCloseButton}
        >
          <Ionicons
            name="close-outline"
            size={18}
            color={theme.colors.textSubtle}
          />
        </Pressable>
      </Pressable>
    </Animated.View>
  );
}

function RootNavigator() {
  const { isLoading, user } = useAuth();
  const startupStartedAtRef = useRef(Date.now());
  const hasStartedExitRef = useRef(false);
  const [startupVisible, setStartupVisible] = useState(true);
  const appEntrance = useRef(new Animated.Value(0)).current;
  const overlayExit = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!isLoading && !hasStartedExitRef.current) {
      const elapsed = Date.now() - startupStartedAtRef.current;
      const remaining = Math.max(0, MIN_STARTUP_SCREEN_MS - elapsed);
      const timeoutId = setTimeout(() => {
        hasStartedExitRef.current = true;

        Animated.parallel([
          Animated.timing(appEntrance, {
            toValue: 1,
            duration: STARTUP_EXIT_DURATION_MS,
            easing: Easing.out(Easing.back(1.15)),
            useNativeDriver: true,
          }),
          Animated.timing(overlayExit, {
            toValue: 0,
            duration: STARTUP_EXIT_DURATION_MS - 80,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
        ]).start(() => {
          setStartupVisible(false);
        });
      }, remaining);

      return () => clearTimeout(timeoutId);
    }
  }, [appEntrance, isLoading, overlayExit]);

  const appOpacity = appEntrance.interpolate({
    inputRange: [0, 1],
    outputRange: [0.45, 1],
  });
  const appScale = appEntrance.interpolate({
    inputRange: [0, 1],
    outputRange: [0.93, 1],
  });
  const appTranslateY = appEntrance.interpolate({
    inputRange: [0, 1],
    outputRange: [34, 0],
  });
  const overlayScale = overlayExit.interpolate({
    inputRange: [0, 1],
    outputRange: [1.08, 1],
  });
  const overlayTranslateY = overlayExit.interpolate({
    inputRange: [0, 1],
    outputRange: [-28, 0],
  });

  return (
    <View style={styles.root}>
      <Animated.View
        style={[
          styles.navigatorLayer,
          {
            opacity: appOpacity,
            transform: [{ translateY: appTranslateY }, { scale: appScale }],
          },
        ]}
      >
        <Stack
          key={user ? 'tabs-stack' : 'auth-stack'}
          screenOptions={{
            headerShown: false,
          }}
        >
          {user ? (
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          ) : (
            <Stack.Screen name="(auth)" options={{ headerShown: false }} />
          )}
        </Stack>
      </Animated.View>

      {startupVisible ? (
        <Animated.View
          style={[
            styles.startupOverlay,
            {
              opacity: overlayExit,
              transform: [
                { translateY: overlayTranslateY },
                { scale: overlayScale },
              ],
            },
          ]}
        >
          <StartupLoadingScreen durationMs={MIN_STARTUP_SCREEN_MS} />
        </Animated.View>
      ) : null}

      <ForegroundNotificationPopup />
    </View>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <AppProvider>
          <ErrorBoundary>
            <RootNavigator />
          </ErrorBoundary>
        </AppProvider>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  navigatorLayer: {
    flex: 1,
  },
  startupOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 50,
  },
  popupShell: {
    position: 'absolute',
    top: 18,
    left: 16,
    right: 16,
    zIndex: 45,
  },
  popupCard: {
    minHeight: 78,
    borderRadius: 20,
    borderWidth: 1,
    paddingVertical: 14,
    paddingLeft: 14,
    paddingRight: 10,
    flexDirection: 'row',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.14,
    shadowRadius: 24,
    elevation: 8,
  },
  popupContentPressable: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  popupIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  popupCopy: {
    flex: 1,
    marginLeft: 12,
    marginRight: 10,
  },
  popupTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 3,
  },
  popupMessage: {
    fontSize: 12,
    lineHeight: 18,
  },
  popupCloseButton: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
