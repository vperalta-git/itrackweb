import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  FlatList,
} from 'react-native';
import { colors, typography, spacing, radius } from '../../constants/theme';

interface Vehicle {
  id: string;
  unitName: string;
  status: string;
  color: string;
}

export default function VehiclesScreen() {
  const [vehicles] = useState<Vehicle[]>([
    {
      id: '1',
      unitName: 'Tesla Model S - TS001',
      status: 'available',
      color: colors.success,
    },
    {
      id: '2',
      unitName: 'BMW 3 Series - BM002',
      status: 'in_transit',
      color: colors.info,
    },
    {
      id: '3',
      unitName: 'Audi A4 - AU003',
      status: 'maintenance',
      color: colors.warning,
    },
  ]);

  const renderVehicleCard = (vehicle: Vehicle) => (
    <View key={vehicle.id} style={styles.vehicleCard}>
      <View style={styles.vehicleHeader}>
        <View style={styles.vehicleInfo}>
          <Text style={styles.vehicleName}>{vehicle.unitName}</Text>
          <View style={styles.statusBadge}>
            <View
              style={[styles.statusDot, { backgroundColor: vehicle.color }]}
            />
            <Text style={styles.statusText}>
              {vehicle.status.replace('_', ' ').toUpperCase()}
            </Text>
          </View>
        </View>
        <TouchableOpacity style={styles.moreButton}>
          <Text style={styles.moreButtonText}>⋯</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>Vehicle Stocks</Text>
          <TouchableOpacity style={styles.addButton}>
            <Text style={styles.addButtonText}>+ Add Vehicle</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.searchBar}>
          <Text style={styles.searchPlaceholder}>🔍 Search vehicles...</Text>
        </View>

        <View style={styles.vehiclesList}>
          {vehicles.map((vehicle) => renderVehicleCard(vehicle))}
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
  searchBar: {
    backgroundColor: colors.gray100,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    marginBottom: spacing.lg,
  },
  searchPlaceholder: {
    color: colors.gray500,
    fontSize: typography.fontSize.base,
  },
  vehiclesList: {
    gap: spacing.lg,
  },
  vehicleCard: {
    backgroundColor: colors.gray50,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  vehicleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: spacing.sm,
  },
  statusText: {
    fontSize: typography.fontSize.xs,
    fontWeight: '600',
    color: colors.gray700,
  },
  moreButton: {
    padding: spacing.sm,
  },
  moreButtonText: {
    fontSize: typography.fontSize.lg,
    color: colors.gray500,
  },
});
