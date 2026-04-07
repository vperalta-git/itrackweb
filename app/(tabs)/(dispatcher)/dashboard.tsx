import React, { useEffect, useMemo, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useNavigation } from 'expo-router';
import {
  AppScreen,
  Card,
  EmptyState,
  PageHeader,
  StatusBadge,
} from '@/src/mobile/components';
import { theme } from '@/src/mobile/constants/theme';
import { useAuth } from '@/src/mobile/context/AuthContext';
import {
  formatRequestedServices,
  getDispatcherChecklistCompletionText,
  getDispatcherDashboardSummary,
  getNextDispatcherChecklistLabel,
  getPendingDispatcherPreparations,
  loadPreparationRecords,
  getPreparationApprovalLabel,
  getPreparationBadgeStatus,
  getPreparationRecordRequesterLabel,
  getPreparationStatusLabel,
  PreparationRecord,
} from '@/src/mobile/data/preparation';

export default function DispatcherDashboard() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [pendingPreparations, setPendingPreparations] = useState<
    PreparationRecord[]
  >(() => getPendingDispatcherPreparations(user?.id));

  useEffect(() => {
    let isActive = true;

    const refreshPreparations = async () => {
      try {
        await loadPreparationRecords();
      } finally {
        if (isActive) {
          setPendingPreparations(getPendingDispatcherPreparations(user?.id));
        }
      }
    };

    refreshPreparations().catch(() => undefined);

    const unsubscribe = navigation.addListener('focus', () => {
      refreshPreparations().catch(() => undefined);
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
      setPendingPreparations(getPendingDispatcherPreparations(user?.id));
      setRefreshing(false);
    }
  };

  const summary = useMemo(
    () => getDispatcherDashboardSummary(user?.id),
    [pendingPreparations, user?.id]
  );

  return (
    <AppScreen refreshing={refreshing} onRefresh={handleRefresh}>
      <PageHeader
        eyebrow="Dispatcher"
        title="Dispatcher Dashboard"
        subtitle="Review approved vehicle preparation endorsements and open each in-dispatch vehicle prep record for dispatcher checklist processing."
      />

      <View style={styles.statsRow}>
        {[
          {
            label: 'In Dispatch',
            value: `${summary.inDispatch}`,
            icon: 'swap-horizontal-outline',
            tint: theme.colors.infoLight,
            color: theme.colors.info,
          },
          {
            label: 'Ready for Release',
            value: `${summary.readyForRelease}`,
            icon: 'shield-checkmark-outline',
            tint: theme.colors.primarySurface,
            color: theme.colors.primary,
          },
          {
            label: 'Completed',
            value: `${summary.completed}`,
            icon: 'checkmark-done-outline',
            tint: theme.colors.successLight,
            color: theme.colors.success,
          },
        ].map((stat) => (
          <Card key={stat.label} style={styles.statCard}>
            <View style={[styles.statIconWrap, { backgroundColor: stat.tint }]}>
              <Ionicons name={stat.icon as any} size={18} color={stat.color} />
            </View>
            <Text style={styles.statValue}>{stat.value}</Text>
            <Text style={styles.statLabel}>{stat.label}</Text>
          </Card>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>In Dispatch Queue</Text>

        {pendingPreparations.length ? (
          <View style={styles.queueList}>
            {pendingPreparations.map((item) => (
              <Card
                key={item.id}
                style={styles.queueCard}
                variant="elevated"
                onPress={() =>
                  router.push({
                    pathname: '/(tabs)/(dispatcher)/checklist',
                    params: {
                      preparationId: item.id,
                    },
                  })
                }
              >
                <View style={styles.queueHeader}>
                  <View style={styles.queueTitleWrap}>
                    <Text style={styles.queueTitle}>{item.unitName}</Text>
                    <Text style={styles.queueSubtitle}>{item.variation}</Text>
                  </View>

                  <StatusBadge
                    status={getPreparationBadgeStatus(item.status)}
                    label={getPreparationStatusLabel(item.status)}
                    size="small"
                  />
                </View>

                <View style={styles.metaRow}>
                  <Ionicons
                    name="car-sport-outline"
                    size={14}
                    color={theme.colors.textSubtle}
                  />
                  <Text style={styles.metaText}>
                    Conduction No: {item.conductionNumber}
                  </Text>
                </View>

                <View style={styles.metaRow}>
                  <Ionicons
                    name="person-outline"
                    size={14}
                    color={theme.colors.textSubtle}
                  />
                  <Text style={styles.metaText}>
                    Submitted by {getPreparationRecordRequesterLabel(item)}
                  </Text>
                </View>

                <View style={styles.metaRow}>
                  <Ionicons
                    name="shield-checkmark-outline"
                    size={14}
                    color={theme.colors.textSubtle}
                  />
                  <Text style={styles.metaText}>
                    Approved by {getPreparationApprovalLabel(item)}
                  </Text>
                </View>

                <View style={styles.serviceChip}>
                  <Ionicons
                    name="checkbox-outline"
                    size={14}
                    color={theme.colors.primaryDark}
                  />
                  <Text style={styles.serviceChipLabel}>Checklist Progress</Text>
                  <Text style={styles.serviceChipValue}>
                    {getDispatcherChecklistCompletionText(item)}
                  </Text>
                </View>

                <View style={styles.metaRow}>
                  <Ionicons
                    name="list-outline"
                    size={14}
                    color={theme.colors.textSubtle}
                  />
                  <Text style={styles.metaText}>
                    Next step: {getNextDispatcherChecklistLabel(item)}
                  </Text>
                </View>

                <View style={styles.metaRow}>
                  <Ionicons
                    name="construct-outline"
                    size={14}
                    color={theme.colors.textSubtle}
                  />
                  <Text style={styles.metaText}>
                    Requested services:{' '}
                    {formatRequestedServices(
                      item.requestedServices,
                      item.customRequests
                    )}
                  </Text>
                </View>

                <View style={styles.queueFooter}>
                  <Text style={styles.queueFooterText}>
                    Tap to open dispatcher checklist
                  </Text>
                  <Ionicons
                    name="chevron-forward-outline"
                    size={16}
                    color={theme.colors.textSubtle}
                  />
                </View>
              </Card>
            ))}
          </View>
        ) : (
          <EmptyState
            title="No in-dispatch checklist"
            description="Approved vehicle preparation requests will appear here automatically after endorsement from admin or supervisor."
          />
        )}
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.xl,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
  },
  statIconWrap: {
    width: 42,
    height: 42,
    borderRadius: theme.radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.sm,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 4,
    fontFamily: theme.fonts.family.sans,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.textMuted,
    fontFamily: theme.fonts.family.sans,
  },
  section: {
    marginBottom: theme.spacing.xl,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: theme.spacing.base,
    fontFamily: theme.fonts.family.sans,
  },
  queueList: {
    gap: theme.spacing.md,
  },
  queueCard: {
    gap: theme.spacing.base,
  },
  queueHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: theme.spacing.base,
  },
  queueTitleWrap: {
    flex: 1,
  },
  queueTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 4,
    fontFamily: theme.fonts.family.sans,
  },
  queueSubtitle: {
    fontSize: 13,
    color: theme.colors.textMuted,
    fontFamily: theme.fonts.family.sans,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  metaText: {
    flex: 1,
    fontSize: 12,
    color: theme.colors.textSubtle,
    fontFamily: theme.fonts.family.sans,
  },
  serviceChip: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.primarySurface,
    borderWidth: 1,
    borderColor: theme.colors.primarySurfaceStrong,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  serviceChipLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.primaryDark,
    fontFamily: theme.fonts.family.sans,
  },
  serviceChipValue: {
    flex: 1,
    fontSize: 12,
    color: theme.colors.text,
    fontFamily: theme.fonts.family.sans,
  },
  queueFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
    paddingTop: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  queueFooterText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.text,
    fontFamily: theme.fonts.family.sans,
  },
});
