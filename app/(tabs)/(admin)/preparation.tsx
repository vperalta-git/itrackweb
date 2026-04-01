import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
} from 'react-native';
import { colors, typography, spacing, radius } from '../../constants/theme';

export default function PreparationScreen() {
  const preparations = [
    { id: '1', vehicle: 'Tesla Model S', status: 'in_progress', progress: 60 },
    { id: '2', vehicle: 'BMW 3 Series', status: 'pending', progress: 0 },
    { id: '3', vehicle: 'Audi A4', status: 'completed', progress: 100 },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return colors.success;
      case 'in_progress':
        return colors.warning;
      case 'pending':
        return colors.gray400;
      default:
        return colors.gray400;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>Vehicle Preparation</Text>
          <TouchableOpacity style={styles.addButton}>
            <Text style={styles.addButtonText}>+ New Request</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.list}>
          {preparations.map((item) => (
            <View key={item.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>{item.vehicle}</Text>
                <View
                  style={[
                    styles.statusBadge,
                    {
                      backgroundColor: getStatusColor(item.status),
                    },
                  ]}
                >
                  <Text style={styles.statusBadgeText}>
                    {item.status.replace('_', ' ').toUpperCase()}
                  </Text>
                </View>
              </View>
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${item.progress}%` },
                  ]}
                />
              </View>
              <Text style={styles.progressText}>{item.progress}% Complete</Text>
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
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  cardTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: colors.gray900,
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
  progressBar: {
    height: 8,
    backgroundColor: colors.gray300,
    borderRadius: radius.sm,
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
  },
  progressText: {
    fontSize: typography.fontSize.xs,
    color: colors.gray600,
  },
});
