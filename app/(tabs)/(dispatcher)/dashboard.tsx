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

export default function DispatcherDashboard() {
  const stats = [
    { label: 'Pending', value: '5', icon: '⏳' },
    { label: 'In Progress', value: '3', icon: '🔄' },
    { label: 'Completed', value: '12', icon: '✓' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.greeting}>Dispatcher Dashboard</Text>
          <Text style={styles.subtitle}>Today&apos;s Tasks</Text>
        </View>

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
    fontSize: typography.fontSize['2xl'],
    fontWeight: '700',
    color: colors.gray900,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: typography.fontSize.sm,
    color: colors.gray600,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing['2xl'],
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.gray50,
    borderRadius: radius.lg,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    marginHorizontal: spacing.sm,
  },
  statIcon: {
    fontSize: 28,
    marginBottom: spacing.sm,
  },
  statValue: {
    fontSize: typography.fontSize.xl,
    fontWeight: '700',
    color: colors.gray900,
    marginBottom: spacing.xs,
  },
  statLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.gray600,
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
  actionCard: {
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  actionIcon: {
    fontSize: 24,
    marginRight: spacing.lg,
  },
  actionContent: {
    flex: 1,
  },
  actionTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: colors.white,
    marginBottom: spacing.xs,
  },
  actionSubtitle: {
    fontSize: typography.fontSize.sm,
    color: colors.gray100,
  },
  arrowIcon: {
    fontSize: typography.fontSize.lg,
    color: colors.white,
    fontWeight: '700',
  },
  taskCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.gray50,
    borderRadius: radius.lg,
    marginBottom: spacing.lg,
  },
  taskDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
    marginRight: spacing.lg,
  },
  taskContent: {
    flex: 1,
  },
  taskTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    color: colors.gray900,
  },
  taskTime: {
    fontSize: typography.fontSize.xs,
    color: colors.gray600,
    marginTop: spacing.xs,
  },
});
