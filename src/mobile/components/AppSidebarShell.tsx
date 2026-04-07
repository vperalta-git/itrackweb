import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Image,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useSegments } from 'expo-router';

import { brandLogo } from '../constants/assets';
import { AppTheme, useTheme } from '../constants/theme';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import {
  getPageLabelForRoute,
  getRoleLabel,
  getSidebarSectionsForRole,
  isMenuItemActive,
  normalizeSegmentsToRoute,
} from '../navigation/access';
import { UserAvatar } from './UserAvatar';

type ShellMode = 'auth' | 'user';

type AppSidebarShellProps = {
  children: React.ReactNode;
  mode: ShellMode;
};

type MenuItem = {
  badge: string;
  description: string;
  href: string;
  id: string;
  isActive: boolean;
  label: string;
};

type MenuSection = {
  items: MenuItem[];
  title: string;
};

const AUTH_PAGE_LABELS: Record<string, string> = {
  '/(auth)/forgot-password': 'Password Recovery',
  '/(auth)/reset-password': 'Reset Password',
  '/(auth)/sign-in': 'Sign In',
};

const getAuthSections = (routeKey: string): MenuSection[] => [
  {
    title: 'Access',
    items: [
      {
        id: 'sign-in',
        label: 'Sign In',
        badge: 'IN',
        href: '/(auth)/sign-in',
        description: 'Open the main login page.',
        isActive: routeKey === '/(auth)/sign-in',
      },
      {
        id: 'password-recovery',
        label: 'Password Recovery',
        badge: 'PW',
        href: '/(auth)/forgot-password',
        description: 'Request an OTP and reset your password.',
        isActive:
          routeKey === '/(auth)/forgot-password' ||
          routeKey === '/(auth)/reset-password',
      },
    ],
  },
];

export function AppSidebarShell({
  children,
  mode,
}: AppSidebarShellProps) {
  const { user, logout } = useAuth();
  const { unreadCount } = useApp();
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const routeKey = normalizeSegmentsToRoute(useSegments());
  const [menuVisible, setMenuVisible] = useState(false);
  const isUserMode = mode === 'user' && Boolean(user);
  const showNavigation = isUserMode;

  useEffect(() => {
    setMenuVisible((current) => (current ? false : current));
  }, [routeKey]);

  const pageLabel = useMemo(() => {
    if (isUserMode && user) {
      return getPageLabelForRoute(user.role, routeKey);
    }

    return AUTH_PAGE_LABELS[routeKey] ?? 'Secure Access';
  }, [isUserMode, routeKey, user]);

  const menuSections = useMemo<MenuSection[]>(() => {
    if (isUserMode && user) {
      return getSidebarSectionsForRole(user.role).map((section) => ({
        title: section.title,
        items: section.items.map((item) => ({
          id: item.key,
          label: item.label,
          badge: item.badge,
          href: item.href,
          description: item.description,
          isActive: isMenuItemActive(routeKey, item),
        })),
      }));
    }

    return getAuthSections(routeKey);
  }, [isUserMode, routeKey, user]);

  const quickItems = useMemo<MenuItem[]>(() => {
    if (!isUserMode || !user) {
      return [];
    }

    return [
      {
        id: 'notifications',
        label: 'Notifications',
        badge: unreadCount ? (unreadCount > 99 ? '99+' : String(unreadCount)) : 'NT',
        href: '/(tabs)/notifications',
        description: 'Alerts and reminders.',
        isActive: routeKey.startsWith('/(tabs)/notifications'),
      },
      {
        id: 'profile',
        label: 'Profile',
        badge: 'ME',
        href: '/(tabs)/profile',
        description: 'Account and settings.',
        isActive: routeKey.startsWith('/(tabs)/profile'),
      },
    ];
  }, [isUserMode, routeKey, unreadCount, user]);

  const navigateTo = (href: string) => {
    setMenuVisible(false);

    if (routeKey === href || routeKey.startsWith(`${href}/`)) {
      return;
    }

    if (mode === 'auth') {
      router.push(href as any);
      return;
    }

    router.replace(href as any);
  };

  const confirmLogout = () => {
    setMenuVisible(false);

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
          },
        },
      ]
    );
  };

  const renderSection = (section: MenuSection) => (
    <View key={section.title} style={styles.section}>
      <Text style={styles.sectionTitle}>{section.title}</Text>

      {section.items.map((item) => (
        <TouchableOpacity
          key={item.id}
          activeOpacity={0.88}
          onPress={() => navigateTo(item.href)}
          style={[styles.item, item.isActive ? styles.itemActive : null]}
        >
          <View style={styles.itemBadge}>
            <Text style={styles.itemBadgeText}>{item.badge}</Text>
          </View>

          <View style={styles.itemCopy}>
            <Text style={styles.itemLabel}>{item.label}</Text>
            <Text style={styles.itemDescription}>{item.description}</Text>
          </View>

          <Ionicons
            name={
              item.isActive
                ? 'checkmark-circle-outline'
                : 'chevron-forward-outline'
            }
            size={18}
            color={
              item.isActive ? theme.colors.primary : theme.colors.textSubtle
            }
          />
        </TouchableOpacity>
      ))}
    </View>
  );

  return (
    <View style={styles.root}>
      <View style={styles.glowTop} />
      <View style={styles.glowBottom} />

      {showNavigation ? (
        <SafeAreaView style={styles.topBarSafeArea}>
          <View style={styles.topBar}>
            <View style={styles.topBarLeft}>
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => setMenuVisible(true)}
                style={styles.iconButton}
              >
                <Ionicons
                  name="menu-outline"
                  size={23}
                  color={theme.colors.primaryDark}
                />
              </TouchableOpacity>

              <View style={styles.brandWrap}>
                <Image source={brandLogo} style={styles.brandLogo} />
                <View>
                  <Text style={styles.brandTitle}>I-TRACK</Text>
                  <Text style={styles.brandSubtitle}>{pageLabel}</Text>
                </View>
              </View>
            </View>

            {user ? (
              <View style={styles.topBarActions}>
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => navigateTo('/(tabs)/notifications')}
                  style={styles.iconButton}
                >
                  <Ionicons
                    name="notifications-outline"
                    size={21}
                    color={theme.colors.text}
                  />
                  {unreadCount ? (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </Text>
                    </View>
                  ) : null}
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => navigateTo('/(tabs)/profile')}
                  style={styles.avatarButton}
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
            ) : null}
          </View>
        </SafeAreaView>
      ) : null}

      <View style={styles.content}>{children}</View>

      {showNavigation ? (
        <Modal
          transparent
          animationType="fade"
          visible={menuVisible}
          onRequestClose={() => setMenuVisible(false)}
        >
          <View style={styles.modalRoot}>
            <Pressable
              onPress={() => setMenuVisible(false)}
              style={styles.modalBackdrop}
            />

            <SafeAreaView style={styles.panelSafeArea}>
              <View style={styles.panel}>
                <View style={styles.panelHeader}>
                  <View style={styles.panelBrand}>
                    <Image source={brandLogo} style={styles.panelLogo} />
                    <View style={styles.panelBrandCopy}>
                      <Text style={styles.panelTitle}>I-TRACK</Text>
                      <Text style={styles.panelSubtitle}>
                        {isUserMode && user
                          ? `${getRoleLabel(user.role)} Workspace`
                          : 'Workspace Access'}
                      </Text>
                    </View>
                  </View>

                  <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={() => setMenuVisible(false)}
                    style={styles.iconButton}
                  >
                    <Ionicons
                      name="close-outline"
                      size={22}
                      color={theme.colors.text}
                    />
                  </TouchableOpacity>
                </View>

                <ScrollView
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={styles.scrollContent}
                >
                  {menuSections.map(renderSection)}
                  {quickItems.length ? renderSection({ title: 'Quick Access', items: quickItems }) : null}
                </ScrollView>

                {user ? (
                  <View style={styles.footer}>
                    <View style={styles.footerProfile}>
                      <UserAvatar
                        name={user.name || 'I-TRACK User'}
                        avatarUri={user.avatar}
                        size={42}
                        radius={18}
                        textSize={15}
                      />
                      <View style={styles.footerCopy}>
                        <Text numberOfLines={1} style={styles.footerName}>
                          {user.name || 'I-TRACK User'}
                        </Text>
                        <Text numberOfLines={1} style={styles.footerRole}>
                          {getRoleLabel(user.role)}
                        </Text>
                      </View>
                    </View>

                    <TouchableOpacity
                      activeOpacity={0.85}
                      onPress={confirmLogout}
                      style={styles.logoutButton}
                    >
                      <Ionicons
                        name="log-out-outline"
                        size={18}
                        color={theme.colors.primaryDark}
                      />
                      <Text style={styles.logoutText}>Sign Out</Text>
                    </TouchableOpacity>
                  </View>
                ) : null}
              </View>
            </SafeAreaView>
          </View>
        </Modal>
      ) : null}
    </View>
  );
}

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: theme.colors.background },
    glowTop: {
      position: 'absolute',
      top: -100,
      right: -40,
      width: 300,
      height: 300,
      borderRadius: 150,
      backgroundColor: theme.colors.primarySurface,
      opacity: 0.9,
    },
    glowBottom: {
      position: 'absolute',
      bottom: -110,
      left: -60,
      width: 280,
      height: 280,
      borderRadius: 140,
      backgroundColor: theme.colors.gray100,
      opacity: 0.9,
    },
    topBarSafeArea: {
      backgroundColor: theme.colors.surfaceRaised,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    topBar: {
      minHeight: 72,
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.base,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: theme.spacing.base,
    },
    topBarLeft: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.base,
    },
    topBarActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.base,
    },
    iconButton: {
      width: 38,
      height: 38,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    avatarButton: {
      width: 38,
      height: 38,
      borderRadius: theme.radius.full,
      overflow: 'hidden',
    },
    brandWrap: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
    brandLogo: { width: 32, height: 32 },
    brandTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: theme.colors.black,
      fontFamily: theme.fonts.family.sans,
    },
    brandSubtitle: {
      fontSize: 11,
      color: theme.colors.textSubtle,
      fontFamily: theme.fonts.family.sans,
    },
    badge: {
      position: 'absolute',
      top: -4,
      right: -8,
      minWidth: 18,
      height: 18,
      borderRadius: theme.radius.full,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 4,
      backgroundColor: theme.colors.primary,
      borderWidth: 1,
      borderColor: theme.colors.white,
    },
    badgeText: {
      fontSize: 10,
      fontWeight: '700',
      color: theme.colors.white,
      fontFamily: theme.fonts.family.sans,
    },
    content: { flex: 1 },
    modalRoot: { flex: 1 },
    modalBackdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: theme.colors.backdrop,
    },
    panelSafeArea: { flex: 1, maxWidth: 380 },
    panel: {
      flex: 1,
      backgroundColor: theme.colors.surfaceRaised,
      borderRightWidth: 1,
      borderRightColor: theme.colors.border,
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.base,
    },
    panelHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: theme.spacing.base,
      marginBottom: theme.spacing.base,
    },
    panelBrand: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, flex: 1 },
    panelLogo: { width: 36, height: 36 },
    panelBrandCopy: { flex: 1 },
    panelTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: theme.colors.text,
      fontFamily: theme.fonts.family.sans,
    },
    panelSubtitle: {
      fontSize: 12,
      color: theme.colors.textMuted,
      fontFamily: theme.fonts.family.sans,
    },
    scrollContent: { paddingBottom: theme.spacing.base, gap: theme.spacing.base },
    section: { gap: theme.spacing.sm },
    sectionTitle: {
      fontSize: 12,
      fontWeight: '700',
      color: theme.colors.textSubtle,
      fontFamily: theme.fonts.family.sans,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
    },
    item: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.md,
      borderRadius: theme.radius.lg,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    itemActive: {
      backgroundColor: theme.colors.primarySurface,
      borderColor: theme.colors.primary,
    },
    itemBadge: {
      width: 38,
      height: 38,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.white,
      borderWidth: 1,
      borderColor: theme.colors.borderStrong,
    },
    itemBadgeText: {
      fontSize: 11,
      fontWeight: '700',
      color: theme.colors.primaryDark,
      fontFamily: theme.fonts.family.sans,
    },
    itemCopy: { flex: 1 },
    itemLabel: {
      fontSize: 14,
      fontWeight: '700',
      color: theme.colors.text,
      marginBottom: 2,
      fontFamily: theme.fonts.family.sans,
    },
    itemDescription: {
      fontSize: 12,
      lineHeight: 18,
      color: theme.colors.textMuted,
      fontFamily: theme.fonts.family.sans,
    },
    footer: {
      marginTop: theme.spacing.base,
      paddingTop: theme.spacing.base,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
      gap: theme.spacing.base,
    },
    footerProfile: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
    footerCopy: { flex: 1 },
    footerName: {
      fontSize: 14,
      fontWeight: '700',
      color: theme.colors.text,
      fontFamily: theme.fonts.family.sans,
    },
    footerRole: {
      fontSize: 12,
      color: theme.colors.textMuted,
      fontFamily: theme.fonts.family.sans,
    },
    logoutButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: theme.spacing.sm,
      borderRadius: theme.radius.full,
      paddingHorizontal: theme.spacing.base,
      paddingVertical: theme.spacing.base,
      backgroundColor: theme.colors.primarySurface,
      borderWidth: 1,
      borderColor: theme.colors.primarySurfaceStrong,
    },
    logoutText: {
      fontSize: 14,
      fontWeight: '700',
      color: theme.colors.primaryDark,
      fontFamily: theme.fonts.family.sans,
    },
  });
