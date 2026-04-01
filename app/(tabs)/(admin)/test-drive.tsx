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

export default function TestDriveScreen() {
  const [activeTab, setActiveTab] = useState<'units' | 'schedules'>('units');

  const units = [
    { id: '1', name: 'Tesla Model S', variation: 'Long Range', color: 'Black' },
    {
      id: '2',
      name: 'BMW 3 Series',
      variation: '320i',
      color: 'White',
    },
    {
      id: '3',
      name: 'Audi A4',
      variation: '2.0 TFSI',
      color: 'Silver',
    },
  ];

  const schedules = [
    {
      id: '1',
      unit: 'Tesla Model S',
      customer: 'John Doe',
      date: 'Today, 2:00 PM',
      status: 'confirmed',
    },
    {
      id: '2',
      unit: 'BMW 3 Series',
      customer: 'Jane Smith',
      date: 'Tomorrow, 10:00 AM',
      status: 'pending',
    },
  ];

  const getStatusColor = (status: string) => {
    return status === 'confirmed' ? colors.success : colors.warning;
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'units' && styles.activeTab]}
          onPress={() => setActiveTab('units')}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'units' && styles.activeTabText,
            ]}
          >
            Units
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'schedules' && styles.activeTab]}
          onPress={() => setActiveTab('schedules')}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'schedules' && styles.activeTabText,
            ]}
          >
            Schedules
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>
            {activeTab === 'units' ? 'Test Drive Units' : 'Test Drive Schedules'}
          </Text>
          <TouchableOpacity style={styles.addButton}>
            <Text style={styles.addButtonText}>+ Add</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.list}>
          {activeTab === 'units'
            ? units.map((unit) => (
                <View key={unit.id} style={styles.card}>
                  <Text style={styles.cardTitle}>{unit.name}</Text>
                  <Text style={styles.cardSubtitle}>
                    {unit.variation} • {unit.color}
                  </Text>
                </View>
              ))
            : schedules.map((schedule) => (
                <View key={schedule.id} style={styles.card}>
                  <View style={styles.scheduleHeader}>
                    <View style={styles.scheduleInfo}>
                      <Text style={styles.cardTitle}>{schedule.unit}</Text>
                      <Text style={styles.customerName}>
                        {schedule.customer}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.statusBadge,
                        {
                          backgroundColor: getStatusColor(schedule.status),
                        },
                      ]}
                    >
                      <Text style={styles.statusBadgeText}>
                        {schedule.status.toUpperCase()}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.dateText}>📅 {schedule.date}</Text>
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
  tabContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.gray200,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.base,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
  },
  tabText: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: colors.gray500,
  },
  activeTabText: {
    color: colors.primary,
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
  },
  cardTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: colors.gray900,
    marginBottom: spacing.xs,
  },
  cardSubtitle: {
    fontSize: typography.fontSize.sm,
    color: colors.gray600,
  },
  scheduleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.lg,
  },
  scheduleInfo: {
    flex: 1,
  },
  customerName: {
    fontSize: typography.fontSize.sm,
    color: colors.gray600,
    marginTop: spacing.xs,
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
  dateText: {
    fontSize: typography.fontSize.sm,
    color: colors.gray600,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.gray200,
  },
});
