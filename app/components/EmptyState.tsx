import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { theme } from '../constants/theme';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  style?: ViewStyle;
}

export const EmptyState = ({
  icon,
  title,
  description,
  action,
  style,
}: EmptyStateProps) => {
  return (
    <View
      style={[
        {
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          paddingHorizontal: 24,
          paddingVertical: 60,
        },
        style,
      ]}
    >
      {icon && <View style={{ marginBottom: 16 }}>{icon}</View>}

      <Text
        style={{
          fontSize: 18,
          fontWeight: '700',
          color: theme.colors.gray900,
          marginBottom: 8,
          textAlign: 'center',
          fontFamily: theme.fonts.family.sans,
        }}
      >
        {title}
      </Text>

      {description && (
        <Text
          style={{
            fontSize: 14,
            color: theme.colors.gray600,
            marginBottom: 24,
            textAlign: 'center',
            fontFamily: theme.fonts.family.sans,
            lineHeight: 20,
          }}
        >
          {description}
        </Text>
      )}

      {action && <View>{action}</View>}
    </View>
  );
};

const styles = StyleSheet.create({});
