import React, { useMemo } from 'react';
import {
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import { AppTheme, useTheme } from '../constants/theme';

interface StatusBadgeProps {
  status:
    | 'active'
    | 'inactive'
    | 'pending'
    | 'completed'
    | 'cancelled'
    | 'error'
    | 'available'
    | 'in_transit'
    | 'verified'
    | 'maintenance'
    | 'confirmed'
    | 'assigned';
  label: string;
  size?: 'small' | 'medium' | 'large';
  style?: StyleProp<ViewStyle>;
}

export const StatusBadge = ({
  status,
  label,
  size = 'medium',
  style,
}: StatusBadgeProps) => {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const statusConfig = {
    active: {
      backgroundColor: theme.colors.infoLight,
      color: theme.colors.info,
      dotColor: theme.colors.info,
    },
    inactive: {
      backgroundColor: theme.colors.surfaceMuted,
      color: theme.colors.textMuted,
      dotColor: theme.colors.textSubtle,
    },
    pending: {
      backgroundColor: theme.colors.warningLight,
      color: theme.colors.warning,
      dotColor: theme.colors.warning,
    },
    completed: {
      backgroundColor: theme.colors.successLight,
      color: theme.colors.success,
      dotColor: theme.colors.success,
    },
    cancelled: {
      backgroundColor: theme.colors.errorLight,
      color: theme.colors.error,
      dotColor: theme.colors.error,
    },
    error: {
      backgroundColor: theme.colors.errorLight,
      color: theme.colors.error,
      dotColor: theme.colors.error,
    },
    available: {
      backgroundColor: theme.colors.successLight,
      color: theme.colors.success,
      dotColor: theme.colors.success,
    },
    in_transit: {
      backgroundColor: theme.colors.infoLight,
      color: theme.colors.info,
      dotColor: theme.colors.info,
    },
    verified: {
      backgroundColor: theme.colors.successLight,
      color: theme.colors.success,
      dotColor: theme.colors.success,
    },
    maintenance: {
      backgroundColor: theme.colors.surfaceMuted,
      color: theme.colors.textMuted,
      dotColor: theme.colors.textSubtle,
    },
    confirmed: {
      backgroundColor: theme.colors.successLight,
      color: theme.colors.success,
      dotColor: theme.colors.success,
    },
    assigned: {
      backgroundColor: theme.colors.primarySurface,
      color: theme.colors.primaryDark,
      dotColor: theme.colors.primary,
    },
  } as const;
  const config = statusConfig[status] ?? statusConfig.inactive;

  const sizeMap = {
    small: { fontSize: 11, paddingX: 8, paddingY: 5, dotSize: 5 },
    medium: { fontSize: 12, paddingX: 10, paddingY: 6, dotSize: 6 },
    large: { fontSize: 13, paddingX: 12, paddingY: 8, dotSize: 7 },
  };

  const sizeConfig = sizeMap[size];

  return (
    <View
      style={[
        styles.base,
        {
          backgroundColor: config.backgroundColor,
          paddingHorizontal: sizeConfig.paddingX,
          paddingVertical: sizeConfig.paddingY,
        },
        style,
      ]}
    >
      <View
        style={{
          width: sizeConfig.dotSize,
          height: sizeConfig.dotSize,
          borderRadius: sizeConfig.dotSize / 2,
          backgroundColor: config.dotColor,
        }}
      />
      <Text
        style={{
          fontSize: sizeConfig.fontSize,
          fontWeight: '700',
          color: config.color,
          fontFamily: theme.fonts.family.sans,
        }}
      >
        {label}
      </Text>
    </View>
  );
};

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: theme.radius.full,
    borderWidth: 1,
    borderColor: 'rgba(21, 19, 17, 0.06)',
    alignSelf: 'flex-start',
  },
  });
