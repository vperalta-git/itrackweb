import React, { useMemo, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppTheme, useTheme } from '../constants/theme';

interface SelectOption {
  label: string;
  value: string | number;
}

interface SelectProps {
  label?: string;
  placeholder?: string;
  value: string | number | null;
  options: SelectOption[];
  onValueChange: (value: string | number) => void;
  error?: string;
  disabled?: boolean;
  searchable?: boolean;
  searchPlaceholder?: string;
  style?: ViewStyle;
}

export const Select = ({
  label,
  placeholder = 'Select an option',
  value,
  options,
  onValueChange,
  error,
  disabled = false,
  searchable = true,
  searchPlaceholder = 'Search options',
  style,
}: SelectProps) => {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [visible, setVisible] = useState(false);
  const [searchValue, setSearchValue] = useState('');

  const selectedOption = options.find((opt) => opt.value === value);
  const filteredOptions = useMemo(() => {
    const query = searchValue.trim().toLowerCase();

    if (!query) {
      return options;
    }

    return options.filter((option) =>
      option.label.toLowerCase().includes(query)
    );
  }, [options, searchValue]);

  const containerStyle: ViewStyle = {
    marginBottom: error ? 8 : 16,
  };

  const selectContainerStyle: ViewStyle = {
    borderWidth: 1.5,
    borderColor: error
      ? theme.colors.danger
      : visible
        ? theme.colors.primary
        : theme.colors.gray300,
    borderRadius: theme.radius.md,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: disabled ? theme.colors.gray50 : theme.colors.white,
    marginTop: label ? 6 : 0,
    justifyContent: 'center',
    minHeight: 44,
  };

  return (
    <View style={[containerStyle, style]}>
      {label && (
        <Text
          style={{
            fontSize: 14,
            fontWeight: '600',
            color: theme.colors.gray700,
            marginBottom: 4,
            fontFamily: theme.fonts.family.sans,
          }}
        >
          {label}
        </Text>
      )}

      <TouchableOpacity
        onPress={() => {
          if (!disabled) {
            if (visible) {
              setVisible(false);
              setSearchValue('');
            } else {
              setSearchValue('');
              setVisible(true);
            }
          }
        }}
        disabled={disabled}
        activeOpacity={0.7}
      >
        <View style={selectContainerStyle}>
          <View style={styles.triggerRow}>
            <Text
              style={[
                styles.triggerText,
                !selectedOption && styles.triggerPlaceholder,
              ]}
            >
              {selectedOption?.label || placeholder}
            </Text>
            <Ionicons
              name={visible ? 'chevron-up-outline' : 'chevron-down-outline'}
              size={18}
              color={theme.colors.textSubtle}
            />
          </View>
        </View>
      </TouchableOpacity>

      {visible ? (
        <View style={styles.dropdownPanel}>
          {searchable ? (
            <View style={styles.searchWrap}>
              <View style={styles.searchField}>
                <Ionicons
                  name="search-outline"
                  size={18}
                  color={theme.colors.textSubtle}
                />
                <TextInput
                  value={searchValue}
                  onChangeText={setSearchValue}
                  placeholder={searchPlaceholder}
                  placeholderTextColor={theme.colors.textSubtle}
                  style={styles.searchInput}
                  selectionColor={theme.colors.primary}
                  cursorColor={theme.colors.primary}
                />
                {searchValue ? (
                  <TouchableOpacity
                    onPress={() => setSearchValue('')}
                    activeOpacity={0.85}
                  >
                    <Ionicons
                      name="close-circle"
                      size={18}
                      color={theme.colors.textSubtle}
                    />
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>
          ) : null}

          {filteredOptions.length ? (
            <ScrollView
              style={styles.optionsScroll}
              nestedScrollEnabled
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator
            >
              {filteredOptions.map((item, index) => {
                const active = value === item.value;
                const isLastItem = index === filteredOptions.length - 1;

                return (
                  <TouchableOpacity
                    key={item.value.toString()}
                    onPress={() => {
                      onValueChange(item.value);
                      setVisible(false);
                      setSearchValue('');
                    }}
                    style={[
                      styles.optionRow,
                      active && styles.optionRowActive,
                      isLastItem && styles.optionRowLast,
                    ]}
                    activeOpacity={0.85}
                  >
                    <Text style={[styles.optionText, active && styles.optionTextActive]}>
                      {item.label}
                    </Text>
                    {active ? (
                      <Ionicons
                        name="checkmark-circle"
                        size={18}
                        color={theme.colors.primary}
                      />
                    ) : null}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>No results found</Text>
              <Text style={styles.emptyText}>
                Try another keyword in the dropdown search.
              </Text>
            </View>
          )}
        </View>
      ) : null}

      {error && (
        <Text
          style={{
            fontSize: 12,
            color: theme.colors.danger,
            marginTop: 4,
            fontFamily: theme.fonts.family.sans,
          }}
        >
          {error}
        </Text>
      )}
    </View>
  );
};

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
  triggerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.base,
  },
  triggerText: {
    flex: 1,
    fontSize: 16,
    color: theme.colors.gray900,
    fontFamily: theme.fonts.family.sans,
  },
  triggerPlaceholder: {
    color: theme.colors.gray400,
  },
  dropdownPanel: {
    marginTop: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.borderStrong,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.white,
    overflow: 'hidden',
    ...theme.shadows.sm,
  },
  searchWrap: {
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 8,
  },
  searchField: {
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.borderStrong,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 12,
  },
  optionsScroll: {
    maxHeight: 240,
  },
  searchInput: {
    flex: 1,
    minHeight: 46,
    fontSize: 15,
    color: theme.colors.text,
    fontFamily: theme.fonts.family.sans,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.base,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.gray200,
    backgroundColor: theme.colors.white,
  },
  optionRowActive: {
    backgroundColor: theme.colors.gray50,
  },
  optionRowLast: {
    borderBottomWidth: 0,
  },
  optionText: {
    flex: 1,
    fontSize: 16,
    color: theme.colors.gray900,
    fontWeight: '400',
    fontFamily: theme.fonts.family.sans,
  },
  optionTextActive: {
    fontWeight: '600',
  },
  emptyState: {
    paddingHorizontal: 20,
    paddingVertical: 28,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 4,
    fontFamily: theme.fonts.family.sans,
  },
  emptyText: {
    fontSize: 13,
    lineHeight: 19,
    color: theme.colors.textMuted,
    textAlign: 'center',
    fontFamily: theme.fonts.family.sans,
  },
  });
