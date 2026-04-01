import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { colors, typography, spacing, radius } from '../../constants/theme';

export default function DriverDashboard() {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Map Placeholder */}
        <View style={styles.mapContainer}>
          <Text style={styles.mapPlaceholder}>🗺️</Text>
          <Text style={styles.mapText}>Live Tracking Map</Text>
          <Text style={styles.mapSubtext}>
            Your real-time location will appear here
          </Text>
        </View>

        {/* Trip Info */}
        <View style={styles.tripInfo}>
          <View style={styles.tripHeader}>
            <Text style={styles.tripTitle}>Current Trip</Text>
            <View style={styles.statusBadge}>
              <Text style={styles.statusText}>On Trip</Text>
            </View>
          </View>

          <View style={styles.tripDetails}>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>From</Text>
              <Text style={styles.detailValue}>Central Stockyard</Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>To</Text>
              <Text style={styles.detailValue}>Downtown Location</Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>ETA</Text>
              <Text style={styles.detailValue}>15 minutes</Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Vehicle</Text>
              <Text style={styles.detailValue}>Tesla Model S</Text>
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity style={[styles.button, styles.startButton]}>
            <Text style={styles.buttonText}>▶ Start Trip</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.button, styles.endButton]}>
            <Text style={styles.buttonText}>■ End Trip</Text>
          </TouchableOpacity>
        </View>

        {/* Route Info */}
        <View style={styles.routeInfo}>
          <Text style={styles.routeTitle}>Route Information</Text>
          <View style={styles.routePoint}>
            <Text style={styles.routeIcon}>📍</Text>
            <Text style={styles.routeText}>
              Pickup: Central Stockyard at 2:00 PM
            </Text>
          </View>
          <View style={styles.routePoint}>
            <Text style={styles.routeIcon}>🎯</Text>
            <Text style={styles.routeText}>
              Delivery: Downtown Location by 2:15 PM
            </Text>
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
  mapContainer: {
    backgroundColor: colors.gray100,
    borderRadius: radius.lg,
    padding: spacing['2xl'],
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 250,
    marginBottom: spacing.lg,
  },
  mapPlaceholder: {
    fontSize: 48,
    marginBottom: spacing.lg,
  },
  mapText: {
    fontSize: typography.fontSize.lg,
    fontWeight: '700',
    color: colors.gray900,
    marginBottom: spacing.xs,
  },
  mapSubtext: {
    fontSize: typography.fontSize.sm,
    color: colors.gray600,
    textAlign: 'center',
  },
  tripInfo: {
    backgroundColor: colors.gray50,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  tripHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  tripTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: '700',
    color: colors.gray900,
  },
  statusBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
  },
  statusText: {
    fontSize: typography.fontSize.xs,
    fontWeight: '600',
    color: colors.white,
  },
  tripDetails: {
    gap: spacing.lg,
  },
  detailItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray200,
  },
  detailLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.gray600,
  },
  detailValue: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    color: colors.gray900,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: spacing.lg,
    marginBottom: spacing.lg,
  },
  button: {
    flex: 1,
    paddingVertical: spacing.lg,
    borderRadius: radius.lg,
    alignItems: 'center',
  },
  startButton: {
    backgroundColor: colors.success,
  },
  endButton: {
    backgroundColor: colors.error,
  },
  buttonText: {
    fontSize: typography.fontSize.base,
    fontWeight: '700',
    color: colors.white,
  },
  routeInfo: {
    backgroundColor: colors.gray50,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  routeTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: '700',
    color: colors.gray900,
    marginBottom: spacing.lg,
  },
  routePoint: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.lg,
  },
  routeIcon: {
    fontSize: 20,
    marginRight: spacing.lg,
    marginTop: spacing.xs,
  },
  routeText: {
    flex: 1,
    fontSize: typography.fontSize.sm,
    color: colors.gray700,
    lineHeight: 20,
  },
});
