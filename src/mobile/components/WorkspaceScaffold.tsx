import React, { useMemo } from 'react';
import {
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import { AppTheme, useTheme } from '../constants/theme';
import { AppScreen } from './AppScreen';
import AccessScopeNotice from './AccessScopeNotice';
import { PageHeader } from './PageHeader';
import { SearchFieldPlaceholder } from './SearchFieldPlaceholder';

interface WorkspaceScaffoldProps {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  toolbar?: React.ReactNode;
  scopeTitle?: string;
  scopeMessage?: string;
  searchPlaceholder?: string;
  summaryLeft?: string;
  summaryRight?: string;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  refreshing?: boolean;
  onRefresh?: () => void;
}

export function WorkspaceScaffold({
  eyebrow,
  title,
  subtitle,
  action,
  toolbar,
  scopeTitle,
  scopeMessage,
  searchPlaceholder,
  summaryLeft,
  summaryRight,
  children,
  style,
  contentStyle,
  refreshing,
  onRefresh,
}: WorkspaceScaffoldProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  return (
    <AppScreen style={style} refreshing={refreshing} onRefresh={onRefresh}>
      <PageHeader
        eyebrow={eyebrow}
        title={title}
        subtitle={subtitle}
        action={action}
      />

      {toolbar ? <View style={styles.toolbar}>{toolbar}</View> : null}

      {scopeTitle && scopeMessage ? (
        <AccessScopeNotice
          title={scopeTitle}
          message={scopeMessage}
          style={styles.notice}
        />
      ) : null}

      {!toolbar && searchPlaceholder ? (
        <SearchFieldPlaceholder
          placeholder={searchPlaceholder}
          style={styles.search}
        />
      ) : null}

      {summaryLeft || summaryRight ? (
        <View style={styles.summaryRow}>
          {summaryLeft ? <Text style={styles.summaryText}>{summaryLeft}</Text> : <View />}
          {summaryRight ? <Text style={styles.summaryText}>{summaryRight}</Text> : null}
        </View>
      ) : null}

      <View style={contentStyle}>{children}</View>
    </AppScreen>
  );
}

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
  toolbar: {
    marginBottom: theme.spacing.base,
  },
  notice: {
    marginBottom: theme.spacing.base,
  },
  search: {
    marginBottom: theme.spacing.base,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: theme.spacing.base,
    marginBottom: theme.spacing.lg,
  },
  summaryText: {
    flex: 1,
    fontSize: 12,
    color: theme.colors.textSubtle,
    fontFamily: theme.fonts.family.sans,
  },
  });
