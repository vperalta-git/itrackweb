import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  Button,
  MapViewComponent,
  StatusBadge,
} from '@/src/mobile/components';
import { theme } from '@/src/mobile/constants/theme';
import { useAuth } from '@/src/mobile/context/AuthContext';
import type { Location, MarkerData } from '@/src/mobile/components/MapView';
import {
  acceptDriverAllocation,
  completeDriverAllocationTrip,
  findDriverAllocationLocation,
  getDriverAllocationDashboardRecord,
  getDriverAllocationInitialRegion,
  getDriverAllocationLiveLocation,
  getDriverAllocationRoute,
  startDriverAllocationTrip,
} from '@/src/mobile/data/driver-allocation';
import { useDriverRealtimeLocation } from '@/src/mobile/hooks';
import { AllocationStatus } from '@/src/mobile/types';

type DriverTripStage =
  | 'pending_acceptance'
  | 'accepted'
  | 'in_transit'
  | 'waiting_for_booking';

const getStageBadgeStatus = (stage: DriverTripStage) => {
  switch (stage) {
    case 'pending_acceptance':
      return 'pending' as const;
    case 'accepted':
      return 'confirmed' as const;
    case 'in_transit':
      return 'in_transit' as const;
    case 'waiting_for_booking':
      return 'inactive' as const;
    default:
      return 'inactive' as const;
  }
};

const getStageLabel = (stage: DriverTripStage) => {
  switch (stage) {
    case 'pending_acceptance':
      return 'Pending Acceptance';
    case 'accepted':
      return 'Accepted';
    case 'in_transit':
      return 'In Transit';
    case 'waiting_for_booking':
      return 'Waiting for Booking';
    default:
      return 'Pending Acceptance';
  }
};

const getMapChipLabel = (stage: DriverTripStage) => {
  switch (stage) {
    case 'pending_acceptance':
    case 'accepted':
      return 'Pickup to Destination';
    case 'in_transit':
      return 'Live Driving Route';
    case 'waiting_for_booking':
      return 'Waiting for Booking';
    default:
      return 'Pickup to Destination';
  }
};

const getStageMessage = (stage: DriverTripStage) => {
  switch (stage) {
    case 'pending_acceptance':
      return 'Accept the pending booking first before trip controls appear. Only one active booking is assigned per driver.';
    case 'accepted':
      return 'Booking accepted. Start the trip when the vehicle is ready to move.';
    case 'in_transit':
      return 'Trip is active on the live route. End the trip once delivery is complete.';
    case 'waiting_for_booking':
      return 'No active booking right now. Stay available for the next assignment.';
    default:
      return 'Accept the pending booking first before trip controls appear.';
  }
};

export default function DriverDashboard() {
  const { user } = useAuth();
  const [refreshKey, setRefreshKey] = useState(0);

  const activeAllocation = useMemo(
    () => (user?.id ? getDriverAllocationDashboardRecord(user.id) : null),
    [refreshKey, user?.id]
  );

  const tripStage: DriverTripStage = useMemo(() => {
    if (!activeAllocation) {
      return 'waiting_for_booking';
    }

    switch (activeAllocation.status) {
      case AllocationStatus.ASSIGNED:
        return 'accepted';
      case AllocationStatus.IN_TRANSIT:
        return 'in_transit';
      case AllocationStatus.PENDING:
      default:
        return 'pending_acceptance';
    }
  }, [activeAllocation]);

  const pickupLocation = useMemo(
    () =>
      activeAllocation
        ? findDriverAllocationLocation(activeAllocation.pickupId)
        : null,
    [activeAllocation]
  );
  const destinationLocation = useMemo(
    () =>
      activeAllocation
        ? findDriverAllocationLocation(activeAllocation.destinationId)
        : null,
    [activeAllocation]
  );
  const {
    currentLocation: trackedDriverLocation,
    trackingStatus,
    statusMessage: trackingStatusMessage,
    lastUpdatedAt,
  } = useDriverRealtimeLocation(activeAllocation);
  const driverLocation = useMemo(
    () =>
      activeAllocation?.status === AllocationStatus.IN_TRANSIT
        ? trackedDriverLocation ?? getDriverAllocationLiveLocation(activeAllocation)
        : null,
    [activeAllocation, trackedDriverLocation]
  );
  const pickupMarker = useMemo<MarkerData | null>(
    () =>
      pickupLocation
        ? {
            id: 'driver-pickup',
            location: pickupLocation.location,
            title: 'Pickup',
            description: pickupLocation.label,
            type: 'checkpoint',
          }
        : null,
    [pickupLocation]
  );
  const destinationMarker = useMemo<MarkerData | null>(
    () =>
      destinationLocation
        ? {
            id: 'driver-destination',
            location: destinationLocation.location,
            title: 'Destination',
            description: destinationLocation.label,
            type: 'destination',
          }
        : null,
    [destinationLocation]
  );
  const driverMarker = useMemo<MarkerData | null>(
    () =>
      driverLocation && activeAllocation
        ? {
            id: `driver-${activeAllocation.id}`,
            location: driverLocation,
            title: activeAllocation.driverName,
            description: `Current position - ETA ${activeAllocation.eta}`,
            type: 'driver',
            status: 'active',
          }
        : null,
    [activeAllocation, driverLocation]
  );
  const markers = useMemo(
    () =>
      [
        pickupMarker,
        destinationMarker,
        tripStage === 'in_transit' ? driverMarker : null,
      ].filter((marker) => marker !== null) as MarkerData[],
    [destinationMarker, driverMarker, pickupMarker, tripStage]
  );
  const routes = useMemo<Location[][]>(() => {
    if (
      tripStage === 'in_transit' &&
      driverLocation &&
      destinationLocation
    ) {
      return [[driverLocation, destinationLocation.location]];
    }

    if (!activeAllocation) {
      return [];
    }

    return getDriverAllocationRoute(
      activeAllocation.pickupId,
      activeAllocation.destinationId
    );
  }, [activeAllocation, destinationLocation, driverLocation, tripStage]);
  const initialRegion = useMemo(
    () =>
      activeAllocation
        ? getDriverAllocationInitialRegion(
            activeAllocation.pickupId,
            activeAllocation.destinationId
          )
        : {
            latitude: 14.5995,
            longitude: 120.9842,
            latitudeDelta: 0.18,
            longitudeDelta: 0.18,
          },
    [activeAllocation]
  );

  const stageMessage = getStageMessage(tripStage);
  const isWaitingForBooking = tripStage === 'waiting_for_booking';
  const compactMeta =
    isWaitingForBooking
      ? 'Available'
      : tripStage === 'pending_acceptance'
        ? 'Pending'
        : activeAllocation?.eta ?? 'On Route';
  const trackingMetaLabel =
    trackingStatus === 'tracking' && lastUpdatedAt
      ? `Updated ${lastUpdatedAt.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
        })}`
      : trackingStatus === 'tracking'
        ? 'Live GPS Active'
        : trackingStatus === 'permission_denied'
          ? 'Location Access Needed'
          : trackingStatus === 'disabled'
            ? 'Location Services Off'
            : trackingStatus === 'error'
              ? 'Live GPS Delayed'
              : 'Live GPS Standby';

  const refreshActiveAllocation = () => {
    setRefreshKey((current) => current + 1);
  };

  const handleAcceptBooking = async () => {
    if (!activeAllocation) {
      return;
    }

    try {
      await acceptDriverAllocation(activeAllocation.id);
      refreshActiveAllocation();
      Alert.alert(
        'Booking Accepted',
        'The booking is now accepted. Start the trip when ready.'
      );
    } catch (error) {
      Alert.alert(
        'Unable to accept booking',
        error instanceof Error
          ? error.message
          : 'The booking could not be accepted right now.'
      );
    }
  };

  const handleStartTrip = async () => {
    if (!activeAllocation) {
      return;
    }

    try {
      await startDriverAllocationTrip(activeAllocation.id);
      refreshActiveAllocation();
      Alert.alert(
        'Trip Started',
        'The booking is now marked as In Transit and live tracking is active.'
      );
    } catch (error) {
      Alert.alert(
        'Unable to start trip',
        error instanceof Error
          ? error.message
          : 'The trip could not be started right now.'
      );
    }
  };

  const handleEndTrip = async () => {
    if (!activeAllocation) {
      return;
    }

    try {
      await completeDriverAllocationTrip(activeAllocation.id);
      refreshActiveAllocation();
      Alert.alert(
        'Trip Ended',
        'The trip is now completed and the stock unit is marked as Available.'
      );
    } catch (error) {
      Alert.alert(
        'Unable to complete trip',
        error instanceof Error
          ? error.message
          : 'The trip could not be completed right now.'
      );
    }
  };

  return (
    <View style={styles.container}>
      {isWaitingForBooking ? (
        <View style={styles.standbyMapSurface}>
          <View style={styles.standbyGlowPrimary} />
          <View style={styles.standbyGlowSecondary} />
          <View style={styles.standbyRingLarge} />
          <View style={styles.standbyRingSmall} />

          <View style={styles.standbyMapChip}>
            <Ionicons
              name="sparkles-outline"
              size={14}
              color={theme.colors.primaryDark}
            />
            <Text style={styles.standbyMapChipText}>Standby Coverage</Text>
          </View>

          <View style={styles.standbyHeroCard}>
            <View style={styles.standbyHeroBadge}>
              <Ionicons
                name="locate-outline"
                size={16}
                color={theme.colors.primary}
              />
              <Text style={styles.standbyHeroBadgeText}>
                Ready for the next dispatch
              </Text>
            </View>

            <Text style={styles.standbyHeroTitle}>
              Live route tracking appears once a booking is assigned.
            </Text>

            <Text style={styles.standbyHeroSubtitle}>
              Keep this driver online and notifications enabled so pickup and
              destination details can open here right away.
            </Text>

            <View style={styles.standbyHeroStats}>
              <View style={styles.standbyHeroStat}>
                <Text style={styles.standbyHeroStatLabel}>Status</Text>
                <Text style={styles.standbyHeroStatValue}>Standby</Text>
              </View>

              <View style={styles.standbyHeroStat}>
                <Text style={styles.standbyHeroStatLabel}>Tracking</Text>
                <Text style={styles.standbyHeroStatValue}>Waiting for trip</Text>
              </View>
            </View>
          </View>
        </View>
      ) : (
        <MapViewComponent
          markers={markers}
          routes={routes}
          initialRegion={initialRegion}
          mapChipLabel={getMapChipLabel(tripStage)}
          style={styles.map}
        />
      )}

      <SafeAreaView pointerEvents="box-none" style={styles.overlay}>
        <View style={styles.topOverlay}>
          {activeAllocation ? (
            <View style={styles.headerCard}>
              <View style={styles.headerRow}>
                <Text style={styles.headerLabel}>Assigned Booking</Text>
                <StatusBadge
                  status={getStageBadgeStatus(tripStage)}
                  label={getStageLabel(tripStage)}
                  size="small"
                />
              </View>

              <View style={styles.routeSummaryRow}>
                <View style={styles.routeSummaryPill}>
                  <Text style={styles.routeSummaryKey}>Pickup</Text>
                  <Text style={styles.routeSummaryValue} numberOfLines={1}>
                    {activeAllocation.pickupLabel}
                  </Text>
                </View>

                <Ionicons
                  name="arrow-forward-outline"
                  size={16}
                  color={theme.colors.primaryDark}
                />

                <View style={styles.routeSummaryPill}>
                  <Text style={styles.routeSummaryKey}>Destination</Text>
                  <Text style={styles.routeSummaryValue} numberOfLines={1}>
                    {activeAllocation.destinationLabel}
                  </Text>
                </View>
              </View>
            </View>
          ) : null}
        </View>

        <View style={styles.bottomOverlay}>
          {tripStage === 'waiting_for_booking' ? (
            <View style={[styles.controlCard, styles.waitingCard]}>
              <View style={styles.waitingCardTop}>
                <View style={styles.waitingIconWrap}>
                  <Ionicons
                    name="time-outline"
                    size={22}
                    color={theme.colors.primary}
                  />
                </View>

                <StatusBadge
                  status="inactive"
                  label="Standby"
                  size="small"
                />
              </View>

              <Text style={styles.waitingTitle}>Waiting for Booking</Text>
              <Text style={styles.waitingSubtitle}>{stageMessage}</Text>

              <View style={styles.waitingInfoRow}>
                <View style={styles.waitingInfoChip}>
                  <Ionicons
                    name="radio-outline"
                    size={14}
                    color={theme.colors.primaryDark}
                  />
                  <Text style={styles.waitingInfoText}>Available now</Text>
                </View>

                <View style={styles.waitingInfoChip}>
                  <Ionicons
                    name="car-sport-outline"
                    size={14}
                    color={theme.colors.primaryDark}
                  />
                  <Text style={styles.waitingInfoText}>
                    One active dispatch at a time
                  </Text>
                </View>
              </View>

              <View style={styles.waitingTipCard}>
                <Ionicons
                  name="notifications-outline"
                  size={18}
                  color={theme.colors.primary}
                />
                <View style={styles.waitingTipCopy}>
                  <Text style={styles.waitingTipTitle}>
                    Keep notifications on
                  </Text>
                  <Text style={styles.waitingTipText}>
                    New assignments will show here as soon as they are sent to
                    this driver account.
                  </Text>
                </View>
              </View>
            </View>
          ) : (
            <View style={styles.controlCard}>
              <View style={styles.controlHeader}>
                <View style={styles.controlTitleWrap}>
                  <Text style={styles.controlTitle}>
                    {tripStage === 'pending_acceptance'
                      ? 'Accept Booking'
                      : tripStage === 'accepted'
                        ? 'Trip Ready'
                        : 'Driving'}
                  </Text>
                  <Text style={styles.controlSubtitle}>{stageMessage}</Text>
                </View>

                <View style={styles.timeChip}>
                  <Ionicons
                    name="navigate-outline"
                    size={14}
                    color={theme.colors.primaryDark}
                  />
                  <Text style={styles.timeChipText}>{compactMeta}</Text>
                </View>
              </View>

              <View style={styles.trackingCard}>
                <View style={styles.trackingCardTop}>
                  <View style={styles.trackingIconWrap}>
                    <Ionicons
                      name={
                        trackingStatus === 'tracking'
                          ? 'locate'
                          : trackingStatus === 'permission_denied'
                            ? 'alert-circle-outline'
                            : 'location-outline'
                      }
                      size={16}
                      color={
                        trackingStatus === 'tracking'
                          ? theme.colors.success
                          : trackingStatus === 'permission_denied'
                            ? theme.colors.error
                            : theme.colors.primary
                      }
                    />
                  </View>

                  <View style={styles.trackingCopy}>
                    <Text style={styles.trackingTitle}>Realtime Location</Text>
                    <Text style={styles.trackingSubtitle}>
                      {trackingStatusMessage}
                    </Text>
                  </View>

                  <StatusBadge
                    status={
                      trackingStatus === 'tracking'
                        ? 'verified'
                        : trackingStatus === 'permission_denied' ||
                            trackingStatus === 'error'
                          ? 'cancelled'
                          : 'inactive'
                    }
                    label={trackingMetaLabel}
                    size="small"
                  />
                </View>
              </View>

              <View style={styles.actionStack}>
                {tripStage === 'pending_acceptance' ? (
                  <Button
                    title="Accept Booking"
                    variant="primary"
                    onPress={handleAcceptBooking}
                    fullWidth
                    icon={
                      <Ionicons
                        name="checkmark-circle-outline"
                        size={18}
                        color={theme.colors.white}
                      />
                    }
                  />
                ) : null}

                {tripStage === 'accepted' ? (
                  <Button
                    title="Start Trip"
                    variant="primary"
                    onPress={handleStartTrip}
                    fullWidth
                    icon={
                      <Ionicons
                        name="play-outline"
                        size={18}
                        color={theme.colors.white}
                      />
                    }
                  />
                ) : null}

                {tripStage === 'in_transit' ? (
                  <Button
                    title="End Trip"
                    variant="danger"
                    onPress={handleEndTrip}
                    fullWidth
                    icon={
                      <Ionicons
                        name="stop-circle-outline"
                        size={18}
                        color={theme.colors.white}
                      />
                    }
                  />
                ) : null}
              </View>
            </View>
          )}
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.black,
  },
  map: {
    flex: 1,
    width: '100%',
    height: '100%',
    borderRadius: 0,
    borderWidth: 0,
    backgroundColor: theme.colors.gray100,
  },
  standbyMapSurface: {
    flex: 1,
    width: '100%',
    backgroundColor: '#F5EFE4',
    overflow: 'hidden',
  },
  standbyGlowPrimary: {
    position: 'absolute',
    top: -120,
    right: -80,
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: 'rgba(204, 53, 53, 0.12)',
  },
  standbyGlowSecondary: {
    position: 'absolute',
    top: 120,
    left: -90,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(209, 167, 101, 0.16)',
  },
  standbyRingLarge: {
    position: 'absolute',
    top: 110,
    right: 28,
    width: 170,
    height: 170,
    borderRadius: 85,
    borderWidth: 1,
    borderColor: 'rgba(128, 110, 75, 0.16)',
  },
  standbyRingSmall: {
    position: 'absolute',
    top: 210,
    left: 32,
    width: 98,
    height: 98,
    borderRadius: 49,
    borderWidth: 1,
    borderColor: 'rgba(128, 110, 75, 0.14)',
  },
  standbyMapChip: {
    position: 'absolute',
    top: 22,
    left: theme.spacing.base,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    borderRadius: theme.radius.full,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.65)',
  },
  standbyMapChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.primaryDark,
    fontFamily: theme.fonts.family.sans,
  },
  standbyHeroCard: {
    position: 'absolute',
    left: theme.spacing.base,
    right: theme.spacing.base,
    top: 92,
    borderRadius: 28,
    padding: theme.spacing.base,
    backgroundColor: 'rgba(255, 252, 248, 0.92)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.7)',
    ...theme.shadows.lg,
  },
  standbyHeroBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    borderRadius: theme.radius.full,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.primarySurface,
    borderWidth: 1,
    borderColor: theme.colors.primarySurfaceStrong,
    marginBottom: theme.spacing.base,
  },
  standbyHeroBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.primaryDark,
    fontFamily: theme.fonts.family.sans,
  },
  standbyHeroTitle: {
    fontSize: 23,
    lineHeight: 29,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
    fontFamily: theme.fonts.family.sans,
  },
  standbyHeroSubtitle: {
    fontSize: 13,
    lineHeight: 20,
    color: theme.colors.textMuted,
    marginBottom: theme.spacing.base,
    fontFamily: theme.fonts.family.sans,
  },
  standbyHeroStats: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  standbyHeroStat: {
    flex: 1,
    borderRadius: 18,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderWidth: 1,
    borderColor: theme.colors.borderStrong,
  },
  standbyHeroStatLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.7,
    textTransform: 'uppercase',
    color: theme.colors.textSubtle,
    marginBottom: 4,
    fontFamily: theme.fonts.family.sans,
  },
  standbyHeroStatValue: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.text,
    fontFamily: theme.fonts.family.sans,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
  },
  topOverlay: {
    paddingHorizontal: theme.spacing.base,
    paddingTop: theme.spacing.sm,
  },
  headerCard: {
    borderRadius: 22,
    padding: theme.spacing.sm,
    backgroundColor: theme.colors.white,
    borderWidth: 1,
    borderColor: theme.colors.borderStrong,
    ...theme.shadows.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.base,
    marginBottom: theme.spacing.xs,
  },
  headerLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.9,
    textTransform: 'uppercase',
    color: theme.colors.primaryDark,
    fontFamily: theme.fonts.family.sans,
  },
  routeSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  routeSummaryPill: {
    flex: 1,
    borderRadius: 16,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 10,
    backgroundColor: theme.colors.surfaceOverlay,
    borderWidth: 1,
    borderColor: theme.colors.borderStrong,
  },
  routeSummaryKey: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.7,
    textTransform: 'uppercase',
    color: theme.colors.textSubtle,
    marginBottom: 2,
    fontFamily: theme.fonts.family.sans,
  },
  routeSummaryValue: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.text,
    fontFamily: theme.fonts.family.sans,
  },
  bottomOverlay: {
    paddingHorizontal: theme.spacing.base,
    paddingBottom: theme.spacing.base,
  },
  controlCard: {
    borderRadius: 28,
    padding: theme.spacing.sm,
    backgroundColor: 'rgba(247, 248, 252, 0.96)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.7)',
    ...theme.shadows.lg,
  },
  controlHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: theme.spacing.base,
    marginBottom: theme.spacing.xs,
  },
  controlTitleWrap: {
    flex: 1,
  },
  controlTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 2,
    fontFamily: theme.fonts.family.sans,
  },
  controlSubtitle: {
    fontSize: 11,
    lineHeight: 16,
    color: theme.colors.textMuted,
    fontFamily: theme.fonts.family.sans,
  },
  timeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    borderRadius: theme.radius.full,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.primarySurface,
    borderWidth: 1,
    borderColor: theme.colors.primarySurfaceStrong,
  },
  timeChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.primaryDark,
    fontFamily: theme.fonts.family.sans,
  },
  trackingCard: {
    marginBottom: theme.spacing.sm,
    borderRadius: 20,
    paddingHorizontal: theme.spacing.base,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.white,
    borderWidth: 1,
    borderColor: theme.colors.borderStrong,
  },
  trackingCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  trackingIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primarySurface,
    borderWidth: 1,
    borderColor: theme.colors.primarySurfaceStrong,
  },
  trackingCopy: {
    flex: 1,
  },
  trackingTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 2,
    fontFamily: theme.fonts.family.sans,
  },
  trackingSubtitle: {
    fontSize: 11,
    lineHeight: 16,
    color: theme.colors.textMuted,
    fontFamily: theme.fonts.family.sans,
  },
  actionStack: {
    gap: theme.spacing.sm,
  },
  waitingCard: {
    padding: theme.spacing.base,
  },
  waitingCardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: theme.spacing.base,
    marginBottom: theme.spacing.base,
  },
  waitingIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primarySurface,
    borderWidth: 1,
    borderColor: theme.colors.primarySurfaceStrong,
  },
  waitingTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
    fontFamily: theme.fonts.family.sans,
  },
  waitingSubtitle: {
    fontSize: 13,
    lineHeight: 20,
    color: theme.colors.textMuted,
    marginBottom: theme.spacing.base,
    fontFamily: theme.fonts.family.sans,
  },
  waitingInfoRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.base,
  },
  waitingInfoChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    borderRadius: theme.radius.full,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.surfaceOverlay,
    borderWidth: 1,
    borderColor: theme.colors.borderStrong,
  },
  waitingInfoText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.text,
    fontFamily: theme.fonts.family.sans,
  },
  waitingTipCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.sm,
    borderRadius: 22,
    paddingHorizontal: theme.spacing.base,
    paddingVertical: theme.spacing.base,
    backgroundColor: theme.colors.primarySurface,
    borderWidth: 1,
    borderColor: theme.colors.primarySurfaceStrong,
  },
  waitingTipCopy: {
    flex: 1,
  },
  waitingTipTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.primaryDark,
    marginBottom: 4,
    fontFamily: theme.fonts.family.sans,
  },
  waitingTipText: {
    fontSize: 12,
    lineHeight: 18,
    color: theme.colors.textMuted,
    fontFamily: theme.fonts.family.sans,
  },
});
