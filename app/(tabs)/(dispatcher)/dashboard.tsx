import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
} from 'react-native';
import { router } from 'expo-router';
import { theme } from '../../constants/theme';
import { MapViewComponent } from '../../components/MapView';
import LocationTracker from '../../utils/locationTracker';

export default function DispatcherDashboard() {
  const stats = [
    { label: 'Pending', value: '5', icon: '⏳' },
    { label: 'In Progress', value: '3', icon: '🔄' },
    { label: 'Completed', value: '12', icon: '✓' },
  ];

  // Get drivers for display
  const drivers = LocationTracker.getDriversForDisplay(
    ['driver-1', 'driver-2', 'driver-3'],
    {
      'driver-1': 'John Doe',
      'driver-2': 'Jane Smith',
      'driver-3': 'Mike Johnson',
    },
    {
      'driver-1': 'active',
      'driver-2': 'active',
      'driver-3': 'inactive',
    }
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.greeting}>Dispatcher Dashboard</Text>
          <Text style={styles.subtitle}>Live Driver Tracking</Text>
        </View>

        {/* Live Tracking Map */}
        <MapViewComponent
          markers={drivers}
          initialRegion={{
            latitude: 40.7128,
            longitude: -74.006,
            latitudeDelta: 0.1,
            longitudeDelta: 0.1,
          }}
          style={styles.mapContainer}
          showScale
        />

        {/* Stats */}
        <View style={styles.statsContainer}>
          {stats.map((stat, index) => (
            <View key={index} style={styles.statCard}>
              <Text style={styles.statIcon}>{stat.icon}</Text>
              <Text style={styles.statValue}>{stat.value}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push('/(tabs)/(dispatcher)/checklist')}
          >
            <Text style={styles.actionIcon}>✓</Text>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>Vehicle Checklist</Text>
              <Text style={styles.actionSubtitle}>Mark preparation steps</Text>
            </View>
            <Text style={styles.arrowIcon}>→</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push('/(tabs)/(dispatcher)/history')}
          >
            <Text style={styles.actionIcon}>📋</Text>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>Dispatch History</Text>
              <Text style={styles.actionSubtitle}>View past dispatches</Text>
            </View>
            <Text style={styles.arrowIcon}>→</Text>
          </TouchableOpacity>
        </View>

        {/* Recent Tasks */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Tasks</Text>
          {[1, 2, 3].map((_, index) => (
            <View key={index} style={styles.taskCard}>
              <View style={styles.taskDot} />
              <View style={styles.taskContent}>
                <Text style={styles.taskTitle}>Prepare Vehicle TSL-001</Text>
                <Text style={styles.taskTime}>In progress • 2 hours</Text>
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
    backgroundColor: theme.colors.white,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24,
  },
  header: {
    marginBottom: 20,
  },
  greeting: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.gray900,
    marginBottom: 4,
    fontFamily: theme.fonts.family.sans,
  },
  subtitle: {
    fontSize: 14,
    color: theme.colors.gray600,
    fontFamily: theme.fonts.family.sans,
  },
  mapContainer: {
    marginBottom: 20,
    height: 300,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: theme.colors.gray50,
    borderRadius: theme.radius.lg,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  statIcon: {
    fontSize: 28,
    marginBottom: 8,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.gray900,
    marginBottom: 4,
    fontFamily: theme.fonts.family.sans,
  },
  statLabel: {
    fontSize: 12,
    color: theme.colors.gray600,
    fontFamily: theme.fonts.family.sans,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.gray900,
    marginBottom: 12,
    fontFamily: theme.fonts.family.sans,
  },
  actionCard: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.lg,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  actionIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  actionContent: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.white,
    marginBottom: 4,
    fontFamily: theme.fonts.family.sans,
  },
  actionSubtitle: {
    fontSize: 12,
    color: theme.colors.gray100,
    fontFamily: theme.fonts.family.sans,
  },
  arrowIcon: {
    fontSize: 16,
    color: theme.colors.white,
    fontWeight: '700',
  },
  taskCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: theme.colors.gray50,
    borderRadius: theme.radius.lg,
    marginBottom: 12,
  },
  taskDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.primary,
    marginRight: 12,
  },
  taskContent: {
    flex: 1,
  },
  taskTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.gray900,
    fontFamily: theme.fonts.family.sans,
  },
  taskTime: {
    fontSize: 12,
    color: theme.colors.gray600,
    marginTop: 4,
    fontFamily: theme.fonts.family.sans,
  },
});
