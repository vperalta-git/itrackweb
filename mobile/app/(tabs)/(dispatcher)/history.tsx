import React, { useEffect, useMemo, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  AppScreen,
  Card,
  EmptyState,
  PageHeader,
  StatusBadge,
} from '@/src/mobile/components';
import { AppTheme, useTheme } from '@/src/mobile/constants/theme';
import { useAuth } from '@/src/mobile/context/AuthContext';
import { useNavigation } from 'expo-router';
import {
  formatRequestedServices,
  getCompletedDispatcherPreparations,
  getPreparationBadgeStatus,
  getPreparationRecordCompletionLabel,
  getPreparationStatusLabel,
  loadPreparationRecords,
  PreparationRecord,
} from '@/src/mobile/data/preparation';

export default function HistoryScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [refreshing, setRefreshing] = useState(false);
  const [history, setHistory] = useState<PreparationRecord[]>(() =>
    getCompletedDispatcherPreparations(user?.id)
  );

  useEffect(() => {
    let isActive = true;

    const refreshHistory = async () => {
      try {
        await loadPreparationRecords();
      } finally {
        if (isActive) {
          setHistory(getCompletedDispatcherPreparations(user?.id));
        }
      }
    };

    refreshHistory().catch(() => undefined);

    const unsubscribe = navigation.addListener('focus', () => {
      refreshHistory().catch(() => undefined);
    });

    return () => {
      isActive = false;
      unsubscribe();
    };
  }, [navigation, user?.id]);

  const handleRefresh = async () => {
    setRefreshing(true);

    try {
      await loadPreparationRecords();
    } finally {
      setHistory(getCompletedDispatcherPreparations(user?.id));
      setRefreshing(false);
    }
  };

  return (
    <AppScreen refreshing={refreshing} onRefresh={handleRefresh}>
      <PageHeader
        eyebrow="Dispatcher"
        title="Dispatch History"
        subtitle="Review dispatcher checklist records that are already marked ready for release or fully completed."
      />

      <View style={styles.list}>
        {history.length ? (
          history.map((item) => (
            <Card key={item.id} style={styles.card}>
              <View style={styles.cardTop}>
                <View style={styles.copy}>
                  <Text style={styles.title}>{item.unitName}</Text>
                  <Text style={styles.subtitle}>{item.variation}</Text>
                </View>
                <StatusBadge
                  status={getPreparationBadgeStatus(item.status)}
                  label={getPreparationStatusLabel(item.status)}
                />
              </View>

              <Text style={styles.services}>
                {formatRequestedServices(
                  item.requestedServices,
                  item.customRequests
                )}
              </Text>

              <View style={styles.cardFooter}>
                <Text style={styles.duration}>
                  {getPreparationRecordCompletionLabel(item)}
                </Text>
              </View>
            </Card>
          ))
        ) : (
          <EmptyState
            title="No completed dispatch checklist yet"
            description="Completed dispatcher vehicle preparation checklists will appear here."
          />
        )}
      </View>
    </AppScreen>
  );
}

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
  list: {
    gap: theme.spacing.md,
  },
  card: {
    marginBottom: theme.spacing.md,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: theme.spacing.base,
    marginBottom: theme.spacing.sm,
  },
  copy: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 4,
    fontFamily: theme.fonts.family.sans,
  },
  subtitle: {
    fontSize: 13,
    color: theme.colors.textMuted,
    fontFamily: theme.fonts.family.sans,
  },
  services: {
    fontSize: 13,
    lineHeight: 19,
    color: theme.colors.text,
    fontFamily: theme.fonts.family.sans,
  },
  cardFooter: {
    paddingTop: theme.spacing.base,
    marginTop: theme.spacing.base,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  duration: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.text,
    fontFamily: theme.fonts.family.sans,
  },
  });
