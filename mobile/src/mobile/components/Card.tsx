import React, { useMemo } from 'react';
import {
  Pressable,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import { AppTheme, useTheme } from '../constants/theme';

interface CardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  padding?: 'small' | 'medium' | 'large';
  variant?: 'default' | 'elevated' | 'outlined';
  onPress?: () => void;
  disabled?: boolean;
}

const paddingMap = {
  small: 12,
  medium: 14,
  large: 18,
};

export const Card = ({
  children,
  style,
  padding = 'medium',
  variant = 'default',
  onPress,
  disabled = false,
}: CardProps) => {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const variantMap: Record<NonNullable<CardProps['variant']>, ViewStyle> = {
    default: {
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      ...theme.shadows.sm,
    },
    elevated: {
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.borderStrong,
      ...theme.shadows.md,
    },
    outlined: {
      backgroundColor: theme.colors.primarySurface,
      borderWidth: 1,
      borderColor: theme.colors.borderStrong,
    },
  };
  const cardStyle: ViewStyle = {
    borderRadius: 22,
    padding: paddingMap[padding],
    ...variantMap[variant],
  };

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        disabled={disabled}
        style={({ pressed }) => [
          cardStyle,
          pressed && !disabled ? styles.pressed : null,
          disabled ? styles.disabled : null,
          style,
        ]}
      >
        {children}
      </Pressable>
    );
  }

  return <View style={[cardStyle, style]}>{children}</View>;
};

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
  pressed: {
    opacity: 0.96,
    transform: [{ scale: 0.995 }],
  },
  disabled: {
    opacity: 0.6,
  },
  });
