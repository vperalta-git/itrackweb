import React, { useEffect, useMemo, useState } from 'react';
import {
  Animated,
  Alert,
  Easing,
  Image,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Slot, router, useSegments } from 'expo-router';
import { useAuth } from '@/src/mobile/context/AuthContext';
import { useApp } from '@/src/mobile/context/AppContext';
import { UserAvatar } from '@/src/mobile/components';
import {
  AppModuleKey,
  getDefaultRouteForRole,
  getSidebarSectionsForRole,
  isMenuItemActive,
  normalizeSegmentsToRoute,
} from '@/src/mobile/navigation/access';
import { brandLogo } from '@/src/mobile/constants/assets';
import { AppTheme, useTheme } from '@/src/mobile/constants/theme';

function LoadingShell() {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <SafeAreaView style={styles.loadingShell}>
      <View style={styles.loadingCard}>
        <Text style={styles.loadingTitle}>Preparing workspace</Text>
        <Text style={styles.loadingText}>
          Loading your role menu and page access.
        </Text>
      </View>
    </SafeAreaView>
  );
}

function getMenuIcon(key: AppModuleKey) {
  switch (key) {
    case 'dashboard':
      return 'grid-outline';
    case 'vehicleStocks':
      return 'car-sport-outline';
    case 'vehiclePreparation':
      return 'construct-outline';
    case 'unitAgentAllocation':
      return 'layers-outline';
    case 'driverAllocation':
      return 'people-outline';
    case 'testDrive':
      return 'trail-sign-outline';
    case 'userManagement':
      return 'person-circle-outline';
    case 'reports':
      return 'document-text-outline';
    case 'checklist':
      return 'checkmark-circle-outline';
    case 'dispatchHistory':
    case 'driverHistory':
      return 'time-outline';
    default:
      return 'ellipse-outline';
  }
}

interface SidebarProps {
  currentRoute: string;
  onNavigate?: () => void;
  onClose?: () => void;
}

function Sidebar({ currentRoute, onNavigate, onClose }: SidebarProps) {
  const { user, logout } = useAuth();
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { colors } = theme;

  const sections = useMemo(
    () => (user ? getSidebarSectionsForRole(user.role) : []),
    [user]
  );

  if (!user) {
    return null;
  }

  const navigateTo = (href: string) => {
    router.replace(href as any);
    onNavigate?.();
  };

  const handleLogout = () => {
    Alert.alert(
      'Sign out?',
      'Are you sure you want to sign out of your account?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: () => {
            logout();
            router.replace('/(auth)/sign-in');
            onNavigate?.();
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.sidebarSafeArea}>
      <View style={styles.sidebarHeader}>
        <View style={styles.sidebarHeaderTop}>
          <View style={styles.sidebarBrandWrap}>
            <Image
              source={brandLogo}
              style={styles.sidebarBrandLogo}
              resizeMode="contain"
            />
            <View style={styles.sidebarBrandTextWrap}>
              <Text style={styles.sidebarBrandTitle}>I-TRACK</Text>
              <Text style={styles.sidebarBrandSubtitle}>Navigation Menu</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.sidebarCloseButton}
            activeOpacity={0.85}
            onPress={onClose}
          >
            <Ionicons
              name="close-outline"
              size={24}
              color={colors.textMuted}
            />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.sidebarBody}>
        <ScrollView
          contentContainerStyle={styles.sidebarScrollContent}
          showsVerticalScrollIndicator={false}
        >
          {sections.map((section) => (
            <View key={section.title} style={styles.menuSection}>
              <Text style={styles.menuSectionTitle}>{section.title}</Text>

              <View style={styles.menuSectionItems}>
                {section.items.map((item, index) => {
                  const active = isMenuItemActive(currentRoute, item);
                  const isLastItem = index === section.items.length - 1;

                  return (
                    <TouchableOpacity
                      key={item.href}
                      style={[
                        styles.menuItem,
                        active && styles.menuItemActive,
                        isLastItem && styles.menuItemLast,
                      ]}
                      activeOpacity={0.85}
                      onPress={() => navigateTo(item.href)}
                    >
                      <View
                        style={[
                          styles.menuIndicator,
                          active && styles.menuIndicatorActive,
                        ]}
                      />
                      <View style={styles.menuItemContent}>
                        <View style={styles.menuItemMain}>
                          <Ionicons
                            name={getMenuIcon(item.key) as any}
                            size={22}
                            color={active ? colors.primary : colors.textMuted}
                            style={styles.menuIcon}
                          />
                          <Text
                            style={[
                              styles.menuLabel,
                              active && styles.menuLabelActive,
                            ]}
                          >
                            {item.label}
                          </Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          ))}
        </ScrollView>
      </View>

      <View style={styles.sidebarFooter}>
        <TouchableOpacity
          style={styles.logoutButton}
          activeOpacity={0.85}
          onPress={handleLogout}
        >
          <Ionicons
            name="log-out-outline"
            size={22}
            color={colors.primaryDark}
            style={styles.logoutIcon}
          />
          <Text style={styles.logoutButtonLabel}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

export default function SidebarLayout() {
  const { user, isLoading } = useAuth();
  const { unreadCount } = useApp();
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { colors } = theme;
  const segments = useSegments();
  const { width } = useWindowDimensions();
  const [menuMounted, setMenuMounted] = useState(false);
  const [menuTargetOpen, setMenuTargetOpen] = useState(false);
  const [menuAnimation] = useState(() => new Animated.Value(0));

  const currentRoute = normalizeSegmentsToRoute(segments);
  const fallbackRoute = user
    ? getDefaultRouteForRole(user.role)
    : '/(auth)/sign-in';
  const isRootTabsRoute =
    currentRoute === '/(tabs)' ||
    currentRoute === '/(tabs)/index' ||
    currentRoute === '/';
  const shouldRedirectToDefault = Boolean(user && isRootTabsRoute);

  useEffect(() => {
    if (isLoading) {
      return;
    }

    if (!user) {
      router.replace('/(auth)/sign-in');
      return;
    }

    if (shouldRedirectToDefault && currentRoute !== fallbackRoute) {
      router.replace(fallbackRoute as any);
    }
  }, [currentRoute, fallbackRoute, isLoading, shouldRedirectToDefault, user]);

  useEffect(() => {
    setMenuTargetOpen(false);
  }, [currentRoute]);

  useEffect(() => {
    if (menuTargetOpen) {
      setMenuMounted(true);
      menuAnimation.stopAnimation();
      Animated.timing(menuAnimation, {
        toValue: 1,
        duration: 280,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
      return;
    }

    if (!menuMounted) {
      menuAnimation.setValue(0);
      return;
    }

    menuAnimation.stopAnimation();
    Animated.timing(menuAnimation, {
      toValue: 0,
      duration: 220,
      easing: Easing.inOut(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) {
        setMenuMounted(false);
      }
    });
  }, [menuAnimation, menuMounted, menuTargetOpen]);

  useEffect(
    () => () => {
      menuAnimation.stopAnimation();
    },
    [menuAnimation]
  );

  if (isLoading || !user || shouldRedirectToDefault) {
    return <LoadingShell />;
  }

  const sidebarWidth = Math.min(width * 0.86, 360);
  const sidebarTranslateX = menuAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [-sidebarWidth, 0],
  });
  const sidebarBackdropOpacity = menuAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  return (
    <View style={styles.root}>
      <View style={styles.backgroundGlowTop} />
      <View style={styles.backgroundGlowBottom} />

      <SafeAreaView style={styles.topBarSafeArea}>
        <View style={styles.topBar}>
          <View style={styles.topBarLeft}>
            <TouchableOpacity
              style={styles.topIconButton}
              activeOpacity={0.85}
              onPress={() => setMenuTargetOpen(true)}
            >
              <Ionicons
                name="menu-outline"
                size={28}
                color={colors.primaryDark}
              />
            </TouchableOpacity>

            <View style={styles.brandWrap}>
              <Image source={brandLogo} style={styles.brandLogo} resizeMode="contain" />
              <View style={styles.brandTextWrap}>
                <Text style={styles.brandTitle}>I-TRACK</Text>
                <Text style={styles.brandSubtitle}>ISUZU VSMS</Text>
              </View>
            </View>
          </View>

          <View style={styles.topActions}>
            <TouchableOpacity
              style={styles.topIconButton}
              activeOpacity={0.85}
              onPress={() => router.push('/(tabs)/notifications')}
            >
              <Ionicons
                name="notifications-outline"
                size={23}
                color={colors.text}
              />
              {unreadCount ? (
                <View style={styles.notificationBadge}>
                  <Text style={styles.notificationBadgeText}>
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </Text>
                </View>
              ) : null}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.topAvatarButton}
              activeOpacity={0.85}
              onPress={() => router.push('/(tabs)/profile')}
            >
              <UserAvatar
                name={user.name || 'I-TRACK User'}
                avatarUri={user.avatar}
                size={38}
                radius={19}
                textSize={13}
              />
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>

      <View style={styles.contentColumn}>
        <View style={styles.contentSurface}>
          <Slot />
        </View>
      </View>

      {menuMounted ? (
        <View style={styles.sidebarOverlay}>
          <Animated.View
            style={[
              styles.sidebarPanel,
              {
                width: sidebarWidth,
                transform: [{ translateX: sidebarTranslateX }],
              },
            ]}
          >
            <Sidebar
              currentRoute={currentRoute}
              onNavigate={() => setMenuTargetOpen(false)}
              onClose={() => setMenuTargetOpen(false)}
            />
          </Animated.View>
          <Animated.View
            style={[
              styles.sidebarBackdrop,
              {
                opacity: sidebarBackdropOpacity,
              },
            ]}
          >
            <Pressable
              style={styles.sidebarBackdropPressable}
              onPress={() => setMenuTargetOpen(false)}
            />
          </Animated.View>
        </View>
      ) : null}
    </View>
  );
}

const createStyles = (theme: AppTheme) => {
  const { colors, radius, spacing, typography, shadows } = theme;

  return StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: colors.background,
    },
    backgroundGlowTop: {
      position: 'absolute',
      top: -100,
      right: -40,
      width: 300,
      height: 300,
      borderRadius: 150,
      backgroundColor: colors.primarySurface,
      opacity: 0.9,
    },
    backgroundGlowBottom: {
      position: 'absolute',
      bottom: -110,
      left: -60,
      width: 280,
      height: 280,
      borderRadius: 140,
      backgroundColor: colors.gray100,
      opacity: 0.9,
    },
    topBarSafeArea: {
      backgroundColor: colors.surfaceRaised,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    topBar: {
      minHeight: 72,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.base,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.lg,
    },
    topBarLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.base,
    },
    topActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.base,
    },
    topIconButton: {
      width: 34,
      height: 34,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'transparent',
    },
    notificationBadge: {
      position: 'absolute',
      top: -4,
      right: -8,
      minWidth: 18,
      height: 18,
      borderRadius: radius.full,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 4,
      backgroundColor: colors.primary,
      borderWidth: 1,
      borderColor: colors.white,
    },
    notificationBadgeText: {
      fontSize: 10,
      fontWeight: '700',
      color: colors.white,
      fontFamily: theme.fonts.family.sans,
    },
    brandWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    brandLogo: {
      width: 32,
      height: 32,
    },
    brandTextWrap: {
      justifyContent: 'center',
    },
    brandTitle: {
      fontSize: 18,
      fontWeight: '700',
      letterSpacing: 0.9,
      color: colors.black,
      fontFamily: theme.fonts.family.sans,
    },
    brandSubtitle: {
      fontSize: 11,
      fontWeight: '600',
      letterSpacing: 0.6,
      color: colors.textSubtle,
      fontFamily: theme.fonts.family.sans,
    },
    topAvatarButton: {
      width: 38,
      height: 38,
      borderRadius: radius.full,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },
    contentColumn: {
      flex: 1,
    },
    contentSurface: {
      flex: 1,
    },
    sidebarOverlay: {
      ...StyleSheet.absoluteFillObject,
      flexDirection: 'row',
      zIndex: 30,
    },
    sidebarPanel: {
      height: '100%',
      paddingVertical: 0,
      paddingLeft: 0,
      paddingRight: 0,
    },
    sidebarBackdrop: {
      flex: 1,
      backgroundColor: colors.backdrop,
    },
    sidebarBackdropPressable: {
      flex: 1,
    },
    sidebarSafeArea: {
      flex: 1,
      backgroundColor: colors.surfaceRaised,
      borderTopRightRadius: 0,
      borderBottomRightRadius: 0,
      padding: spacing.base,
    },
    sidebarHeader: {
      paddingTop: spacing.sm,
      paddingBottom: spacing.base,
      marginBottom: spacing.xl,
    },
    sidebarHeaderTop: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.base,
      marginBottom: spacing.base,
    },
    sidebarBrandWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      flexShrink: 1,
    },
    sidebarBrandLogo: {
      width: 42,
      height: 42,
    },
    sidebarBrandTextWrap: {
      justifyContent: 'center',
    },
    sidebarBrandTitle: {
      fontSize: 22,
      fontWeight: '700',
      letterSpacing: 0.9,
      color: colors.primary,
      fontFamily: theme.fonts.family.sans,
    },
    sidebarBrandSubtitle: {
      fontSize: 11,
      fontWeight: '600',
      letterSpacing: 0.5,
      color: colors.textSubtle,
      textTransform: 'uppercase',
      fontFamily: theme.fonts.family.sans,
    },
    sidebarCloseButton: {
      width: 36,
      height: 36,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radius.full,
      backgroundColor: colors.surfaceOverlay,
      borderWidth: 1,
      borderColor: colors.border,
    },
    sidebarBody: {
      flex: 1,
    },
    sidebarScrollContent: {
      paddingBottom: spacing.xl,
    },
    menuSection: {
      marginBottom: spacing.xl,
    },
    menuSectionTitle: {
      fontSize: 12,
      fontWeight: '700',
      letterSpacing: 0.8,
      textTransform: 'uppercase',
      color: colors.textSubtle,
      marginBottom: spacing.base,
      paddingLeft: spacing.base,
      fontFamily: theme.fonts.family.sans,
    },
    menuSectionItems: {
      backgroundColor: 'transparent',
    },
    menuItem: {
      flexDirection: 'row',
      alignItems: 'center',
      minHeight: 58,
      paddingHorizontal: spacing.sm,
      paddingVertical: 14,
      marginBottom: spacing.xs,
      backgroundColor: 'transparent',
    },
    menuItemActive: {
      backgroundColor: 'transparent',
    },
    menuItemLast: {
      marginBottom: 0,
    },
    menuIndicator: {
      width: 4,
      height: 24,
      borderRadius: radius.full,
      backgroundColor: 'transparent',
      marginRight: spacing.base,
    },
    menuIndicatorActive: {
      backgroundColor: colors.primary,
    },
    menuItemContent: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
    },
    menuItemMain: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
    },
    menuIcon: {
      marginRight: spacing.base,
    },
    menuLabel: {
      fontSize: 17,
      fontWeight: '700',
      color: colors.text,
      fontFamily: theme.fonts.family.sans,
    },
    menuLabelActive: {
      color: colors.primaryDark,
    },
    sidebarFooter: {
      paddingTop: spacing.base,
    },
    logoutButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: spacing.base,
      paddingVertical: spacing.base,
      borderRadius: radius.full,
      borderWidth: 1,
      borderColor: colors.primarySurfaceStrong,
      backgroundColor: colors.primarySurface,
    },
    logoutIcon: {
      marginRight: spacing.sm,
    },
    logoutButtonLabel: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.primaryDark,
      fontFamily: theme.fonts.family.sans,
    },
    loadingShell: {
      flex: 1,
      backgroundColor: colors.background,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: spacing.xl,
    },
    loadingCard: {
      width: '100%',
      maxWidth: 420,
      backgroundColor: colors.surface,
      borderRadius: radius.xl,
      padding: spacing.xl,
      borderWidth: 1,
      borderColor: colors.border,
      ...shadows.md,
    },
    loadingTitle: {
      fontSize: typography.fontSize.xl,
      fontWeight: '700',
      color: colors.text,
      marginBottom: spacing.sm,
      fontFamily: theme.fonts.family.sans,
    },
    loadingText: {
      fontSize: typography.fontSize.sm,
      color: colors.textMuted,
      lineHeight: 20,
      fontFamily: theme.fonts.family.sans,
    },
  });
};
