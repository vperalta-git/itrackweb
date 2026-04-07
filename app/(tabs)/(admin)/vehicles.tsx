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
  StatusBadge,
  WorkspaceScaffold,
} from '@/src/mobile/components';
import { useAuth } from '@/src/mobile/context/AuthContext';
import {
  getModuleAccess,
  getRoleLabel,
  getRoleRoute,
} from '@/src/mobile/navigation/access';
import { UserRole, Vehicle, VehicleStatus } from '@/src/mobile/types';
import { theme } from '@/src/mobile/constants/theme';
import { getDriverAllocationUnitStockStatusByConductionNumber } from '@/src/mobile/data/driver-allocation';
import {
  deleteVehicleStock,
  formatVehicleCreatedDate,
  formatVehicleStatusLabel,
  formatVehicleStockReference,
  getVehicleStatusAccentColor,
  getVehicleStatusBadgeStatus,
  getVehicleStocks,
  loadVehicleStocks,
} from '@/src/mobile/data/vehicle-stocks';
import { shareExport } from '@/src/mobile/utils/shareExport';

const ITEMS_PER_PAGE = 5;

const getStatusFilterAccentColor = (statusFilter: string) => {
  switch (statusFilter) {
    case VehicleStatus.AVAILABLE:
      return theme.colors.success;
    case VehicleStatus.IN_STOCKYARD:
      return theme.colors.primary;
    case VehicleStatus.IN_TRANSIT:
      return theme.colors.info;
    case VehicleStatus.MAINTENANCE:
      return theme.colors.error;
    default:
      return theme.colors.textSubtle;
  }
};

export default function VehiclesScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const role = user?.role ?? UserRole.ADMIN;
  const access = getModuleAccess(role, 'vehicleStocks');
  const [searchValue, setSearchValue] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [refreshing, setRefreshing] = useState(false);
  const [stockStatusVersion, setStockStatusVersion] = useState(0);
  const [vehicles, setVehicles] = useState<Vehicle[]>(() => getVehicleStocks());
  const displayVehicles = useMemo(
    () =>
      vehicles.map((vehicle) => {
        const syncedStatus = getDriverAllocationUnitStockStatusByConductionNumber(
          vehicle.conductionNumber
        );

        return syncedStatus ? { ...vehicle, status: syncedStatus } : vehicle;
      }),
    [stockStatusVersion, vehicles]
  );

  const filteredVehicles = useMemo(
    () =>
      displayVehicles.filter((vehicle) => {
        const query = searchValue.toLowerCase();
        const matchesSearch =
          vehicle.unitName.toLowerCase().includes(query) ||
          vehicle.variation.toLowerCase().includes(query) ||
          vehicle.conductionNumber.toLowerCase().includes(query) ||
          vehicle.bodyColor.toLowerCase().includes(query) ||
          formatVehicleStatusLabel(vehicle.status).toLowerCase().includes(query);
        const matchesStatus =
          statusFilter === 'all' || vehicle.status === statusFilter;

        return matchesSearch && matchesStatus;
      }),
    [displayVehicles, searchValue, statusFilter]
  );

  const totalPages = Math.max(
    1,
    Math.ceil(filteredVehicles.length / ITEMS_PER_PAGE)
  );
  const statusFilterLabel =
    statusFilter === 'all'
      ? 'All statuses'
      : formatVehicleStatusLabel(statusFilter as VehicleStatus);
  const paginatedVehicles = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredVehicles.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [currentPage, filteredVehicles]);
  const paginationRangeLabel = useMemo(() => {
    if (!filteredVehicles.length) {
      return 'Showing 0 of 0';
    }

    const start = (currentPage - 1) * ITEMS_PER_PAGE + 1;
    const end = Math.min(currentPage * ITEMS_PER_PAGE, filteredVehicles.length);

    return `Showing ${start}-${end} of ${filteredVehicles.length}`;
  }, [currentPage, filteredVehicles]);

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
    const refreshVehicles = async () => {
      try {
        const records = await loadVehicleStocks();

        if (isActive) {
          setVehicles(records);
          setStockStatusVersion((current) => current + 1);
        }
      } catch {
        if (isActive) {
          setVehicles(getVehicleStocks());
          setStockStatusVersion((current) => current + 1);
        }
      }
    };

    refreshVehicles().catch(() => undefined);

    const unsubscribe = navigation.addListener('focus', () => {
      refreshVehicles().catch(() => undefined);
    });

    return () => {
      isActive = false;
      unsubscribe();
    };
  }, [navigation]);

  const handleRefresh = async () => {
    setRefreshing(true);

    try {
      const records = await loadVehicleStocks();
      setVehicles(records);
      setStockStatusVersion((current) => current + 1);
    } catch (error) {
      setVehicles(getVehicleStocks());
      setStockStatusVersion((current) => current + 1);
      Alert.alert(
        'Unable to refresh vehicles',
        error instanceof Error
          ? error.message
          : 'The latest vehicle stocks could not be loaded right now.'
      );
    } finally {
      setRefreshing(false);
    }
  };

  const handleClearFilters = () => {
    setSearchValue('');
    setStatusFilter('all');
  };

  const handleExportVehicles = async () => {
    const statusFilterLabel =
      statusFilter === 'all'
        ? 'All statuses'
        : formatVehicleStatusLabel(statusFilter as VehicleStatus);
    const message = [
      'Vehicle Stocks Export',
      `Scope: ${getRoleLabel(role)}`,
      `Status Filter: ${statusFilterLabel}`,
      `Search: ${searchValue || 'None'}`,
      `Records: ${filteredVehicles.length}`,
      '',
      ...(filteredVehicles.length
        ? filteredVehicles.map(
            (vehicle) =>
              `${formatVehicleStockReference(vehicle.id)} | ${vehicle.unitName} ${vehicle.variation} | ${vehicle.conductionNumber} | ${vehicle.bodyColor} | ${formatVehicleStatusLabel(vehicle.status)} | Added ${formatVehicleCreatedDate(vehicle.createdAt)}`
          )
        : ['No matching vehicle records.']),
    ].join('\n');

    await shareExport({
      title: 'Vehicle Stocks Export',
      message,
      errorMessage: 'The vehicle stock records could not be exported right now.',
    });
  };

  const handleVehiclePress = (vehicleId: string) => {
    if (!access.canViewDetails) {
      return;
    }

    router.push({
      pathname: getRoleRoute(role, 'vehicle-detail'),
      params: {
        vehicleId,
      },
    });
  };

  const handleEditVehicle = (vehicleId: string) => {
    if (!access.canEdit) {
      return;
    }

    router.push({
      pathname: getRoleRoute(role, 'add-stock'),
      params: {
        mode: 'edit',
        vehicleId,
      },
    });
  };

  const handleDeleteVehicle = (vehicleId: string, unitName: string) => {
    if (!access.canDelete) {
      return;
    }

    Alert.alert(
      'Delete vehicle?',
      `${unitName} will be removed from the stock list. This action cannot be undone.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteVehicleStock(vehicleId);
            setVehicles(getVehicleStocks());
          },
        },
      ]
    );
  };

  return (
    <WorkspaceScaffold
      eyebrow={getRoleLabel(role)}
      title="Vehicle Stocks"
      subtitle="Track inventory readiness, transport movement, and stockyard visibility."
      action={
        access.canCreate ? (
          <Button
            title="Add Stock"
            size="small"
            onPress={() => router.push(getRoleRoute(role, 'add-stock') as any)}
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
          searchPlaceholder="Search unit, variation, conduction number, or color"
          filters={[
            { label: 'All', value: 'all' },
            { label: 'Available', value: 'available' },
            { label: 'In Stockyard', value: 'in_stockyard' },
            { label: 'In Transit', value: 'in_transit' },
            { label: 'Maintenance', value: 'maintenance' },
          ]}
          activeFilter={statusFilter}
          onFilterChange={setStatusFilter}
          onClearFilters={handleClearFilters}
          actions={
            access.canExportPdf
              ? [
                  {
                    key: 'export-vehicles',
                    iconName: 'download-outline',
                    accessibilityLabel: 'Export vehicle stocks',
                    onPress: handleExportVehicles,
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
        title="Vehicle View"
        value={`${filteredVehicles.length} of ${displayVehicles.length} vehicles shown`}
        iconName="car-sport-outline"
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
        {filteredVehicles.length ? (
          paginatedVehicles.map((vehicle) => {
            const menuItems: CardActionMenuItem[] = [];

            if (access.canEdit) {
              menuItems.push({
                key: `edit-${vehicle.id}`,
                label: 'Edit',
                iconName: 'create-outline',
                onPress: () => handleEditVehicle(vehicle.id),
              });
            }

            if (access.canDelete) {
              menuItems.push({
                key: `delete-${vehicle.id}`,
                label: 'Delete',
                iconName: 'trash-outline',
                tone: 'destructive',
                onPress: () => handleDeleteVehicle(vehicle.id, vehicle.unitName),
              });
            }

            return (
              <Card
                key={vehicle.id}
                style={styles.card}
                variant="elevated"
                padding="large"
                onPress={
                  access.canViewDetails
                    ? () => handleVehiclePress(vehicle.id)
                    : undefined
                }
                disabled={!access.canViewDetails}
              >
                <View
                  style={[
                    styles.accentBar,
                    {
                      backgroundColor: getVehicleStatusAccentColor(vehicle.status),
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
                        {formatVehicleStockReference(vehicle.id)}
                      </Text>
                      <Text style={styles.title}>{vehicle.unitName}</Text>
                      <Text style={styles.subtitle}>{vehicle.variation}</Text>
                    </View>
                  </View>

                  <View style={styles.headerAside}>
                    {menuItems.length ? (
                      <View style={styles.headerActions}>
                        <CardActionMenu
                          accessibilityLabel={`Open actions for ${vehicle.unitName}`}
                          items={menuItems}
                        />
                      </View>
                    ) : null}
                    <StatusBadge
                      status={getVehicleStatusBadgeStatus(vehicle.status)}
                      label={formatVehicleStatusLabel(vehicle.status)}
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
                    {vehicle.conductionNumber}
                  </Text>
                </View>

                <View style={styles.metricGrid}>
                  <View style={styles.metricCard}>
                    <Text style={styles.metricLabel}>Body Color</Text>
                    <Text style={styles.metricValue}>{vehicle.bodyColor}</Text>
                  </View>

                  <View style={styles.metricCard}>
                    <Text style={styles.metricLabel}>Date Created</Text>
                    <Text style={styles.metricValue}>
                      {formatVehicleCreatedDate(vehicle.createdAt)}
                    </Text>
                  </View>
                </View>

                <View style={styles.cardFooter}>
                  <View style={styles.footerHint}>
                    <Ionicons
                      name="albums-outline"
                      size={15}
                      color={theme.colors.textSubtle}
                    />
                    <Text style={styles.footerHintText}>
                      {access.canViewDetails
                        ? 'Tap card to open vehicle details'
                        : 'List view only'}
                    </Text>
                  </View>
                </View>
              </Card>
            );
          })
        ) : (
          <EmptyState
            title="No vehicles found"
            description="Try another search term or change the selected status filter."
          />
        )}

        {filteredVehicles.length ? (
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
