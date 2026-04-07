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
  ProgressBar,
  SearchFiltersBar,
  StatusBadge,
  WorkspaceScaffold,
} from '@/src/mobile/components';
import { useAuth } from '@/src/mobile/context/AuthContext';
import { theme } from '@/src/mobile/constants/theme';
import {
  approvePreparationRequest,
  deletePreparationRecord,
  formatRequestedServices,
  getPreparationBadgeStatus,
  getPreparationRecords,
  getPreparationStatusLabel,
  loadPreparationRecords,
  markPreparationReadyForRelease,
  PreparationRecord,
  rejectPreparationRequest,
} from '@/src/mobile/data/preparation';
import {
  getModuleAccess,
  getRoleLabel,
  getRoleRoute,
} from '@/src/mobile/navigation/access';
import { PreparationStatus, UserRole } from '@/src/mobile/types';
import { shareExport } from '@/src/mobile/utils/shareExport';

const ITEMS_PER_PAGE = 5;

const getStatusFilterAccentColor = (statusFilter: string) => {
  switch (statusFilter) {
    case PreparationStatus.PENDING:
      return theme.colors.warning;
    case PreparationStatus.IN_DISPATCH:
      return theme.colors.info;
    case PreparationStatus.COMPLETED:
      return theme.colors.success;
    case PreparationStatus.READY_FOR_RELEASE:
      return theme.colors.primary;
    case PreparationStatus.REJECTED:
      return theme.colors.error;
    default:
      return theme.colors.textSubtle;
  }
};

const getPreparationFooterHint = (status: PreparationStatus) => {
  switch (status) {
    case PreparationStatus.PENDING:
      return 'Waiting for admin or supervisor approval';
    case PreparationStatus.IN_DISPATCH:
      return 'Queued for dispatcher checklist processing';
    case PreparationStatus.COMPLETED:
      return 'Dispatcher checklist completed';
    case PreparationStatus.READY_FOR_RELEASE:
      return 'Unit cleared and ready for release';
    case PreparationStatus.REJECTED:
      return 'Preparation request was rejected';
  }
};

export default function PreparationScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const role = user?.role ?? UserRole.ADMIN;
  const canReviewPreparation =
    role === UserRole.ADMIN || role === UserRole.SUPERVISOR;
  const access = getModuleAccess(role, 'vehiclePreparation');
  const [searchValue, setSearchValue] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [refreshing, setRefreshing] = useState(false);
  const [preparations, setPreparations] =
    useState<PreparationRecord[]>(() => getPreparationRecords());
  const statusFilterLabel =
    statusFilter === 'all'
      ? 'All stages'
      : getPreparationStatusLabel(statusFilter as PreparationStatus);

  const filteredPreparations = useMemo(
    () =>
      preparations.filter((item) => {
        const query = searchValue.toLowerCase();
        const matchesSearch =
          item.unitName.toLowerCase().includes(query) ||
          item.variation.toLowerCase().includes(query) ||
          item.customerName.toLowerCase().includes(query) ||
          item.customerContactNo.toLowerCase().includes(query) ||
          formatRequestedServices(item.requestedServices, item.customRequests)
            .toLowerCase()
            .includes(query) ||
          getPreparationStatusLabel(item.status).toLowerCase().includes(query);
        const matchesStatus =
          statusFilter === 'all' || item.status === statusFilter;

        return matchesSearch && matchesStatus;
      }),
    [preparations, searchValue, statusFilter]
  );
  const totalPages = Math.max(
    1,
    Math.ceil(filteredPreparations.length / ITEMS_PER_PAGE)
  );
  const paginatedPreparations = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredPreparations.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [currentPage, filteredPreparations]);
  const paginationRangeLabel = useMemo(() => {
    if (!filteredPreparations.length) {
      return 'Showing 0 of 0';
    }

    const start = (currentPage - 1) * ITEMS_PER_PAGE + 1;
    const end = Math.min(currentPage * ITEMS_PER_PAGE, filteredPreparations.length);

    return `Showing ${start}-${end} of ${filteredPreparations.length}`;
  }, [currentPage, filteredPreparations]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchValue, statusFilter]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  useEffect(() => {
    let isActive = true;
    const refreshPreparations = async () => {
      try {
        const records = await loadPreparationRecords();

        if (isActive) {
          setPreparations(records);
        }
      } catch {
        if (isActive) {
          setPreparations(getPreparationRecords());
        }
      }
    };

    refreshPreparations().catch(() => undefined);

    const unsubscribe = navigation.addListener('focus', () => {
      refreshPreparations().catch(() => undefined);
    });

    return () => {
      isActive = false;
      unsubscribe();
    };
  }, [navigation]);

  const handleRefresh = async () => {
    setRefreshing(true);

    try {
      const records = await loadPreparationRecords();
      setPreparations(records);
    } catch (error) {
      setPreparations(getPreparationRecords());
      Alert.alert(
        'Unable to refresh preparation records',
        error instanceof Error
          ? error.message
          : 'The latest preparation records could not be loaded right now.'
      );
    } finally {
      setRefreshing(false);
    }
  };

  const handleClearFilters = () => {
    setSearchValue('');
    setStatusFilter('all');
  };

  const handleExportPreparations = async () => {
    const statusFilterLabel =
      statusFilter === 'all'
        ? 'All stages'
        : getPreparationStatusLabel(statusFilter as PreparationStatus);
    const message = [
      'Vehicle Preparation Export',
      `Scope: ${getRoleLabel(role)}`,
      `Status Filter: ${statusFilterLabel}`,
      `Search: ${searchValue || 'None'}`,
      `Records: ${filteredPreparations.length}`,
      '',
      ...(filteredPreparations.length
        ? filteredPreparations.map(
            (item) =>
              `${item.unitName} ${item.variation} | ${item.conductionNumber} | ${item.customerName} | ${formatRequestedServices(item.requestedServices, item.customRequests)} | ${getPreparationStatusLabel(item.status)} | Progress ${item.progress}%`
          )
        : ['No matching preparation records.']),
    ].join('\n');

    await shareExport({
      title: 'Vehicle Preparation Export',
      message,
      errorMessage:
        'The preparation records could not be exported right now.',
    });
  };

  const handlePreparationPress = (preparationId: string) => {
    if (!access.canViewDetails) {
      return;
    }

    router.push(
      {
        pathname: getRoleRoute(role, 'preparation-detail'),
        params: {
          preparationId,
        },
      }
    );
  };

  const handleEditPreparation = (preparationId: string) => {
    if (!access.canEdit) {
      return;
    }

    router.push({
      pathname: getRoleRoute(role, 'preparation-form'),
      params: {
        mode: 'edit',
        preparationId,
      },
    });
  };

  const handleDeletePreparation = (
    preparationId: string,
    vehicleName: string
  ) => {
    if (!access.canDelete) {
      return;
    }

    Alert.alert(
      'Delete preparation request?',
      `${vehicleName} will be removed from the preparation list. This action cannot be undone.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deletePreparationRecord(preparationId);
            setPreparations(getPreparationRecords());
          },
        },
      ]
    );
  };

  const handleApprovePreparation = (
    preparationId: string,
    vehicleName: string
  ) => {
    if (!canReviewPreparation) {
      return;
    }

    Alert.alert(
      'Approve preparation request?',
      `${vehicleName} will be moved to In Dispatch and assigned to the dispatcher queue.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Approve',
          onPress: async () => {
            await approvePreparationRequest(
              preparationId,
              role,
              user?.name ?? 'System User'
            );
            setPreparations(getPreparationRecords());
          },
        },
      ]
    );
  };

  const handleRejectPreparation = (
    preparationId: string,
    vehicleName: string
  ) => {
    if (!canReviewPreparation) {
      return;
    }

    Alert.alert(
      'Reject preparation request?',
      `${vehicleName} will be marked as Rejected.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async () => {
            await rejectPreparationRequest(preparationId);
            setPreparations(getPreparationRecords());
          },
        },
      ]
    );
  };

  const handleReadyForRelease = (
    preparationId: string,
    vehicleName: string
  ) => {
    if (!canReviewPreparation) {
      return;
    }

    Alert.alert(
      'Mark ready for release?',
      `${vehicleName} will be marked as Ready for Release.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Ready for Release',
          onPress: async () => {
            await markPreparationReadyForRelease(preparationId);
            setPreparations(getPreparationRecords());
          },
        },
      ]
    );
  };

  return (
    <WorkspaceScaffold
      eyebrow={getRoleLabel(role)}
      title="Vehicle Preparation"
      subtitle="Coordinate service requests, customer updates, and release readiness from one flow."
      action={
        access.canCreate ? (
          <Button
            title="Add Prep"
            size="small"
            onPress={() =>
              router.push(getRoleRoute(role, 'preparation-form') as any)
            }
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
        <SearchFiltersBar
          searchValue={searchValue}
          onSearchChange={setSearchValue}
          searchPlaceholder="Search vehicle, customer, service, or status"
          filters={[
            { label: 'All', value: 'all' },
            { label: 'Pending', value: PreparationStatus.PENDING },
            { label: 'In Dispatch', value: PreparationStatus.IN_DISPATCH },
            { label: 'Completed', value: PreparationStatus.COMPLETED },
            {
              label: 'Ready for Release',
              value: PreparationStatus.READY_FOR_RELEASE,
            },
            { label: 'Rejected', value: PreparationStatus.REJECTED },
          ]}
          activeFilter={statusFilter}
          onFilterChange={setStatusFilter}
          onClearFilters={handleClearFilters}
          actions={
            access.canExportPdf
              ? [
                  {
                    key: 'export-preparation',
                    iconName: 'download-outline',
                    accessibilityLabel: 'Export vehicle preparation records',
                    onPress: handleExportPreparations,
                  },
                ]
              : undefined
          }
        />
      }
      scopeTitle={access.scopeLabel}
      scopeMessage={access.scopeNote}
      refreshing={refreshing}
      onRefresh={handleRefresh}
    >
      <FilterSummaryCard
        title="Preparation View"
        value={`${filteredPreparations.length} of ${preparations.length} requests shown`}
        iconName="build-outline"
        items={[
          {
            label: 'Status Filter',
            value: statusFilterLabel,
            dotColor: getStatusFilterAccentColor(statusFilter),
          },
        ]}
        style={styles.summaryCard}
      />

      <View style={styles.list}>
        {filteredPreparations.length ? (
          paginatedPreparations.map((item) => {
            const menuItems: CardActionMenuItem[] = [];

            if (canReviewPreparation && item.status === PreparationStatus.PENDING) {
              menuItems.push({
                key: `approve-${item.id}`,
                label: 'Approve',
                iconName: 'checkmark-circle-outline',
                tone: 'positive',
                onPress: () => handleApprovePreparation(item.id, item.unitName),
              });
              menuItems.push({
                key: `reject-${item.id}`,
                label: 'Reject',
                iconName: 'close-circle-outline',
                tone: 'destructive',
                onPress: () => handleRejectPreparation(item.id, item.unitName),
              });
            }

            if (
              canReviewPreparation &&
              item.status === PreparationStatus.COMPLETED
            ) {
              menuItems.push({
                key: `release-${item.id}`,
                label: 'Ready for Release',
                iconName: 'shield-checkmark-outline',
                tone: 'positive',
                onPress: () => handleReadyForRelease(item.id, item.unitName),
              });
            }

            if (access.canEdit) {
              menuItems.push({
                key: `edit-${item.id}`,
                label: 'Edit Prep',
                iconName: 'create-outline',
                onPress: () => handleEditPreparation(item.id),
              });
            }

            if (access.canDelete) {
              menuItems.push({
                key: `delete-${item.id}`,
                label: 'Delete',
                iconName: 'trash-outline',
                tone: 'destructive',
                onPress: () => handleDeletePreparation(item.id, item.unitName),
              });
            }

            return (
              <Card
                key={item.id}
                style={styles.card}
                variant="elevated"
                padding="large"
                onPress={
                  access.canViewDetails
                    ? () => handlePreparationPress(item.id)
                    : undefined
                }
                disabled={!access.canViewDetails}
              >
                <View style={styles.cardHeader}>
                  <View style={styles.identityRow}>
                    <View style={styles.iconWrap}>
                      <Ionicons
                        name="build-outline"
                        size={22}
                        color={theme.colors.primary}
                      />
                    </View>

                    <View style={styles.copy}>
                      <Text style={styles.title}>{item.unitName}</Text>
                      <Text style={styles.subtitle}>{item.variation}</Text>
                    </View>
                  </View>

                  <View style={styles.headerAside}>
                    {menuItems.length ? (
                      <View style={styles.headerActions}>
                        <CardActionMenu
                          accessibilityLabel={`Open actions for ${item.unitName}`}
                          items={menuItems}
                        />
                      </View>
                    ) : null}
                    <StatusBadge
                      status={getPreparationBadgeStatus(item.status)}
                      label={getPreparationStatusLabel(item.status)}
                      size="small"
                    />
                  </View>
                </View>

                <View style={styles.serviceChip}>
                  <Ionicons
                    name="construct-outline"
                    size={14}
                    color={theme.colors.primaryDark}
                  />
                  <Text style={styles.serviceChipLabel}>Requested Services</Text>
                  <Text style={styles.serviceChipValue}>
                    {formatRequestedServices(
                      item.requestedServices,
                      item.customRequests
                    )}
                  </Text>
                </View>

                <View style={styles.metricRow}>
                  <View style={styles.metricTile}>
                    <Text style={styles.metricLabel}>Customer</Text>
                    <Text style={styles.metricValue}>{item.customerName}</Text>
                  </View>
                  <View style={styles.metricTile}>
                    <Text style={styles.metricLabel}>Contact No</Text>
                    <Text style={styles.metricValue}>{item.customerContactNo}</Text>
                  </View>
                </View>

                <ProgressBar
                  progress={item.progress}
                  label="Preparation Progress"
                  style={styles.progress}
                />

                <View style={styles.cardFooter}>
                  <View style={styles.footerHint}>
                    <Ionicons
                      name={
                        item.status === PreparationStatus.PENDING
                          ? 'time-outline'
                          : item.status === PreparationStatus.IN_DISPATCH
                          ? 'swap-horizontal-outline'
                          : item.status === PreparationStatus.COMPLETED
                          ? 'checkmark-done-outline'
                          : item.status === PreparationStatus.READY_FOR_RELEASE
                          ? 'shield-checkmark-outline'
                          : 'close-circle-outline'
                      }
                      size={15}
                      color={theme.colors.textSubtle}
                    />
                    <Text style={styles.footerHintText}>
                      {getPreparationFooterHint(item.status)}
                    </Text>
                  </View>
                </View>
              </Card>
            );
          })
        ) : (
          <EmptyState
            title="No preparation records found"
            description="Change the search or status filter to see more preparation requests."
          />
        )}

        {filteredPreparations.length ? (
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
  list: {
    gap: theme.spacing.md,
  },
  card: {
    gap: theme.spacing.base,
    overflow: 'hidden',
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
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: theme.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primarySurface,
    borderWidth: 1,
    borderColor: theme.colors.primarySurfaceStrong,
  },
  copy: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 4,
    fontFamily: theme.fonts.family.sans,
  },
  subtitle: {
    fontSize: 13,
    color: theme.colors.textMuted,
    fontFamily: theme.fonts.family.sans,
  },
  headerAside: {
    alignItems: 'flex-end',
    gap: theme.spacing.sm,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: theme.spacing.xs,
  },
  serviceChip: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.primarySurface,
    borderWidth: 1,
    borderColor: theme.colors.primarySurfaceStrong,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  serviceChipLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.primaryDark,
    fontFamily: theme.fonts.family.sans,
  },
  serviceChipValue: {
    flex: 1,
    fontSize: 12,
    color: theme.colors.text,
    fontFamily: theme.fonts.family.sans,
  },
  metricRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  metricTile: {
    flex: 1,
    borderRadius: theme.radius.md,
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
  progress: {
    marginTop: theme.spacing.xs,
  },
  cardFooter: {
    paddingTop: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  footerHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  footerHintText: {
    fontSize: 12,
    color: theme.colors.textMuted,
    fontFamily: theme.fonts.family.sans,
  },
  actionRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  actionButton: {
    flex: 1,
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    borderRadius: 18,
    paddingHorizontal: theme.spacing.base,
    paddingVertical: theme.spacing.sm,
  },
  editButton: {
    backgroundColor: theme.colors.primary,
    borderWidth: 1,
    borderColor: theme.colors.primaryDark,
  },
  deleteButton: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: theme.colors.error,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: theme.fonts.family.sans,
    textAlign: 'center',
  },
  editButtonText: {
    color: theme.colors.white,
  },
  deleteButtonText: {
    color: theme.colors.error,
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
