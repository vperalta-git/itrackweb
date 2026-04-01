import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { colors, typography, spacing, radius } from '../../constants/theme';

export default function AdminDashboard() {
  const { user } = useAuth();

  const stats = [
    { label: 'Total Vehicles', value: '42', icon: '🚗' },
    { label: 'Active Allocations', value: '18', icon: '📍' },
    { label: 'Pending Preparations', value: '7', icon: '🔧' },
    { label: 'Test Drives Today', value: '5', icon: '🗓️' },
  ];

  const quickActions = [
    { label: 'Add Vehicle', route: '/(tabs)/(admin)/vehicles', icon: '➕' },
    {
      label: 'New Allocation',
      route: '/(tabs)/(admin)/driver-allocation',
      icon: '📍',
    },
    {
      label: 'Manage Users',
      route: '/(tabs)/(admin)/users',
      icon: '👥',
    },
    {
      label: 'Reports',
      route: '/(tabs)/(admin)/reports',
      icon: '📊',
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.greeting}>Welcome back,</Text>
          <Text style={styles.userName}>{user?.name}</Text>
        </View>

        {/* Stats Grid */}
        <View style={styles.statsContainer}>
          {stats.map((stat, index) => (
            <View key={index} style={styles.statCard}>
              <Text style={styles.statIcon}>{stat.icon}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
              <Text style={styles.statValue}>{stat.value}</Text>
            </View>
          ))}
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionsGrid}>
            {quickActions.map((action, index) => (
              <TouchableOpacity
                key={index}
                style={styles.actionButton}
                onPress={() => router.push(action.route as any)}
              >
                <Text style={styles.actionIcon}>{action.icon}</Text>
                <Text style={styles.actionLabel}>{action.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Recent Activity */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          <View style={styles.activityList}>
            <View style={styles.activityItem}>
              <View style={styles.activityDot} />
              <View style={styles.activityContent}>
                <Text style={styles.activityTitle}>Vehicle Added</Text>
                <Text style={styles.activityTime}>2 hours ago</Text>
              </View>
            </View>
            <View style={styles.activityItem}>
              <View style={styles.activityDot} />
              <View style={styles.activityContent}>
                <Text style={styles.activityTitle}>Driver Allocated</Text>
                <Text style={styles.activityTime}>4 hours ago</Text>
              </View>
            </View>
            <View style={styles.activityItem}>
              <View style={styles.activityDot} />
              <View style={styles.activityContent}>
                <Text style={styles.activityTitle}>Preparation Started</Text>
                <Text style={styles.activityTime}>1 day ago</Text>
              </View>
            </View>
          </View>
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
    marginBottom: spacing['2xl'],
  },
  greeting: {
    fontSize: typography.fontSize.sm,
    color: colors.gray600,
    marginBottom: spacing.xs,
  },
  userName: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: '700',
    color: colors.gray900,
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: spacing['2xl'],
    justifyContent: 'space-between',
  },
  statCard: {
    width: '48%',
    backgroundColor: colors.gray50,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  statIcon: {
    fontSize: 28,
    marginBottom: spacing.sm,
  },
  statLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.gray600,
    marginBottom: spacing.xs,
  },
  statValue: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: '700',
    color: colors.gray900,
  },
  section: {
    marginBottom: spacing['2xl'],
  },
  sectionTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: '700',
    color: colors.gray900,
    marginBottom: spacing.lg,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  actionButton: {
    width: '48%',
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  actionIcon: {
    fontSize: 32,
    marginBottom: spacing.sm,
  },
  actionLabel: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    color: colors.white,
    textAlign: 'center',
  },
  activityList: {
    backgroundColor: colors.gray50,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
  },
  activityItem: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  activityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
    marginRight: spacing.lg,
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    color: colors.gray900,
  },
  activityTime: {
    fontSize: typography.fontSize.xs,
    color: colors.gray500,
    marginTop: spacing.xs,
  },
});
