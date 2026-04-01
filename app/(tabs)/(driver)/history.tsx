import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { colors, typography, spacing, radius } from '../../constants/theme';

export default function DriverHistoryScreen() {
  const history = [
    {
      id: '1',
      vehicle: 'Tesla Model S - TS001',
      from: 'Stockyard',
      to: 'Downtown',
      status: 'completed',
      date: 'Today, 2:15 PM',
      duration: '15 mins',
    },
    {
      id: '2',
      vehicle: 'BMW 3 Series - BM002',
      from: 'Warehouse',
      to: 'Service Center',
      status: 'completed',
      date: 'Today, 10:30 AM',
      duration: '22 mins',
    },
    {
      id: '3',
      vehicle: 'Audi A4 - AU003',
      from: 'Central Hub',
      to: 'Branch Office',
      status: 'completed',
      date: 'Yesterday, 4:45 PM',
      duration: '18 mins',
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContentStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>Trip History</Text>
        </View>

        <View style={styles.list}>
          {history.map((trip) => (
            <View key={trip.id} style={styles.card}>
              <View style={styles.cardTop}>
                <View style={styles.vehicleInfo}>
                  <Text style={styles.vehicleName}>{trip.vehicle}</Text>
                  <View style={styles.routeInfo}>
                    <Text style={styles.routeText}>
                      {trip.from} → {trip.to}
                    </Text>
                  </View>
                </View>
                <View
                  style={[
                    styles.statusBadge,
                    trip.status === 'completed' &&
                      styles.statusBadgeCompleted,
                  ]}
                >
                  <Text style={styles.statusBadgeText}>
                    {trip.status.toUpperCase()}
                  </Text>
                </View>
              </View>
              <View style={styles.cardBottom}>
                <Text style={styles.date}>{trip.date}</Text>
                <Text style={styles.duration}>⏱️ {trip.duration}</Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  scrollContent: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.base,
    paddingBottom: spacing['2xl'],
  },
  header: {
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: '700',
    color: colors.gray900,
  },
  list: {
    gap: spacing.lg,
  },
  card: {
    backgroundColor: colors.gray50,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.lg,
  },
  vehicleInfo: {
    flex: 1,
  },
  vehicleName: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: colors.gray900,
    marginBottom: spacing.sm,
  },
  routeInfo: {
    backgroundColor: colors.gray100,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  routeText: {
    fontSize: typography.fontSize.sm,
    color: colors.gray700,
  },
  statusBadge: {
    backgroundColor: colors.warning,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
  },
  statusBadgeCompleted: {
    backgroundColor: colors.success,
  },
  statusBadgeText: {
    fontSize: typography.fontSize.xs,
    fontWeight: '600',
    color: colors.white,
  },
  cardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.gray200,
  },
  date: {
    fontSize: typography.fontSize.sm,
    color: colors.gray600,
  },
  duration: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    color: colors.gray900,
  },
});
