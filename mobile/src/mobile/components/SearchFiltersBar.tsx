import React, { useEffect, useMemo, useState } from 'react';
import {
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppTheme, useTheme } from '../constants/theme';
import { Input } from './Input';

export interface SearchFilterOption {
  label: string;
  value: string;
}

export interface SearchFiltersBarAction {
  key: string;
  iconName: keyof typeof Ionicons.glyphMap;
  accessibilityLabel: string;
  onPress: () => void;
}

interface SearchFiltersBarProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder: string;
  filters?: SearchFilterOption[];
  activeFilter?: string;
  onFilterChange?: (value: string) => void;
  secondaryFilters?: SearchFilterOption[];
  activeSecondaryFilter?: string;
  onSecondaryFilterChange?: (value: string) => void;
  extraFiltersContent?: React.ReactNode;
  extraFiltersActive?: boolean;
  onClearFilters?: () => void;
  actions?: SearchFiltersBarAction[];
  style?: StyleProp<ViewStyle>;
}

export function SearchFiltersBar({
  searchValue,
  onSearchChange,
  searchPlaceholder,
  filters,
  activeFilter,
  onFilterChange,
  secondaryFilters,
  activeSecondaryFilter,
  onSecondaryFilterChange,
  extraFiltersContent,
  extraFiltersActive = false,
  onClearFilters,
  actions,
  style,
}: SearchFiltersBarProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const hasFilterOptions = Boolean(
    filters?.length || secondaryFilters?.length || extraFiltersContent
  );
  const primaryDefaultValue = filters?.[0]?.value;
  const secondaryDefaultValue = secondaryFilters?.[0]?.value;
  const hasActiveFilters = useMemo(
    () =>
      Boolean(
        (activeFilter &&
          (primaryDefaultValue ? activeFilter !== primaryDefaultValue : true)) ||
          (activeSecondaryFilter &&
            (secondaryDefaultValue
              ? activeSecondaryFilter !== secondaryDefaultValue
              : true)) ||
          extraFiltersActive
      ),
    [
      activeFilter,
      activeSecondaryFilter,
      extraFiltersActive,
      primaryDefaultValue,
      secondaryDefaultValue,
    ]
  );
  const [filtersVisible, setFiltersVisible] = useState(hasActiveFilters);
  const canClearFilters = Boolean(searchValue || hasActiveFilters);

  useEffect(() => {
    if (hasActiveFilters) {
      setFiltersVisible(true);
    }
  }, [hasActiveFilters]);

  return (
    <View style={style}>
      <View style={styles.searchRow}>
        <Input
          value={searchValue}
          onChangeText={onSearchChange}
          placeholder={searchPlaceholder}
          style={styles.searchInput}
          icon={
            <Ionicons
              name="search-outline"
              size={18}
              color={theme.colors.textSubtle}
            />
          }
          rightIcon={
            searchValue ? (
              <Ionicons
                name="close-circle"
                size={18}
                color={theme.colors.textSubtle}
              />
            ) : undefined
          }
          onRightIconPress={searchValue ? () => onSearchChange('') : undefined}
        />

        {hasFilterOptions || actions?.length ? (
          <View style={styles.actionsRow}>
            {hasFilterOptions ? (
              <TouchableOpacity
                style={[
                  styles.filterButton,
                  (filtersVisible || hasActiveFilters) && styles.filterButtonActive,
                ]}
                activeOpacity={0.85}
                onPress={() => setFiltersVisible((value) => !value)}
              >
                <Ionicons
                  name="options-outline"
                  size={20}
                  color={
                    filtersVisible || hasActiveFilters
                      ? theme.colors.primaryDark
                      : theme.colors.textMuted
                  }
                />
                {hasActiveFilters ? <View style={styles.filterActiveDot} /> : null}
              </TouchableOpacity>
            ) : null}

            {actions?.map((action) => (
              <TouchableOpacity
                key={action.key}
                accessibilityLabel={action.accessibilityLabel}
                style={styles.actionButton}
                activeOpacity={0.85}
                onPress={action.onPress}
              >
                <Ionicons
                  name={action.iconName}
                  size={20}
                  color={theme.colors.textMuted}
                />
              </TouchableOpacity>
            ))}
          </View>
        ) : null}
      </View>

      {filters?.length && filtersVisible ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          {filters.map((filter) => {
            const active = filter.value === activeFilter;

            return (
              <TouchableOpacity
                key={filter.value}
                style={[styles.filterChip, active && styles.filterChipActive]}
                activeOpacity={0.85}
                onPress={() => onFilterChange?.(filter.value)}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    active && styles.filterChipTextActive,
                  ]}
                >
                  {filter.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      ) : null}

      {secondaryFilters?.length && filtersVisible ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.secondaryFilterRow}
        >
          {secondaryFilters.map((filter) => {
            const active = filter.value === activeSecondaryFilter;

            return (
              <TouchableOpacity
                key={filter.value}
                style={[
                  styles.secondaryFilterChip,
                  active && styles.secondaryFilterChipActive,
                ]}
                activeOpacity={0.85}
                onPress={() => onSecondaryFilterChange?.(filter.value)}
              >
                <Text
                  style={[
                    styles.secondaryFilterChipText,
                    active && styles.secondaryFilterChipTextActive,
                  ]}
                >
                  {filter.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      ) : null}

      {extraFiltersContent && filtersVisible ? (
        <View style={styles.extraFiltersWrap}>{extraFiltersContent}</View>
      ) : null}

      {filtersVisible && onClearFilters && canClearFilters ? (
        <View style={styles.clearFiltersRow}>
          <TouchableOpacity
            style={styles.clearFiltersButton}
            activeOpacity={0.85}
            onPress={() => {
              onClearFilters();
              setFiltersVisible(false);
            }}
          >
            <View style={styles.clearFiltersContent}>
              <View style={styles.clearFiltersIconWrap}>
                <Ionicons
                  name="refresh-outline"
                  size={16}
                  color={theme.colors.primaryDark}
                />
              </View>

              <View style={styles.clearFiltersCopy}>
                <Text style={styles.clearFiltersTitle}>Clear Filters</Text>
                <Text style={styles.clearFiltersHint}>
                  Reset search and selected filters
                </Text>
              </View>
            </View>

            <View style={styles.clearFiltersBadge}>
              <Text style={styles.clearFiltersBadgeText}>Reset</Text>
            </View>
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  );
}

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
  searchRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  searchInput: {
    flex: 1,
    marginBottom: 0,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  filterButton: {
    width: 58,
    height: 58,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.colors.borderStrong,
    backgroundColor: theme.colors.surfaceOverlay,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadows.sm,
  },
  actionButton: {
    width: 58,
    height: 58,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.colors.borderStrong,
    backgroundColor: theme.colors.surfaceOverlay,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadows.sm,
  },
  filterButtonActive: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primarySurface,
  },
  filterActiveDot: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.primary,
  },
  filterRow: {
    gap: theme.spacing.sm,
    paddingBottom: theme.spacing.xs,
  },
  filterChip: {
    paddingHorizontal: theme.spacing.base,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radius.full,
    borderWidth: 1,
    borderColor: theme.colors.borderStrong,
    backgroundColor: theme.colors.surface,
  },
  filterChipActive: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primarySurface,
  },
  filterChipText: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: '700',
    color: theme.colors.textMuted,
    fontFamily: theme.fonts.family.sans,
  },
  filterChipTextActive: {
    color: theme.colors.primaryDark,
  },
  secondaryFilterRow: {
    gap: theme.spacing.sm,
    paddingTop: theme.spacing.sm,
  },
  secondaryFilterChip: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 7,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.surfaceMuted,
  },
  secondaryFilterChipActive: {
    backgroundColor: theme.colors.gray200,
  },
  secondaryFilterChipText: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: '700',
    color: theme.colors.textSubtle,
    fontFamily: theme.fonts.family.sans,
  },
  secondaryFilterChipTextActive: {
    color: theme.colors.text,
  },
  extraFiltersWrap: {
    marginTop: theme.spacing.sm,
  },
  clearFiltersRow: {
    marginTop: theme.spacing.sm,
  },
  clearFiltersButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.base,
    borderRadius: theme.radius.lg,
    paddingHorizontal: theme.spacing.base,
    paddingVertical: theme.spacing.md,
    backgroundColor: theme.colors.primarySurface,
    borderWidth: 1,
    borderColor: theme.colors.primarySurfaceStrong,
    ...theme.shadows.sm,
  },
  clearFiltersContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  clearFiltersIconWrap: {
    width: 38,
    height: 38,
    borderRadius: theme.radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.white,
    borderWidth: 1,
    borderColor: theme.colors.primarySurfaceStrong,
  },
  clearFiltersCopy: {
    flex: 1,
  },
  clearFiltersTitle: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: '700',
    color: theme.colors.primaryDark,
    fontFamily: theme.fonts.family.sans,
  },
  clearFiltersHint: {
    marginTop: 2,
    fontSize: 12,
    color: theme.colors.textMuted,
    fontFamily: theme.fonts.family.sans,
  },
  clearFiltersBadge: {
    borderRadius: theme.radius.full,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 7,
    backgroundColor: theme.colors.white,
    borderWidth: 1,
    borderColor: theme.colors.primarySurfaceStrong,
  },
  clearFiltersBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    color: theme.colors.primaryDark,
    fontFamily: theme.fonts.family.sans,
  },
  });
