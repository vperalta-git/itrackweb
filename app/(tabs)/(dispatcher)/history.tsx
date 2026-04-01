import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { colors, typography, spacing, radius } from '../../constants/theme';

export default function HistoryScreen() {
  const history = [
    {
      id: '1',
      vehicle: 'Tesla Model S - TS001',
      status: 'completed',
      date: 'Today, 2:30 PM',
      duration: '3 hours',
    },
    {
      id: '2',
      vehicle: 'BMW 3 Series - BM002',
      status: 'completed',
      date: 'Today, 11:00 AM',
      duration: '2.5 hours',
    },
    {
      id: '3',
      vehicle: 'Audi A4 - AU003',
      status: 'completed',
      date: 'Yesterday, 4:00 PM',
      duration: '4 hours',
    },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return colors.success;
      case 'in_progress':
        return colors.warning;
      default:
        return colors.gray400;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>Dispatch History</Text>
        </View>

        <View style={styles.list}>
          {history.map((item) => (
            <View key={item.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.cardInfo}>
                  <Text style={styles.vehicleName}>{item.vehicle}</Text>
                  <Text style={styles.date}>{item.date}</Text>
                </View>
                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: getStatusColor(item.status) },
                  ]}
                >
                  <Text style={styles.statusBadgeText}>
                    {item.status.toUpperCase()}
                  </Text>
                </View>
              </View>
              <View style={styles.cardFooter}>
                <Text style={styles.duration}>⏱️ {item.duration}</Text>
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
  cardHeader: {
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
    marginBottom: spacing.xs,
  },
  date: {
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
  cardFooter: {
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.gray200,
  },
  duration: {
    fontSize: typography.fontSize.sm,
    color: colors.gray700,
    fontWeight: '600',
  },
});
