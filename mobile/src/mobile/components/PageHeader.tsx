import React, { useMemo } from 'react';
import {
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import { AppTheme, typography, useTheme } from '../constants/theme';

interface PageHeaderProps {
  eyebrow?: string;
  showEyebrow?: boolean;
  title: string;
  subtitle?: string;
  showSubtitle?: boolean;
  leading?: React.ReactNode;
  leadingPlacement?: 'inline' | 'above';
  action?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function PageHeader({
  eyebrow,
  showEyebrow = false,
  title,
  subtitle,
  showSubtitle = false,
  leading,
  leadingPlacement = 'inline',
  action,
  style,
}: PageHeaderProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const renderCopy = () => (
    <View style={styles.copy}>
      {leading && leadingPlacement === 'above' ? (
        <View style={styles.leadingAbove}>{leading}</View>
      ) : null}
      {showEyebrow && eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
      <Text style={styles.title}>{title}</Text>
      {showSubtitle && subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );

  return (
    <View style={[styles.container, style]}>
      {leading && leadingPlacement === 'inline' ? (
        <View style={styles.leading}>{leading}</View>
      ) : null}
      {renderCopy()}
      {action ? <View style={styles.action}>{action}</View> : null}
    </View>
  );
}

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.lg,
    gap: theme.spacing.base,
  },
  copy: {
    flex: 1,
    gap: theme.spacing.xs,
  },
  leading: {
    alignSelf: 'flex-start',
  },
  leadingAbove: {
    marginBottom: theme.spacing.sm,
  },
  eyebrow: {
    alignSelf: 'flex-start',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 5,
    borderRadius: theme.radius.full,
    overflow: 'hidden',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.9,
    textTransform: 'uppercase',
    color: theme.colors.primaryDark,
    backgroundColor: theme.colors.primarySurface,
  },
  action: {
    alignSelf: 'flex-start',
  },
  title: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '700',
    letterSpacing: typography.letterSpacing.tight,
    color: theme.colors.text,
    fontFamily: theme.fonts.family.sans,
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 19,
    color: theme.colors.textMuted,
    fontFamily: theme.fonts.family.sans,
  },
  });
