import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { theme } from '../constants/theme';

interface ProgressBarProps {
  progress: number; // 0-100
  label?: string;
  showPercentage?: boolean;
  size?: 'small' | 'medium' | 'large';
  color?: string;
  style?: ViewStyle;
}

export const ProgressBar = ({
  progress,
  label,
  showPercentage = true,
  size = 'medium',
  color = theme.colors.primary,
  style,
}: ProgressBarProps) => {
  const clampedProgress = Math.min(Math.max(progress, 0), 100);

  const sizeMap = {
    small: { height: 4, radius: 2 },
    medium: { height: 8, radius: 4 },
    large: { height: 12, radius: 6 },
  };

  const sizeConfig = sizeMap[size];

  return (
    <View style={style}>
      {(label || showPercentage) && (
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 8,
          }}
        >
          {label && (
            <Text
              style={{
                fontSize: 14,
                fontWeight: '600',
                color: theme.colors.gray900,
                fontFamily: theme.fonts.family.sans,
              }}
            >
              {label}
            </Text>
          )}
          {showPercentage && (
            <Text
              style={{
                fontSize: 14,
                fontWeight: '600',
                color: theme.colors.gray600,
                fontFamily: theme.fonts.family.sans,
              }}
            >
              {clampedProgress}%
            </Text>
          )}
        </View>
      )}

      <View
        style={{
          height: sizeConfig.height,
          backgroundColor: theme.colors.gray200,
          borderRadius: sizeConfig.radius,
          overflow: 'hidden',
        }}
      >
        <View
          style={{
            height: '100%',
            width: `${clampedProgress}%`,
            backgroundColor: color,
            borderRadius: sizeConfig.radius,
          }}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({});
