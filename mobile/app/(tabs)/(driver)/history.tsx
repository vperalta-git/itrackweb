import React from 'react';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  AppScreen,
  Card,
  EmptyState,
  LoadingSpinner,
  PageHeader,
  StatusBadge,
} from '@/src/mobile/components';
import { theme } from '@/src/mobile/constants/theme';
import { useAuth } from '@/src/mobile/context/AuthContext';
import {
  DriverAllocationRecord,
  formatDriverAllocationDuration,
  formatDriverAllocationHistoryDateTime,
  getDriverAllocationHistoryRecords,
  loadDriverAllocations,
} from '@/src/mobile/data/driver-allocation';

export default function DriverHistoryScreen() {
  const { user } = useAuth();
  const [history, setHistory] = React.useState<DriverAllocationRecord[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isRefreshing, setIsRefreshing] = React.useState(false);

  const syncHistory = React.useCallback(
    async (options?: { refresh?: boolean }) => {
      if (!user?.id) {
        setHistory([]);
        setIsLoading(false);
        setIsRefreshing(false);
        return;
      }

      if (options?.refresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      try {
        await loadDriverAllocations();
      } catch (error) {
        console.error('Unable to refresh driver trip history:', error);
      } finally {
        setHistory(getDriverAllocationHistoryRecords(user.id));
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [user?.id]
  );

  useFocusEffect(
    React.useCallback(() => {
      void syncHistory();
    }, [syncHistory])
  );

  return (
    <AppScreen
      refreshing={isRefreshing}
      onRefresh={() => {
        void syncHistory({ refresh: true });
      }}
    >
      <PageHeader
        eyebrow="Driver"
        title="Trip History"
        subtitle="See your recent completed trips and route timings."
      />

      {isLoading ? (
        <View style={styles.loadingWrap}>
          <LoadingSpinner size="large" />
          <Text style={styles.loadingText}>Loading your completed trips...</Text>
        </View>
      ) : history.length === 0 ? (
        <EmptyState
          icon={
            <Ionicons
              name="time-outline"
              size={26}
              color={theme.colors.primary}
            />
          }
          title="No completed trips yet"
          description="Completed driver bookings will appear here once you finish a trip."
        />
      ) : (
        <View style={styles.list}>
          {history.map((trip) => {
            const vehicleLabel = [trip.unitName, trip.variation]
              .filter(Boolean)
              .join(' ');

            return (
              <Card key={trip.id} style={styles.card}>
                <View style={styles.cardTop}>
                  <View style={styles.copy}>
                    <Text style={styles.title}>
                      {[vehicleLabel, trip.conductionNumber].filter(Boolean).join(' - ')}
                    </Text>
                    <Text style={styles.route}>
                      {trip.pickupLabel} to {trip.destinationLabel}
                    </Text>
                  </View>
                  <StatusBadge status="completed" label="Completed" />
                </View>

                <View style={styles.metaRow}>
                  <View style={styles.metaChip}>
                    <Text style={styles.metaLabel}>Driver</Text>
                    <Text style={styles.metaValue}>{trip.driverName}</Text>
                  </View>
                  <View style={styles.metaChip}>
                    <Text style={styles.metaLabel}>Manager</Text>
                    <Text style={styles.metaValue}>
                      {trip.managerName || 'Unassigned'}
                    </Text>
                  </View>
                </View>

                <View style={styles.cardFooter}>
                  <Text style={styles.date}>
                    {formatDriverAllocationHistoryDateTime(trip)}
                  </Text>
                  <Text style={styles.duration}>
                    {formatDriverAllocationDuration(trip)}
                  </Text>
                </View>
              </Card>
            );
          })}
        </View>
      )}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: theme.spacing.md,
  },
  loadingWrap: {
    flex: 1,
    minHeight: 260,
    justifyContent: 'center',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  loadingText: {
    fontSize: 14,
    color: theme.colors.textMuted,
    fontFamily: theme.fonts.family.sans,
  },
  card: {
    marginBottom: theme.spacing.md,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: theme.spacing.base,
    marginBottom: theme.spacing.base,
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
  route: {
    fontSize: 14,
    color: theme.colors.textMuted,
    fontFamily: theme.fonts.family.sans,
  },
  metaRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.base,
  },
  metaChip: {
    flex: 1,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.surfaceOverlay,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  metaLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: theme.colors.textSubtle,
    marginBottom: 4,
    fontFamily: theme.fonts.family.sans,
  },
  metaValue: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.text,
    fontFamily: theme.fonts.family.sans,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: theme.spacing.base,
    paddingTop: theme.spacing.base,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  date: {
    fontSize: 13,
    color: theme.colors.textSubtle,
    fontFamily: theme.fonts.family.sans,
  },
  duration: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.text,
    fontFamily: theme.fonts.family.sans,
  },
});
