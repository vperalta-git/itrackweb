import React from 'react';
import {
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import { theme } from '../constants/theme';

interface ProgressBarProps {
  progress: number;
  label?: string;
  showPercentage?: boolean;
  size?: 'small' | 'medium' | 'large';
  color?: string;
  style?: StyleProp<ViewStyle>;
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
    small: { height: 6, radius: 4 },
    medium: { height: 10, radius: 6 },
    large: { height: 14, radius: 8 },
  };

  const sizeConfig = sizeMap[size];

  return (
    <View style={style}>
      {label || showPercentage ? (
        <View style={styles.header}>
          {label ? <Text style={styles.label}>{label}</Text> : <View />}
          {showPercentage ? (
            <Text style={styles.percentage}>{clampedProgress}%</Text>
          ) : null}
        </View>
      ) : null}

      <View
        style={{
          height: sizeConfig.height,
          backgroundColor: theme.colors.surfaceMuted,
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

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.text,
    fontFamily: theme.fonts.family.sans,
  },
  percentage: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.textMuted,
    fontFamily: theme.fonts.family.sans,
  },
});
