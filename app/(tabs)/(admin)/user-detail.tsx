import React, { useEffect, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import {
  AccessScopeNotice,
  Card,
  Header,
  StatusBadge,
} from '@/src/mobile/components';
import { useAuth } from '@/src/mobile/context/AuthContext';
import { theme } from '@/src/mobile/constants/theme';
import {
  deleteUserManagementRecord,
  formatUserCreatedDate,
  formatUserRoleLabel,
  formatUserManagementStatusLabel,
  getUserManagementRecordById,
  getUserRoleBadgePalette,
  getUserManagementStatusBadgeStatus,
  loadUserManagementRecords,
  setUserManagementRecordActiveState,
} from '@/src/mobile/data/users';
import {
  getModuleAccess,
  getRoleRoute,
} from '@/src/mobile/navigation/access';
import { UserRole } from '@/src/mobile/types';

export default function UserDetailScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const { userId } = useLocalSearchParams<{ userId?: string | string[] }>();
  const { user } = useAuth();
  const role = user?.role ?? UserRole.ADMIN;
  const access = getModuleAccess(role, 'userManagement');
  const canManageActivation =
    role === UserRole.ADMIN || role === UserRole.SUPERVISOR;
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

    const unsubscribe = navigation.addListener('focus', () => {
      refreshRecord().catch(() => undefined);
    });

    return () => {
      isActive = false;
      unsubscribe();
    };
  }, [navigation, resolvedUserId]);

  const handleDeleteUser = () => {
    if (!record) {
      return;
    }

    Alert.alert(
      'Delete user?',
      'This user record will be removed from the list and this action cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteUserManagementRecord(record.id);
            router.dismiss();
          },
        },
      ]
    );
  };

  const handleToggleUserStatus = () => {
    if (!record) {
      return;
    }

    const nextActiveState = !record.isActive;
    const actionLabel = nextActiveState ? 'Activate' : 'Deactivate';

    Alert.alert(
      `${actionLabel} user?`,
      nextActiveState
        ? `${fullName} will be moved back to the active users tab.`
        : `${fullName} will be moved to the deactivated users tab.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: actionLabel,
          onPress: async () => {
            const updatedRecord = await setUserManagementRecordActiveState(
              record.id,
              nextActiveState
            );
            setRecord(updatedRecord);
          },
        },
      ]
    );
  };

  if (!record) {
    return (
      <View style={styles.container}>
        <Header
          title="User Details"
          leftIcon={
            <Ionicons
              name="arrow-back-outline"
              size={18}
              color={theme.colors.text}
            />
          }
          onLeftPress={() => router.dismiss()}
        />

        <View style={styles.emptyStateWrap}>
          <Card style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>User not found</Text>
            <Text style={styles.emptyText}>
              The selected user record could not be loaded.
            </Text>
          </Card>
        </View>
      </View>
    );
  }

  const roleBadgePalette = getUserRoleBadgePalette(record.role);
  const fullName = `${record.firstName} ${record.lastName}`;

  return (
    <View style={styles.container}>
      <Header
        title="User Details"
        leftIcon={
          <Ionicons
            name="arrow-back-outline"
            size={18}
            color={theme.colors.text}
          />
        }
        onLeftPress={() => router.dismiss()}
      />

      <ScrollView contentContainerStyle={styles.content}>
        <AccessScopeNotice
          title={access.scopeLabel}
          message={access.scopeNote}
          style={styles.notice}
        />

        <Card style={styles.card} variant="elevated" padding="large">
          <View style={styles.heroTop}>
            <View style={styles.heroCopy}>
              <Text style={styles.heroTitle}>{fullName}</Text>
              <Text style={styles.heroSubtitle}>{record.email}</Text>
            </View>

            <View style={styles.heroBadges}>
              <View
                style={[
                  styles.roleBadge,
                  {
                    backgroundColor: roleBadgePalette.backgroundColor,
                    borderColor: roleBadgePalette.borderColor,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.roleBadgeText,
                    { color: roleBadgePalette.textColor },
                  ]}
                >
                  {formatUserRoleLabel(record.role)}
                </Text>
              </View>

              <StatusBadge
                status={getUserManagementStatusBadgeStatus(record.isActive)}
                label={formatUserManagementStatusLabel(record.isActive)}
                size="small"
              />
            </View>
          </View>

          <View style={styles.metricRow}>
            <View style={styles.metricTile}>
              <Text style={styles.metricLabel}>Phone No</Text>
              <Text style={styles.metricValue}>{record.phone}</Text>
            </View>
            <View style={styles.metricTile}>
              <Text style={styles.metricLabel}>Password</Text>
              <Text style={styles.metricValue}>Managed separately</Text>
            </View>
          </View>
        </Card>

        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>Basic Information</Text>
          {[
            { label: 'Email', value: record.email },
            { label: 'First Name', value: record.firstName },
            { label: 'Last Name', value: record.lastName },
            { label: 'Role', value: formatUserRoleLabel(record.role) },
            {
              label: 'Status',
              value: formatUserManagementStatusLabel(record.isActive),
            },
          ].map((item, index) => (
            <View
              key={item.label}
              style={[styles.row, index < 4 ? styles.rowDivider : null]}
            >
              <Text style={styles.rowLabel}>{item.label}</Text>
              <Text style={styles.rowValue}>{item.value}</Text>
            </View>
          ))}
        </Card>

        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>Account Access</Text>
          {[
            { label: 'Phone No', value: record.phone },
            { label: 'Password', value: 'Managed separately' },
            {
              label: 'Date Created',
              value: formatUserCreatedDate(record.createdAt),
            },
          ].map((item, index) => (
            <View
              key={item.label}
              style={[styles.row, index < 2 ? styles.rowDivider : null]}
            >
              <Text style={styles.rowLabel}>{item.label}</Text>
              <Text style={styles.rowValue}>{item.value}</Text>
            </View>
          ))}
        </Card>

        {access.canEdit || access.canDelete || canManageActivation ? (
          <View style={styles.actions}>
            <View style={styles.actionGroup}>
              {access.canEdit || access.canDelete ? (
                <View style={styles.actionRow}>
                  {access.canEdit ? (
                    <TouchableOpacity
                      style={[styles.actionButton, styles.editButton]}
                      activeOpacity={0.88}
                      onPress={() =>
                        router.push({
                          pathname: getRoleRoute(role, 'user-form'),
                          params: {
                            mode: 'edit',
                            userId: record.id,
                          },
                        })
                      }
                    >
                      <Ionicons
                        name="create-outline"
                        size={18}
                        color={theme.colors.white}
                      />
                      <Text
                        style={[styles.actionButtonText, styles.editButtonText]}
                      >
                        Edit User
                      </Text>
                    </TouchableOpacity>
                  ) : null}

                  {access.canDelete ? (
                    <TouchableOpacity
                      style={[styles.actionButton, styles.deleteButton]}
                      activeOpacity={0.88}
                      onPress={handleDeleteUser}
                    >
                      <Ionicons
                        name="trash-outline"
                        size={18}
                        color={theme.colors.error}
                      />
                      <Text
                        style={[styles.actionButtonText, styles.deleteButtonText]}
                      >
                        Delete User
                      </Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              ) : null}

              {canManageActivation ? (
                <TouchableOpacity
                  style={[
                    styles.statusActionButton,
                    record.isActive
                      ? styles.deactivateButton
                      : styles.activateButton,
                  ]}
                  accessibilityLabel={
                    record.isActive ? 'Deactivate user' : 'Activate user'
                  }
                  activeOpacity={0.88}
                  onPress={handleToggleUserStatus}
                >
                  <Ionicons
                    name={
                      record.isActive
                        ? 'pause-circle-outline'
                        : 'checkmark-circle-outline'
                    }
                    size={18}
                    color={
                      record.isActive
                        ? theme.colors.error
                        : theme.colors.success
                    }
                  />
                  <Text
                    style={[
                      styles.actionButtonText,
                      record.isActive
                        ? styles.deactivateButtonText
                        : styles.activateButtonText,
                    ]}
                  >
                    {record.isActive ? 'Deactivate User' : 'Activate User'}
                  </Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  emptyStateWrap: {
    flex: 1,
    padding: theme.spacing.lg,
    justifyContent: 'center',
  },
  emptyCard: {
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text,
    fontFamily: theme.fonts.family.sans,
  },
  emptyText: {
    fontSize: 14,
    color: theme.colors.textMuted,
    textAlign: 'center',
    fontFamily: theme.fonts.family.sans,
  },
  content: {
    padding: theme.spacing.lg,
    paddingBottom: theme.spacing['2xl'],
  },
  notice: {
    marginBottom: theme.spacing.base,
  },
  card: {
    marginBottom: theme.spacing.base,
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: theme.spacing.base,
    marginBottom: theme.spacing.base,
  },
  heroCopy: {
    flex: 1,
  },
  heroTitle: {
    fontSize: 20,
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
  heroBadges: {
    alignItems: 'flex-end',
    gap: theme.spacing.sm,
  },
  roleBadge: {
    borderRadius: theme.radius.full,
    borderWidth: 1,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  roleBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: theme.fonts.family.sans,
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
  },
  metricTile: {
    flex: 1,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.surfaceMuted,
    padding: theme.spacing.md,
  },
  metricLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.textSubtle,
    marginBottom: 6,
    fontFamily: theme.fonts.family.sans,
  },
  metricValue: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.text,
    fontFamily: theme.fonts.family.sans,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: theme.spacing.base,
    fontFamily: theme.fonts.family.sans,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: theme.spacing.base,
    paddingVertical: theme.spacing.md,
  },
  rowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  rowLabel: {
    fontSize: 13,
    color: theme.colors.textMuted,
    fontFamily: theme.fonts.family.sans,
  },
  rowValue: {
    flexShrink: 1,
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.text,
    textAlign: 'right',
    fontFamily: theme.fonts.family.sans,
  },
  actions: {
    marginTop: theme.spacing.xs,
  },
  actionGroup: {
    gap: theme.spacing.sm,
  },
  actionRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  actionButton: {
    flex: 1,
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    borderRadius: 20,
    paddingHorizontal: theme.spacing.base,
    paddingVertical: theme.spacing.md,
  },
  statusActionButton: {
    width: '100%',
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    borderRadius: 20,
    paddingHorizontal: theme.spacing.base,
    paddingVertical: theme.spacing.md,
  },
  editButton: {
    backgroundColor: theme.colors.primary,
    borderWidth: 1,
    borderColor: theme.colors.primaryDark,
  },
  activateButton: {
    backgroundColor: theme.colors.successLight,
    borderWidth: 1.5,
    borderColor: '#D7F0E0',
  },
  deactivateButton: {
    backgroundColor: theme.colors.errorLight,
    borderWidth: 1.5,
    borderColor: '#F8D0D0',
  },
  deleteButton: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: theme.colors.error,
  },
  actionButtonText: {
    fontSize: 15,
    fontWeight: '700',
    fontFamily: theme.fonts.family.sans,
    textAlign: 'center',
  },
  editButtonText: {
    color: theme.colors.white,
  },
  activateButtonText: {
    color: '#0E7A37',
  },
  deactivateButtonText: {
    color: theme.colors.error,
  },
  deleteButtonText: {
    color: theme.colors.error,
  },
});
