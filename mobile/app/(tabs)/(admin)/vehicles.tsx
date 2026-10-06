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
  SegmentedControl,
  SearchFiltersBar,
  Select,
  StatusBadge,
  WorkspaceScaffold,
} from '@/src/mobile/components';
import { VehicleUnitSetupPanel } from '@/src/mobile/components/VehicleUnitSetupPanel';
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
type VehicleStocksTab = 'stock_list' | 'unit_setup';
type StockListViewMode = 'details' | 'stock_count';
type StockSortMode = 'unit' | 'color_asc' | 'color_desc' | 'count_desc' | 'count_asc';

type StockCountRow = {
  id: string;
  unitName: string;
  variation: string;
  bodyColor: string;
  stockCount: number;
};

const normalizeStockCountValue = (value: string) =>
  value.trim() || 'Unspecified';

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
  const [activeTab, setActiveTab] = useState<VehicleStocksTab>('stock_list');
  const [stockListViewMode, setStockListViewMode] =
    useState<StockListViewMode>('details');
  const [stockSortMode, setStockSortMode] = useState<StockSortMode>('unit');
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

  const statusFilteredVehicles = useMemo(
    () =>
      displayVehicles.filter((vehicle) => {
        const matchesStatus =
          statusFilter === 'all' || vehicle.status === statusFilter;

        return matchesStatus;
      }),
    [displayVehicles, statusFilter]
  );

  const filteredVehicles = useMemo(
    () =>
      statusFilteredVehicles.filter((vehicle) => {
        const query = searchValue.toLowerCase();

        return (
          vehicle.unitName.toLowerCase().includes(query) ||
          vehicle.variation.toLowerCase().includes(query) ||
          vehicle.conductionNumber.toLowerCase().includes(query) ||
          vehicle.bodyColor.toLowerCase().includes(query) ||
          (vehicle.notes ?? '').toLowerCase().includes(query) ||
          formatVehicleStatusLabel(vehicle.status).toLowerCase().includes(query)
        );
      }),
    [searchValue, statusFilteredVehicles]
  );

  const stockCountRows = useMemo(() => {
    const groupedRows = new Map<string, StockCountRow>();

    statusFilteredVehicles.forEach((vehicle) => {
      const unitName = normalizeStockCountValue(vehicle.unitName);
      const variation = normalizeStockCountValue(vehicle.variation);
      const bodyColor = normalizeStockCountValue(vehicle.bodyColor);
      const key = [unitName, variation, bodyColor]
        .map((value) => value.toLocaleLowerCase())
        .join('||');
      const existingRow = groupedRows.get(key);

      if (existingRow) {
        existingRow.stockCount += 1;
        return;
      }

      groupedRows.set(key, {
        id: key,
        unitName,
        variation,
        bodyColor,
        stockCount: 1,
      });
    });

    const query = searchValue.toLowerCase();

    return Array.from(groupedRows.values())
      .filter(
        (row) =>
          row.unitName.toLowerCase().includes(query) ||
          row.variation.toLowerCase().includes(query) ||
          row.bodyColor.toLowerCase().includes(query) ||
          String(row.stockCount).includes(query)
      )
      .sort((left, right) => {
        if (stockSortMode === 'color_asc') {
          const colorSort = left.bodyColor.localeCompare(right.bodyColor);
          if (colorSort !== 0) {
            return colorSort;
          }
        }

        if (stockSortMode === 'color_desc') {
          const colorSort = right.bodyColor.localeCompare(left.bodyColor);
          if (colorSort !== 0) {
            return colorSort;
          }
        }

        if (stockSortMode === 'count_desc') {
          const countSort = right.stockCount - left.stockCount;
          if (countSort !== 0) {
            return countSort;
          }
        }

        if (stockSortMode === 'count_asc') {
          const countSort = left.stockCount - right.stockCount;
          if (countSort !== 0) {
            return countSort;
          }
        }

        const unitSort = left.unitName.localeCompare(right.unitName);
        if (unitSort !== 0) {
          return unitSort;
        }

        const variationSort = left.variation.localeCompare(right.variation);
        if (variationSort !== 0) {
          return variationSort;
        }

        return left.bodyColor.localeCompare(right.bodyColor);
      });
  }, [searchValue, statusFilteredVehicles, stockSortMode]);

  const activeStockRecordCount =
    stockListViewMode === 'stock_count'
      ? stockCountRows.length
      : filteredVehicles.length;

  const activeStockTotalCount =
    stockListViewMode === 'stock_count'
      ? statusFilteredVehicles.length
      : displayVehicles.length;

  const activeSearchPlaceholder =
    stockListViewMode === 'stock_count'
      ? 'Search unit, variation, color, or count'
      : 'Search unit, variation, conduction number, color, notes, or status';

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
  }, [searchValue, statusFilter, stockListViewMode]);

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

    if (stockListViewMode === 'stock_count') {
      await shareExport({
        title: 'Vehicle Stock Count Report',
        subtitle: 'Grouped by unit, variation, and body color',
        metadata: [
          { label: 'Scope', value: getRoleLabel(role) },
          { label: 'Status Filter', value: statusFilterLabel },
          { label: 'Search', value: searchValue || 'None' },
          { label: 'Groups', value: String(stockCountRows.length) },
        ],
        columns: [
          { header: 'Unit Name', value: (row) => row.unitName },
          { header: 'Variation', value: (row) => row.variation },
          { header: 'Body Color', value: (row) => row.bodyColor },
          { header: 'Stock Count', value: (row) => String(row.stockCount) },
        ],
        rows: stockCountRows,
        emptyStateMessage: 'No matching stock count records.',
        errorMessage: 'The vehicle stock count report could not be exported right now.',
      });
      return;
    }

    await shareExport({
      title: 'Vehicle Stocks Report',
      subtitle: 'Current vehicle stock listing',
      metadata: [
        { label: 'Scope', value: getRoleLabel(role) },
        { label: 'Status Filter', value: statusFilterLabel },
        { label: 'Search', value: searchValue || 'None' },
        { label: 'Records', value: String(filteredVehicles.length) },
      ],
      columns: [
        { header: 'Unit Name', value: (vehicle) => vehicle.unitName },
        {
          header: 'Conduction Number',
          value: (vehicle) => vehicle.conductionNumber,
        },
        { header: 'Body Color', value: (vehicle) => vehicle.bodyColor },
        { header: 'Variation', value: (vehicle) => vehicle.variation },
        {
          header: 'Date Added',
          value: (vehicle) => formatVehicleCreatedDate(vehicle.createdAt),
        },
        {
          header: 'Status',
          value: (vehicle) => formatVehicleStatusLabel(vehicle.status),
        },
      ],
      rows: filteredVehicles,
      emptyStateMessage: 'No matching vehicle records.',
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
            try {
              await deleteVehicleStock(vehicleId);
              setVehicles(getVehicleStocks());
              Alert.alert('Deleted', `${unitName} has been deleted from stock.`);
            } catch (error) {
              Alert.alert(
                'Unable to delete vehicle',
                error instanceof Error
                  ? error.message
                  : 'The stock record could not be deleted right now.'
              );
            }
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
        activeTab === 'stock_list' && access.canCreate ? (
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
        ) : activeTab === 'unit_setup' && access.canCreate ? (
          <Button
            title="Add Unit Setup"
            size="small"
            onPress={() => router.push(getRoleRoute(role, 'unit-setup-form') as any)}
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
        <View style={styles.toolbarStack}>
          <SegmentedControl
            value={activeTab}
            onChange={(value) => setActiveTab(value as VehicleStocksTab)}
            options={[
              { label: 'Stock List', value: 'stock_list' },
              { label: 'Unit Setup', value: 'unit_setup' },
            ]}
          />
          {activeTab === 'stock_list' ? (
            <>
              <SegmentedControl
                value={stockListViewMode}
                onChange={(value) =>
                  setStockListViewMode(value as StockListViewMode)
                }
                options={[
                  { label: 'Details', value: 'details' },
                  { label: 'Stock Count', value: 'stock_count' },
                ]}
              />
              <SearchFiltersBar
                searchValue={searchValue}
                onSearchChange={setSearchValue}
                searchPlaceholder={activeSearchPlaceholder}
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
              {stockListViewMode === 'stock_count' ? (
                <Select
                  label="Sort Stock Count"
                  placeholder="Sort stock count"
                  value={stockSortMode}
                  options={[
                    { label: 'Unit / Variation / Color', value: 'unit' },
                    { label: 'Color A to Z', value: 'color_asc' },
                    { label: 'Color Z to A', value: 'color_desc' },
                    { label: 'Most Stock First', value: 'count_desc' },
                    { label: 'Least Stock First', value: 'count_asc' },
                  ]}
                  onValueChange={(value) => setStockSortMode(value as StockSortMode)}
                  searchable={false}
                />
              ) : null}
            </>
          ) : null}
        </View>
      }
      scopeTitle={access.scopeLabel}
      scopeMessage={access.scopeNote}
      refreshing={refreshing}
      onRefresh={handleRefresh}
    >
      {activeTab === 'stock_list' ? (
        <FilterSummaryCard
          title=""
          value={
            stockListViewMode === 'stock_count'
              ? `${activeStockRecordCount} stock groups from ${activeStockTotalCount} vehicles`
              : `${activeStockRecordCount} of ${activeStockTotalCount} vehicles shown`
          }
          iconName="car-sport-outline"
          items={[
            {
              label: 'View',
              value:
                stockListViewMode === 'stock_count' ? 'Stock Count' : 'Details',
              dotColor: theme.colors.info,
            },
            {
              label: 'Status Filter',
              value: statusFilterLabel,
              dotColor: getStatusFilterAccentColor(statusFilter),
            },
          ]}
          style={styles.summaryCard}
        />
      ) : null}

      {activeTab === 'unit_setup' ? (
        <VehicleUnitSetupPanel
          canEdit={Boolean(access.canEdit)}
          canDelete={Boolean(access.canDelete)}
          onEditPress={(unitName) =>
            router.push({
              pathname: getRoleRoute(role, 'unit-setup-form') as any,
              params: {
                mode: 'edit',
                unitName,
              },
            })
          }
        />
      ) : stockListViewMode === 'stock_count' ? (
        <View style={styles.list}>
          {stockCountRows.length ? (
            <Card style={styles.stockCountTable} variant="elevated" padding="medium">
              <View style={styles.stockCountHeaderRow}>
                <Text style={[styles.stockCountHeaderText, styles.stockCountUnitCell]}>
                  Unit
                </Text>
                <Text style={[styles.stockCountHeaderText, styles.stockCountVariantCell]}>
                  Variation / Color
                </Text>
                <Text style={[styles.stockCountHeaderText, styles.stockCountCountCell]}>
                  Count
                </Text>
              </View>

              {stockCountRows.map((row) => (
                <View key={row.id} style={styles.stockCountRow}>
                  <Text style={[styles.stockCountUnitText, styles.stockCountUnitCell]}>
                    {row.unitName}
                  </Text>
                  <View style={styles.stockCountVariantCell}>
                    <Text style={styles.stockCountVariantText}>{row.variation}</Text>
                    <Text style={styles.stockCountColorText}>{row.bodyColor}</Text>
                  </View>
                  <Text style={[styles.stockCountValueText, styles.stockCountCountCell]}>
                    {row.stockCount}
                  </Text>
                </View>
              ))}
            </Card>
          ) : (
            <EmptyState
              title="No stock counts found"
              description="Try another search term or change the selected status filter."
            />
          )}
        </View>
      ) : (
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
      )}
    </WorkspaceScaffold>
  );
}

const styles = StyleSheet.create({
  summaryCard: {
    marginBottom: theme.spacing.lg,
  },
  toolbarStack: {
    gap: theme.spacing.base,
  },
  list: {
    gap: theme.spacing.md,
  },
  stockCountTable: {
    gap: 0,
    overflow: 'hidden',
  },
  stockCountHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderStrong,
    paddingBottom: theme.spacing.sm,
    gap: theme.spacing.sm,
  },
  stockCountHeaderText: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    color: theme.colors.textSubtle,
    fontFamily: theme.fonts.family.sans,
  },
  stockCountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    paddingVertical: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  stockCountUnitCell: {
    flex: 1.05,
    minWidth: 0,
  },
  stockCountVariantCell: {
    flex: 1.45,
    minWidth: 0,
  },
  stockCountCountCell: {
    flex: 0.55,
    minWidth: 52,
    textAlign: 'right',
  },
  stockCountUnitText: {
    fontSize: 13,
    fontWeight: '800',
    color: theme.colors.text,
    fontFamily: theme.fonts.family.sans,
  },
  stockCountVariantText: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.text,
    fontFamily: theme.fonts.family.sans,
  },
  stockCountColorText: {
    marginTop: 3,
    fontSize: 12,
    color: theme.colors.textMuted,
    fontFamily: theme.fonts.family.sans,
  },
  stockCountValueText: {
    fontSize: 18,
    fontWeight: '800',
    color: theme.colors.primary,
    fontFamily: theme.fonts.family.sans,
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
