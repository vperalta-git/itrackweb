import React from 'react';
import {
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  AppScreen,
  Card,
  PageHeader,
  StatusBadge,
} from '@/src/mobile/components';
import { theme } from '@/src/mobile/constants/theme';

export default function DriverHistoryScreen() {
  const history = [
    {
      id: '1',
      vehicle: 'Tesla Model S - TS001',
      from: 'Stockyard',
      to: 'Downtown',
      status: 'completed' as const,
      date: 'Today, 2:15 PM',
      duration: '15 mins',
    },
    {
      id: '2',
      vehicle: 'BMW 3 Series - BM002',
      from: 'Warehouse',
      to: 'Service Center',
      status: 'completed' as const,
      date: 'Today, 10:30 AM',
      duration: '22 mins',
    },
    {
      id: '3',
      vehicle: 'Audi A4 - AU003',
      from: 'Central Hub',
      to: 'Branch Office',
      status: 'completed' as const,
      date: 'Yesterday, 4:45 PM',
      duration: '18 mins',
    },
  ];

  return (
    <AppScreen>
      <PageHeader
        eyebrow="Driver"
        title="Trip History"
        subtitle="See your recent completed trips and route timings."
      />

      <View style={styles.list}>
        {history.map((trip) => (
          <Card key={trip.id} style={styles.card}>
            <View style={styles.cardTop}>
              <View style={styles.copy}>
                <Text style={styles.title}>{trip.vehicle}</Text>
                <Text style={styles.route}>
                  {trip.from} to {trip.to}
                </Text>
              </View>
              <StatusBadge status={trip.status} label="Completed" />
            </View>

            <View style={styles.cardFooter}>
              <Text style={styles.date}>{trip.date}</Text>
              <Text style={styles.duration}>{trip.duration}</Text>
            </View>
          </Card>
        ))}
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: theme.spacing.md,
  },
  card: {
    marginBottom: theme.spacing.md,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: theme.spacing.base,
    marginBottom: theme.spacing.base,
  },
  copy: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 4,
    fontFamily: theme.fonts.family.sans,
  },
  route: {
    fontSize: 14,
    color: theme.colors.textMuted,
    fontFamily: theme.fonts.family.sans,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: theme.spacing.base,
    paddingTop: theme.spacing.base,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  date: {
    fontSize: 13,
    color: theme.colors.textSubtle,
    fontFamily: theme.fonts.family.sans,
  },
  duration: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.text,
    fontFamily: theme.fonts.family.sans,
  },
});
