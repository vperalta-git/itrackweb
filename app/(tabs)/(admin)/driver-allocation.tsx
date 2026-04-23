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
  Select,
  StatusBadge,
  WorkspaceScaffold,
} from '@/src/mobile/components';
import { DriverAllocationLiveTracking } from '@/src/mobile/components/DriverAllocationLiveTracking';
import { useAuth } from '@/src/mobile/context/AuthContext';
import { theme } from '@/src/mobile/constants/theme';
import {
  DRIVER_ALLOCATION_MANAGER_OPTIONS,
  DriverAllocationRecord,
  deleteDriverAllocation,
  formatDriverAllocationEta,
  formatDriverAllocationCreatedDate,
  formatDriverAllocationReference,
  formatDriverAllocationRemainingDistance,
  formatDriverAllocationStatusLabel,
  getDriverAllocations,
  getDriverAllocationBadgeStatus,
  getDriverAllocationStatusAccentColor,
  loadDriverAllocations,
  matchesDriverAllocationStatusFilter,
} from '@/src/mobile/data/driver-allocation';
import { findVehicleStockById } from '@/src/mobile/data/vehicle-stocks';
import {
  getModuleAccess,
  getRoleLabel,
  getRoleRoute,
} from '@/src/mobile/navigation/access';
import { AllocationStatus, UserRole } from '@/src/mobile/types';
import { shareExport } from '@/src/mobile/utils/shareExport';

const ITEMS_PER_PAGE = 5;
type DriverAllocationTab = 'allocations' | 'live_tracking';

const formatRemainingDistanceLabel = (allocation: DriverAllocationRecord) => {
  return formatDriverAllocationRemainingDistance(allocation);
};

const getStatusFilterAccentColor = (statusFilter: string) => {
  switch (statusFilter) {
    case AllocationStatus.PENDING:
    case AllocationStatus.ASSIGNED:
      return theme.colors.warning;
    case AllocationStatus.IN_TRANSIT:
      return theme.colors.info;
    case AllocationStatus.COMPLETED:
      return theme.colors.success;
    default:
      return theme.colors.textSubtle;
  }
};

export default function DriverAllocationScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const role = user?.role ?? UserRole.ADMIN;
  const access = getModuleAccess(role, 'driverAllocation');
  const liveTrackingOnly =
    role === UserRole.MANAGER || role === UserRole.SALES_AGENT;
  const tabOptions = useMemo(
    () =>
      liveTrackingOnly
        ? [{ label: 'Live Tracking', value: 'live_tracking' }]
        : access.canTrackMap
        ? [
            { label: 'Allocations', value: 'allocations' },
            { label: 'Live Tracking', value: 'live_tracking' },
          ]
        : [{ label: 'Allocations', value: 'allocations' }],
    [access.canTrackMap, liveTrackingOnly]
  );
  const [activeTab, setActiveTab] =
    useState<DriverAllocationTab>(
      liveTrackingOnly ? 'live_tracking' : 'allocations'
    );
  const [searchValue, setSearchValue] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [managerFilter, setManagerFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [refreshing, setRefreshing] = useState(false);
  const [allocations, setAllocations] =
    useState<DriverAllocationRecord[]>(getDriverAllocations());

  const filteredAllocations = useMemo(
    () =>
      allocations.filter((allocation) => {
        const query = searchValue.toLowerCase();
        const matchesSearch =
          allocation.managerName.toLowerCase().includes(query) ||
          allocation.unitName.toLowerCase().includes(query) ||
          allocation.variation.toLowerCase().includes(query) ||
          allocation.conductionNumber.toLowerCase().includes(query) ||
          allocation.driverName.toLowerCase().includes(query) ||
          allocation.pickupLabel.toLowerCase().includes(query) ||
          allocation.destinationLabel.toLowerCase().includes(query) ||
          formatDriverAllocationStatusLabel(allocation.status)
            .toLowerCase()
            .includes(query);
        const matchesStatus = matchesDriverAllocationStatusFilter(
          statusFilter,
          allocation.status
        );

        return matchesSearch && matchesStatus;
      }),
    [allocations, searchValue, statusFilter]
  );
  const liveTrackingAllocations = useMemo(
    () =>
      allocations.filter((allocation) => {
        const query = searchValue.toLowerCase();
        const matchesSearch =
          allocation.managerName.toLowerCase().includes(query) ||
          allocation.unitName.toLowerCase().includes(query) ||
          allocation.variation.toLowerCase().includes(query) ||
          allocation.conductionNumber.toLowerCase().includes(query) ||
          allocation.driverName.toLowerCase().includes(query) ||
          allocation.pickupLabel.toLowerCase().includes(query) ||
          allocation.destinationLabel.toLowerCase().includes(query);
        const matchesManager =
          managerFilter === 'all' || allocation.managerId === managerFilter;

        return matchesSearch && matchesManager;
      }),
    [allocations, managerFilter, searchValue]
  );

  const totalPages = Math.max(
    1,
    Math.ceil(filteredAllocations.length / ITEMS_PER_PAGE)
  );
  const statusFilterLabel =
    statusFilter === 'all'
      ? 'All routes'
      : formatDriverAllocationStatusLabel(statusFilter as AllocationStatus);
  const managerFilterLabel =
    managerFilter === 'all'
      ? 'All managers'
      : DRIVER_ALLOCATION_MANAGER_OPTIONS.find(
          (manager) => manager.value === managerFilter
        )?.label ?? 'All managers';
  const paginatedAllocations = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredAllocations.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [currentPage, filteredAllocations]);
  const paginationRangeLabel = useMemo(() => {
    if (!filteredAllocations.length) {
      return 'Showing 0 of 0';
    }

    const start = (currentPage - 1) * ITEMS_PER_PAGE + 1;
    const end = Math.min(currentPage * ITEMS_PER_PAGE, filteredAllocations.length);

    return `Showing ${start}-${end} of ${filteredAllocations.length}`;
  }, [currentPage, filteredAllocations]);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, managerFilter, searchValue, statusFilter]);

  useEffect(() => {
    if (liveTrackingOnly && activeTab !== 'live_tracking') {
      setActiveTab('live_tracking');
    }
  }, [activeTab, liveTrackingOnly]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  useEffect(() => {
    let isActive = true;
    const refreshAllocations = async () => {
      try {
        const records = await loadDriverAllocations();

        if (isActive) {
          setAllocations(records);
        }
      } catch {
        if (isActive) {
          setAllocations(getDriverAllocations());
        }
      }
    };

    refreshAllocations().catch(() => undefined);

    const unsubscribe = navigation.addListener('focus', () => {
      refreshAllocations().catch(() => undefined);
    });

    return () => {
      isActive = false;
      unsubscribe();
    };
  }, [navigation]);

  const handleRefresh = async () => {
    setRefreshing(true);

    try {
      const records = await loadDriverAllocations();
      setAllocations(records);
    } catch (error) {
      setAllocations(getDriverAllocations());
      Alert.alert(
        'Unable to refresh driver allocations',
        error instanceof Error
          ? error.message
          : 'The latest driver allocation records could not be loaded right now.'
      );
    } finally {
      setRefreshing(false);
    }
  };

  const handleClearFilters = () => {
    setSearchValue('');
    setStatusFilter('all');
    setManagerFilter('all');
  };

  const handleExportAllocations = async () => {
    const exportRecords =
      activeTab === 'live_tracking'
        ? liveTrackingAllocations
        : filteredAllocations;
    const statusFilterLabel =
      statusFilter === 'all'
        ? 'All statuses'
        : formatDriverAllocationStatusLabel(statusFilter as AllocationStatus);
    const managerFilterLabel =
      managerFilter === 'all'
        ? 'All managers'
        : DRIVER_ALLOCATION_MANAGER_OPTIONS.find(
            (option) => option.value === managerFilter
          )?.label ?? managerFilter;
    await shareExport({
      title:
        activeTab === 'live_tracking'
          ? 'Driver Allocation Live Tracking Report'
          : 'Driver Allocation Report',
      subtitle:
        activeTab === 'live_tracking'
          ? 'Active live route tracking'
          : statusFilter === 'all'
            ? 'All driver allocations'
            : `Status: ${statusFilterLabel}`,
      metadata: [
        { label: 'Scope', value: getRoleLabel(role) },
        {
          label: 'Tab',
          value: activeTab === 'live_tracking' ? 'Live Tracking' : 'Allocations',
        },
        {
          label: 'Status Filter',
          value: activeTab === 'allocations' ? statusFilterLabel : 'Not applied',
        },
        { label: 'Manager Filter', value: managerFilterLabel },
        { label: 'Search', value: searchValue || 'None' },
        { label: 'Records', value: String(exportRecords.length) },
      ],
      columns: [
        {
          header: 'Date',
          value: (allocation) =>
            formatDriverAllocationCreatedDate(allocation.createdAt),
        },
        { header: 'Unit Name', value: (allocation) => allocation.unitName },
        {
          header: 'Conduction Number',
          value: (allocation) => allocation.conductionNumber,
        },
        {
          header: 'Body Color',
          value: (allocation) =>
            findVehicleStockById(allocation.unitId)?.bodyColor ?? '-',
        },
        { header: 'Variation', value: (allocation) => allocation.variation },
        {
          header: 'Assigned Driver',
          value: (allocation) => allocation.driverName,
        },
        {
          header: 'Driver Phone',
          value: (allocation) => allocation.driverPhone,
        },
        {
          header: 'Pickup Location',
          value: (allocation) => allocation.pickupLabel,
        },
        {
          header: 'Destination',
          value: (allocation) => allocation.destinationLabel,
        },
        {
          header: 'Status',
          value: (allocation) =>
            formatDriverAllocationStatusLabel(allocation.status),
        },
        { header: 'ETA', value: (allocation) => formatDriverAllocationEta(allocation) },
        {
          header: 'Remaining Distance',
          value: (allocation) => formatRemainingDistanceLabel(allocation) ?? '-',
        },
      ],
      rows: exportRecords,
      emptyStateMessage: 'No matching driver allocation records.',
      errorMessage:
        'The driver allocation records could not be exported right now.',
    });
  };

  const openDriverDetail = (allocationId: string) => {
    if (!access.canViewDetails) {
      return;
    }

    router.push(
      {
        pathname: getRoleRoute(role, 'driver-detail'),
        params: {
          allocationId,
        },
      }
    );
  };

  const handleEditAllocation = (allocationId: string) => {
    if (!access.canEdit) {
      return;
    }

    router.push({
      pathname: getRoleRoute(role, 'driver-allocation-form'),
      params: {
        mode: 'edit',
        allocationId,
      },
    });
  };

  const handleDeleteAllocation = (allocationId: string, unitName: string) => {
    if (!access.canDelete) {
      return;
    }

    Alert.alert(
      'Delete allocation?',
      `${unitName} will be removed from the driver allocation list. This action cannot be undone.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteDriverAllocation(allocationId);
            setAllocations(getDriverAllocations());
          },
        },
      ]
    );
  };

  return (
    <WorkspaceScaffold
      eyebrow={getRoleLabel(role)}
      title="Driver Allocation"
      subtitle={
        activeTab === 'live_tracking'
          ? 'Monitor active routes, driver movement, and destination progress in real time.'
          : 'Manage unit dispatch assignments, route progress, and live trip readiness.'
      }
      action={
        activeTab === 'allocations' && access.canCreate ? (
          <Button
            title="Add Allocation"
            size="small"
            onPress={() =>
              router.push(getRoleRoute(role, 'driver-allocation-form') as any)
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
          searchPlaceholder={
            activeTab === 'live_tracking'
              ? 'Search manager, driver, pickup, or destination'
              : 'Search unit, manager, driver, pickup, destination, or status'
          }
          filters={
            activeTab === 'allocations'
              ? [
                  { label: 'All', value: 'all' },
                  { label: 'Pending', value: AllocationStatus.PENDING },
                  { label: 'In Transit', value: AllocationStatus.IN_TRANSIT },
                  { label: 'Completed', value: AllocationStatus.COMPLETED },
                ]
              : undefined
          }
          activeFilter={activeTab === 'allocations' ? statusFilter : undefined}
          onFilterChange={
            activeTab === 'allocations' ? setStatusFilter : undefined
          }
          extraFiltersContent={
            activeTab === 'live_tracking' ? (
              <Select
                label="Filter by Manager"
                placeholder="All managers"
                value={managerFilter}
                options={[
                  { label: 'All Managers', value: 'all' },
                  ...DRIVER_ALLOCATION_MANAGER_OPTIONS,
                ]}
                onValueChange={(value) => setManagerFilter(String(value))}
                searchPlaceholder="Search manager"
                style={styles.managerFilterField}
              />
            ) : undefined
          }
          extraFiltersActive={
            activeTab === 'live_tracking' && managerFilter !== 'all'
          }
          onClearFilters={handleClearFilters}
          actions={
            access.canExportPdf
              ? [
                  {
                    key: 'export-driver-allocation',
                    iconName: 'download-outline',
                    accessibilityLabel: 'Export driver allocations',
                    onPress: handleExportAllocations,
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
      {tabOptions.length > 1 ? (
        <SegmentedControl
          options={tabOptions}
          value={activeTab}
          onChange={(value) => setActiveTab(value as DriverAllocationTab)}
          style={styles.tabs}
        />
      ) : null}

      {activeTab === 'live_tracking' ? (
        <DriverAllocationLiveTracking
          allocations={liveTrackingAllocations}
          managerFilterLabel={managerFilterLabel}
          canViewDetails={access.canViewDetails}
          onOpenAllocation={openDriverDetail}
        />
      ) : (
        <>
          <FilterSummaryCard
            title=""
            value={`${filteredAllocations.length} of ${allocations.length} driver allocations shown`}
            iconName="navigate-outline"
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
        {filteredAllocations.length ? (
          paginatedAllocations.map((allocation) => {
            const remainingDistanceLabel =
              formatRemainingDistanceLabel(allocation);
            const menuItems: CardActionMenuItem[] = [];

            if (access.canEdit) {
              menuItems.push({
                key: `edit-${allocation.id}`,
                label: 'Edit',
                iconName: 'create-outline',
                onPress: () => handleEditAllocation(allocation.id),
              });
            }

            if (access.canDelete) {
              menuItems.push({
                key: `delete-${allocation.id}`,
                label: 'Delete',
                iconName: 'trash-outline',
                tone: 'destructive',
                onPress: () =>
                  handleDeleteAllocation(allocation.id, allocation.unitName),
              });
            }

            return (
              <Card
                key={allocation.id}
                style={styles.card}
                variant="elevated"
                padding="large"
                onPress={
                  access.canViewDetails
                    ? () => openDriverDetail(allocation.id)
                    : undefined
                }
                disabled={!access.canViewDetails}
              >
                <View
                  style={[
                    styles.accentBar,
                    {
                      backgroundColor: getDriverAllocationStatusAccentColor(
                        allocation.status
                      ),
                    },
                  ]}
                />

                <View style={styles.cardHeader}>
                  <View style={styles.identityRow}>
                    <View style={styles.iconWrap}>
                      <Ionicons
                        name="car-sport-outline"
                        size={22}
                        color={theme.colors.primary}
                      />
                    </View>

                    <View style={styles.copy}>
                      <Text style={styles.eyebrow}>
                        {formatDriverAllocationReference(allocation.id)}
                      </Text>
                      <Text style={styles.title}>{allocation.unitName}</Text>
                      <Text style={styles.subtitle}>{allocation.variation}</Text>
                    </View>
                  </View>

                  <View style={styles.headerAside}>
                    {menuItems.length ? (
                      <View style={styles.headerActions}>
                        <CardActionMenu
                          accessibilityLabel={`Open actions for ${allocation.unitName}`}
                          items={menuItems}
                        />
                      </View>
                    ) : null}
                    <StatusBadge
                      status={getDriverAllocationBadgeStatus(allocation.status)}
                      label={formatDriverAllocationStatusLabel(allocation.status)}
                      size="small"
                    />
                  </View>
                </View>

                <View style={styles.referenceChip}>
                  <Ionicons
                    name="pricetag-outline"
                    size={14}
                    color={theme.colors.primaryDark}
                  />
                  <Text style={styles.referenceChipLabel}>
                    Conduction Number
                  </Text>
                  <Text style={styles.referenceChipValue}>
                    {allocation.conductionNumber}
                  </Text>
                </View>

                <View style={styles.routeChip}>
                  <Ionicons
                    name="navigate-outline"
                    size={14}
                    color={theme.colors.primaryDark}
                  />
                  <View style={styles.routeChipCopy}>
                    <Text style={styles.routeChipValue}>
                      {allocation.pickupLabel} to {allocation.destinationLabel}
                    </Text>
                    {remainingDistanceLabel ? (
                      <Text style={styles.routeChipMeta}>
                        {remainingDistanceLabel}
                      </Text>
                    ) : null}
                  </View>
                </View>

                <View style={styles.metricGrid}>
                  <View style={styles.metricCard}>
                    <Text style={styles.metricLabel}>Assigned Driver</Text>
                    <Text style={styles.metricValue}>{allocation.driverName}</Text>
                  </View>

                  <View style={styles.metricCard}>
                    <Text style={styles.metricLabel}>ETA</Text>
                    <Text style={styles.metricValue}>
                      {formatDriverAllocationEta(allocation)}
                    </Text>
                  </View>

                  <View style={styles.metricCard}>
                    <Text style={styles.metricLabel}>
                      {remainingDistanceLabel ? 'KM Left' : 'Date Created'}
                    </Text>
                    <Text style={styles.metricValue}>
                      {remainingDistanceLabel ??
                        formatDriverAllocationCreatedDate(allocation.createdAt)}
                    </Text>
                  </View>
                </View>

                <View style={styles.cardFooter}>
                  <View style={styles.footerHint}>
                    <Ionicons
                      name="map-outline"
                      size={15}
                      color={theme.colors.textSubtle}
                    />
                    <Text style={styles.footerHintText}>
                      {access.canTrackMap
                        ? 'Tap card to open route details and map preview'
                        : 'Dispatch list view only'}
                    </Text>
                  </View>
                </View>
              </Card>
            );
          })
        ) : (
          <EmptyState
            title="No driver allocations found"
            description="Try another search term or change the selected route status."
          />
        )}

        {filteredAllocations.length ? (
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
        </>
      )}
    </WorkspaceScaffold>
  );
}

const styles = StyleSheet.create({
  tabs: {
    marginBottom: theme.spacing.lg,
  },
  summaryCard: {
    marginBottom: theme.spacing.lg,
  },
  managerFilterField: {
    marginBottom: 0,
  },
  list: {
    gap: theme.spacing.md,
  },
  card: {
    gap: theme.spacing.base,
    overflow: 'hidden',
  },
  accentBar: {
    height: 5,
    borderRadius: theme.radius.full,
    marginBottom: theme.spacing.sm,
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
  eyebrow: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: theme.colors.textSubtle,
    marginBottom: 6,
    fontFamily: theme.fonts.family.sans,
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
  referenceChip: {
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
  referenceChipLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.primaryDark,
    fontFamily: theme.fonts.family.sans,
  },
  referenceChipValue: {
    fontSize: 12,
    color: theme.colors.text,
    fontFamily: theme.fonts.family.mono,
  },
  routeChip: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surfaceMuted,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  routeChipCopy: {
    flex: 1,
    gap: 2,
  },
  routeChipValue: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.text,
    fontFamily: theme.fonts.family.sans,
  },
  routeChipMeta: {
    fontSize: 11,
    color: theme.colors.textMuted,
    fontFamily: theme.fonts.family.sans,
  },
  metricGrid: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  metricCard: {
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
