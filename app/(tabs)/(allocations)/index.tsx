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
  Select,
  WorkspaceScaffold,
} from '@/src/mobile/components';
import { useAuth } from '@/src/mobile/context/AuthContext';
import { theme } from '@/src/mobile/constants/theme';
import {
  ALLOCATION_MANAGER_OPTIONS,
  deleteUnitAgentAllocation,
  formatAllocationCreatedDate,
  formatAllocationReference,
  getUnitAgentAllocations,
  loadUnitAgentAllocations,
  UnitAgentAllocationRecord,
} from '@/src/mobile/data/unit-agent-allocation';
import { findVehicleStockById } from '@/src/mobile/data/vehicle-stocks';
import {
  getModuleAccess,
  getRoleLabel,
} from '@/src/mobile/navigation/access';
import { UserRole } from '@/src/mobile/types';
import { shareExport } from '@/src/mobile/utils/shareExport';

const ITEMS_PER_PAGE = 5;

export default function AllocationsScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const role = user?.role ?? UserRole.ADMIN;
  const access = getModuleAccess(role, 'unitAgentAllocation');
  const [searchValue, setSearchValue] = useState('');
  const [managerFilter, setManagerFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [refreshing, setRefreshing] = useState(false);
  const [allocations, setAllocations] =
    useState<UnitAgentAllocationRecord[]>(() => getUnitAgentAllocations());

  const filteredAllocations = useMemo(
    () =>
      allocations.filter((item) => {
        const query = searchValue.toLowerCase();
        const matchesSearch =
          item.unitName.toLowerCase().includes(query) ||
          item.unitVariation.toLowerCase().includes(query) ||
          item.managerName.toLowerCase().includes(query) ||
          item.salesAgentName.toLowerCase().includes(query);
        const matchesManager =
          managerFilter === 'all' || item.managerId === managerFilter;

        return matchesSearch && matchesManager;
      }),
    [allocations, managerFilter, searchValue]
  );

  const totalPages = Math.max(
    1,
    Math.ceil(filteredAllocations.length / ITEMS_PER_PAGE)
  );
  const managerFilterLabel =
    managerFilter === 'all'
      ? 'All managers'
      : ALLOCATION_MANAGER_OPTIONS.find((manager) => manager.value === managerFilter)
          ?.label ?? 'All managers';
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
  }, [managerFilter, searchValue]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  useEffect(() => {
    let isActive = true;
    const refreshAllocations = async () => {
      try {
        const records = await loadUnitAgentAllocations();

        if (isActive) {
          setAllocations(records);
        }
      } catch {
        if (isActive) {
          setAllocations(getUnitAgentAllocations());
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
      const records = await loadUnitAgentAllocations();
      setAllocations(records);
    } catch (error) {
      setAllocations(getUnitAgentAllocations());
      Alert.alert(
        'Unable to refresh agent allocations',
        error instanceof Error
          ? error.message
          : 'The latest agent allocation records could not be loaded right now.'
      );
    } finally {
      setRefreshing(false);
    }
  };

  const handleClearFilters = () => {
    setSearchValue('');
    setManagerFilter('all');
  };

  const handleExportAllocations = async () => {
    await shareExport({
      title: 'Agent Allocation Report',
      subtitle:
        managerFilter === 'all'
          ? 'All managers'
          : `Manager: ${managerFilterLabel}`,
      metadata: [
        { label: 'Scope', value: getRoleLabel(role) },
        { label: 'Manager Filter', value: managerFilterLabel },
        { label: 'Search', value: searchValue || 'None' },
        { label: 'Records', value: String(filteredAllocations.length) },
      ],
      columns: [
        { header: 'Unit Name', value: (item) => item.unitName },
        {
          header: 'Conduction Number',
          value: (item) =>
            findVehicleStockById(item.unitId)?.conductionNumber ?? '-',
        },
        {
          header: 'Body Color',
          value: (item) => findVehicleStockById(item.unitId)?.bodyColor ?? '-',
        },
        { header: 'Variation', value: (item) => item.unitVariation },
        { header: 'Assigned To', value: (item) => item.salesAgentName },
        { header: 'Manager', value: (item) => item.managerName },
        {
          header: 'Date Created',
          value: (item) => formatAllocationCreatedDate(item.createdAt),
        },
      ],
      rows: filteredAllocations,
      emptyStateMessage: 'No matching agent allocation records.',
      errorMessage: 'The agent allocation records could not be exported right now.',
    });
  };

  const handleAllocationPress = (allocationId: string) => {
    if (!access.canViewDetails) {
      return;
    }

    router.push(
      `/(tabs)/(allocations)/allocation-detail?allocationId=${allocationId}` as any
    );
  };

  const handleEditAllocation = (allocationId: string) => {
    if (!access.canEdit) {
      return;
    }

    router.push({
      pathname: '/(tabs)/(allocations)/allocation-form',
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
      'Delete agent allocation?',
      `${unitName} will be removed from the agent allocation list. This action cannot be undone.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteUnitAgentAllocation(allocationId);
            setAllocations(getUnitAgentAllocations());
          },
        },
      ]
    );
  };

  return (
    <WorkspaceScaffold
      eyebrow={getRoleLabel(role)}
      title="Agent Allocation"
      subtitle="Manage manager ownership and assign units to sales agents from one workspace."
      action={
        access.canCreate ? (
          <Button
            title="Add Agent Allocation"
            size="small"
            onPress={() =>
              router.push('/(tabs)/(allocations)/allocation-form' as any)
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
          searchPlaceholder="Search unit, manager, or sales agent"
          extraFiltersActive={managerFilter !== 'all'}
          onClearFilters={handleClearFilters}
          actions={
            access.canExportPdf
              ? [
                  {
                    key: 'export-unit-agent-allocation',
                    iconName: 'download-outline',
                    accessibilityLabel: 'Export agent allocations',
                    onPress: handleExportAllocations,
                  },
                ]
              : undefined
          }
          extraFiltersContent={
            <Select
              label="Select Manager"
              placeholder="All managers"
              value={managerFilter}
              options={[
                { label: 'All Managers', value: 'all' },
                ...ALLOCATION_MANAGER_OPTIONS,
              ]}
              onValueChange={(value) => setManagerFilter(String(value))}
              searchPlaceholder="Search manager"
              style={styles.managerFilterField}
            />
          }
        />
      }
      scopeTitle={access.scopeLabel}
      scopeMessage={access.scopeNote}
      refreshing={refreshing}
      onRefresh={handleRefresh}
    >
      <FilterSummaryCard
        title="Agent Allocation View"
        value={`${filteredAllocations.length} of ${allocations.length} records shown`}
        iconName="people-outline"
        items={[
          {
            label: 'Manager Filter',
            value: managerFilterLabel,
            iconName: 'briefcase-outline',
          },
        ]}
        style={styles.summaryCard}
      />

      <View style={styles.list}>
        {filteredAllocations.length ? (
          paginatedAllocations.map((item) => {
            const menuItems: CardActionMenuItem[] = [];

            if (access.canEdit) {
              menuItems.push({
                key: `edit-${item.id}`,
                label: 'Edit',
                iconName: 'create-outline',
                onPress: () => handleEditAllocation(item.id),
              });
            }

            if (access.canDelete) {
              menuItems.push({
                key: `delete-${item.id}`,
                label: 'Delete',
                iconName: 'trash-outline',
                tone: 'destructive',
                onPress: () => handleDeleteAllocation(item.id, item.unitName),
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
                    ? () => handleAllocationPress(item.id)
                    : undefined
                }
                disabled={!access.canViewDetails}
              >
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
                        {formatAllocationReference(item.id)}
                      </Text>
                      <Text style={styles.title}>{item.unitName}</Text>
                      <Text style={styles.subtitle}>{item.unitVariation}</Text>
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
                  </View>
                </View>

                <View style={styles.referenceChip}>
                  <Ionicons
                    name="briefcase-outline"
                    size={14}
                    color={theme.colors.primaryDark}
                  />
                  <Text style={styles.referenceChipLabel}>Manager</Text>
                  <Text style={styles.referenceChipValue}>{item.managerName}</Text>
                </View>

                <View style={styles.metricGrid}>
                  <View style={styles.metricCard}>
                    <Text style={styles.metricLabel}>Sales Agent</Text>
                    <Text style={styles.metricValue}>{item.salesAgentName}</Text>
                  </View>

                  <View style={styles.metricCard}>
                    <Text style={styles.metricLabel}>Date Created</Text>
                    <Text style={styles.metricValue}>
                      {formatAllocationCreatedDate(item.createdAt)}
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
                        ? 'Tap card to open allocation details'
                        : 'List view only'}
                    </Text>
                  </View>
                </View>
              </Card>
            );
          })
        ) : (
          <EmptyState
            title="No agent allocations found"
            description="Try another search term or change the selected manager filter."
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
  managerFilterField: {
    marginBottom: 0,
  },
});
