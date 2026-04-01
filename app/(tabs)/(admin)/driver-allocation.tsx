import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
} from 'react-native';
import { router } from 'expo-router';
import { colors, typography, spacing, radius } from '../../constants/theme';

export default function DriverAllocationScreen() {
  const allocations = [
    {
      id: '1',
      vehicle: 'Tesla Model S - TS001',
      driver: 'John Smith',
      status: 'in_transit',
      eta: '15 mins',
    },
    {
      id: '2',
      vehicle: 'BMW 3 Series - BM002',
      driver: 'Sarah Johnson',
      status: 'completed',
      eta: '-',
    },
    {
      id: '3',
      vehicle: 'Audi A4 - AU003',
      driver: 'Mike Brown',
      status: 'pending',
      eta: '45 mins',
    },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'in_transit':
        return colors.info;
      case 'completed':
        return colors.success;
      case 'pending':
        return colors.warning;
      default:
        return colors.gray400;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>Driver Allocations</Text>
          <TouchableOpacity style={styles.addButton}>
            <Text style={styles.addButtonText}>+ New Allocation</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.list}>
          {allocations.map((allocation) => (
            <TouchableOpacity
              key={allocation.id}
              style={styles.card}
              onPress={() =>
                router.push(
                  `/(tabs)/(admin)/driver-allocation/${allocation.id}`
                )
              }
            >
              <View style={styles.cardTop}>
                <View style={styles.cardInfo}>
                  <Text style={styles.vehicleName}>{allocation.vehicle}</Text>
                  <Text style={styles.driverName}>🚗 {allocation.driver}</Text>
                </View>
                <View
                  style={[
                    styles.statusBadge,
                    {
                      backgroundColor: getStatusColor(allocation.status),
                    },
                  ]}
                >
                  <Text style={styles.statusBadgeText}>
                    {allocation.status.replace('_', ' ').toUpperCase()}
                  </Text>
                </View>
              </View>
              <View style={styles.etaContainer}>
                <Text style={styles.etaLabel}>ETA: {allocation.eta}</Text>
                <Text style={styles.mapLink}>View Map →</Text>
              </View>
            </TouchableOpacity>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: '700',
    color: colors.gray900,
  },
  addButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
  },
  addButtonText: {
    color: colors.white,
    fontWeight: '600',
    fontSize: typography.fontSize.sm,
  },
  list: {
    gap: spacing.lg,
  },
  card: {
    backgroundColor: colors.gray50,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.lg,
  },
  cardInfo: {
    flex: 1,
  },
  vehicleName: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: colors.gray900,
    marginBottom: spacing.sm,
  },
  driverName: {
    fontSize: typography.fontSize.sm,
    color: colors.gray600,
  },
  statusBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
  },
  statusBadgeText: {
    fontSize: typography.fontSize.xs,
    fontWeight: '600',
    color: colors.white,
  },
  etaContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.gray200,
  },
  etaLabel: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    color: colors.gray900,
  },
  mapLink: {
    fontSize: typography.fontSize.sm,
    color: colors.primary,
    fontWeight: '600',
  },
});
