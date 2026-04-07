import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  Button,
  Card,
  EmptyState,
  Header,
  MapViewComponent,
  ProgressBar,
  StatusBadge,
} from '@/src/mobile/components';
import { theme } from '@/src/mobile/constants/theme';
import {
  findDriverAllocationLocation,
  findDriverAllocationRecord,
  formatDriverAllocationRemainingDistance,
  formatDriverAllocationStatusLabel,
  getDriverAllocationBadgeStatus,
  getDriverAllocationLiveLocation,
  getDriverAllocationRemainingDistanceKm,
  getDriverAllocationRoute,
  getDriverAllocationRouteDistanceKm,
} from '@/src/mobile/data/driver-allocation';
import { useDriverRealtimeLocation } from '@/src/mobile/hooks';
import { AllocationStatus } from '@/src/mobile/types';

export default function TripDetailScreen() {
  const router = useRouter();
  const { tripId } = useLocalSearchParams<{ tripId?: string | string[] }>();
  const resolvedTripId = Array.isArray(tripId) ? tripId[0] : tripId;
  const trip = findDriverAllocationRecord(String(resolvedTripId ?? ''));

  const pickupLocation = useMemo(
    () => findDriverAllocationLocation(trip?.pickupId ?? null),
    [trip?.pickupId]
  );
  const destinationLocation = useMemo(
    () => findDriverAllocationLocation(trip?.destinationId ?? null),
    [trip?.destinationId]
  );
  const {
    currentLocation: trackedDriverLocation,
    trackingStatus,
    lastUpdatedAt,
  } = useDriverRealtimeLocation(trip);
  const driverLocation = useMemo(
    () =>
      trip
        ? trackedDriverLocation ?? getDriverAllocationLiveLocation(trip)
        : null,
    [trackedDriverLocation, trip]
  );
  const markers = useMemo(() => {
    if (!trip || !pickupLocation || !destinationLocation) {
      return [];
    }

    return [
      {
        id: `pickup-${trip.id}`,
        location: pickupLocation.location,
        title: 'Pickup',
        description: trip.pickupLabel,
        type: 'checkpoint' as const,
      },
      ...(driverLocation
        ? [
            {
              id: `driver-${trip.id}`,
              location: driverLocation,
              title: trip.driverName,
              description: `Current ETA ${trip.eta}`,
              type: 'driver' as const,
              status: 'active' as const,
            },
          ]
        : []),
      {
        id: `destination-${trip.id}`,
        location: destinationLocation.location,
        title: 'Destination',
        description: trip.destinationLabel,
        type: 'destination' as const,
      },
    ];
  }, [destinationLocation, driverLocation, pickupLocation, trip]);
  const routes = useMemo(
    () =>
      trip ? getDriverAllocationRoute(trip.pickupId, trip.destinationId) : [],
    [trip]
  );

  if (!trip) {
    return (
      <View style={styles.container}>
        <Header
          title="Trip Details"
          leftIcon={
            <Ionicons
              name="arrow-back-outline"
              size={18}
              color={theme.colors.text}
            />
          }
          onLeftPress={() => router.back()}
        />

        <View style={styles.emptyWrap}>
          <EmptyState
            title="Trip not found"
            description="The selected driver allocation could not be loaded."
          />
        </View>
      </View>
    );
  }

  const totalDistance = getDriverAllocationRouteDistanceKm(trip) ?? 0;
  const remainingDistance = getDriverAllocationRemainingDistanceKm(trip);
  const completedDistance =
    totalDistance > 0 ? totalDistance - (remainingDistance ?? 0) : 0;
  const completionPercentage =
    trip.status === AllocationStatus.COMPLETED
      ? 100
      : totalDistance > 0
        ? (completedDistance / totalDistance) * 100
        : 0;
  const routeSummary =
    pickupLocation && destinationLocation
      ? `${pickupLocation.label} to ${destinationLocation.label}`
      : `${trip.pickupLabel} to ${trip.destinationLabel}`;

  return (
    <View style={styles.container}>
      <Header
        title="Trip Details"
        leftIcon={
          <Ionicons
            name="arrow-back-outline"
            size={18}
            color={theme.colors.text}
          />
        }
        onLeftPress={() => router.back()}
      />

      <ScrollView contentContainerStyle={styles.content}>
        <Card style={styles.card} variant="elevated" padding="large">
          <View style={styles.heroTop}>
            <View style={styles.heroCopy}>
              <Text style={styles.heroTitle}>{trip.unitName}</Text>
              <Text style={styles.heroSubtitle}>{trip.variation}</Text>
            </View>
            <StatusBadge
              status={getDriverAllocationBadgeStatus(trip.status)}
              label={formatDriverAllocationStatusLabel(trip.status)}
            />
          </View>
        </Card>

        {markers.length ? (
          <MapViewComponent
            markers={markers}
            routes={routes}
            initialRegion={{
              latitude:
                driverLocation?.latitude ??
                pickupLocation?.location.latitude ??
                14.5995,
              longitude:
                driverLocation?.longitude ??
                pickupLocation?.location.longitude ??
                120.9842,
              latitudeDelta: 0.05,
              longitudeDelta: 0.05,
            }}
            style={styles.map}
          />
        ) : null}

        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>Trip Progress</Text>
          <ProgressBar
            progress={completionPercentage}
            label="Distance Covered"
            showPercentage
            style={styles.progress}
          />
          <Text style={styles.helperText}>
            {completedDistance.toFixed(1)} / {totalDistance.toFixed(1)} km completed
          </Text>
        </Card>

        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>Trip Information</Text>
          {[
            {
              label: 'Driver',
              value: trip.driverName,
            },
            {
              label: 'Conduction Number',
              value: trip.conductionNumber,
            },
            {
              label: 'ETA',
              value: trip.eta,
            },
            {
              label: 'Remaining Distance',
              value:
                formatDriverAllocationRemainingDistance(trip) ?? 'Not available',
            },
            {
              label: 'Live GPS',
              value:
                trackingStatus === 'tracking' && lastUpdatedAt
                  ? `Active - ${lastUpdatedAt.toLocaleTimeString('en-US', {
                      hour: 'numeric',
                      minute: '2-digit',
                    })}`
                  : trackingStatus === 'permission_denied'
                    ? 'Permission needed'
                    : trackingStatus === 'disabled'
                      ? 'Location services off'
                      : trip.status === AllocationStatus.IN_TRANSIT
                        ? 'Waiting for update'
                        : 'Standby',
            },
          ].map((item, index) => (
            <View
              key={item.label}
              style={[styles.row, index < 4 ? styles.rowDivider : null]}
            >
              <Text style={styles.rowLabel}>{item.label}</Text>
              <Text style={styles.rowValue}>{item.value}</Text>
            </View>
          ))}
        </Card>

        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>Route</Text>
          <Text style={styles.routeText}>{routeSummary}</Text>

          <View style={styles.stopRow}>
            <Ionicons name="ellipse" size={8} color={theme.colors.primary} />
            <Text style={styles.stopText}>Pickup: {trip.pickupLabel}</Text>
          </View>

          <View style={styles.stopRow}>
            <Ionicons name="ellipse" size={8} color={theme.colors.info} />
            <Text style={styles.stopText}>
              Destination: {trip.destinationLabel}
            </Text>
          </View>
        </Card>

        <View style={styles.actions}>
          <Button
            title="Back to Dashboard"
            variant="outline"
            onPress={() => router.back()}
            fullWidth
            style={styles.actionButton}
          />
          <Button
            title={
              trip.status === AllocationStatus.COMPLETED
                ? 'Trip Completed'
                : 'View Active Booking'
            }
            variant="primary"
            onPress={() => router.back()}
            fullWidth
          />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  emptyWrap: {
    flex: 1,
    padding: theme.spacing.lg,
    justifyContent: 'center',
  },
  content: {
    padding: theme.spacing.lg,
    paddingBottom: theme.spacing['2xl'],
  },
  card: {
    marginBottom: theme.spacing.base,
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: theme.spacing.base,
  },
  heroCopy: {
    flex: 1,
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 4,
    fontFamily: theme.fonts.family.sans,
  },
  heroSubtitle: {
    fontSize: 14,
    color: theme.colors.textMuted,
    fontFamily: theme.fonts.family.sans,
  },
  map: {
    marginBottom: theme.spacing.base,
    height: 300,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: theme.spacing.base,
    fontFamily: theme.fonts.family.sans,
  },
  progress: {
    marginBottom: theme.spacing.sm,
  },
  helperText: {
    fontSize: 13,
    color: theme.colors.textMuted,
    fontFamily: theme.fonts.family.sans,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: theme.spacing.base,
    paddingVertical: theme.spacing.md,
  },
  rowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  rowLabel: {
    fontSize: 13,
    color: theme.colors.textMuted,
    fontFamily: theme.fonts.family.sans,
  },
  rowValue: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.text,
    textAlign: 'right',
    fontFamily: theme.fonts.family.sans,
  },
  routeText: {
    fontSize: 14,
    color: theme.colors.text,
    marginBottom: theme.spacing.base,
    fontFamily: theme.fonts.family.sans,
  },
  stopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  stopText: {
    fontSize: 13,
    color: theme.colors.textMuted,
    fontFamily: theme.fonts.family.sans,
  },
  actions: {
    marginTop: theme.spacing.xs,
  },
  actionButton: {
    marginBottom: theme.spacing.sm,
  },
});
