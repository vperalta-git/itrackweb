import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from 'expo-router';
import {
  Card,
  ProgressBar,
  StatusBadge,
  WorkspaceScaffold,
} from '@/src/mobile/components';
import { theme } from '@/src/mobile/constants/theme';
import { useAuth } from '@/src/mobile/context/AuthContext';
import {
  getDriverAllocations,
  type DriverAllocationRecord,
} from '@/src/mobile/data/driver-allocation';
import {
  getPreparationRecords,
  type PreparationRecord,
} from '@/src/mobile/data/preparation';
import { getReleaseHistoryRecords } from '@/src/mobile/data/release-history';
import {
  getUnitAgentAllocations,
  type UnitAgentAllocationRecord,
} from '@/src/mobile/data/unit-agent-allocation';
import {
  formatVehicleStatusLabel,
  getVehicleStocks,
} from '@/src/mobile/data/vehicle-stocks';
import { toDate } from '@/src/mobile/data/shared';
import { getRoleLabel } from '@/src/mobile/navigation/access';
import {
  AllocationStatus,
  PreparationStatus,
  UserRole,
  VehicleStatus,
} from '@/src/mobile/types';

type SummaryCard = {
  key: string;
  label: string;
  value: number;
  caption: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconTint: string;
  iconBackground: string;
};

type VehicleStatusOverviewItem = {
  label: string;
  value: number;
  percentage: number;
  color: string;
};

type CountItem = {
  label: string;
  value: number;
};

type AgentPerformanceItem = {
  name: string;
  managerName: string;
  allocations: number;
  released: number;
  active: number;
};

type TopSellingUnitItem = {
  unit: string;
  sold: number;
};

type DashboardScope = {
  scopeTitle?: string;
  scopeMessage?: string;
  unitIds: Set<string>;
};

const ACTIVE_SHIPMENT_STATUSES = new Set<AllocationStatus>([
  AllocationStatus.PENDING,
  AllocationStatus.ASSIGNED,
  AllocationStatus.IN_TRANSIT,
]);

const ACTIVE_PREPARATION_STATUSES = new Set<PreparationStatus>([
  PreparationStatus.PENDING,
  PreparationStatus.IN_DISPATCH,
]);

const VEHICLE_STATUS_ORDER: VehicleStatus[] = [
  VehicleStatus.AVAILABLE,
  VehicleStatus.IN_STOCKYARD,
  VehicleStatus.IN_TRANSIT,
  VehicleStatus.UNDER_PREPARATION,
  VehicleStatus.MAINTENANCE,
  VehicleStatus.COMPLETED,
];

const getLatestMap = <T,>(
  items: T[],
  getKey: (item: T) => string,
  getDate: (item: T) => Date
) => {
  const latestItems = new Map<string, T>();

  [...items]
    .sort((left, right) => getDate(right).getTime() - getDate(left).getTime())
    .forEach((item) => {
      const key = getKey(item);

      if (!latestItems.has(key)) {
        latestItems.set(key, item);
      }
    });

  return latestItems;
};

const buildCountItems = <T,>(
  items: T[],
  getLabel: (item: T) => string
): CountItem[] => {
  const counts = new Map<string, number>();

  items.forEach((item) => {
    const label = getLabel(item).trim();

    if (!label) {
      return;
    }

    counts.set(label, (counts.get(label) ?? 0) + 1);
  });

  return [...counts.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((left, right) => right.value - left.value || left.label.localeCompare(right.label));
};

const getStatusColorForVehicle = (status: VehicleStatus) => {
  switch (status) {
    case VehicleStatus.AVAILABLE:
      return theme.colors.success;
    case VehicleStatus.IN_STOCKYARD:
      return theme.colors.inStockyard;
    case VehicleStatus.IN_TRANSIT:
      return theme.colors.info;
    case VehicleStatus.UNDER_PREPARATION:
      return theme.colors.warning;
    case VehicleStatus.MAINTENANCE:
      return theme.colors.primary;
    case VehicleStatus.COMPLETED:
      return theme.colors.textSubtle;
    default:
      return theme.colors.primary;
  }
};

const buildDashboardScope = (
  role: UserRole,
  userId: string | undefined,
  allocations: UnitAgentAllocationRecord[]
): DashboardScope => {
  if (!userId) {
    return {
      unitIds: new Set(allocations.map((allocation) => allocation.unitId)),
    };
  }

  if (role === UserRole.MANAGER) {
    const teamUnitIds = allocations
      .filter((allocation) => allocation.managerId === userId)
      .map((allocation) => allocation.unitId);

    return {
      scopeTitle: 'Scope',
      scopeMessage: 'Built from vehicles allocated to your team.',
      unitIds: new Set(teamUnitIds),
    };
  }

  if (role === UserRole.SALES_AGENT) {
    const assignedUnitIds = allocations
      .filter((allocation) => allocation.salesAgentId === userId)
      .map((allocation) => allocation.unitId);

    return {
      scopeTitle: 'Scope',
      scopeMessage: 'Built from vehicles allocated to you.',
      unitIds: new Set(assignedUnitIds),
    };
  }

  return {
    unitIds: new Set(allocations.map((allocation) => allocation.unitId)),
  };
};

export default function AdminDashboard() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const [refreshKey, setRefreshKey] = useState(0);
  const role = user?.role ?? UserRole.ADMIN;
  const roleLabel = getRoleLabel(role);
  const isAdminOrSupervisor =
    role === UserRole.ADMIN || role === UserRole.SUPERVISOR;
  const isManager = role === UserRole.MANAGER;
  const isSalesAgent = role === UserRole.SALES_AGENT;

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      setRefreshKey((current) => current + 1);
    });

    return unsubscribe;
  }, [navigation]);

  const dashboardData = useMemo(() => {
    const allocations = getUnitAgentAllocations();
    const scope = buildDashboardScope(role, user?.id, allocations);
    const allVehicles = getVehicleStocks();
    const scopedVehicles =
      isManager || isSalesAgent
        ? allVehicles.filter((vehicle) => scope.unitIds.has(vehicle.id))
        : allVehicles;
    const scopedConductionNumbers = new Set(
      scopedVehicles.map((vehicle) => vehicle.conductionNumber)
    );
    const scopedAllocations =
      isManager || isSalesAgent
        ? allocations.filter((allocation) => scope.unitIds.has(allocation.unitId))
        : allocations;
    const driverAllocations = getDriverAllocations().filter((record) =>
      isManager || isSalesAgent ? scope.unitIds.has(record.unitId) : true
    );
    const preparationRecords = getPreparationRecords().filter((record) =>
      isManager || isSalesAgent ? scope.unitIds.has(record.vehicleId) : true
    );
    const allReleaseHistory = getReleaseHistoryRecords();
    const scopedReleaseHistory =
      isManager || isSalesAgent
        ? allReleaseHistory.filter((record) =>
            scopedConductionNumbers.has(record.conductionNumber)
          )
        : allReleaseHistory;
    const latestDriverAllocations = getLatestMap(
      driverAllocations,
      (record) => record.unitId,
      (record) => record.createdAt
    );
    const latestPreparationRecords = getLatestMap(
      preparationRecords,
      (record) => record.vehicleId,
      (record) =>
        toDate(
          record.readyForReleaseAt ??
            record.completedAt ??
            record.approvedAt ??
            record.createdAt
        )
    );
    const latestScopedAllocations = getLatestMap(
      scopedAllocations,
      (record) => record.unitId,
      (record) => record.createdAt
    );
    const releasedConductionNumbers = new Set(
      scopedReleaseHistory.map((record) => record.conductionNumber)
    );
    const vehicleById = new Map(
      allVehicles.map((vehicle) => [vehicle.id, vehicle] as const)
    );

    const summaryCards: SummaryCard[] = [
      {
        key: 'total',
        label: 'Total Vehicles',
        value: scopedVehicles.length,
        caption: `${scopedReleaseHistory.length} released`,
        icon: 'car-sport-outline',
        iconTint: theme.colors.primary,
        iconBackground: theme.colors.primarySurface,
      },
      {
        key: 'available',
        label: 'Available',
        value: scopedVehicles.filter(
          (vehicle) => vehicle.status === VehicleStatus.AVAILABLE
        ).length,
        caption: 'Ready for assignment',
        icon: 'cube-outline',
        iconTint: theme.colors.success,
        iconBackground: theme.colors.successLight,
      },
      {
        key: 'shipment',
        label: 'Active Shipment',
        value: [...latestDriverAllocations.values()].filter((record) =>
          ACTIVE_SHIPMENT_STATUSES.has(record.status)
        ).length,
        caption: 'Driver bookings in progress',
        icon: 'swap-horizontal-outline',
        iconTint: theme.colors.info,
        iconBackground: theme.colors.infoLight,
      },
      {
        key: 'preparation',
        label: 'Active Preparation',
        value: [...latestPreparationRecords.values()].filter((record) =>
          ACTIVE_PREPARATION_STATUSES.has(record.status)
        ).length,
        caption: 'Preparation requests in flow',
        icon: 'construct-outline',
        iconTint: theme.colors.warning,
        iconBackground: theme.colors.warningLight,
      },
    ];

    const vehicleStatusOverview: VehicleStatusOverviewItem[] =
      VEHICLE_STATUS_ORDER.map((status) => {
        const value = scopedVehicles.filter(
          (vehicle) => vehicle.status === status
        ).length;
        const percentage =
          scopedVehicles.length > 0
            ? Math.round((value / scopedVehicles.length) * 100)
            : 0;

        return {
          label: formatVehicleStatusLabel(status),
          value,
          percentage,
          color: getStatusColorForVehicle(status),
        };
      });

    const modelDistribution = buildCountItems(
      scopedVehicles,
      (vehicle) => vehicle.unitName
    ).slice(0, 5);

    const agentPerformance = [...latestScopedAllocations.values()]
      .reduce<Map<string, AgentPerformanceItem>>((grouped, allocation) => {
        const agentName = allocation.salesAgentName.trim();

        if (!agentName) {
          return grouped;
        }

        const vehicle = vehicleById.get(allocation.unitId);
        const isReleased = vehicle
          ? releasedConductionNumbers.has(vehicle.conductionNumber)
          : false;
        const currentRecord = grouped.get(agentName) ?? {
          name: agentName,
          managerName: allocation.managerName,
          allocations: 0,
          released: 0,
          active: 0,
        };

        currentRecord.allocations += 1;

        if (isReleased) {
          currentRecord.released += 1;
        } else {
          currentRecord.active += 1;
        }

        grouped.set(agentName, currentRecord);
        return grouped;
      }, new Map())
      .values();

    const topSellingSource = isManager || isSalesAgent
      ? allReleaseHistory
      : scopedReleaseHistory;
    const topSellingUnits = topSellingSource
      .reduce<Map<string, TopSellingUnitItem>>((grouped, record) => {
        const unit = `${record.unitName} ${record.variation}`.trim();
        const currentRecord = grouped.get(unit) ?? {
          unit,
          sold: 0,
        };

        currentRecord.sold += 1;
        grouped.set(unit, currentRecord);
        return grouped;
      }, new Map())
      .values();

    return {
      scope,
      scopedVehicles,
      summaryCards,
      vehicleStatusOverview,
      modelDistribution,
      agentPerformance: [...agentPerformance]
        .sort(
          (left, right) =>
            right.allocations - left.allocations ||
            right.released - left.released ||
            left.name.localeCompare(right.name)
        )
        .slice(0, 5),
      topSellingUnits: [...topSellingUnits]
        .sort(
          (left, right) =>
            right.sold - left.sold || left.unit.localeCompare(right.unit)
        )
        .slice(0, 5),
      topSellingUsesCompanyScope: isManager || isSalesAgent,
    };
  }, [refreshKey, role, user?.id, isManager, isSalesAgent]);

  const fullName = user?.name?.trim() || 'User';
  const summaryCardRows = useMemo(() => {
    const rows: SummaryCard[][] = [];

    for (let index = 0; index < dashboardData.summaryCards.length; index += 2) {
      rows.push(dashboardData.summaryCards.slice(index, index + 2));
    }

    return rows;
  }, [dashboardData.summaryCards]);
  const maxModelCount = dashboardData.modelDistribution[0]?.value ?? 0;
  const maxTopSellingCount = dashboardData.topSellingUnits[0]?.sold ?? 0;

  return (
    <WorkspaceScaffold
      eyebrow={roleLabel}
      title="Dashboard"
      subtitle={`Live snapshot for ${fullName} using backend-backed records.`}
      scopeTitle={dashboardData.scope.scopeTitle}
      scopeMessage={dashboardData.scope.scopeMessage}
    >
      <View style={styles.summaryGrid}>
        {summaryCardRows.map((row, rowIndex) => (
          <View key={`summary-row-${rowIndex}`} style={styles.summaryRow}>
            {row.map((card) => (
              <Card key={card.key} style={styles.summaryCard} variant="elevated">
                <View style={styles.summaryHeader}>
                  <Text style={styles.summaryLabel}>{card.label}</Text>
                  <View
                    style={[
                      styles.summaryIconWrap,
                      { backgroundColor: card.iconBackground },
                    ]}
                  >
                    <Ionicons name={card.icon} size={18} color={card.iconTint} />
                  </View>
                </View>

                <Text style={styles.summaryValue}>{card.value}</Text>
                <Text style={styles.summaryCaption}>{card.caption}</Text>
              </Card>
            ))}

            {row.length === 1 ? <View style={styles.summaryCardSpacer} /> : null}
          </View>
        ))}
      </View>

      {isAdminOrSupervisor ? (
        <Card style={styles.panelCard}>
          <Text style={styles.panelTitle}>Vehicle Status Overview</Text>
          <Text style={styles.panelSubtitle}>
            Distribution of vehicles by current inventory status.
          </Text>

          <View style={styles.stack}>
            {dashboardData.vehicleStatusOverview.map((item) => (
              <View key={item.label} style={styles.analyticsItem}>
                <View style={styles.analyticsHeader}>
                  <Text style={styles.analyticsTitle}>{item.label}</Text>
                  <Text style={styles.analyticsValue}>
                    {item.value} ({item.percentage}%)
                  </Text>
                </View>

                <ProgressBar
                  progress={item.percentage}
                  color={item.color}
                  size="small"
                  showPercentage={false}
                />
              </View>
            ))}
          </View>
        </Card>
      ) : null}

      <Card style={styles.panelCard}>
        <Text style={styles.panelTitle}>Model Distribution</Text>
        <Text style={styles.panelSubtitle}>
          Inventory units grouped by model.
        </Text>

        <View style={styles.stack}>
          {dashboardData.modelDistribution.length ? (
            dashboardData.modelDistribution.map((item, index) => (
              <View key={item.label} style={styles.rankedAnalyticsItem}>
                <View style={styles.rankWrap}>
                  <Text style={styles.rankText}>{index + 1}</Text>
                </View>

                <View style={styles.rankedAnalyticsContent}>
                  <View style={styles.analyticsHeader}>
                    <Text style={styles.analyticsTitle}>{item.label}</Text>
                    <Text style={styles.analyticsValue}>{item.value} unit(s)</Text>
                  </View>

                  <ProgressBar
                    progress={
                      maxModelCount > 0
                        ? Math.round((item.value / maxModelCount) * 100)
                        : 0
                    }
                    size="small"
                    showPercentage={false}
                  />
                </View>
              </View>
            ))
          ) : (
            <Text style={styles.emptyCopy}>
              No model distribution data available.
            </Text>
          )}
        </View>
      </Card>

      {!isAdminOrSupervisor ? (
        <Card style={styles.panelCard}>
          <Text style={styles.panelTitle}>Top Selling Units</Text>
          <Text style={styles.panelSubtitle}>
            {dashboardData.topSellingUsesCompanyScope
              ? 'Company-wide released inventory grouped by unit and variation.'
              : 'Released inventory grouped by unit and variation.'}
          </Text>

          <View style={styles.stack}>
            {dashboardData.topSellingUnits.length ? (
              dashboardData.topSellingUnits.map((item, index) => (
                <View key={item.unit} style={styles.rankedAnalyticsItem}>
                  <View style={styles.rankWrap}>
                    <Text style={styles.rankText}>{index + 1}</Text>
                  </View>

                  <View style={styles.rankedAnalyticsContent}>
                    <View style={styles.analyticsHeader}>
                      <Text style={styles.analyticsTitle}>{item.unit}</Text>
                      <Text style={styles.analyticsValue}>{item.sold} sold</Text>
                    </View>

                    <ProgressBar
                      progress={
                        maxTopSellingCount > 0
                          ? Math.round((item.sold / maxTopSellingCount) * 100)
                          : 0
                      }
                      size="small"
                      showPercentage={false}
                    />
                  </View>
                </View>
              ))
            ) : (
              <Text style={styles.emptyCopy}>
                No released units available yet.
              </Text>
            )}
          </View>
        </Card>
      ) : null}

      {isAdminOrSupervisor || isManager ? (
        <Card style={styles.panelCard}>
          <Text style={styles.panelTitle}>Agent Performance</Text>
          <Text style={styles.panelSubtitle}>
            {isManager
              ? 'Performance across sales agents within your scope.'
              : 'Performance across all sales agents.'}
          </Text>

          <View style={styles.stack}>
            {dashboardData.agentPerformance.length ? (
              dashboardData.agentPerformance.map((item) => (
                <View key={item.name} style={styles.agentCard}>
                  <View style={styles.agentHeader}>
                    <View style={styles.rowCopy}>
                      <Text style={styles.rowTitle}>{item.name}</Text>
                      <Text style={styles.rowMeta}>
                        {isAdminOrSupervisor
                          ? item.managerName || 'No manager assigned'
                          : `${item.allocations} total allocation(s)`}
                      </Text>
                    </View>

                    <Text style={styles.agentTotal}>{item.allocations}</Text>
                  </View>

                  <View style={styles.agentMetrics}>
                    <StatusBadge
                      status={item.released > 0 ? 'verified' : 'inactive'}
                      label={`${item.released} released`}
                      size="small"
                    />
                    <StatusBadge
                      status={item.active > 0 ? 'assigned' : 'inactive'}
                      label={`${item.active} active`}
                      size="small"
                    />
                  </View>
                </View>
              ))
            ) : (
              <Text style={styles.emptyCopy}>
                No agent performance data available.
              </Text>
            )}
          </View>
        </Card>
      ) : null}

      {isAdminOrSupervisor ? (
        <Card style={styles.panelCard}>
          <Text style={styles.panelTitle}>Top Selling Units</Text>
          <Text style={styles.panelSubtitle}>
            Released inventory grouped by unit and variation.
          </Text>

          <View style={styles.stack}>
            {dashboardData.topSellingUnits.length ? (
              dashboardData.topSellingUnits.map((item, index) => (
                <View key={item.unit} style={styles.rankedAnalyticsItem}>
                  <View style={styles.rankWrap}>
                    <Text style={styles.rankText}>{index + 1}</Text>
                  </View>

                  <View style={styles.rankedAnalyticsContent}>
                    <View style={styles.analyticsHeader}>
                      <Text style={styles.analyticsTitle}>{item.unit}</Text>
                      <Text style={styles.analyticsValue}>{item.sold} sold</Text>
                    </View>

                    <ProgressBar
                      progress={
                        maxTopSellingCount > 0
                          ? Math.round((item.sold / maxTopSellingCount) * 100)
                          : 0
                      }
                      size="small"
                      showPercentage={false}
                    />
                  </View>
                </View>
              ))
            ) : (
              <Text style={styles.emptyCopy}>
                No released units available yet.
              </Text>
            )}
          </View>
        </Card>
      ) : null}
    </WorkspaceScaffold>
  );
}

const styles = StyleSheet.create({
  summaryGrid: {
    marginBottom: theme.spacing.base,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: theme.spacing.base,
    marginBottom: theme.spacing.base,
  },
  summaryCard: {
    flex: 1,
    minWidth: 0,
    backgroundColor: theme.colors.white,
  },
  summaryCardSpacer: {
    flex: 1,
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.base,
  },
  summaryLabel: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.textMuted,
    fontFamily: theme.fonts.family.sans,
  },
  summaryIconWrap: {
    width: 36,
    height: 36,
    borderRadius: theme.radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryValue: {
    fontSize: 28,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 4,
    fontFamily: theme.fonts.family.sans,
  },
  summaryCaption: {
    fontSize: 12,
    color: theme.colors.textSubtle,
    fontFamily: theme.fonts.family.sans,
  },
  panelCard: {
    marginBottom: theme.spacing.base,
    backgroundColor: theme.colors.white,
    borderColor: theme.colors.borderStrong,
  },
  panelTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 4,
    fontFamily: theme.fonts.family.sans,
  },
  panelSubtitle: {
    fontSize: 13,
    lineHeight: 19,
    color: theme.colors.textMuted,
    marginBottom: theme.spacing.base,
    fontFamily: theme.fonts.family.sans,
  },
  stack: {
    gap: theme.spacing.sm,
  },
  analyticsItem: {
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.surfaceMuted,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
  },
  rankedAnalyticsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.surfaceMuted,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
  },
  rankedAnalyticsContent: {
    flex: 1,
  },
  analyticsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  analyticsTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.text,
    fontFamily: theme.fonts.family.sans,
  },
  analyticsValue: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.textMuted,
    fontFamily: theme.fonts.family.sans,
  },
  agentCard: {
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.surfaceMuted,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
  },
  agentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  rowCopy: {
    flex: 1,
  },
  rowTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 2,
    fontFamily: theme.fonts.family.sans,
  },
  rowMeta: {
    fontSize: 12,
    lineHeight: 18,
    color: theme.colors.textMuted,
    fontFamily: theme.fonts.family.sans,
  },
  agentTotal: {
    fontSize: 22,
    fontWeight: '700',
    color: theme.colors.primary,
    fontFamily: theme.fonts.family.sans,
  },
  agentMetrics: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  rankWrap: {
    width: 28,
    height: 28,
    borderRadius: theme.radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primarySurface,
  },
  rankText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.primaryDark,
    fontFamily: theme.fonts.family.sans,
  },
  emptyCopy: {
    fontSize: 13,
    color: theme.colors.textMuted,
    fontFamily: theme.fonts.family.sans,
  },
});
