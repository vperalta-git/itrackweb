import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { theme } from '../constants/theme';

interface ButtonProps {
  onPress: () => void;
  title: string;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  fullWidth?: boolean;
  style?: ViewStyle;
}

export const Button = ({
  onPress,
  title,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  icon,
  fullWidth = false,
  style,
}: ButtonProps) => {
  const isDisabled = disabled || loading;

  const getButtonStyle = (): ViewStyle => {
    const baseStyle = {
      borderRadius: theme.radius.md,
      justifyContent: 'center',
      alignItems: 'center',
      flexDirection: 'row' as const,
      gap: 8,
    };

    const sizeStyle = {
      small: { paddingVertical: 8, paddingHorizontal: 16, minHeight: 36 },
      medium: { paddingVertical: 12, paddingHorizontal: 20, minHeight: 44 },
      large: { paddingVertical: 16, paddingHorizontal: 24, minHeight: 52 },
    };

    const variantStyle = {
      primary: {
        backgroundColor: isDisabled ? theme.colors.gray200 : theme.colors.primary,
      },
      secondary: {
        backgroundColor: isDisabled ? theme.colors.gray200 : theme.colors.secondary,
      },
      outline: {
        backgroundColor: 'transparent',
        borderWidth: 1.5,
        borderColor: isDisabled ? theme.colors.gray300 : theme.colors.primary,
      },
      danger: {
        backgroundColor: isDisabled ? theme.colors.gray200 : theme.colors.danger,
      },
      ghost: {
        backgroundColor: 'transparent',
      },
    };

    return {
      ...baseStyle,
      ...sizeStyle[size],
      ...variantStyle[variant],
      width: fullWidth ? '100%' : 'auto',
    };
  };

  const getTextStyle = (): TextStyle => {
    const baseStyle = {
      fontFamily: theme.fonts.family.sans,
      fontWeight: '600' as const,
      textAlign: 'center' as const,
    };

    const sizeStyle = {
      small: { fontSize: 14 },
      medium: { fontSize: 16 },
      large: { fontSize: 18 },
    };

    const variantStyle = {
      primary: { color: theme.colors.white },
      secondary: { color: theme.colors.white },
      outline: { color: isDisabled ? theme.colors.gray500 : theme.colors.primary },
      danger: { color: theme.colors.white },
      ghost: { color: isDisabled ? theme.colors.gray500 : theme.colors.primary },
    };

    return {
      ...baseStyle,
      ...sizeStyle[size],
      ...variantStyle[variant],
    };
  };

  return (
    <TouchableOpacity
      style={[getButtonStyle(), style]}
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={isDisabled ? 1 : 0.7}
    >
      {loading ? (
        <ActivityIndicator color={getTextStyle().color as string} size="small" />
      ) : (
        <>
          {icon}
          <Text style={getTextStyle()}>{title}</Text>
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({});
