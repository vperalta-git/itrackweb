import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../constants/theme';
import { AllocationStatus } from '../types';
import {
  DRIVER_ALLOCATION_LOCATION_OPTIONS,
  DriverAllocationRecord,
  formatDriverAllocationStatusLabel,
  getDriverAllocationBadgeStatus,
} from '../data/driver-allocation';
import { Card } from './Card';
import { EmptyState } from './EmptyState';
import { FilterSummaryCard } from './FilterSummaryCard';
import {
  MapViewComponent,
  type Location,
  type MarkerData,
} from './MapView';
import { StatusBadge } from './StatusBadge';

interface DriverAllocationLiveTrackingProps {
  allocations: DriverAllocationRecord[];
  managerFilterLabel: string;
  canViewDetails?: boolean;
  onOpenAllocation: (allocationId: string) => void;
}

const DEFAULT_IN_TRANSIT_PROGRESS = 0.62;
const EARTH_RADIUS_KM = 6371;

const toRadians = (value: number) => (value * Math.PI) / 180;

const getRouteProgress = (allocation: DriverAllocationRecord) =>
  Math.min(Math.max(allocation.routeProgress ?? DEFAULT_IN_TRANSIT_PROGRESS, 0), 1);

const formatRemainingDistanceLabel = (allocation: DriverAllocationRecord) => {
  if (allocation.status !== AllocationStatus.IN_TRANSIT) {
    return null;
  }

  const pickup = DRIVER_ALLOCATION_LOCATION_OPTIONS.find(
    (location) => location.value === allocation.pickupId
  );
  const destination = DRIVER_ALLOCATION_LOCATION_OPTIONS.find(
    (location) => location.value === allocation.destinationId
  );

  if (!pickup || !destination) {
    return null;
  }

  const latitudeDelta = toRadians(
    destination.location.latitude - pickup.location.latitude
  );
  const longitudeDelta = toRadians(
    destination.location.longitude - pickup.location.longitude
  );
  const pickupLatitude = toRadians(pickup.location.latitude);
  const destinationLatitude = toRadians(destination.location.latitude);
  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(pickupLatitude) *
      Math.cos(destinationLatitude) *
      Math.sin(longitudeDelta / 2) ** 2;
  const totalDistanceKm =
    2 *
    EARTH_RADIUS_KM *
    Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
  const remainingDistanceKm = Math.max(
    totalDistanceKm * (1 - getRouteProgress(allocation)),
    0
  );

  return `${remainingDistanceKm.toFixed(1)} km left`;
};

const getDriverLiveLocation = (allocation: DriverAllocationRecord) => {
  const pickup = DRIVER_ALLOCATION_LOCATION_OPTIONS.find(
    (location) => location.value === allocation.pickupId
  );
  const destination = DRIVER_ALLOCATION_LOCATION_OPTIONS.find(
    (location) => location.value === allocation.destinationId
  );

  if (!pickup || !destination) {
    return null;
  }

  const progress = getRouteProgress(allocation);

  return {
    latitude:
      pickup.location.latitude +
      (destination.location.latitude - pickup.location.latitude) * progress,
    longitude:
      pickup.location.longitude +
      (destination.location.longitude - pickup.location.longitude) * progress,
  };
};

const getLiveTrackingMapPayload = (
  allocation: DriverAllocationRecord | null
): { markers: MarkerData[]; routes: Location[][] } => {
  if (!allocation) {
    return {
      markers: [],
      routes: [],
    };
  }

  const pickup = DRIVER_ALLOCATION_LOCATION_OPTIONS.find(
    (location) => location.value === allocation.pickupId
  );
  const destination = DRIVER_ALLOCATION_LOCATION_OPTIONS.find(
    (location) => location.value === allocation.destinationId
  );
  const driverLocation = getDriverLiveLocation(allocation);

  if (!pickup || !destination || !driverLocation) {
    return {
      markers: [],
      routes: [],
    };
  }

  const remainingDistanceLabel = formatRemainingDistanceLabel(allocation);

  return {
    markers: [
      {
        id: `pickup-${allocation.id}`,
        location: pickup.location,
        title: allocation.pickupLabel,
        description: `Pickup for ${allocation.driverName}`,
        type: 'checkpoint',
      },
      {
        id: `driver-${allocation.id}`,
        location: driverLocation,
        title: allocation.driverName,
        description: `${allocation.unitName} - ETA ${allocation.eta}${
          remainingDistanceLabel ? ` - ${remainingDistanceLabel}` : ''
        }`,
        type: 'driver',
        status: 'active',
      },
      {
        id: `destination-${allocation.id}`,
        location: destination.location,
        title: allocation.destinationLabel,
        description: `Destination for ${allocation.driverName}`,
        type: 'destination',
      },
    ],
    routes: [[driverLocation, destination.location]],
  };
};

const getLiveTrackingInitialRegion = (allocations: DriverAllocationRecord[]) => {
  const points = allocations
    .flatMap((allocation) => {
      const pickup = DRIVER_ALLOCATION_LOCATION_OPTIONS.find(
        (location) => location.value === allocation.pickupId
      )?.location;
      const destination = DRIVER_ALLOCATION_LOCATION_OPTIONS.find(
        (location) => location.value === allocation.destinationId
      )?.location;
      const driver = getDriverLiveLocation(allocation);

      return [pickup, destination, driver].filter(Boolean);
    })
    .filter(
      (
        point
      ): point is {
        latitude: number;
        longitude: number;
      } => Boolean(point)
    );

  if (!points.length) {
    return {
      latitude: 14.5995,
      longitude: 120.9842,
      latitudeDelta: 0.28,
      longitudeDelta: 0.28,
    };
  }

  const latitudes = points.map((point) => point.latitude);
  const longitudes = points.map((point) => point.longitude);
  const minLatitude = Math.min(...latitudes);
  const maxLatitude = Math.max(...latitudes);
  const minLongitude = Math.min(...longitudes);
  const maxLongitude = Math.max(...longitudes);

  return {
    latitude: (minLatitude + maxLatitude) / 2,
    longitude: (minLongitude + maxLongitude) / 2,
    latitudeDelta: Math.max((maxLatitude - minLatitude) * 1.8, 0.08),
    longitudeDelta: Math.max((maxLongitude - minLongitude) * 1.8, 0.08),
  };
};

export function DriverAllocationLiveTracking({
  allocations,
  managerFilterLabel,
  canViewDetails = false,
  onOpenAllocation,
}: DriverAllocationLiveTrackingProps) {
  const [selectedAllocationId, setSelectedAllocationId] = useState<string | null>(
    null
  );

  const trackedAllocations = useMemo(
    () =>
      allocations.filter(
        (allocation) => allocation.status === AllocationStatus.IN_TRANSIT
      ),
    [allocations]
  );

  useEffect(() => {
    if (!trackedAllocations.length) {
      setSelectedAllocationId(null);
      return;
    }

    setSelectedAllocationId((current) =>
      current &&
      trackedAllocations.some((allocation) => allocation.id === current)
        ? current
        : trackedAllocations[0].id
    );
  }, [trackedAllocations]);

  const selectedAllocation = useMemo(
    () =>
      trackedAllocations.find((allocation) => allocation.id === selectedAllocationId) ??
      trackedAllocations[0] ??
      null,
    [selectedAllocationId, trackedAllocations]
  );
  const inTransitCount = trackedAllocations.length;
  const selectedMapPayload = useMemo(
    () => getLiveTrackingMapPayload(selectedAllocation),
    [selectedAllocation]
  );
  const initialRegion = useMemo(
    () =>
      getLiveTrackingInitialRegion(
        selectedAllocation ? [selectedAllocation] : trackedAllocations
      ),
    [selectedAllocation, trackedAllocations]
  );

  return (
    <>
      <FilterSummaryCard
        title="Live Tracking"
        value={`${trackedAllocations.length} in-transit routes on map`}
        iconName="locate-outline"
        items={[
          {
            label: 'Tracking Scope',
            value: 'In Transit only',
            iconName: 'car-outline',
            iconColor: theme.colors.info,
          },
          {
            label: 'Manager Filter',
            value: managerFilterLabel,
            iconName: 'people-outline',
            iconColor: theme.colors.primary,
          },
          {
            label: 'In Transit',
            value: `${inTransitCount} live routes`,
            iconName: 'car-outline',
            iconColor: theme.colors.info,
          },
        ]}
        style={styles.summaryCard}
      />

      {trackedAllocations.length ? (
        <View style={styles.wrap}>
          <View style={styles.mapShell}>
            <View style={styles.mapHeader}>
              <Text style={styles.mapTitle}>Live Route Map</Text>
              <Text style={styles.mapSubtitle}>
                {selectedAllocation
                  ? `Live route for ${selectedAllocation.driverName} from ${selectedAllocation.pickupLabel} to ${selectedAllocation.destinationLabel}`
                  : 'Select an in-transit route below to update the map'}
              </Text>
            </View>

            <MapViewComponent
              key={`live-route-map-${selectedAllocation?.id ?? 'empty'}`}
              markers={selectedMapPayload.markers}
              routes={selectedMapPayload.routes}
              initialRegion={initialRegion}
              style={styles.map}
              showScale
            />
          </View>

          <View style={styles.list}>
            {trackedAllocations.map((allocation) => (
              <Card
                key={`tracking-${allocation.id}`}
                style={[
                  styles.card,
                  allocation.id === selectedAllocation?.id ? styles.cardActive : null,
                ]}
                variant="elevated"
                onPress={() => setSelectedAllocationId(allocation.id)}
              >
                <View style={styles.header}>
                  <View style={styles.copy}>
                    <Text style={styles.driver}>{allocation.driverName}</Text>
                    <Text style={styles.unit}>
                      {allocation.unitName} - {allocation.variation}
                    </Text>
                  </View>

                  <View style={styles.headerActions}>
                    <StatusBadge
                      status={getDriverAllocationBadgeStatus(allocation.status)}
                      label={formatDriverAllocationStatusLabel(allocation.status)}
                      size="small"
                    />

                    {allocation.id === selectedAllocation?.id ? (
                      <View style={styles.selectedPill}>
                        <Ionicons
                          name="locate-outline"
                          size={12}
                          color={theme.colors.primary}
                        />
                        <Text style={styles.selectedPillText}>On Map</Text>
                      </View>
                    ) : null}
                  </View>
                </View>

                <View style={styles.routeRow}>
                  <Ionicons
                    name="navigate-outline"
                    size={15}
                    color={theme.colors.primary}
                  />
                  <View style={styles.routeCopy}>
                    <Text style={styles.routeText}>
                      {allocation.pickupLabel} to {allocation.destinationLabel}
                    </Text>
                    {formatRemainingDistanceLabel(allocation) ? (
                      <Text style={styles.routeMeta}>
                        {formatRemainingDistanceLabel(allocation)}
                      </Text>
                    ) : null}
                  </View>
                </View>

                <View style={styles.metaRow}>
                  <View style={styles.metaPill}>
                    <Text style={styles.metaLabel}>ETA</Text>
                    <Text style={styles.metaValue}>{allocation.eta}</Text>
                  </View>

                  <View style={styles.metaPill}>
                    <Text style={styles.metaLabel}>Conduction</Text>
                    <Text style={styles.metaValue}>
                      {allocation.conductionNumber}
                    </Text>
                  </View>
                </View>

                {canViewDetails ? (
                  <Pressable
                    style={styles.detailButton}
                    onPress={(event) => {
                      event.stopPropagation();
                      onOpenAllocation(allocation.id);
                    }}
                  >
                    <Text style={styles.detailButtonText}>View allocation</Text>
                    <Ionicons
                      name="arrow-forward-outline"
                      size={14}
                      color={theme.colors.primary}
                    />
                  </Pressable>
                ) : null}
              </Card>
            ))}
          </View>
        </View>
      ) : (
        <EmptyState
          title="No live routes to track"
          description="Only in-transit allocations appear here. Try another manager or search term, or wait for a route to start moving."
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  summaryCard: {
    marginBottom: theme.spacing.lg,
  },
  wrap: {
    gap: theme.spacing.base,
  },
  mapShell: {
    marginBottom: theme.spacing.xs,
  },
  mapHeader: {
    marginBottom: theme.spacing.sm,
  },
  mapTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text,
    fontFamily: theme.fonts.family.sans,
  },
  mapSubtitle: {
    marginTop: 4,
    fontSize: 13,
    color: theme.colors.textMuted,
    fontFamily: theme.fonts.family.sans,
  },
  map: {
    height: 320,
  },
  list: {
    gap: theme.spacing.md,
  },
  card: {
    gap: theme.spacing.base,
  },
  cardActive: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primarySurface,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: theme.spacing.base,
  },
  headerActions: {
    alignItems: 'flex-end',
    gap: theme.spacing.xs,
  },
  copy: {
    flex: 1,
  },
  driver: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 4,
    fontFamily: theme.fonts.family.sans,
  },
  unit: {
    fontSize: 13,
    color: theme.colors.textMuted,
    fontFamily: theme.fonts.family.sans,
  },
  selectedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: theme.radius.full,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 6,
    backgroundColor: theme.colors.white,
    borderWidth: 1,
    borderColor: theme.colors.primarySurfaceStrong,
  },
  selectedPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.primaryDark,
    fontFamily: theme.fonts.family.sans,
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.sm,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.primarySurface,
    borderWidth: 1,
    borderColor: theme.colors.primarySurfaceStrong,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  routeCopy: {
    flex: 1,
    gap: 2,
  },
  routeText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.primaryDark,
    fontFamily: theme.fonts.family.sans,
  },
  routeMeta: {
    fontSize: 11,
    color: theme.colors.textMuted,
    fontFamily: theme.fonts.family.sans,
  },
  metaRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  metaPill: {
    flex: 1,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surfaceMuted,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  metaLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    color: theme.colors.textSubtle,
    marginBottom: 4,
    fontFamily: theme.fonts.family.sans,
  },
  metaValue: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.text,
    fontFamily: theme.fonts.family.sans,
  },
  detailButton: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    borderRadius: theme.radius.full,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.white,
    borderWidth: 1,
    borderColor: theme.colors.primarySurfaceStrong,
  },
  detailButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.primaryDark,
    fontFamily: theme.fonts.family.sans,
  },
});
