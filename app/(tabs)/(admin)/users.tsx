import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useNavigation } from 'expo-router';
import {
  Button,
  Card,
  CardActionMenu,
  type CardActionMenuItem,
  EmptyState,
  FilterSummaryCard,
  SearchFiltersBar,
  SegmentedControl,
  WorkspaceScaffold,
} from '@/src/mobile/components';
import { theme } from '@/src/mobile/constants/theme';
import { useAuth } from '@/src/mobile/context/AuthContext';
import {
  deleteUserManagementRecord,
  formatUserCreatedDate,
  formatUserManagementReference,
  formatUserRoleLabel,
  formatUserManagementStatusLabel,
  getUserManagementRecords,
  getUserRoleBadgePalette,
  loadUserManagementRecords,
  UserManagementRecord,
  setUserManagementRecordActiveState,
} from '@/src/mobile/data/users';
import {
  getModuleAccess,
  getRoleLabel,
  getRoleRoute,
} from '@/src/mobile/navigation/access';
import { UserRole } from '@/src/mobile/types';
import { shareExport } from '@/src/mobile/utils/shareExport';

const ITEMS_PER_PAGE = 5;

const getRoleFilterAccentColor = (roleFilter: string) => {
  switch (roleFilter) {
    case UserRole.ADMIN:
      return theme.colors.primary;
    case UserRole.SUPERVISOR:
      return theme.colors.info;
    case UserRole.MANAGER:
      return theme.colors.warning;
    case UserRole.SALES_AGENT:
      return theme.colors.success;
    case UserRole.DISPATCHER:
      return theme.colors.primaryDark;
    case UserRole.DRIVER:
      return theme.colors.textSubtle;
    default:
      return theme.colors.textSubtle;
  }
};

const getUserInitials = (firstName: string, lastName: string) =>
  `${firstName.charAt(0)}${lastName.charAt(0)}`.trim().toUpperCase() || 'IT';

export default function UsersScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const role = user?.role ?? UserRole.ADMIN;
  const access = getModuleAccess(role, 'userManagement');
  const canManageActivation =
    role === UserRole.ADMIN || role === UserRole.SUPERVISOR;
  const [searchValue, setSearchValue] = useState('');
  const [statusTab, setStatusTab] = useState<'active' | 'deactivated'>('active');
  const [roleFilter, setRoleFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [refreshing, setRefreshing] = useState(false);
  const [userRecords, setUserRecords] = useState<UserManagementRecord[]>(
    getUserManagementRecords()
  );
  const roleFilterLabel =
    roleFilter === 'all'
      ? 'All roles'
      : formatUserRoleLabel(roleFilter as UserRole);
  const statusTabLabel =
    statusTab === 'active' ? 'Active users' : 'Deactivated users';
  const activeUserCount = useMemo(
    () => userRecords.filter((record) => record.isActive).length,
    [userRecords]
  );
  const deactivatedUserCount = userRecords.length - activeUserCount;

  const filteredUsers = useMemo(
    () =>
      userRecords.filter((record) => {
        const query = searchValue.toLowerCase();
        const fullName = `${record.firstName} ${record.lastName}`.toLowerCase();
        const matchesSearch =
          fullName.includes(query) ||
          record.firstName.toLowerCase().includes(query) ||
          record.lastName.toLowerCase().includes(query) ||
          record.email.toLowerCase().includes(query) ||
          record.phone.toLowerCase().includes(query) ||
          formatUserRoleLabel(record.role).toLowerCase().includes(query);
        const matchesRole =
          roleFilter === 'all' || record.role === roleFilter;
        const matchesStatus =
          statusTab === 'active' ? record.isActive : !record.isActive;

        return matchesSearch && matchesRole && matchesStatus;
      }),
    [roleFilter, searchValue, statusTab, userRecords]
  );

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / ITEMS_PER_PAGE));
  const paginatedUsers = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredUsers.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [currentPage, filteredUsers]);
  const paginationRangeLabel = useMemo(() => {
    if (!filteredUsers.length) {
      return 'Showing 0 of 0';
    }

    const start = (currentPage - 1) * ITEMS_PER_PAGE + 1;
    const end = Math.min(currentPage * ITEMS_PER_PAGE, filteredUsers.length);

    return `Showing ${start}-${end} of ${filteredUsers.length}`;
  }, [currentPage, filteredUsers]);

  useEffect(() => {
    setCurrentPage(1);
  }, [roleFilter, searchValue, statusTab]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  useEffect(() => {
    let isActive = true;
    const refreshUserRecords = async () => {
      try {
        const records = await loadUserManagementRecords();

        if (isActive) {
          setUserRecords(records);
        }
      } catch {
        if (isActive) {
          setUserRecords(getUserManagementRecords());
        }
      }
    };

    refreshUserRecords().catch(() => undefined);

    const unsubscribe = navigation.addListener('focus', () => {
      refreshUserRecords().catch(() => undefined);
    });

    return () => {
      isActive = false;
      unsubscribe();
    };
  }, [navigation]);

  const handleRefresh = async () => {
    setRefreshing(true);

    try {
      const records = await loadUserManagementRecords();
      setUserRecords(records);
    } catch (error) {
      setUserRecords(getUserManagementRecords());
      Alert.alert(
        'Unable to refresh users',
        error instanceof Error
          ? error.message
          : 'The latest user records could not be loaded right now.'
      );
    } finally {
      setRefreshing(false);
    }
  };

  const handleClearFilters = () => {
    setSearchValue('');
    setStatusTab('active');
    setRoleFilter('all');
  };

  const handleExportUsers = async () => {
    const message = [
      'User Management Export',
      `Scope: ${getRoleLabel(role)}`,
      `Status Tab: ${statusTabLabel}`,
      `Role Filter: ${roleFilterLabel}`,
      `Search: ${searchValue || 'None'}`,
      `Records: ${filteredUsers.length}`,
      '',
      ...(filteredUsers.length
        ? filteredUsers.map(
            (record) =>
              `${formatUserManagementReference(record.id)} | ${record.firstName} ${record.lastName} | ${record.email} | ${record.phone} | ${formatUserRoleLabel(record.role)} | ${formatUserManagementStatusLabel(record.isActive)} | Added ${formatUserCreatedDate(record.createdAt)}`
          )
        : ['No matching user records.']),
    ].join('\n');

    await shareExport({
      title: 'User Management Export',
      message,
      errorMessage:
        'The user management records could not be exported right now.',
    });
  };

  const handleOpenCreate = () => {
    if (!access.canCreate) {
      return;
    }

    router.push(getRoleRoute(role, 'user-form') as any);
  };

  const handleUserPress = (userId: string) => {
    if (!access.canViewDetails) {
      return;
    }

    router.push({
      pathname: getRoleRoute(role, 'user-detail'),
      params: {
        userId,
      },
    });
  };

  const handleEditUser = (userId: string) => {
    if (!access.canEdit) {
      return;
    }

    router.push({
      pathname: getRoleRoute(role, 'user-form'),
      params: {
        mode: 'edit',
        userId,
      },
    });
  };

  const handleDeleteUser = (userId: string, fullName: string) => {
    if (!access.canDelete) {
      return;
    }

    Alert.alert(
      'Delete user?',
      `${fullName} will be removed from user management. This action cannot be undone.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteUserManagementRecord(userId);
            setUserRecords(getUserManagementRecords());
          },
        },
      ]
    );
  };

  const handleToggleUserStatus = (
    userId: string,
    fullName: string,
    nextActiveState: boolean
  ) => {
    if (!canManageActivation) {
      return;
    }

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
            await setUserManagementRecordActiveState(userId, nextActiveState);
            setUserRecords(getUserManagementRecords());
          },
        },
      ]
    );
  };

  return (
    <WorkspaceScaffold
      eyebrow={getRoleLabel(role)}
      title="User Management"
      subtitle="Manage account access with the same add, edit, and delete flow used across admin operations."
      action={
        access.canCreate ? (
          <Button
            title="Add User"
            size="small"
            onPress={handleOpenCreate}
            icon={
              <Ionicons
                name="add-outline"
                size={18}
                color={theme.colors.white}
              />
            }
          />
        ) : undefined
      }
      toolbar={
        <View style={styles.toolbar}>
          <SegmentedControl
            options={[
              { label: `Active (${activeUserCount})`, value: 'active' },
              {
                label: `Deactivated (${deactivatedUserCount})`,
                value: 'deactivated',
              },
            ]}
            value={statusTab}
            onChange={(value) =>
              setStatusTab(value as 'active' | 'deactivated')
            }
            style={styles.segmentedControl}
          />

          <SearchFiltersBar
            searchValue={searchValue}
            onSearchChange={setSearchValue}
            searchPlaceholder="Search user, email, phone, or role"
            filters={[
              { label: 'All', value: 'all' },
              { label: 'Admin', value: UserRole.ADMIN },
              { label: 'Supervisor', value: UserRole.SUPERVISOR },
              { label: 'Manager', value: UserRole.MANAGER },
              { label: 'Sales Agent', value: UserRole.SALES_AGENT },
              { label: 'Dispatcher', value: UserRole.DISPATCHER },
              { label: 'Driver', value: UserRole.DRIVER },
            ]}
            activeFilter={roleFilter}
            onFilterChange={setRoleFilter}
            onClearFilters={handleClearFilters}
            actions={
              access.canExportPdf
                ? [
                    {
                      key: 'export-users',
                      iconName: 'download-outline',
                      accessibilityLabel: 'Export users',
                      onPress: handleExportUsers,
                    },
                  ]
                : undefined
            }
          />
        </View>
      }
      scopeTitle={access.scopeLabel}
      scopeMessage={access.scopeNote}
      refreshing={refreshing}
      onRefresh={handleRefresh}
    >
      <FilterSummaryCard
        title="User View"
        value={`${filteredUsers.length} of ${userRecords.length} users shown`}
        iconName="people-outline"
        items={[
          {
            label: 'Status Tab',
            value: statusTabLabel,
            dotColor: statusTab === 'active' ? theme.colors.success : theme.colors.textSubtle,
          },
          {
            label: 'Role Filter',
            value: roleFilterLabel,
            dotColor: getRoleFilterAccentColor(roleFilter),
          },
        ]}
        style={styles.summaryCard}
      />

      <View style={styles.list}>
        {filteredUsers.length ? (
          paginatedUsers.map((record) => {
            const fullName = `${record.firstName} ${record.lastName}`;
            const initials = getUserInitials(record.firstName, record.lastName);
            const bioPreview = record.bio?.trim() || 'No bio added yet.';
            const isAdmin = record.role === UserRole.ADMIN;
            const roleBadgePalette = getUserRoleBadgePalette(record.role);
            const menuItems: CardActionMenuItem[] = [];

            if (access.canEdit) {
              menuItems.push({
                key: `edit-${record.id}`,
                label: 'Edit User',
                iconName: 'create-outline',
                onPress: () => handleEditUser(record.id),
              });
            }

            if (access.canDelete) {
              menuItems.push({
                key: `delete-${record.id}`,
                label: 'Delete User',
                iconName: 'trash-outline',
                tone: 'destructive',
                onPress: () => handleDeleteUser(record.id, fullName),
              });
            }

            if (canManageActivation) {
              menuItems.push({
                key: `status-${record.id}`,
                label: record.isActive ? 'Deactivate User' : 'Activate User',
                iconName: record.isActive
                  ? 'pause-circle-outline'
                  : 'checkmark-circle-outline',
                tone: record.isActive ? 'destructive' : 'positive',
                onPress: () =>
                  handleToggleUserStatus(record.id, fullName, !record.isActive),
              });
            }

            return (
              <Card
                key={record.id}
                style={styles.card}
                variant="elevated"
                padding="large"
                onPress={
                  access.canViewDetails
                    ? () => handleUserPress(record.id)
                    : undefined
                }
                disabled={!access.canViewDetails}
              >
                <View style={styles.cardHeader}>
                  <View style={styles.identityRow}>
                    <View
                      style={[
                        styles.avatarWrap,
                        {
                          backgroundColor: roleBadgePalette.backgroundColor,
                          borderColor: roleBadgePalette.borderColor,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.avatarText,
                          { color: roleBadgePalette.textColor },
                        ]}
                      >
                        {initials}
                      </Text>
                    </View>

                    <View style={styles.copy}>
                      <Text style={styles.title} numberOfLines={1}>
                        {fullName}
                      </Text>
                      <View style={styles.metaInline}>
                        <Ionicons
                          name="mail-outline"
                          size={14}
                          color={theme.colors.textSubtle}
                        />
                        <Text style={styles.metaInlineText} numberOfLines={1}>
                          {record.email}
                        </Text>
                      </View>
                      <View style={styles.metaInline}>
                        <Ionicons
                          name="call-outline"
                          size={14}
                          color={theme.colors.textSubtle}
                        />
                        <Text
                          style={[styles.metaInlineText, styles.metaInlineMonoText]}
                          numberOfLines={1}
                        >
                          {record.phone}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {menuItems.length ? (
                    <View style={styles.headerActions}>
                      <CardActionMenu
                        accessibilityLabel={`Open actions for ${fullName}`}
                        items={menuItems}
                      />
                    </View>
                  ) : null}
                </View>

                <View style={styles.badgeRow}>
                  <View
                    style={[
                      styles.roleBadge,
                      isAdmin ? styles.adminRoleBadge : null,
                      {
                        backgroundColor: roleBadgePalette.backgroundColor,
                        borderColor: roleBadgePalette.borderColor,
                      },
                    ]}
                  >
                    {isAdmin ? (
                      <Ionicons
                        name="shield-checkmark-outline"
                        size={14}
                        color={roleBadgePalette.textColor}
                      />
                    ) : (
                      <View
                        style={[
                          styles.roleBadgeDot,
                          { backgroundColor: roleBadgePalette.textColor },
                        ]}
                      />
                    )}
                    <Text
                      style={[
                        styles.roleBadgeText,
                        isAdmin ? styles.adminRoleBadgeText : null,
                        { color: roleBadgePalette.textColor },
                      ]}
                    >
                      {formatUserRoleLabel(record.role)}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.statusBadge,
                      record.isActive
                        ? styles.statusBadgeActive
                        : styles.statusBadgeInactive,
                    ]}
                  >
                    <Ionicons
                      name={
                        record.isActive
                          ? 'checkmark-circle-outline'
                          : 'pause-circle-outline'
                      }
                      size={14}
                      color={
                        record.isActive
                          ? theme.colors.success
                          : theme.colors.textMuted
                      }
                    />
                    <Text
                      style={[
                        styles.statusBadgeText,
                        record.isActive
                          ? styles.statusBadgeTextActive
                          : styles.statusBadgeTextInactive,
                      ]}
                    >
                      {formatUserManagementStatusLabel(record.isActive)}
                    </Text>
                  </View>
                </View>

                <View style={styles.bioPanel}>
                  <View style={styles.bioHeader}>
                    <Ionicons
                      name="document-text-outline"
                      size={14}
                      color={theme.colors.textSubtle}
                    />
                    <Text style={styles.bioLabel}>Bio</Text>
                  </View>
                  <Text style={styles.bioText}>{bioPreview}</Text>
                </View>
              </Card>
            );
          })
        ) : (
          <EmptyState
            title="No users found"
            description={`Try another search term or change the selected role filter for the ${statusTabLabel.toLowerCase()}.`}
          />
        )}

        {filteredUsers.length ? (
          <View style={styles.paginationWrap}>
            <View style={styles.paginationSummary}>
              <Text style={styles.paginationTitle}>Pagination</Text>
              <Text style={styles.paginationText}>
                {paginationRangeLabel} - {ITEMS_PER_PAGE} items per page
              </Text>
            </View>

            <View style={styles.paginationControls}>
              <TouchableOpacity
                style={[
                  styles.paginationButton,
                  currentPage === 1 ? styles.paginationButtonDisabled : null,
                ]}
                activeOpacity={0.88}
                disabled={currentPage === 1}
                onPress={() => setCurrentPage((page) => Math.max(1, page - 1))}
              >
                <Ionicons
                  name="chevron-back-outline"
                  size={16}
                  color={
                    currentPage === 1
                      ? theme.colors.textSubtle
                      : theme.colors.text
                  }
                />
              </TouchableOpacity>

              <View style={styles.paginationIndicator}>
                <Text style={styles.paginationIndicatorText}>
                  Page {currentPage} of {totalPages}
                </Text>
              </View>

              <TouchableOpacity
                style={[
                  styles.paginationButton,
                  currentPage === totalPages
                    ? styles.paginationButtonDisabled
                    : styles.paginationButtonPrimary,
                ]}
                activeOpacity={0.88}
                disabled={currentPage === totalPages}
                onPress={() =>
                  setCurrentPage((page) => Math.min(totalPages, page + 1))
                }
              >
                <Ionicons
                  name="chevron-forward-outline"
                  size={16}
                  color={
                    currentPage === totalPages
                      ? theme.colors.textSubtle
                      : theme.colors.white
                  }
                />
              </TouchableOpacity>
            </View>
          </View>
        ) : null}
      </View>
    </WorkspaceScaffold>
  );
}

const styles = StyleSheet.create({
  summaryCard: {
    marginBottom: theme.spacing.lg,
  },
  toolbar: {
    gap: theme.spacing.base,
  },
  segmentedControl: {
    marginBottom: 0,
  },
  list: {
    gap: theme.spacing.md,
  },
  card: {
    gap: theme.spacing.base,
    backgroundColor: theme.colors.surfaceRaised,
    borderColor: theme.colors.borderStrong,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: theme.spacing.base,
  },
  identityRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.md,
  },
  avatarWrap: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: theme.fonts.family.sans,
  },
  copy: {
    flex: 1,
    gap: theme.spacing.xs,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: theme.colors.text,
    fontFamily: theme.fonts.family.sans,
  },
  metaInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  metaInlineText: {
    flex: 1,
    fontSize: 13,
    color: theme.colors.textMuted,
    fontFamily: theme.fonts.family.sans,
  },
  metaInlineMonoText: {
    fontFamily: theme.fonts.family.mono,
  },
  headerActions: {
    marginLeft: theme.spacing.sm,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: theme.radius.full,
    borderWidth: 1,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  roleBadgeDot: {
    width: 8,
    height: 8,
    borderRadius: theme.radius.full,
  },
  roleBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: theme.fonts.family.sans,
  },
  adminRoleBadge: {
    paddingHorizontal: theme.spacing.base,
    borderWidth: 1.5,
    ...theme.shadows.sm,
  },
  adminRoleBadgeText: {
    letterSpacing: 0.2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: theme.radius.full,
    borderWidth: 1,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  statusBadgeActive: {
    backgroundColor: theme.colors.successLight,
    borderColor: '#D7F0E0',
  },
  statusBadgeInactive: {
    backgroundColor: theme.colors.surfaceMuted,
    borderColor: theme.colors.border,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: theme.fonts.family.sans,
  },
  statusBadgeTextActive: {
    color: '#0E7A37',
  },
  statusBadgeTextInactive: {
    color: theme.colors.textMuted,
  },
  bioPanel: {
    gap: theme.spacing.xs,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surfaceMuted,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
  },
  bioHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  bioLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.textSubtle,
    fontFamily: theme.fonts.family.sans,
  },
  bioText: {
    fontSize: 13,
    lineHeight: 20,
    color: theme.colors.text,
    fontFamily: theme.fonts.family.sans,
  },
  paginationWrap: {
    marginTop: theme.spacing.sm,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.borderStrong,
    padding: theme.spacing.base,
    gap: theme.spacing.base,
    ...theme.shadows.sm,
  },
  paginationSummary: {
    gap: 4,
  },
  paginationTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.text,
    fontFamily: theme.fonts.family.sans,
  },
  paginationText: {
    fontSize: 12,
    color: theme.colors.textMuted,
    fontFamily: theme.fonts.family.sans,
  },
  paginationControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  paginationButton: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.borderStrong,
    backgroundColor: theme.colors.backgroundAlt,
  },
  paginationButtonPrimary: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primaryDark,
  },
  paginationButtonDisabled: {
    backgroundColor: theme.colors.surfaceMuted,
    borderColor: theme.colors.border,
  },
  paginationIndicator: {
    flex: 1,
    minHeight: 44,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primarySurface,
    borderWidth: 1,
    borderColor: theme.colors.primarySurfaceStrong,
    paddingHorizontal: theme.spacing.sm,
  },
  paginationIndicatorText: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.primaryDark,
    fontFamily: theme.fonts.family.sans,
    textAlign: 'center',
  },
});
