import React, { useEffect, useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from 'expo-router';

import { theme } from '../constants/theme';
import { Card } from './Card';
import { EmptyState } from './EmptyState';
import { SearchFiltersBar } from './SearchFiltersBar';
import type { UnitSetupCategory, UnitSetupRecord } from '../data/unit-setup';
import {
  deleteUnitSetupRecord,
  getUnitSetupCategory,
  getUnitSetupCategoryLabel,
  getUnitSetupRecords,
} from '../data/unit-setup';

type VehicleUnitSetupPanelProps = {
  canEdit: boolean;
  canDelete: boolean;
  onEditPress: (unitName: string) => void;
};

const ITEMS_PER_PAGE = 6;

type UnitSetupFilterValue = 'all' | UnitSetupCategory;

export function VehicleUnitSetupPanel({
  canEdit,
  canDelete,
  onEditPress,
}: VehicleUnitSetupPanelProps) {
  const navigation = useNavigation();
  const [records, setRecords] = useState<UnitSetupRecord[]>(() => getUnitSetupRecords());
  const [searchValue, setSearchValue] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<UnitSetupFilterValue>('all');
  const [focusedUnitName, setFocusedUnitName] = useState('all');
  const [expandedUnits, setExpandedUnits] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    const syncRecords = () => {
      setRecords(getUnitSetupRecords());
    };

    syncRecords();
    const unsubscribe = navigation.addListener('focus', syncRecords);

    return unsubscribe;
  }, [navigation]);

  const filteredRecords = useMemo(() => {
    const query = searchValue.trim().toLowerCase();

    return records.filter((record) => {
      const matchesCategory =
        categoryFilter === 'all' || getUnitSetupCategory(record.unitName) === categoryFilter;
      const matchesFocusedUnit =
        focusedUnitName === 'all' || record.unitName === focusedUnitName;

      if (!matchesCategory || !matchesFocusedUnit) {
        return false;
      }

      if (!query) {
        return true;
      }

      if (record.unitName.toLowerCase().includes(query)) {
        return true;
      }

      return record.variations.some((variation) =>
        [variation.name, ...variation.bodyColors].join(' ').toLowerCase().includes(query)
      );
    });
  }, [categoryFilter, focusedUnitName, records, searchValue]);

  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / ITEMS_PER_PAGE));

  const paginatedRecords = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredRecords.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [currentPage, filteredRecords]);

  const paginationRangeLabel = useMemo(() => {
    if (!filteredRecords.length) {
      return 'Showing 0 of 0';
    }

    const start = (currentPage - 1) * ITEMS_PER_PAGE + 1;
    const end = Math.min(currentPage * ITEMS_PER_PAGE, filteredRecords.length);

    return `Showing ${start}-${end} of ${filteredRecords.length}`;
  }, [currentPage, filteredRecords]);

  const unitFilters = useMemo(
    () => [
      { label: 'All Units', value: 'all' },
      ...records.map((record) => ({
        label: record.unitName.replace('Isuzu ', ''),
        value: record.unitName,
      })),
    ],
    [records]
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [categoryFilter, focusedUnitName, searchValue]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const clearFilters = () => {
    setSearchValue('');
    setCategoryFilter('all');
    setFocusedUnitName('all');
  };

  const removeRecord = (unitName: string) => {
    Alert.alert('Delete unit setup?', `Remove ${unitName} from Unit Setup?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          setRecords(deleteUnitSetupRecord(unitName));
          setExpandedUnits((current) => current.filter((value) => value !== unitName));
          setFocusedUnitName((current) => (current === unitName ? 'all' : current));
        },
      },
    ]);
  };

  const toggleExpanded = (unitName: string) => {
    setExpandedUnits((current) =>
      current.includes(unitName)
        ? current.filter((value) => value !== unitName)
        : [...current, unitName]
    );
  };

  return (
    <View style={styles.wrap}>
      <SearchFiltersBar
        searchValue={searchValue}
        onSearchChange={setSearchValue}
        searchPlaceholder="Search unit setup, variations, or body colors"
        filters={[
          { label: 'All', value: 'all' },
          { label: 'Pickup & SUV', value: 'pickup_suv' },
          { label: 'Light Duty', value: 'light_duty' },
          { label: 'Heavy Duty', value: 'heavy_duty' },
        ]}
        activeFilter={categoryFilter}
        onFilterChange={(value) => setCategoryFilter(value as UnitSetupFilterValue)}
        secondaryFilters={unitFilters}
        activeSecondaryFilter={focusedUnitName}
        onSecondaryFilterChange={setFocusedUnitName}
        onClearFilters={clearFilters}
      />

      {filteredRecords.length ? (
        paginatedRecords.map((record) => {
          const isExpanded = expandedUnits.includes(record.unitName);
          const totalBodyColors = record.variations.reduce(
            (count, variation) => count + variation.bodyColors.length,
            0
          );

          return (
            <Card key={record.unitName} style={styles.card} variant="elevated" padding="large">
              <TouchableOpacity
                activeOpacity={0.88}
                onPress={() => toggleExpanded(record.unitName)}
                style={styles.header}
              >
                <View style={styles.titleRow}>
                  <View style={styles.iconWrap}>
                    <Ionicons
                      name={isExpanded ? 'chevron-down-outline' : 'chevron-forward-outline'}
                      size={20}
                      color={theme.colors.primary}
                    />
                  </View>
                  <View style={styles.copy}>
                    <Text style={styles.title}>{record.unitName}</Text>
                    <Text style={styles.subtitle}>
                      {getUnitSetupCategoryLabel(getUnitSetupCategory(record.unitName))} -{' '}
                      {record.variations.length} variations - {totalBodyColors} body colors
                    </Text>
                  </View>
                </View>

                {canEdit || canDelete ? (
                  <View style={styles.headerActions}>
                    {canEdit ? (
                      <TouchableOpacity
                        onPress={() => onEditPress(record.unitName)}
                        style={styles.iconButton}
                      >
                        <Ionicons name="create-outline" size={18} color={theme.colors.primary} />
                      </TouchableOpacity>
                    ) : null}
                    {canDelete ? (
                      <TouchableOpacity
                        onPress={() => removeRecord(record.unitName)}
                        style={styles.iconButton}
                      >
                        <Ionicons name="trash-outline" size={18} color={theme.colors.error} />
                      </TouchableOpacity>
                    ) : null}
                  </View>
                ) : null}
              </TouchableOpacity>

              {isExpanded ? (
                <View style={styles.body}>
                  {record.variations.map((variation) => (
                    <View key={`${record.unitName}-${variation.name}`} style={styles.variationCard}>
                      <Text style={styles.variationTitle}>{variation.name}</Text>
                      {variation.transmission || variation.drivetrain || variation.bodyType ? (
                        <View style={styles.metaWrap}>
                          {variation.transmission ? (
                            <View style={styles.metaChip}>
                              <Text style={styles.metaChipText}>{variation.transmission}</Text>
                            </View>
                          ) : null}
                          {variation.drivetrain ? (
                            <View style={styles.metaChip}>
                              <Text style={styles.metaChipText}>{variation.drivetrain}</Text>
                            </View>
                          ) : null}
                          {variation.bodyType ? (
                            <View style={styles.metaChip}>
                              <Text style={styles.metaChipText}>{variation.bodyType}</Text>
                            </View>
                          ) : null}
                        </View>
                      ) : null}
                      <View style={styles.tagWrap}>
                        {variation.bodyColors.map((bodyColor) => (
                          <View key={`${variation.name}-${bodyColor}`} style={styles.tag}>
                            <Text style={styles.tagText}>{bodyColor}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  ))}
                </View>
              ) : null}
            </Card>
          );
        })
      ) : (
        <EmptyState
          title="No unit setup found"
          description="Try another search term or change the selected filters."
        />
      )}

      {filteredRecords.length ? (
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
                color={currentPage === 1 ? theme.colors.textSubtle : theme.colors.text}
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
              onPress={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
            >
              <Ionicons
                name="chevron-forward-outline"
                size={16}
                color={currentPage === totalPages ? theme.colors.textSubtle : theme.colors.white}
              />
            </TouchableOpacity>
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: theme.spacing.md,
  },
  card: {
    gap: theme.spacing.base,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: theme.spacing.base,
  },
  titleRow: {
    flex: 1,
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  iconWrap: {
    width: 42,
    height: 42,
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
  headerActions: {
    flexDirection: 'row',
    gap: theme.spacing.xs,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: theme.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surfaceMuted,
  },
  body: {
    gap: theme.spacing.sm,
  },
  variationCard: {
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surfaceMuted,
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  variationTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.text,
    fontFamily: theme.fonts.family.sans,
  },
  metaWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.xs,
  },
  metaChip: {
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.white,
    borderWidth: 1,
    borderColor: theme.colors.borderStrong,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 5,
  },
  metaChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.textMuted,
    fontFamily: theme.fonts.family.sans,
  },
  tagWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.xs,
  },
  tag: {
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.white,
    borderWidth: 1,
    borderColor: theme.colors.borderStrong,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 6,
  },
  tagText: {
    fontSize: 12,
    fontWeight: '600',
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
