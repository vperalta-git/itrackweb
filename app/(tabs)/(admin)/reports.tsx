import React, { useEffect, useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
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
  getAuthEventRecords,
  loadAuthEventRecords,
} from '@/src/mobile/data/auth-events';
import {
  formatDriverAllocationStatusLabel,
  getDriverAllocations,
  loadDriverAllocations,
} from '@/src/mobile/data/driver-allocation';
import {
  formatRequestedServices,
  getPreparationRecords,
  getPreparationStatusLabel,
  loadPreparationRecords,
} from '@/src/mobile/data/preparation';
import {
  formatReleaseDateTime,
  getReleaseHistoryExportFileName,
  getReleaseHistoryRecords,
  type ReleaseHistoryRecord,
} from '@/src/mobile/data/release-history';
import {
  formatTestDriveSchedule,
  formatTestDriveStatusLabel,
  getTestDriveBookings,
  loadTestDriveBookings,
} from '@/src/mobile/data/test-drive';
import {
  formatAllocationStatusLabel,
  getUnitAgentAllocations,
  loadUnitAgentAllocations,
} from '@/src/mobile/data/unit-agent-allocation';
import {
  formatUserRoleLabel,
  getUserManagementRecords,
  loadUserManagementRecords,
} from '@/src/mobile/data/users';
import {
  getUserAuditEventRecords,
  loadUserAuditEventRecords,
} from '@/src/mobile/data/user-audit-events';
import {
  formatVehicleStatusLabel,
  getVehicleStocks,
  loadVehicleStocks,
} from '@/src/mobile/data/vehicle-stocks';
import {
  getFirstValidDate,
  isDateValueValid,
} from '@/src/mobile/data/shared';
import {
  getModuleAccess,
  getRoleLabel,
  getRoleRoute,
} from '@/src/mobile/navigation/access';
import { UserRole } from '@/src/mobile/types';
import { shareExport } from '@/src/mobile/utils/shareExport';

type ReportTab = 'audit' | 'release';
type ActivityKind =
  | 'created'
  | 'updated'
  | 'released'
  | 'login'
  | 'logout'
  | 'deleted';
type ActivityModule =
  | 'authentication'
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
  name: string;
  title: string;
  description: string;
};

const ALL_RELEASE_UNITS = 'all_units';
const ALL_RELEASE_PERIODS = 'all_periods';
const ITEMS_PER_PAGE = 10;

const REPORT_SUBTITLES: Record<ReportTab, string> = {
  audit:
    'Review the derived audit trail from authentication, user lifecycle events, vehicle stocks, allocations, preparations, bookings, and release records.',
  release:
    'Review released unit history with customer, preparation, and assignment details.',
};

const ACTIVITY_KIND_LABELS: Record<ActivityKind, string> = {
  created: 'Created',
  updated: 'Updated',
  released: 'Released',
  login: 'Login',
  logout: 'Logout',
  deleted: 'Deleted',
};

const ACTIVITY_MODULE_LABELS: Record<ActivityModule, string> = {
  authentication: 'Authentication',
  users: 'Users',
  vehicle_stocks: 'Vehicle Stocks',
  unit_allocations: 'Unit Allocations',
  driver_allocation: 'Driver Allocation',
  preparation: 'Preparation',
  test_drive: 'Test Drive',
  release_history: 'Release History',
};

const ACTIVITY_KIND_FILTERS = [
  { label: 'All Entries', value: 'all' },
  { label: 'Created', value: 'created' },
  { label: 'Updated', value: 'updated' },
  { label: 'Released', value: 'released' },
  { label: 'Login', value: 'login' },
  { label: 'Logout', value: 'logout' },
  { label: 'Deleted', value: 'deleted' },
] as const;

const ACTIVITY_MODULE_FILTERS = [
  { label: 'All Modules', value: 'all_modules' },
  { label: 'Authentication', value: 'authentication' },
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
    case 'login':
      return 'confirmed' as const;
    case 'logout':
      return 'inactive' as const;
    case 'deleted':
      return 'cancelled' as const;
    default:
      return 'inactive' as const;
  }
};

const formatActivityTimestamp = (value: Date) =>
  isDateValueValid(value)
    ? value.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      })
    : 'Unavailable';

const getReleasePeriodValue = (value: Date) =>
  isDateValueValid(value)
    ? `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}`
    : 'unknown-period';

const formatReleasePeriodLabel = (value: string) => {
  if (value === 'unknown-period') {
    return 'Unknown Release Date';
  }

  const [year, month] = value.split('-').map(Number);

  if (!Number.isFinite(year) || !Number.isFinite(month)) {
    return 'Unknown Release Date';
  }

  return new Date(year, Math.max(month - 1, 0), 1).toLocaleDateString('en-US', {
    month: 'short',
    year: 'numeric',
  });
};

const buildReleasePreparationSummary = (record: ReleaseHistoryRecord) =>
  record.preparationDone.length
    ? record.preparationDone
        .map(
          (item, index) =>
            `${index + 1}. ${item.title} (${formatReleaseDateTime(
              item.completedAt
            )})`
        )
        .join('\n')
    : 'No preparation items recorded.';

const buildReleaseTimelineSummary = (record: ReleaseHistoryRecord) =>
  record.timeline
    .map(
      (item) =>
        `${formatReleaseDateTime(item.timestamp)}\n${item.title}\n${item.description}`
    )
    .join('\n\n');

const getSortableActivityTime = (value: Date) =>
  Number.isFinite(value.getTime()) ? value.getTime() : 0;

const formatActivityName = (value: string | null | undefined) =>
  String(value ?? '').trim() || 'Unavailable';

const formatActivityRoleLabel = (value?: UserRole | null) =>
  value ? formatUserRoleLabel(value) : 'User';

const buildActivityRecords = (): ActivityRecord[] => {
  const authRecords = getAuthEventRecords().map((record) => ({
    id: `auth-${record.id}`,
    timestamp: record.createdAt,
    module: 'authentication' as const,
    kind: record.eventType,
    name: formatActivityName(record.name || record.email),
    title:
      record.eventType === 'login'
        ? 'User signed in'
        : 'User signed out',
    description: `${record.email} ${record.eventType === 'login' ? 'signed in' : 'signed out'} as ${formatActivityRoleLabel(record.role)}.`,
  }));

  const deletedUserRecords = getUserAuditEventRecords().map((record) => ({
    id: `user-audit-${record.id}`,
    timestamp: record.createdAt,
    module: 'users' as const,
    kind: 'deleted' as const,
    name: formatActivityName(record.name),
    title: 'User account deleted',
    description: `${record.email} was removed. Previous role: ${formatUserRoleLabel(record.role)}.`,
  }));

  const userRecords = getUserManagementRecords().map((record) => ({
    id: `user-${record.id}`,
    timestamp: record.createdAt,
    module: 'users' as const,
    kind: 'created' as const,
    name: formatActivityName(`${record.firstName} ${record.lastName}`),
    title: `${record.firstName} ${record.lastName}`.trim(),
    description: `User account created as ${formatUserRoleLabel(record.role)}.`,
  }));

  const vehicleRecords = getVehicleStocks().map((record) => ({
    id: `vehicle-${record.id}`,
    timestamp: record.createdAt,
    module: 'vehicle_stocks' as const,
    kind: 'created' as const,
    name: formatActivityName(record.conductionNumber || record.unitName),
    title: `${record.unitName} ${record.variation}`.trim(),
    description: `Vehicle stock saved with status ${formatVehicleStatusLabel(record.status)}.`,
  }));

  const allocationRecords = getUnitAgentAllocations().map((record) => ({
    id: `allocation-${record.id}`,
    timestamp: record.createdAt,
    module: 'unit_allocations' as const,
    kind: 'created' as const,
    name: formatActivityName(record.salesAgentName || record.managerName),
    title: `${record.unitName} allocation`,
    description: `Assigned to ${record.salesAgentName} under ${record.managerName}. Status: ${formatAllocationStatusLabel(record.status)}.`,
  }));

  const driverAllocationRecords = getDriverAllocations().map((record) => ({
    id: `dispatch-${record.id}`,
    timestamp: record.createdAt,
    module: 'driver_allocation' as const,
    kind:
      record.status === 'completed' ? ('released' as const) : ('updated' as const),
    name: formatActivityName(record.driverName),
    title: `${record.unitName} dispatch`,
    description: `${record.driverName} route from ${record.pickupLabel} to ${record.destinationLabel}. Status: ${formatDriverAllocationStatusLabel(record.status)}.`,
  }));

  const preparationRecords = getPreparationRecords().map((record) => ({
    id: `preparation-${record.id}`,
    timestamp: getFirstValidDate([
      record.completedAt,
      record.readyForReleaseAt,
      record.approvedAt,
      record.createdAt,
    ]),
    module: 'preparation' as const,
    kind:
      record.status === 'completed'
        ? ('released' as const)
        : ('updated' as const),
    name: formatActivityName(
      record.approvedByName || record.requestedByName || record.customerName
    ),
    title: `${record.unitName} preparation`,
    description: `${record.customerName} requested ${formatRequestedServices(record.requestedServices, record.customRequests)}. Current status: ${getPreparationStatusLabel(record.status)}.`,
  }));

  const testDriveRecords = getTestDriveBookings().map((record) => ({
    id: `test-drive-${record.id}`,
    timestamp: record.createdAt,
    module: 'test_drive' as const,
    kind:
      record.status === 'completed' ? ('released' as const) : ('created' as const),
    name: formatActivityName(record.customerName),
    title: `${record.unitName} test drive`,
    description: `${record.customerName} booked ${formatTestDriveSchedule(record.scheduledDate, record.scheduledTime)}. Status: ${formatTestDriveStatusLabel(record.status)}.`,
  }));

  const releaseHistoryRecords = getReleaseHistoryRecords().map((record) => ({
    id: `release-${record.id}`,
    timestamp: record.releasedAt,
    module: 'release_history' as const,
    kind: 'released' as const,
    name: formatActivityName(record.assignedAgent),
    title: `${record.unitName} released`,
    description: `${record.assignedAgent} released this unit to ${record.customerName}.`,
  }));

  return [
    ...authRecords,
    ...deletedUserRecords,
    ...releaseHistoryRecords,
    ...preparationRecords,
    ...driverAllocationRecords,
    ...allocationRecords,
    ...testDriveRecords,
    ...vehicleRecords,
    ...userRecords,
  ].sort(
    (left, right) =>
      getSortableActivityTime(right.timestamp) -
      getSortableActivityTime(left.timestamp)
  );
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
  const [activityPage, setActivityPage] = useState(1);
  const [releasePage, setReleasePage] = useState(1);
  const [refreshing, setRefreshing] = useState(false);
  const [dataVersion, setDataVersion] = useState(0);

  useEffect(() => {
    if (!availableTabs.includes(activeTab)) {
      setActiveTab(availableTabs[0]);
    }
  }, [activeTab, availableTabs]);

  const activityRecords = useMemo(() => buildActivityRecords(), [dataVersion]);
  const releaseHistory = useMemo(() => getReleaseHistoryRecords(), [dataVersion]);

  const handleRefresh = async () => {
    setRefreshing(true);

    try {
      await Promise.all([
        loadAuthEventRecords(),
        loadUserAuditEventRecords(),
        loadUserManagementRecords(),
        loadVehicleStocks(),
        loadUnitAgentAllocations(),
        loadDriverAllocations(),
        loadPreparationRecords(),
        loadTestDriveBookings(),
      ]);
      setDataVersion((current) => current + 1);
    } catch (error) {
      setDataVersion((current) => current + 1);
      Alert.alert(
        'Unable to refresh reports',
        error instanceof Error
          ? error.message
          : 'The latest audit trail and release history data could not be loaded right now.'
      );
    } finally {
      setRefreshing(false);
    }
  };

  const filteredActivity = useMemo(
    () =>
      activityRecords.filter((record) => {
        const query = activitySearchValue.trim().toLowerCase();
        const matchesSearch =
          !query ||
          record.name.toLowerCase().includes(query) ||
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
  const activityTotalPages = Math.max(
    1,
    Math.ceil(filteredActivity.length / ITEMS_PER_PAGE)
  );
  const paginatedActivity = useMemo(() => {
    const startIndex = (activityPage - 1) * ITEMS_PER_PAGE;
    return filteredActivity.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [activityPage, filteredActivity]);
  const activityPaginationRangeLabel = useMemo(() => {
    if (!filteredActivity.length) {
      return 'Showing 0 of 0';
    }

    const start = (activityPage - 1) * ITEMS_PER_PAGE + 1;
    const end = Math.min(activityPage * ITEMS_PER_PAGE, filteredActivity.length);

    return `Showing ${start}-${end} of ${filteredActivity.length}`;
  }, [activityPage, filteredActivity]);

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
  const releaseTotalPages = Math.max(
    1,
    Math.ceil(filteredReleaseHistory.length / ITEMS_PER_PAGE)
  );
  const paginatedReleaseHistory = useMemo(() => {
    const startIndex = (releasePage - 1) * ITEMS_PER_PAGE;
    return filteredReleaseHistory.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredReleaseHistory, releasePage]);
  const releasePaginationRangeLabel = useMemo(() => {
    if (!filteredReleaseHistory.length) {
      return 'Showing 0 of 0';
    }

    const start = (releasePage - 1) * ITEMS_PER_PAGE + 1;
    const end = Math.min(
      releasePage * ITEMS_PER_PAGE,
      filteredReleaseHistory.length
    );

    return `Showing ${start}-${end} of ${filteredReleaseHistory.length}`;
  }, [filteredReleaseHistory, releasePage]);

  useEffect(() => {
    setActivityPage(1);
  }, [
    activityKindFilter,
    activityModuleFilter,
    activitySearchValue,
    dataVersion,
  ]);

  useEffect(() => {
    if (activityPage > activityTotalPages) {
      setActivityPage(activityTotalPages);
    }
  }, [activityPage, activityTotalPages]);

  useEffect(() => {
    setReleasePage(1);
  }, [dataVersion, releasePeriodFilter, releaseSearchValue, releaseUnitFilter]);

  useEffect(() => {
    if (releasePage > releaseTotalPages) {
      setReleasePage(releaseTotalPages);
    }
  }, [releasePage, releaseTotalPages]);

  const handleExportActivity = async () => {
    await shareExport({
      title: 'Audit Trail Report',
      subtitle: 'Derived audit trail from current operational, authentication, and user lifecycle records',
      metadata: [
        { label: 'Scope', value: getRoleLabel(role) },
        {
          label: 'Kind Filter',
          value:
            activityKindFilter === 'all'
              ? 'All Entries'
              : ACTIVITY_KIND_LABELS[activityKindFilter],
        },
        {
          label: 'Module Filter',
          value:
            activityModuleFilter === 'all_modules'
              ? 'All Modules'
              : ACTIVITY_MODULE_LABELS[activityModuleFilter],
        },
        { label: 'Search', value: activitySearchValue || 'None' },
        { label: 'Records', value: String(filteredActivity.length) },
      ],
      columns: [
        {
          header: 'Timestamp',
          value: (record) => formatActivityTimestamp(record.timestamp),
        },
        {
          header: 'Entry Type',
          value: (record) => ACTIVITY_KIND_LABELS[record.kind],
        },
        {
          header: 'Module',
          value: (record) => ACTIVITY_MODULE_LABELS[record.module],
        },
        { header: 'Name', value: (record) => record.name },
        { header: 'Title', value: (record) => record.title },
        { header: 'Description', value: (record) => record.description },
      ],
      rows: filteredActivity,
      emptyStateMessage: 'No matching audit trail records.',
      errorMessage: 'The audit trail records could not be exported right now.',
    });
  };

  const handleExportReleaseHistory = async () => {
    await shareExport({
      title: 'Release History Report',
      subtitle:
        'Complete unit history from backend preparation and release records',
      metadata: [
        { label: 'Scope', value: getRoleLabel(role) },
        {
          label: 'Unit Filter',
          value:
            releaseUnitFilter === ALL_RELEASE_UNITS
              ? 'All Units'
              : releaseUnitFilter,
        },
        {
          label: 'Release Date Filter',
          value:
            releasePeriodFilter === ALL_RELEASE_PERIODS
              ? 'All Release Dates'
              : formatReleasePeriodLabel(releasePeriodFilter),
        },
        { label: 'Search', value: releaseSearchValue || 'None' },
        { label: 'Records', value: String(filteredReleaseHistory.length) },
      ],
      layout: 'cards',
      recordTitle: (record) => `${record.conductionNumber} - ${record.unitName}`,
      recordSubtitle: (record) => `${record.variation} - ${record.bodyColor}`,
      columns: [
        {
          header: 'Vehicle Added',
          value: (record) => formatReleaseDateTime(record.addedAt),
        },
        {
          header: 'Conduction Number',
          value: (record) => record.conductionNumber,
        },
        {
          header: 'Unit Details',
          value: (record) =>
            `${record.unitName}\n${record.variation}\n${record.bodyColor}`,
        },
        {
          header: 'Delivery Pickup',
          value: (record) => formatReleaseDateTime(record.pickupAt),
        },
        {
          header: 'Preparation Done',
          value: (record) => buildReleasePreparationSummary(record),
        },
        {
          header: 'Agent Assigned',
          value: (record) =>
            `${record.assignedAgent}\n${formatReleaseDateTime(record.assignedDate)}`,
        },
        {
          header: 'Customer',
          value: (record) =>
            `${record.customerName}\n${record.customerPhone}`,
        },
        {
          header: 'Date Released',
          value: (record) => formatReleaseDateTime(record.releasedAt),
        },
        {
          header: 'History',
          value: (record) => buildReleaseTimelineSummary(record),
          spanFull: true,
        },
      ],
      rows: filteredReleaseHistory,
      emptyStateMessage: 'No matching release history records.',
      errorMessage:
        'The release history records could not be exported right now.',
    });
  };

  const handleExportRelease = async (release: ReleaseHistoryRecord) => {
    await shareExport({
      title: 'Release History Report',
      subtitle:
        'Complete unit history from backend preparation and release records',
      filename: getReleaseHistoryExportFileName(release),
      metadata: [
        { label: 'Scope', value: getRoleLabel(role) },
        { label: 'Record', value: release.conductionNumber },
        { label: 'Status', value: release.statusLabel },
        { label: 'Released', value: formatReleaseDateTime(release.releasedAt) },
      ],
      layout: 'cards',
      recordTitle: (record) => `${record.conductionNumber} - ${record.unitName}`,
      recordSubtitle: (record) => `${record.variation} - ${record.bodyColor}`,
      columns: [
        {
          header: 'Vehicle Added',
          value: (record) => formatReleaseDateTime(record.addedAt),
        },
        {
          header: 'Conduction Number',
          value: (record) => record.conductionNumber,
        },
        {
          header: 'Unit Details',
          value: (record) =>
            `${record.unitName}\n${record.variation}\n${record.bodyColor}`,
        },
        {
          header: 'Delivery Pickup',
          value: (record) => formatReleaseDateTime(record.pickupAt),
        },
        {
          header: 'Preparation Done',
          value: (record) => buildReleasePreparationSummary(record),
        },
        {
          header: 'Agent Assigned',
          value: (record) =>
            `${record.assignedAgent}\n${formatReleaseDateTime(record.assignedDate)}`,
        },
        {
          header: 'Customer',
          value: (record) =>
            `${record.customerName}\n${record.customerPhone}`,
        },
        {
          header: 'Date Released',
          value: (record) => formatReleaseDateTime(record.releasedAt),
        },
        {
          header: 'History',
          value: (record) => buildReleaseTimelineSummary(record),
          spanFull: true,
        },
      ],
      rows: [release],
      errorMessage: 'The release history record could not be exported right now.',
    });
  };

  const renderActivityTab = () => (
    <>
      <FilterSummaryCard
        title="Audit Trail View"
        value={`${filteredActivity.length} of ${activityRecords.length} audit trail records shown`}
        iconName="shield-checkmark-outline"
        items={[
          {
            label: 'Kind Filter',
            value:
              activityKindFilter === 'all'
                ? 'All Entries'
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
            value: 'Backend records, authentication events, and saved user lifecycle events',
            iconName: 'server-outline',
            iconColor: theme.colors.textSubtle,
          },
        ]}
        style={styles.summaryCard}
      />

      <View style={styles.list}>
        {filteredActivity.length ? (
          paginatedActivity.map((record) => (
            <Card key={record.id} style={styles.card} variant="elevated" padding="large">
              <View style={styles.cardTop}>
                <View style={styles.copy}>
                  <Text style={styles.eyebrow}>
                    {ACTIVITY_MODULE_LABELS[record.module]}
                  </Text>
                  <Text style={styles.title}>{record.title}</Text>
                  <Text style={styles.detailLine}>Name: {record.name}</Text>
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
            title="No audit trail records found"
            description="Try another search term or change the selected entry and module filters."
          />
        )}

        {filteredActivity.length ? (
          <View style={styles.paginationWrap}>
            <View style={styles.paginationSummary}>
              <Text style={styles.paginationTitle}>Pagination</Text>
              <Text style={styles.paginationText}>
                {activityPaginationRangeLabel} - {ITEMS_PER_PAGE} items per page
              </Text>
            </View>

            <View style={styles.paginationControls}>
              <TouchableOpacity
                style={[
                  styles.paginationButton,
                  activityPage === 1 ? styles.paginationButtonDisabled : null,
                ]}
                activeOpacity={0.88}
                disabled={activityPage === 1}
                onPress={() => setActivityPage((page) => Math.max(1, page - 1))}
              >
                <Ionicons
                  name="chevron-back-outline"
                  size={16}
                  color={
                    activityPage === 1
                      ? theme.colors.textSubtle
                      : theme.colors.text
                  }
                />
              </TouchableOpacity>

              <View style={styles.paginationIndicator}>
                <Text style={styles.paginationIndicatorText}>
                  Page {activityPage} of {activityTotalPages}
                </Text>
              </View>

              <TouchableOpacity
                style={[
                  styles.paginationButton,
                  activityPage === activityTotalPages
                    ? styles.paginationButtonDisabled
                    : styles.paginationButtonPrimary,
                ]}
                activeOpacity={0.88}
                disabled={activityPage === activityTotalPages}
                onPress={() =>
                  setActivityPage((page) =>
                    Math.min(activityTotalPages, page + 1)
                  )
                }
              >
                <Ionicons
                  name="chevron-forward-outline"
                  size={16}
                  color={
                    activityPage === activityTotalPages
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
          paginatedReleaseHistory.map((release) => (
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

        {filteredReleaseHistory.length ? (
          <View style={styles.paginationWrap}>
            <View style={styles.paginationSummary}>
              <Text style={styles.paginationTitle}>Pagination</Text>
              <Text style={styles.paginationText}>
                {releasePaginationRangeLabel} - {ITEMS_PER_PAGE} items per page
              </Text>
            </View>

            <View style={styles.paginationControls}>
              <TouchableOpacity
                style={[
                  styles.paginationButton,
                  releasePage === 1 ? styles.paginationButtonDisabled : null,
                ]}
                activeOpacity={0.88}
                disabled={releasePage === 1}
                onPress={() => setReleasePage((page) => Math.max(1, page - 1))}
              >
                <Ionicons
                  name="chevron-back-outline"
                  size={16}
                  color={
                    releasePage === 1
                      ? theme.colors.textSubtle
                      : theme.colors.text
                  }
                />
              </TouchableOpacity>

              <View style={styles.paginationIndicator}>
                <Text style={styles.paginationIndicatorText}>
                  Page {releasePage} of {releaseTotalPages}
                </Text>
              </View>

              <TouchableOpacity
                style={[
                  styles.paginationButton,
                  releasePage === releaseTotalPages
                    ? styles.paginationButtonDisabled
                    : styles.paginationButtonPrimary,
                ]}
                activeOpacity={0.88}
                disabled={releasePage === releaseTotalPages}
                onPress={() =>
                  setReleasePage((page) =>
                    Math.min(releaseTotalPages, page + 1)
                  )
                }
              >
                <Ionicons
                  name="chevron-forward-outline"
                  size={16}
                  color={
                    releasePage === releaseTotalPages
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
  );

  const tabLabels: Record<ReportTab, string> = {
    audit: 'Audit Trail',
    release: 'Release History',
  };

  return (
    <WorkspaceScaffold
      eyebrow={getRoleLabel(role)}
      title={tabLabels[activeTab]}
      subtitle={REPORT_SUBTITLES[activeTab]}
      refreshing={refreshing}
      onRefresh={handleRefresh}
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
              searchPlaceholder="Search module, name, entry, timestamp, or description"
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
                        accessibilityLabel: 'Export audit trail',
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
  detailLine: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 4,
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
