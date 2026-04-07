import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import {
  Button,
  Card,
  EmptyState,
  FilterSummaryCard,
  SearchFiltersBar,
  SegmentedControl,
  StatusBadge,
  WorkspaceScaffold,
} from '@/src/mobile/components';
import { theme } from '@/src/mobile/constants/theme';
import { useAuth } from '@/src/mobile/context/AuthContext';
import {
  formatDriverAllocationStatusLabel,
  getDriverAllocations,
} from '@/src/mobile/data/driver-allocation';
import {
  formatRequestedServices,
  getPreparationRecords,
  getPreparationStatusLabel,
} from '@/src/mobile/data/preparation';
import {
  buildReleaseHistoryExportSummary,
  formatReleaseDateTime,
  getReleaseHistoryExportFileName,
  getReleaseHistoryRecords,
  type ReleaseHistoryRecord,
} from '@/src/mobile/data/release-history';
import {
  formatTestDriveSchedule,
  formatTestDriveStatusLabel,
  getTestDriveBookings,
} from '@/src/mobile/data/test-drive';
import {
  formatAllocationStatusLabel,
  getUnitAgentAllocations,
} from '@/src/mobile/data/unit-agent-allocation';
import {
  formatUserRoleLabel,
  getUserManagementRecords,
} from '@/src/mobile/data/users';
import {
  formatVehicleStatusLabel,
  getVehicleStocks,
} from '@/src/mobile/data/vehicle-stocks';
import { toDate } from '@/src/mobile/data/shared';
import {
  getModuleAccess,
  getRoleLabel,
  getRoleRoute,
} from '@/src/mobile/navigation/access';
import { UserRole } from '@/src/mobile/types';
import { shareExport } from '@/src/mobile/utils/shareExport';

type ReportTab = 'audit' | 'release';
type ActivityKind = 'created' | 'updated' | 'released';
type ActivityModule =
  | 'users'
  | 'vehicle_stocks'
  | 'unit_allocations'
  | 'driver_allocation'
  | 'preparation'
  | 'test_drive'
  | 'release_history';
type ActivityKindFilter = 'all' | ActivityKind;
type ActivityModuleFilter = 'all_modules' | ActivityModule;
type ReleaseUnitFilter = 'all_units' | string;
type ReleasePeriodFilter = 'all_periods' | string;

type ActivityRecord = {
  id: string;
  timestamp: Date;
  module: ActivityModule;
  kind: ActivityKind;
  title: string;
  description: string;
};

const ALL_RELEASE_UNITS = 'all_units';
const ALL_RELEASE_PERIODS = 'all_periods';

const REPORT_SUBTITLES: Record<ReportTab, string> = {
  audit:
    'Review derived backend activity from real users, vehicle stocks, allocations, preparations, bookings, and release records.',
  release:
    'Review released unit history with customer, preparation, and assignment details.',
};

const ACTIVITY_KIND_LABELS: Record<ActivityKind, string> = {
  created: 'Created',
  updated: 'Updated',
  released: 'Released',
};

const ACTIVITY_MODULE_LABELS: Record<ActivityModule, string> = {
  users: 'Users',
  vehicle_stocks: 'Vehicle Stocks',
  unit_allocations: 'Unit Allocations',
  driver_allocation: 'Driver Allocation',
  preparation: 'Preparation',
  test_drive: 'Test Drive',
  release_history: 'Release History',
};

const ACTIVITY_KIND_FILTERS = [
  { label: 'All Activity', value: 'all' },
  { label: 'Created', value: 'created' },
  { label: 'Updated', value: 'updated' },
  { label: 'Released', value: 'released' },
] as const;

const ACTIVITY_MODULE_FILTERS = [
  { label: 'All Modules', value: 'all_modules' },
  { label: 'Users', value: 'users' },
  { label: 'Vehicle Stocks', value: 'vehicle_stocks' },
  { label: 'Unit Allocations', value: 'unit_allocations' },
  { label: 'Driver Allocation', value: 'driver_allocation' },
  { label: 'Preparation', value: 'preparation' },
  { label: 'Test Drive', value: 'test_drive' },
  { label: 'Release History', value: 'release_history' },
] as const;

const getActivityBadgeStatus = (kind: ActivityKind) => {
  switch (kind) {
    case 'created':
      return 'confirmed' as const;
    case 'updated':
      return 'active' as const;
    case 'released':
      return 'verified' as const;
    default:
      return 'inactive' as const;
  }
};

const formatActivityTimestamp = (value: Date) =>
  value.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

const getReleasePeriodValue = (value: Date) =>
  `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}`;

const formatReleasePeriodLabel = (value: string) => {
  const [year, month] = value.split('-').map(Number);

  return new Date(year, Math.max(month - 1, 0), 1).toLocaleDateString('en-US', {
    month: 'short',
    year: 'numeric',
  });
};

const buildActivityRecords = (): ActivityRecord[] => {
  const userRecords = getUserManagementRecords().map((record) => ({
    id: `user-${record.id}`,
    timestamp: record.createdAt,
    module: 'users' as const,
    kind: 'created' as const,
    title: `${record.firstName} ${record.lastName}`.trim(),
    description: `User account created as ${formatUserRoleLabel(record.role)}.`,
  }));

  const vehicleRecords = getVehicleStocks().map((record) => ({
    id: `vehicle-${record.id}`,
    timestamp: record.createdAt,
    module: 'vehicle_stocks' as const,
    kind: 'created' as const,
    title: `${record.unitName} ${record.variation}`.trim(),
    description: `Vehicle stock saved with status ${formatVehicleStatusLabel(record.status)}.`,
  }));

  const allocationRecords = getUnitAgentAllocations().map((record) => ({
    id: `allocation-${record.id}`,
    timestamp: record.createdAt,
    module: 'unit_allocations' as const,
    kind: 'created' as const,
    title: `${record.unitName} allocation`,
    description: `Assigned to ${record.salesAgentName} under ${record.managerName}. Status: ${formatAllocationStatusLabel(record.status)}.`,
  }));

  const driverAllocationRecords = getDriverAllocations().map((record) => ({
    id: `dispatch-${record.id}`,
    timestamp: record.createdAt,
    module: 'driver_allocation' as const,
    kind:
      record.status === 'completed' ? ('released' as const) : ('updated' as const),
    title: `${record.unitName} dispatch`,
    description: `${record.driverName} route from ${record.pickupLabel} to ${record.destinationLabel}. Status: ${formatDriverAllocationStatusLabel(record.status)}.`,
  }));

  const preparationRecords = getPreparationRecords().map((record) => ({
    id: `preparation-${record.id}`,
    timestamp: toDate(
      record.readyForReleaseAt ??
        record.completedAt ??
        record.approvedAt ??
        record.createdAt
    ),
    module: 'preparation' as const,
    kind:
      record.status === 'ready_for_release'
        ? ('released' as const)
        : ('updated' as const),
    title: `${record.unitName} preparation`,
    description: `${record.customerName} requested ${formatRequestedServices(record.requestedServices, record.customRequests)}. Current status: ${getPreparationStatusLabel(record.status)}.`,
  }));

  const testDriveRecords = getTestDriveBookings().map((record) => ({
    id: `test-drive-${record.id}`,
    timestamp: record.createdAt,
    module: 'test_drive' as const,
    kind:
      record.status === 'completed' ? ('released' as const) : ('created' as const),
    title: `${record.unitName} test drive`,
    description: `${record.customerName} booked ${formatTestDriveSchedule(record.scheduledDate, record.scheduledTime)}. Status: ${formatTestDriveStatusLabel(record.status)}.`,
  }));

  const releaseHistoryRecords = getReleaseHistoryRecords().map((record) => ({
    id: `release-${record.id}`,
    timestamp: record.releasedAt,
    module: 'release_history' as const,
    kind: 'released' as const,
    title: `${record.unitName} released`,
    description: `${record.assignedAgent} released this unit to ${record.customerName}.`,
  }));

  return [
    ...releaseHistoryRecords,
    ...preparationRecords,
    ...driverAllocationRecords,
    ...allocationRecords,
    ...testDriveRecords,
    ...vehicleRecords,
    ...userRecords,
  ].sort((left, right) => right.timestamp.getTime() - left.timestamp.getTime());
};

export default function ReportsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const role = user?.role ?? UserRole.ADMIN;
  const access = getModuleAccess(role, 'reports');
  const availableTabs = useMemo<ReportTab[]>(
    () => [
      ...(access.canViewAuditTrail ? ['audit' as const] : []),
      ...(access.canViewReleaseHistory ? ['release' as const] : []),
    ],
    [access.canViewAuditTrail, access.canViewReleaseHistory]
  );
  const [activeTab, setActiveTab] = useState<ReportTab>(availableTabs[0]);
  const [activitySearchValue, setActivitySearchValue] = useState('');
  const [releaseSearchValue, setReleaseSearchValue] = useState('');
  const [activityKindFilter, setActivityKindFilter] =
    useState<ActivityKindFilter>('all');
  const [activityModuleFilter, setActivityModuleFilter] =
    useState<ActivityModuleFilter>('all_modules');
  const [releaseUnitFilter, setReleaseUnitFilter] =
    useState<ReleaseUnitFilter>(ALL_RELEASE_UNITS);
  const [releasePeriodFilter, setReleasePeriodFilter] =
    useState<ReleasePeriodFilter>(ALL_RELEASE_PERIODS);

  useEffect(() => {
    if (!availableTabs.includes(activeTab)) {
      setActiveTab(availableTabs[0]);
    }
  }, [activeTab, availableTabs]);

  const activityRecords = useMemo(() => buildActivityRecords(), []);
  const releaseHistory = useMemo(() => getReleaseHistoryRecords(), []);

  const filteredActivity = useMemo(
    () =>
      activityRecords.filter((record) => {
        const query = activitySearchValue.trim().toLowerCase();
        const matchesSearch =
          !query ||
          record.title.toLowerCase().includes(query) ||
          record.description.toLowerCase().includes(query) ||
          ACTIVITY_KIND_LABELS[record.kind].toLowerCase().includes(query) ||
          ACTIVITY_MODULE_LABELS[record.module].toLowerCase().includes(query) ||
          formatActivityTimestamp(record.timestamp).toLowerCase().includes(query);
        const matchesKind =
          activityKindFilter === 'all' || record.kind === activityKindFilter;
        const matchesModule =
          activityModuleFilter === 'all_modules' ||
          record.module === activityModuleFilter;

        return matchesSearch && matchesKind && matchesModule;
      }),
    [activityKindFilter, activityModuleFilter, activityRecords, activitySearchValue]
  );

  const releaseUnitOptions = useMemo(
    () => [
      { label: 'All Units', value: ALL_RELEASE_UNITS },
      ...Array.from(new Set(releaseHistory.map((record) => record.unitName)))
        .sort((left, right) => left.localeCompare(right))
        .map((unitName) => ({
          label: unitName,
          value: unitName,
        })),
    ],
    [releaseHistory]
  );

  const releasePeriodOptions = useMemo(
    () => [
      { label: 'All Release Dates', value: ALL_RELEASE_PERIODS },
      ...Array.from(
        new Set(
          releaseHistory.map((record) => getReleasePeriodValue(record.releasedAt))
        )
      )
        .sort((left, right) => right.localeCompare(left))
        .map((period) => ({
          label: formatReleasePeriodLabel(period),
          value: period,
        })),
    ],
    [releaseHistory]
  );

  const filteredReleaseHistory = useMemo(
    () =>
      releaseHistory.filter((record) => {
        const query = releaseSearchValue.trim().toLowerCase();
        const matchesSearch =
          !query ||
          record.unitName.toLowerCase().includes(query) ||
          record.variation.toLowerCase().includes(query) ||
          record.conductionNumber.toLowerCase().includes(query) ||
          record.bodyColor.toLowerCase().includes(query) ||
          record.assignedAgent.toLowerCase().includes(query) ||
          record.customerName.toLowerCase().includes(query) ||
          record.customerPhone.toLowerCase().includes(query) ||
          formatReleaseDateTime(record.releasedAt).toLowerCase().includes(query);
        const matchesUnit =
          releaseUnitFilter === ALL_RELEASE_UNITS ||
          record.unitName === releaseUnitFilter;
        const matchesPeriod =
          releasePeriodFilter === ALL_RELEASE_PERIODS ||
          getReleasePeriodValue(record.releasedAt) === releasePeriodFilter;

        return matchesSearch && matchesUnit && matchesPeriod;
      }),
    [releaseHistory, releasePeriodFilter, releaseSearchValue, releaseUnitFilter]
  );

  const handleExportActivity = async () => {
    const message = [
      'Activity Export',
      `Scope: ${getRoleLabel(role)}`,
      `Kind Filter: ${
        activityKindFilter === 'all'
          ? 'All Activity'
          : ACTIVITY_KIND_LABELS[activityKindFilter]
      }`,
      `Module Filter: ${
        activityModuleFilter === 'all_modules'
          ? 'All Modules'
          : ACTIVITY_MODULE_LABELS[activityModuleFilter]
      }`,
      `Search: ${activitySearchValue || 'None'}`,
      `Records: ${filteredActivity.length}`,
      '',
      ...(filteredActivity.length
        ? filteredActivity.map(
            (record) =>
              `${formatActivityTimestamp(record.timestamp)} | ${ACTIVITY_KIND_LABELS[record.kind]} | ${ACTIVITY_MODULE_LABELS[record.module]} | ${record.title} | ${record.description}`
          )
        : ['No matching backend activity records.']),
    ].join('\n');

    await shareExport({
      title: 'Activity Export',
      message,
      errorMessage: 'The backend activity records could not be exported right now.',
    });
  };

  const handleExportReleaseHistory = async () => {
    const message = [
      'Release History Export',
      `Scope: ${getRoleLabel(role)}`,
      `Unit Filter: ${
        releaseUnitFilter === ALL_RELEASE_UNITS ? 'All Units' : releaseUnitFilter
      }`,
      `Release Date Filter: ${
        releasePeriodFilter === ALL_RELEASE_PERIODS
          ? 'All Release Dates'
          : formatReleasePeriodLabel(releasePeriodFilter)
      }`,
      `Search: ${releaseSearchValue || 'None'}`,
      `Records: ${filteredReleaseHistory.length}`,
      '',
      ...(filteredReleaseHistory.length
        ? filteredReleaseHistory.map(
            (record) =>
              `${record.unitName} | ${record.conductionNumber} | ${formatReleaseDateTime(record.releasedAt)} | Agent ${record.assignedAgent} | Customer ${record.customerName}`
          )
        : ['No matching release history records.']),
    ].join('\n');

    await shareExport({
      title: 'Release History Export',
      message,
      errorMessage:
        'The release history records could not be exported right now.',
    });
  };

  const handleExportRelease = async (release: ReleaseHistoryRecord) => {
    await shareExport({
      title: getReleaseHistoryExportFileName(release),
      message: buildReleaseHistoryExportSummary(release),
      errorMessage: 'The release history record could not be exported right now.',
    });
  };

  const renderActivityTab = () => (
    <>
      <FilterSummaryCard
        title="Activity View"
        value={`${filteredActivity.length} of ${activityRecords.length} backend activity records shown`}
        iconName="shield-checkmark-outline"
        items={[
          {
            label: 'Kind Filter',
            value:
              activityKindFilter === 'all'
                ? 'All Activity'
                : ACTIVITY_KIND_LABELS[activityKindFilter],
            dotColor:
              activityKindFilter === 'released'
                ? theme.colors.success
                : activityKindFilter === 'updated'
                  ? theme.colors.info
                  : theme.colors.primary,
          },
          {
            label: 'Module Filter',
            value:
              activityModuleFilter === 'all_modules'
                ? 'All Modules'
                : ACTIVITY_MODULE_LABELS[activityModuleFilter],
            dotColor: theme.colors.textSubtle,
          },
          {
            label: 'Data Source',
            value: 'Derived from current backend records',
            iconName: 'server-outline',
            iconColor: theme.colors.textSubtle,
          },
        ]}
        style={styles.summaryCard}
      />

      <View style={styles.list}>
        {filteredActivity.length ? (
          filteredActivity.map((record) => (
            <Card key={record.id} style={styles.card} variant="elevated" padding="large">
              <View style={styles.cardTop}>
                <View style={styles.copy}>
                  <Text style={styles.eyebrow}>
                    {ACTIVITY_MODULE_LABELS[record.module]}
                  </Text>
                  <Text style={styles.title}>{record.title}</Text>
                  <Text style={styles.subtitle}>{record.description}</Text>
                </View>

                <StatusBadge
                  status={getActivityBadgeStatus(record.kind)}
                  label={ACTIVITY_KIND_LABELS[record.kind]}
                  size="small"
                />
              </View>

              <View style={styles.metaRow}>
                <View style={styles.metaChip}>
                  <Ionicons
                    name="time-outline"
                    size={14}
                    color={theme.colors.primaryDark}
                  />
                  <Text style={styles.metaChipText}>
                    {formatActivityTimestamp(record.timestamp)}
                  </Text>
                </View>
              </View>
            </Card>
          ))
        ) : (
          <EmptyState
            title="No backend activity records found"
            description="Try another search term or change the selected activity and module filters."
          />
        )}
      </View>
    </>
  );

  const renderReleaseTab = () => (
    <>
      <FilterSummaryCard
        title="Release View"
        value={`${filteredReleaseHistory.length} of ${releaseHistory.length} release records shown`}
        iconName="archive-outline"
        items={[
          {
            label: 'Unit Filter',
            value:
              releaseUnitFilter === ALL_RELEASE_UNITS
                ? 'All Units'
                : releaseUnitFilter,
            dotColor:
              releaseUnitFilter === ALL_RELEASE_UNITS
                ? theme.colors.textSubtle
                : theme.colors.primary,
          },
          {
            label: 'Release Date',
            value:
              releasePeriodFilter === ALL_RELEASE_PERIODS
                ? 'All Release Dates'
                : formatReleasePeriodLabel(releasePeriodFilter),
            dotColor:
              releasePeriodFilter === ALL_RELEASE_PERIODS
                ? theme.colors.info
                : theme.colors.success,
          },
          {
            label: 'Latest Release',
            value: releaseHistory[0]
              ? formatReleaseDateTime(releaseHistory[0].releasedAt)
              : 'No records',
            iconName: 'time-outline',
            iconColor: theme.colors.textSubtle,
          },
        ]}
        style={styles.summaryCard}
      />

      <View style={styles.list}>
        {filteredReleaseHistory.length ? (
          filteredReleaseHistory.map((release) => (
            <Card
              key={release.id}
              style={styles.releaseCard}
              variant="elevated"
              padding="large"
            >
              <TouchableOpacity
                activeOpacity={0.88}
                onPress={() =>
                  router.push({
                    pathname: getRoleRoute(role, 'release-history-detail'),
                    params: {
                      releaseId: release.id,
                    },
                  })
                }
              >
                <View style={styles.cardTop}>
                  <View style={styles.copy}>
                    <Text style={styles.title}>{release.unitName}</Text>
                    <Text style={styles.subtitle}>{release.variation}</Text>
                  </View>

                  <StatusBadge
                    status="completed"
                    label={release.statusLabel}
                    size="small"
                  />
                </View>

                <Text style={styles.releaseMeta}>
                  Conduction No.: {release.conductionNumber}
                </Text>
                <Text style={styles.releaseMeta}>
                  Assigned Agent: {release.assignedAgent}
                </Text>
                <Text style={styles.releaseMeta}>
                  Release Date: {formatReleaseDateTime(release.releasedAt)}
                </Text>
              </TouchableOpacity>

              {access.canExportPdf ? (
                <View style={styles.releaseActions}>
                  <Button
                    title="Export"
                    size="small"
                    variant="outline"
                    icon={
                      <Ionicons
                        name="download-outline"
                        size={16}
                        color={theme.colors.text}
                      />
                    }
                    onPress={() => handleExportRelease(release)}
                  />
                </View>
              ) : null}
            </Card>
          ))
        ) : (
          <EmptyState
            title="No release history records found"
            description="Try another search term or change the selected unit and release date filters."
          />
        )}
      </View>
    </>
  );

  const tabLabels: Record<ReportTab, string> = {
    audit: 'Activity',
    release: 'Release History',
  };

  return (
    <WorkspaceScaffold
      eyebrow={getRoleLabel(role)}
      title={tabLabels[activeTab]}
      subtitle={REPORT_SUBTITLES[activeTab]}
      toolbar={
        <View style={styles.toolbarStack}>
          {availableTabs.length > 1 ? (
            <SegmentedControl
              options={availableTabs.map((tab) => ({
                label: tabLabels[tab],
                value: tab,
              }))}
              value={activeTab}
              onChange={(value) => setActiveTab(value as ReportTab)}
              style={styles.tabs}
            />
          ) : null}

          {activeTab === 'audit' ? (
            <SearchFiltersBar
              searchValue={activitySearchValue}
              onSearchChange={setActivitySearchValue}
              searchPlaceholder="Search module, title, timestamp, or description"
              filters={ACTIVITY_KIND_FILTERS.map((item) => ({
                label: item.label,
                value: item.value,
              }))}
              activeFilter={activityKindFilter}
              onFilterChange={(value) =>
                setActivityKindFilter(value as ActivityKindFilter)
              }
              secondaryFilters={ACTIVITY_MODULE_FILTERS.map((item) => ({
                label: item.label,
                value: item.value,
              }))}
              activeSecondaryFilter={activityModuleFilter}
              onSecondaryFilterChange={(value) =>
                setActivityModuleFilter(value as ActivityModuleFilter)
              }
              onClearFilters={() => {
                setActivitySearchValue('');
                setActivityKindFilter('all');
                setActivityModuleFilter('all_modules');
              }}
              actions={
                access.canExportPdf
                  ? [
                      {
                        key: 'export-activity',
                        iconName: 'download-outline',
                        accessibilityLabel: 'Export backend activity',
                        onPress: handleExportActivity,
                      },
                    ]
                  : undefined
              }
            />
          ) : (
            <SearchFiltersBar
              searchValue={releaseSearchValue}
              onSearchChange={setReleaseSearchValue}
              searchPlaceholder="Search unit, conduction number, agent, customer, or release date"
              filters={releaseUnitOptions}
              activeFilter={releaseUnitFilter}
              onFilterChange={(value) => setReleaseUnitFilter(value)}
              secondaryFilters={releasePeriodOptions}
              activeSecondaryFilter={releasePeriodFilter}
              onSecondaryFilterChange={(value) => setReleasePeriodFilter(value)}
              onClearFilters={() => {
                setReleaseSearchValue('');
                setReleaseUnitFilter(ALL_RELEASE_UNITS);
                setReleasePeriodFilter(ALL_RELEASE_PERIODS);
              }}
              actions={
                access.canExportPdf
                  ? [
                      {
                        key: 'export-release-history',
                        iconName: 'download-outline',
                        accessibilityLabel: 'Export release history',
                        onPress: handleExportReleaseHistory,
                      },
                    ]
                  : undefined
              }
            />
          )}
        </View>
      }
    >
      {activeTab === 'audit' ? renderActivityTab() : renderReleaseTab()}
    </WorkspaceScaffold>
  );
}

const styles = StyleSheet.create({
  toolbarStack: {
    gap: theme.spacing.base,
  },
  tabs: {
    marginBottom: theme.spacing.xs,
  },
  summaryCard: {
    marginBottom: theme.spacing.base,
  },
  list: {
    gap: theme.spacing.base,
  },
  card: {
    backgroundColor: theme.colors.white,
    borderColor: theme.colors.borderStrong,
  },
  releaseCard: {
    backgroundColor: theme.colors.white,
    borderColor: theme.colors.borderStrong,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: theme.spacing.base,
  },
  copy: {
    flex: 1,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    color: theme.colors.textSubtle,
    marginBottom: 4,
    fontFamily: theme.fonts.family.sans,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 4,
    fontFamily: theme.fonts.family.sans,
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 19,
    color: theme.colors.textMuted,
    fontFamily: theme.fonts.family.sans,
  },
  metaRow: {
    marginTop: theme.spacing.base,
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    alignSelf: 'flex-start',
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.primarySurface,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  metaChipText: {
    fontSize: 12,
    color: theme.colors.primaryDark,
    fontFamily: theme.fonts.family.sans,
  },
  releaseMeta: {
    fontSize: 13,
    color: theme.colors.text,
    marginTop: theme.spacing.xs,
    fontFamily: theme.fonts.family.sans,
  },
  releaseActions: {
    marginTop: theme.spacing.base,
    alignItems: 'flex-start',
  },
});
