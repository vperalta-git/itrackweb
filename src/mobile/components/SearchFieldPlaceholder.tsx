import React, { useMemo } from 'react';
import {
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppTheme, typography, useTheme } from '../constants/theme';

interface SearchFieldPlaceholderProps {
  placeholder: string;
  style?: StyleProp<ViewStyle>;
}

export function SearchFieldPlaceholder({
  placeholder,
  style,
}: SearchFieldPlaceholderProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  return (
    <View style={[styles.container, style]}>
      <Ionicons
        name="search-outline"
        size={18}
        color={theme.colors.textSubtle}
      />
      <Text style={styles.placeholder}>{placeholder}</Text>
    </View>
  );
}

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    borderRadius: 18,
    backgroundColor: theme.colors.surfaceMuted,
    paddingHorizontal: theme.spacing.base,
    paddingVertical: 14,
  },
  placeholder: {
    flex: 1,
    fontSize: typography.fontSize.sm,
    color: theme.colors.textSubtle,
    fontFamily: theme.fonts.family.sans,
  },
  });
