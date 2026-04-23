import React, { useMemo } from 'react';
import {
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppTheme, useTheme } from '../constants/theme';
import { Card } from './Card';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

interface FilterSummaryItem {
  label: string;
  value: string;
  iconName?: IoniconName;
  iconColor?: string;
  dotColor?: string;
}

interface FilterSummaryCardProps {
  title?: string;
  value: string;
  iconName: IoniconName;
  items: FilterSummaryItem[];
  style?: StyleProp<ViewStyle>;
}

export function FilterSummaryCard({
  title,
  value,
  iconName,
  items,
  style,
}: FilterSummaryCardProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  return (
    <Card style={style} variant="elevated" padding="large">
      <View style={styles.header}>
        <View style={styles.headerIconWrap}>
          <Ionicons
            name={iconName}
            size={18}
            color={theme.colors.primaryDark}
          />
        </View>

        <View style={styles.headerCopy}>
          {title ? <Text style={styles.headerLabel}>{title}</Text> : null}
          <Text style={[styles.headerValue, !title ? styles.headerValueStandalone : null]}>
            {value}
          </Text>
        </View>
      </View>

      <View style={styles.itemsWrap}>
        {items.map((item, index) => (
          <View
            key={`${item.label}-${index}`}
            style={[styles.itemRow, index > 0 ? styles.itemRowDivider : null]}
          >
            <View style={styles.itemMeta}>
              <View style={styles.itemIconWrap}>
                {item.dotColor ? (
                  <View
                    style={[
                      styles.itemDot,
                      {
                        backgroundColor: item.dotColor,
                      },
                    ]}
                  />
                ) : (
                  <Ionicons
                    name={item.iconName ?? 'pricetag-outline'}
                    size={15}
                    color={item.iconColor ?? theme.colors.textSubtle}
                  />
                )}
              </View>
              <Text style={styles.itemLabel}>{item.label}</Text>
            </View>

            <Text style={styles.itemValue}>{item.value}</Text>
          </View>
        ))}
      </View>
    </Card>
  );
}

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.base,
  },
  headerIconWrap: {
    width: 42,
    height: 42,
    borderRadius: theme.radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primarySurface,
    borderWidth: 1,
    borderColor: theme.colors.primarySurfaceStrong,
  },
  headerCopy: {
    flex: 1,
  },
  headerLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: theme.colors.textSubtle,
    fontFamily: theme.fonts.family.sans,
  },
  headerValue: {
    marginTop: 3,
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.text,
    fontFamily: theme.fonts.family.sans,
  },
  headerValueStandalone: {
    marginTop: 0,
  },
  itemsWrap: {
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surfaceMuted,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: 'hidden',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.base,
    paddingHorizontal: theme.spacing.base,
    paddingVertical: theme.spacing.md,
  },
  itemRowDivider: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  itemMeta: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  itemIconWrap: {
    width: 28,
    height: 28,
    borderRadius: theme.radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.white,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  itemDot: {
    width: 10,
    height: 10,
    borderRadius: theme.radius.full,
  },
  itemLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.textSubtle,
    fontFamily: theme.fonts.family.sans,
  },
  itemValue: {
    flexShrink: 1,
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.text,
    textAlign: 'right',
    fontFamily: theme.fonts.family.sans,
  },
  });
