import React from 'react';
import { View, StyleSheet, ViewStyle, Pressable } from 'react-native';
import { theme } from '../constants/theme';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  padding?: 'small' | 'medium' | 'large';
  variant?: 'default' | 'elevated' | 'outlined';
  onPress?: () => void;
  disabled?: boolean;
}

export const Card = ({
  children,
  style,
  padding = 'medium',
  variant = 'default',
  onPress,
  disabled = false,
}: CardProps) => {
  const paddingMap = {
    small: 12,
    medium: 16,
    large: 20,
  };

  const paddingValue = paddingMap[padding];

  const baseStyle: ViewStyle = {
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.white,
    padding: paddingValue,
  };

  const variantStyle: ViewStyle = {
    default: {
      backgroundColor: theme.colors.white,
      borderWidth: 1,
      borderColor: theme.colors.gray200,
    },
    elevated: {
      backgroundColor: theme.colors.white,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    outlined: {
      backgroundColor: theme.colors.white,
      borderWidth: 1.5,
      borderColor: theme.colors.primary,
    },
  };

  const cardStyle: ViewStyle = {
    ...baseStyle,
    ...variantStyle[variant],
  };

  const Component = onPress ? Pressable : View;

  return (
    <Component
      style={({ pressed }) => [
        cardStyle,
        style,
        onPress && pressed && !disabled
          ? { opacity: 0.7 }
          : { opacity: disabled ? 0.6 : 1 },
      ]}
      onPress={onPress}
      disabled={disabled || !onPress}
    >
      {children}
    </Component>
  );
};

const styles = StyleSheet.create({});
