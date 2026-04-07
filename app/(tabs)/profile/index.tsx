import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Switch,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { AppScreen, Card, PageHeader, UserAvatar } from '@/src/mobile/components';
import { useAuth } from '@/src/mobile/context/AuthContext';
import { AppTheme, useTheme } from '@/src/mobile/constants/theme';
import { useApp } from '@/src/mobile/context/AppContext';
import { getRoleLabel } from '@/src/mobile/navigation/access';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const { isDarkMode, setIsDarkMode } = useApp();
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [refreshing, setRefreshing] = useState(false);
  const refreshTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
    },
    []
  );

  const handleRefresh = useCallback(() => {
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
    }

    setRefreshing(true);
    refreshTimeoutRef.current = setTimeout(() => {
      setRefreshing(false);
      refreshTimeoutRef.current = null;
    }, 700);
  }, []);

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
          },
        },
      ]
    );
  };

  const displayName = user?.name ?? 'Workspace User';
  const email = user?.email ?? 'Not available';
  const roleLabel = user ? getRoleLabel(user.role) : 'User';
  const isActive = Boolean(user?.isActive);
  const accountStatus = isActive ? 'Active' : 'Inactive';
  const initials = displayName
    .split(' ')
    .map((part) => part.charAt(0))
    .join('')
    .slice(0, 2)
    .toUpperCase();
  const joinedDate = user?.createdAt
    ? user.createdAt.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : 'Not available';
  const bio = user?.bio?.trim() || 'No bio added yet.';

  const summaryItems: Array<{
    label: string;
    value: string;
    icon: IconName;
  }> = [
    {
      label: 'Phone Number',
      value: user?.phone || 'Not set',
      icon: 'call-outline',
    },
    {
      label: 'Joined',
      value: joinedDate,
      icon: 'calendar-outline',
    },
  ];

  const detailItems: Array<{
    label: string;
    value: string;
    icon: IconName;
  }> = [
    {
      label: 'Full Name',
      value: displayName,
      icon: 'person-outline',
    },
    {
      label: 'Email',
      value: email,
      icon: 'mail-outline',
    },
    {
      label: 'Role',
      value: roleLabel,
      icon: 'briefcase-outline',
    },
    {
      label: 'Status',
      value: accountStatus,
      icon: 'shield-checkmark-outline',
    },
  ];

  const actions: Array<{
    title: string;
    icon: IconName;
    tint: string;
    color: string;
    borderColor: string;
    onPress: () => void;
  }> = useMemo(
    () => [
      {
        title: 'Edit Profile',
        icon: 'create-outline',
        tint: theme.colors.primarySurface,
        color: theme.colors.primary,
        borderColor: theme.colors.primarySurfaceStrong,
        onPress: () => router.push('/(tabs)/profile/edit'),
      },
      {
        title: 'Change Password',
        icon: 'lock-closed-outline',
        tint: theme.colors.infoLight,
        color: theme.colors.info,
        borderColor: theme.colors.borderStrong,
        onPress: () => router.push('/(tabs)/profile/change-password'),
      },
      {
        title: 'View Other Profile',
        icon: 'people-outline',
        tint: theme.colors.successLight,
        color: theme.colors.success,
        borderColor: theme.colors.borderStrong,
        onPress: () => router.push('/(tabs)/profile/other-profiles'),
      },
    ],
    [theme]
  );

  return (
    <AppScreen refreshing={refreshing} onRefresh={handleRefresh}>
      <PageHeader title="Profile" />

      <Card style={styles.profileCard} variant="elevated" padding="large">
        <View style={styles.profileCardShell}>
          <View style={styles.profileAccent} />

          <View style={styles.profileContent}>
            <View style={styles.profileTop}>
              <UserAvatar
                name={displayName || 'Workspace User'}
                avatarUri={user?.avatar}
                size={84}
                radius={28}
                textSize={28}
              />

              <View style={styles.identityCopy}>
                <Text style={styles.userName}>{displayName}</Text>
                <Text style={styles.userEmail}>{email}</Text>

                <View style={styles.badgeRow}>
                  <View style={styles.roleBadge}>
                    <Ionicons
                      name="briefcase-outline"
                      size={13}
                      color={theme.colors.primaryDark}
                    />
                    <Text style={styles.roleBadgeText}>{roleLabel}</Text>
                  </View>

                  <View
                    style={[
                      styles.statusBadge,
                      isActive ? styles.statusBadgeActive : null,
                    ]}
                  >
                    <View
                      style={[
                        styles.statusDot,
                        isActive ? styles.statusDotActive : null,
                      ]}
                    />
                    <Text
                      style={[
                        styles.statusBadgeText,
                        isActive ? styles.statusBadgeTextActive : null,
                      ]}
                    >
                      {accountStatus}
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            <View style={styles.summaryGrid}>
              {summaryItems.map((item) => (
                <View key={item.label} style={styles.summaryCard}>
                  <View style={styles.summaryIconWrap}>
                    <Ionicons
                      name={item.icon}
                      size={18}
                      color={theme.colors.primaryDark}
                    />
                  </View>
                  <Text style={styles.summaryLabel}>{item.label}</Text>
                  <Text style={styles.summaryValue} numberOfLines={1}>
                    {item.value}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        </View>
      </Card>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Account Details</Text>
        <Text style={styles.sectionCaption}>
          Your saved workspace information.
        </Text>
      </View>

      <Card style={styles.detailsCard} variant="elevated" padding="large">
        <View style={styles.detailsList}>
          {detailItems.map((item, index) => (
            <View
              key={item.label}
              style={[
                styles.detailRow,
                index < detailItems.length - 1 ? styles.detailRowBorder : null,
              ]}
            >
              <View style={styles.detailIconWrap}>
                <Ionicons
                  name={item.icon}
                  size={18}
                  color={theme.colors.primaryDark}
                />
              </View>

              <View style={styles.detailCopy}>
                <Text style={styles.detailLabel}>{item.label}</Text>
                <Text style={styles.detailValue}>{item.value}</Text>
              </View>
            </View>
          ))}
        </View>
      </Card>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Bio</Text>
        <Text style={styles.sectionCaption}>
          A short introduction about your role and focus.
        </Text>
      </View>

      <Card style={styles.bioCard} variant="elevated" padding="large">
        <Text style={styles.bioText}>{bio}</Text>
      </Card>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Appearance</Text>
        <Text style={styles.sectionCaption}>
          Choose how I-TRACK looks across the app.
        </Text>
      </View>

      <Card style={styles.appearanceCard} variant="elevated" padding="large">
        <View style={styles.appearanceRow}>
          <View style={styles.appearanceIconWrap}>
            <Ionicons
              name={isDarkMode ? 'moon-outline' : 'sunny-outline'}
              size={20}
              color={theme.colors.primaryDark}
            />
          </View>

          <View style={styles.appearanceCopy}>
            <Text style={styles.appearanceTitle}>Dark Mode</Text>
            <Text style={styles.appearanceCaption}>
              Switch the app to a darker, low-glare theme.
            </Text>
          </View>

          <Switch
            value={isDarkMode}
            onValueChange={setIsDarkMode}
            trackColor={{
              false: theme.colors.borderStrong,
              true: theme.colors.primary,
            }}
            thumbColor={theme.colors.white}
            ios_backgroundColor={theme.colors.border}
          />
        </View>
      </Card>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <Text style={styles.sectionCaption}>
          Manage your profile, browse other profiles, and sign-in security.
        </Text>
      </View>

      <View style={styles.actionsList}>
        {actions.map((action) => (
          <Card
            key={action.title}
            style={styles.actionCard}
            variant="elevated"
            padding="large"
            onPress={action.onPress}
          >
            <View
              style={[
                styles.actionIconWrap,
                {
                  backgroundColor: action.tint,
                  borderColor: action.borderColor,
                },
              ]}
            >
              <Ionicons
                name={action.icon}
                size={20}
                color={action.color}
              />
            </View>

            <View style={styles.actionCopy}>
              <Text style={styles.actionTitle}>{action.title}</Text>
            </View>

            <Ionicons
              name="chevron-forward-outline"
              size={18}
              color={theme.colors.textSubtle}
            />
          </Card>
        ))}
      </View>

      <TouchableOpacity
        style={styles.signOutButton}
        activeOpacity={0.85}
        onPress={handleLogout}
      >
        <Ionicons
          name="log-out-outline"
          size={22}
          color={theme.colors.primaryDark}
          style={styles.signOutIcon}
        />
        <Text style={styles.signOutButtonLabel}>Sign Out</Text>
      </TouchableOpacity>
    </AppScreen>
  );
}

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    profileCard: {
      marginBottom: theme.spacing.xl,
      backgroundColor: theme.colors.surfaceRaised,
      borderColor: theme.colors.borderStrong,
    },
    profileCardShell: {
      flexDirection: 'row',
      alignItems: 'stretch',
      gap: theme.spacing.base,
    },
    profileAccent: {
      width: 6,
      borderRadius: theme.radius.full,
      backgroundColor: theme.colors.primary,
    },
    profileContent: {
      flex: 1,
    },
    profileTop: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.base,
      marginBottom: theme.spacing.lg,
    },
    identityCopy: {
      flex: 1,
    },
    userName: {
      fontSize: 24,
      lineHeight: 30,
      fontWeight: '700',
      color: theme.colors.text,
      marginBottom: 4,
      fontFamily: theme.fonts.family.sans,
    },
    userEmail: {
      fontSize: 14,
      lineHeight: 20,
      color: theme.colors.textMuted,
      marginBottom: theme.spacing.base,
      fontFamily: theme.fonts.family.sans,
    },
    badgeRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: theme.spacing.sm,
    },
    roleBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      borderRadius: theme.radius.full,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: 7,
      backgroundColor: theme.colors.primarySurface,
      borderWidth: 1,
      borderColor: theme.colors.primarySurfaceStrong,
    },
    roleBadgeText: {
      fontSize: 11,
      fontWeight: '700',
      color: theme.colors.primaryDark,
      fontFamily: theme.fonts.family.sans,
    },
    statusBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      borderRadius: theme.radius.full,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: 7,
      backgroundColor: theme.colors.surfaceMuted,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    statusBadgeActive: {
      backgroundColor: theme.colors.successLight,
      borderColor: theme.colors.success,
    },
    statusDot: {
      width: 7,
      height: 7,
      borderRadius: theme.radius.full,
      backgroundColor: theme.colors.textSubtle,
    },
    statusDotActive: {
      backgroundColor: theme.colors.success,
    },
    statusBadgeText: {
      fontSize: 11,
      fontWeight: '700',
      color: theme.colors.textMuted,
      fontFamily: theme.fonts.family.sans,
    },
    statusBadgeTextActive: {
      color: theme.colors.success,
    },
    summaryGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: theme.spacing.sm,
    },
    summaryCard: {
      width: '48%',
      minHeight: 110,
      borderRadius: theme.radius.md,
      padding: theme.spacing.md,
      backgroundColor: theme.colors.surfaceMuted,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    summaryIconWrap: {
      width: 38,
      height: 38,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: theme.spacing.base,
      backgroundColor: theme.colors.surfaceOverlay,
      borderWidth: 1,
      borderColor: theme.colors.borderStrong,
    },
    summaryLabel: {
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 0.6,
      textTransform: 'uppercase',
      color: theme.colors.textSubtle,
      marginBottom: 6,
      fontFamily: theme.fonts.family.sans,
    },
    summaryValue: {
      fontSize: 14,
      lineHeight: 20,
      fontWeight: '700',
      color: theme.colors.text,
      fontFamily: theme.fonts.family.sans,
    },
    sectionHeader: {
      marginBottom: theme.spacing.md,
      gap: 4,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: theme.colors.text,
      fontFamily: theme.fonts.family.sans,
    },
    sectionCaption: {
      fontSize: 13,
      lineHeight: 19,
      color: theme.colors.textMuted,
      fontFamily: theme.fonts.family.sans,
    },
    detailsCard: {
      marginBottom: theme.spacing.xl,
      backgroundColor: theme.colors.surfaceRaised,
      borderColor: theme.colors.borderStrong,
    },
    bioCard: {
      marginBottom: theme.spacing.xl,
      backgroundColor: theme.colors.surfaceRaised,
      borderColor: theme.colors.borderStrong,
    },
    detailsList: {
      gap: 0,
    },
    detailRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: theme.spacing.base,
      paddingVertical: theme.spacing.md,
    },
    detailRowBorder: {
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    detailIconWrap: {
      width: 46,
      height: 46,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.primarySurface,
      borderWidth: 1,
      borderColor: theme.colors.primarySurfaceStrong,
    },
    detailCopy: {
      flex: 1,
      paddingTop: 2,
    },
    detailLabel: {
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 0.7,
      textTransform: 'uppercase',
      color: theme.colors.textSubtle,
      marginBottom: 6,
      fontFamily: theme.fonts.family.sans,
    },
    detailValue: {
      fontSize: 15,
      lineHeight: 21,
      fontWeight: '700',
      color: theme.colors.text,
      fontFamily: theme.fonts.family.sans,
    },
    bioText: {
      fontSize: 14,
      lineHeight: 22,
      color: theme.colors.text,
      fontFamily: theme.fonts.family.sans,
    },
    appearanceCard: {
      marginBottom: theme.spacing.xl,
      backgroundColor: theme.colors.surfaceRaised,
      borderColor: theme.colors.borderStrong,
    },
    appearanceRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.base,
    },
    appearanceIconWrap: {
      width: 50,
      height: 50,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.primarySurface,
      borderWidth: 1,
      borderColor: theme.colors.primarySurfaceStrong,
    },
    appearanceCopy: {
      flex: 1,
    },
    appearanceTitle: {
      fontSize: 15,
      fontWeight: '700',
      color: theme.colors.text,
      marginBottom: 2,
      fontFamily: theme.fonts.family.sans,
    },
    appearanceCaption: {
      fontSize: 13,
      lineHeight: 19,
      color: theme.colors.textMuted,
      fontFamily: theme.fonts.family.sans,
    },
    actionsList: {
      marginBottom: theme.spacing.xl,
      gap: theme.spacing.md,
    },
    actionCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.base,
      backgroundColor: theme.colors.surfaceRaised,
      borderColor: theme.colors.borderStrong,
    },
    actionIconWrap: {
      width: 50,
      height: 50,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
    },
    actionCopy: {
      flex: 1,
    },
    actionTitle: {
      fontSize: 15,
      fontWeight: '700',
      color: theme.colors.text,
      fontFamily: theme.fonts.family.sans,
    },
    signOutButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      width: '100%',
      paddingHorizontal: theme.spacing.base,
      paddingVertical: theme.spacing.base,
      borderRadius: theme.radius.full,
      borderWidth: 1,
      borderColor: theme.colors.primarySurfaceStrong,
      backgroundColor: theme.colors.primarySurface,
    },
    signOutIcon: {
      marginRight: theme.spacing.sm,
    },
    signOutButtonLabel: {
      fontSize: 16,
      fontWeight: '700',
      color: theme.colors.primaryDark,
      fontFamily: theme.fonts.family.sans,
    },
  });
