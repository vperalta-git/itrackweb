import React, { useMemo } from 'react';
import {
  StyleProp,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';
import { AppTheme, typography, useTheme } from '../constants/theme';

export interface SegmentedOption {
  label: string;
  value: string;
}

interface SegmentedControlProps {
  options: SegmentedOption[];
  value: string;
  onChange: (value: string) => void;
  style?: StyleProp<ViewStyle>;
}

export function SegmentedControl({
  options,
  value,
  onChange,
  style,
}: SegmentedControlProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  return (
    <View style={[styles.container, style]}>
      {options.map((option) => {
        const active = option.value === value;

        return (
          <TouchableOpacity
            key={option.value}
            style={[styles.option, active && styles.optionActive]}
            activeOpacity={0.85}
            onPress={() => onChange(option.value)}
          >
            <Text style={[styles.optionText, active && styles.optionTextActive]}>
              {option.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
  container: {
    flexDirection: 'row',
    padding: 4,
    borderRadius: theme.radius.full,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceMuted,
    marginBottom: theme.spacing.xl,
  },
  option: {
    flex: 1,
    borderRadius: theme.radius.full,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.base,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionActive: {
    backgroundColor: theme.colors.surface,
    ...theme.shadows.sm,
  },
  optionText: {
    fontSize: typography.fontSize.sm,
    fontWeight: '700',
    color: theme.colors.textSubtle,
    fontFamily: theme.fonts.family.sans,
  },
  optionTextActive: {
    color: theme.colors.text,
  },
  });
