import React, { useMemo } from 'react';
import {
  StyleProp,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';
import { AppTheme, useTheme } from '../constants/theme';

interface HeaderProps {
  title: string;
  subtitle?: string;
  showSubtitle?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  onLeftPress?: () => void;
  onRightPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

export const Header = ({
  title,
  subtitle,
  showSubtitle = false,
  leftIcon,
  rightIcon,
  onLeftPress,
  onRightPress,
  style,
}: HeaderProps) => {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  return (
    <View style={[styles.container, style]}>
      <TouchableOpacity
        onPress={onLeftPress}
        disabled={!onLeftPress}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        style={[styles.iconButton, !leftIcon && styles.iconButtonHidden]}
      >
        {leftIcon}
      </TouchableOpacity>

      <View style={styles.copy}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        {showSubtitle && subtitle ? (
          <Text style={styles.subtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>

      <TouchableOpacity
        onPress={onRightPress}
        disabled={!onRightPress}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        style={[styles.iconButton, !rightIcon && styles.iconButtonHidden]}
      >
        {rightIcon}
      </TouchableOpacity>
    </View>
  );
};

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.base,
    backgroundColor: theme.colors.backgroundAlt,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: theme.radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  iconButtonHidden: {
    opacity: 0,
  },
  copy: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: theme.spacing.base,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text,
    fontFamily: theme.fonts.family.sans,
  },
  subtitle: {
    marginTop: 2,
    fontSize: 12,
    color: theme.colors.textMuted,
    fontFamily: theme.fonts.family.sans,
  },
  });
