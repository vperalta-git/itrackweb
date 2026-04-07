import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import { theme } from '../constants/theme';
import { Card } from './Card';
import { StatusBadge } from './StatusBadge';

export interface TripDetails {
  driverId: string;
  driverName: string;
  vehicleId: string;
  vehicleNumber: string;
  destination: string;
  distance: number;
  eta: number;
  status: 'active' | 'completed' | 'cancelled' | 'pending';
  startTime: string;
  currentSpeed: number;
  route: string;
  notes?: string;
}

interface TripDetailsOverlayProps {
  trip: TripDetails;
  onClose?: () => void;
  style?: ViewStyle;
}

export const TripDetailsOverlay = ({
  trip,
  onClose,
  style,
}: TripDetailsOverlayProps) => {
  const statusMap = {
    active: { status: 'in_transit' as const, label: 'In Transit' },
    completed: { status: 'completed' as const, label: 'Completed' },
    cancelled: { status: 'cancelled' as const, label: 'Cancelled' },
    pending: { status: 'pending' as const, label: 'Pending' },
  };

  const currentStatus = statusMap[trip.status];

  void onClose;

  return (
    <Card style={style} variant="elevated" padding="large">
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text style={styles.driverName}>{trip.driverName}</Text>
          <Text style={styles.vehicleNumber}>{trip.vehicleNumber}</Text>
        </View>
        <StatusBadge status={currentStatus.status} label={currentStatus.label} />
      </View>

      <View style={styles.metricGrid}>
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>Destination</Text>
          <Text style={styles.metricValue}>{trip.destination}</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>Distance</Text>
          <Text style={styles.metricValue}>{trip.distance.toFixed(1)} km</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>ETA</Text>
          <Text style={styles.metricValue}>{trip.eta} min</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>Current Speed</Text>
          <Text style={styles.metricValue}>{trip.currentSpeed} km/h</Text>
        </View>
      </View>

      {trip.notes ? (
        <View style={styles.notes}>
          <Text style={styles.notesLabel}>Notes</Text>
          <Text style={styles.notesText}>{trip.notes}</Text>
        </View>
      ) : null}
    </Card>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.base,
    gap: theme.spacing.base,
  },
  headerCopy: {
    flex: 1,
  },
  driverName: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text,
    fontFamily: theme.fonts.family.sans,
  },
  vehicleNumber: {
    marginTop: 4,
    fontSize: 13,
    color: theme.colors.textMuted,
    fontFamily: theme.fonts.family.sans,
  },
  metricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
  },
  metricCard: {
    width: '48%',
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.surfaceMuted,
    padding: theme.spacing.md,
  },
  metricLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.textSubtle,
    marginBottom: 6,
    fontFamily: theme.fonts.family.sans,
  },
  metricValue: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.text,
    fontFamily: theme.fonts.family.sans,
  },
  notes: {
    marginTop: theme.spacing.base,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.primarySurface,
    padding: theme.spacing.md,
  },
  notesLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    color: theme.colors.primaryDark,
    marginBottom: 6,
    fontFamily: theme.fonts.family.sans,
  },
  notesText: {
    fontSize: 13,
    lineHeight: 19,
    color: theme.colors.textMuted,
    fontFamily: theme.fonts.family.sans,
  },
});
