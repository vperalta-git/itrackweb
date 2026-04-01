import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { theme } from '../constants/theme';

interface StatusBadgeProps {
  status: 'active' | 'inactive' | 'pending' | 'completed' | 'cancelled' | 'error';
  label: string;
  size?: 'small' | 'medium' | 'large';
  style?: ViewStyle;
}

const statusConfig = {
  active: {
    backgroundColor: '#dcfce7',
    color: '#166534',
    dotColor: '#22c55e',
  },
  inactive: {
    backgroundColor: '#f3f4f6',
    color: '#4b5563',
    dotColor: '#9ca3af',
  },
  pending: {
    backgroundColor: '#fef3c7',
    color: '#92400e',
    dotColor: '#fbbf24',
  },
  completed: {
    backgroundColor: '#d1fae5',
    color: '#065f46',
    dotColor: '#10b981',
  },
  cancelled: {
    backgroundColor: '#fee2e2',
    color: '#991b1b',
    dotColor: '#ef4444',
  },
  error: {
    backgroundColor: '#fee2e2',
    color: '#991b1b',
    dotColor: '#dc2626',
  },
};

export const StatusBadge = ({
  status,
  label,
  size = 'medium',
  style,
}: StatusBadgeProps) => {
  const config = statusConfig[status];

  const sizeMap = {
    small: { fontSize: 12, padding: 6, dotSize: 4 },
    medium: { fontSize: 13, padding: 8, dotSize: 6 },
    large: { fontSize: 14, padding: 10, dotSize: 8 },
  };

  const sizeConfig = sizeMap[size];

  return (
    <View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
          paddingHorizontal: sizeConfig.padding,
          paddingVertical: sizeConfig.padding / 2,
          borderRadius: theme.radius.full,
          backgroundColor: config.backgroundColor,
          alignSelf: 'flex-start',
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
          fontWeight: '600',
          color: config.color,
          fontFamily: theme.fonts.family.sans,
        }}
      >
        {label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({});
