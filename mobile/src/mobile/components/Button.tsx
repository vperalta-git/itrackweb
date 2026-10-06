import React, { useMemo } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  TextStyle,
  ViewStyle,
} from 'react-native';
import { AppTheme, useTheme } from '../constants/theme';

interface ButtonProps {
  onPress: () => void;
  title: string;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
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
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const isDisabled = disabled || loading;
  const sizeStyles: Record<NonNullable<ButtonProps['size']>, ViewStyle> = {
    small: {
      minHeight: 42,
      paddingHorizontal: theme.spacing.base,
      paddingVertical: theme.spacing.sm,
    },
    medium: {
      minHeight: 48,
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.md,
    },
    large: {
      minHeight: 56,
      paddingHorizontal: theme.spacing.xl,
      paddingVertical: theme.spacing.base,
    },
  };
  const variantStyles: Record<NonNullable<ButtonProps['variant']>, ViewStyle> = {
    primary: {
      backgroundColor: theme.colors.primary,
      borderWidth: 1,
      borderColor: theme.colors.primaryDark,
      ...theme.shadows.lg,
    },
    secondary: {
      backgroundColor: theme.colors.surfaceOverlay,
      borderWidth: 1,
      borderColor: theme.colors.borderStrong,
      ...theme.shadows.sm,
    },
    outline: {
      backgroundColor: theme.colors.surfaceTint,
      borderWidth: 1,
      borderColor: theme.colors.borderStrong,
    },
    danger: {
      backgroundColor: theme.colors.error,
      borderWidth: 1,
      borderColor: theme.colors.error,
      ...theme.shadows.md,
    },
    ghost: {
      backgroundColor: theme.colors.primarySurface,
    },
  };

  const textStyle = getTextStyle(theme, variant, size);

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        sizeStyles[size],
        variantStyles[variant],
        fullWidth && styles.fullWidth,
        isDisabled && styles.disabled,
        pressed && !isDisabled && styles.pressed,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={textStyle.color as string} size="small" />
      ) : (
        <>
          {icon}
          <Text style={textStyle}>{title}</Text>
        </>
      )}
    </Pressable>
  );
};

function getTextStyle(
  theme: AppTheme,
  variant: NonNullable<ButtonProps['variant']>,
  size: NonNullable<ButtonProps['size']>
): TextStyle {
  const sizeMap: Record<NonNullable<ButtonProps['size']>, TextStyle> = {
    small: { fontSize: 14 },
    medium: { fontSize: 15 },
    large: { fontSize: 16 },
  };

  const variantMap: Record<NonNullable<ButtonProps['variant']>, TextStyle> = {
    primary: { color: theme.colors.white },
    secondary: { color: theme.colors.text },
    outline: { color: theme.colors.text },
    danger: { color: theme.colors.white },
    ghost: { color: theme.colors.primary },
  };

  return {
    fontFamily: theme.fonts.family.sans,
    fontWeight: '700',
    textAlign: 'center',
    ...sizeMap[size],
    ...variantMap[variant],
  };
}

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    base: {
      borderRadius: 20,
      justifyContent: 'center',
      alignItems: 'center',
      flexDirection: 'row',
      gap: theme.spacing.sm,
    },
    fullWidth: {
      width: '100%',
    },
    disabled: {
      opacity: 0.55,
    },
    pressed: {
      opacity: 0.92,
      transform: [{ scale: 0.988 }],
    },
  });
