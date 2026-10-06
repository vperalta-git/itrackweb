import React, { useEffect, useMemo, useState } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import {
  AppScreen,
  Card,
  EmptyState,
  PageHeader,
  UserAvatar,
} from '@/src/mobile/components';
import { AppTheme, useTheme } from '@/src/mobile/constants/theme';
import {
  formatUserCreatedDate,
  formatUserManagementStatusLabel,
  formatUserRoleLabel,
  getUserManagementRecordById,
  loadUserManagementRecords,
} from '@/src/mobile/data/users';

export default function OtherProfileDetailScreen() {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { userId } = useLocalSearchParams<{ userId?: string | string[] }>();
  const resolvedUserId = Array.isArray(userId) ? userId[0] : userId;
  const [record, setRecord] = useState(() =>
    resolvedUserId ? getUserManagementRecordById(resolvedUserId) : null
  );

  useEffect(() => {
    let isActive = true;
    const refreshRecord = async () => {
      try {
        await loadUserManagementRecords();
      } catch {
        // Keep the latest cached record when refresh fails.
      }

      if (isActive) {
        setRecord(resolvedUserId ? getUserManagementRecordById(resolvedUserId) : null);
      }
    };

    refreshRecord().catch(() => undefined);

    return () => {
      isActive = false;
    };
  }, [resolvedUserId]);

  if (!record) {
    return (
      <AppScreen>
        <PageHeader
          leading={
            <TouchableOpacity
              style={styles.backButton}
              activeOpacity={0.85}
              onPress={() => router.back()}
            >
              <Ionicons
                name="arrow-back-outline"
                size={20}
                color={theme.colors.text}
              />
            </TouchableOpacity>
          }
          leadingPlacement="above"
          title="Profile Details"
        />

        <EmptyState
          title="Profile not found"
          description="The selected profile is unavailable right now."
        />
      </AppScreen>
    );
  }

  const fullName = `${record.firstName} ${record.lastName}`;
  return (
    <AppScreen>
      <PageHeader
        leading={
          <TouchableOpacity
            style={styles.backButton}
            activeOpacity={0.85}
            onPress={() => router.back()}
          >
            <Ionicons
              name="arrow-back-outline"
              size={20}
              color={theme.colors.text}
            />
          </TouchableOpacity>
        }
        leadingPlacement="above"
        title="Profile Details"
        subtitle="Review the selected user profile and account details."
      />

      <Card style={styles.heroCard} variant="elevated" padding="large">
        <View style={styles.heroTop}>
          <UserAvatar
            name={fullName}
            avatarUri={record.avatar}
            size={84}
            radius={28}
            textSize={28}
          />

          <View style={styles.heroCopy}>
            <Text style={styles.heroTitle}>{fullName}</Text>
            <Text style={styles.heroSubtitle}>{record.email}</Text>
          </View>
        </View>

        <View style={styles.badgeRow}>
          <View style={styles.roleBadge}>
            <Text style={styles.roleBadgeText}>
              {formatUserRoleLabel(record.role)}
            </Text>
          </View>

          <View
            style={[
              styles.statusBadge,
              record.isActive ? styles.statusBadgeActive : styles.statusBadgeInactive,
            ]}
          >
            <Text style={styles.statusBadgeText}>
              {formatUserManagementStatusLabel(record.isActive)}
            </Text>
          </View>
        </View>
      </Card>

      <Card style={styles.card} variant="elevated" padding="large">
        <Text style={styles.sectionTitle}>Bio</Text>
        <Text style={styles.bioText}>{record.bio || 'No bio added yet.'}</Text>
      </Card>

      <Card style={styles.card} variant="elevated" padding="large">
        <Text style={styles.sectionTitle}>Profile Details</Text>

        {[
          { label: 'First Name', value: record.firstName },
          { label: 'Last Name', value: record.lastName },
          { label: 'Email', value: record.email },
          { label: 'Phone Number', value: record.phone },
          { label: 'Role', value: formatUserRoleLabel(record.role) },
          {
            label: 'Status',
            value: formatUserManagementStatusLabel(record.isActive),
          },
          {
            label: 'Joined',
            value: formatUserCreatedDate(record.createdAt),
          },
        ].map((item, index, array) => (
          <View
            key={item.label}
            style={[
              styles.detailRow,
              index < array.length - 1 ? styles.detailRowBorder : null,
            ]}
          >
            <Text style={styles.detailLabel}>{item.label}</Text>
            <Text style={styles.detailValue}>{item.value}</Text>
          </View>
        ))}
      </Card>
    </AppScreen>
  );
}

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    backButton: {
      width: 42,
      height: 42,
      borderRadius: theme.radius.full,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surfaceOverlay,
    },
    heroCard: {
      marginBottom: theme.spacing.xl,
      backgroundColor: theme.colors.surfaceRaised,
      borderColor: theme.colors.borderStrong,
    },
    heroTop: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.base,
      marginBottom: theme.spacing.base,
    },
    heroCopy: {
      flex: 1,
    },
    heroTitle: {
      fontSize: 24,
      fontWeight: '700',
      color: theme.colors.text,
      marginBottom: 4,
      fontFamily: theme.fonts.family.sans,
    },
    heroSubtitle: {
      fontSize: 14,
      color: theme.colors.textMuted,
      fontFamily: theme.fonts.family.sans,
    },
    badgeRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: theme.spacing.sm,
    },
    roleBadge: {
      borderRadius: theme.radius.full,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      backgroundColor: theme.colors.primarySurface,
      borderWidth: 1,
      borderColor: theme.colors.primarySurfaceStrong,
    },
    roleBadgeText: {
      fontSize: 12,
      fontWeight: '700',
      color: theme.colors.primaryDark,
      fontFamily: theme.fonts.family.sans,
    },
    statusBadge: {
      borderRadius: theme.radius.full,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
    },
    statusBadgeActive: {
      backgroundColor: theme.colors.successLight,
      borderWidth: 1,
      borderColor: theme.colors.success,
    },
    statusBadgeInactive: {
      backgroundColor: theme.colors.surfaceMuted,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    statusBadgeText: {
      fontSize: 12,
      fontWeight: '700',
      color: theme.colors.text,
      fontFamily: theme.fonts.family.sans,
    },
    card: {
      marginBottom: theme.spacing.xl,
      backgroundColor: theme.colors.surfaceRaised,
      borderColor: theme.colors.borderStrong,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: theme.colors.text,
      marginBottom: theme.spacing.base,
      fontFamily: theme.fonts.family.sans,
    },
    bioText: {
      fontSize: 14,
      lineHeight: 22,
      color: theme.colors.text,
      fontFamily: theme.fonts.family.sans,
    },
    detailRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: theme.spacing.base,
      paddingVertical: theme.spacing.md,
    },
    detailRowBorder: {
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    detailLabel: {
      fontSize: 13,
      color: theme.colors.textMuted,
      fontFamily: theme.fonts.family.sans,
    },
    detailValue: {
      flexShrink: 1,
      fontSize: 13,
      fontWeight: '700',
      color: theme.colors.text,
      textAlign: 'right',
      fontFamily: theme.fonts.family.sans,
    },
  });
