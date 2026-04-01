import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
} from 'react-native';
import { colors, typography, spacing, radius } from '../../constants/theme';

export default function ReportsScreen() {
  const [activeTab, setActiveTab] = useState<'reports' | 'audit'>('reports');

  const reports = [
    {
      id: '1',
      title: 'Daily Fleet Summary',
      date: 'Jan 15, 2024',
      type: 'fleet',
    },
    {
      id: '2',
      title: 'Vehicle Utilization Report',
      date: 'Jan 14, 2024',
      type: 'vehicle',
    },
    {
      id: '3',
      title: 'Driver Performance',
      date: 'Jan 13, 2024',
      type: 'driver',
    },
  ];

  const auditLogs = [
    {
      id: '1',
      action: 'Vehicle Added',
      user: 'Admin User',
      module: 'Vehicles',
      timestamp: '2 hours ago',
    },
    {
      id: '2',
      action: 'Driver Allocated',
      user: 'Sarah Johnson',
      module: 'Allocations',
      timestamp: '4 hours ago',
    },
    {
      id: '3',
      action: 'User Created',
      user: 'Admin User',
      module: 'Users',
      timestamp: '1 day ago',
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'reports' && styles.activeTab]}
          onPress={() => setActiveTab('reports')}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'reports' && styles.activeTabText,
            ]}
          >
            Reports
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'audit' && styles.activeTab]}
          onPress={() => setActiveTab('audit')}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'audit' && styles.activeTabText,
            ]}
          >
            Audit Trail
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>
            {activeTab === 'reports' ? 'Reports' : 'Audit Trail'}
          </Text>
        </View>

        <View style={styles.list}>
          {activeTab === 'reports'
            ? reports.map((report) => (
                <TouchableOpacity key={report.id} style={styles.card}>
                  <View style={styles.reportHeader}>
                    <View style={styles.reportInfo}>
                      <Text style={styles.reportTitle}>{report.title}</Text>
                      <Text style={styles.reportDate}>{report.date}</Text>
                    </View>
                    <Text style={styles.downloadIcon}>⬇️</Text>
                  </View>
                </TouchableOpacity>
              ))
            : auditLogs.map((log) => (
                <View key={log.id} style={styles.card}>
                  <View style={styles.auditHeader}>
                    <View style={styles.auditInfo}>
                      <Text style={styles.auditAction}>{log.action}</Text>
                      <Text style={styles.auditUser}>{log.user}</Text>
                    </View>
                    <Text style={styles.auditModule}>{log.module}</Text>
                  </View>
                  <Text style={styles.auditTime}>{log.timestamp}</Text>
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
  reportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  reportInfo: {
    flex: 1,
  },
  reportTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: colors.gray900,
    marginBottom: spacing.xs,
  },
  reportDate: {
    fontSize: typography.fontSize.sm,
    color: colors.gray600,
  },
  downloadIcon: {
    fontSize: typography.fontSize.lg,
  },
  auditHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.lg,
  },
  auditInfo: {
    flex: 1,
  },
  auditAction: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: colors.gray900,
    marginBottom: spacing.xs,
  },
  auditUser: {
    fontSize: typography.fontSize.sm,
    color: colors.gray600,
  },
  auditModule: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    color: colors.primary,
  },
  auditTime: {
    fontSize: typography.fontSize.xs,
    color: colors.gray500,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.gray200,
  },
});
