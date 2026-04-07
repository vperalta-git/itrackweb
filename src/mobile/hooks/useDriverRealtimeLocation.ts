import { useEffect, useMemo, useRef, useState } from 'react';
import { Platform } from 'react-native';
import * as ExpoLocation from 'expo-location';
import {
  type DriverAllocationLiveLocation,
  type DriverAllocationRecord,
  updateDriverAllocationLiveLocation,
} from '../data/driver-allocation';
import { AllocationStatus } from '../types';

type TrackingStatus =
  | 'idle'
  | 'tracking'
  | 'disabled'
  | 'permission_denied'
  | 'error';

type UseDriverRealtimeLocationResult = {
  currentLocation: DriverAllocationLiveLocation | null;
  trackingStatus: TrackingStatus;
  statusMessage: string;
  lastUpdatedAt: Date | null;
};

const LOCATION_SYNC_DISTANCE_METERS = 8;
const LOCATION_SYNC_INTERVAL_MS = 10_000;

const toRadians = (value: number) => (value * Math.PI) / 180;

const getDistanceBetweenMeters = (
  origin: DriverAllocationLiveLocation,
  destination: DriverAllocationLiveLocation
) => {
  const earthRadiusMeters = 6_371_000;
  const latitudeDelta = toRadians(destination.latitude - origin.latitude);
  const longitudeDelta = toRadians(destination.longitude - origin.longitude);
  const originLatitude = toRadians(origin.latitude);
  const destinationLatitude = toRadians(destination.latitude);
  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(originLatitude) *
      Math.cos(destinationLatitude) *
      Math.sin(longitudeDelta / 2) ** 2;

  return (
    2 *
    earthRadiusMeters *
    Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine))
  );
};

const mapLocationObjectToLiveLocation = (
  location: ExpoLocation.LocationObject
): DriverAllocationLiveLocation => ({
  latitude: location.coords.latitude,
  longitude: location.coords.longitude,
  accuracy:
    typeof location.coords.accuracy === 'number' ? location.coords.accuracy : null,
  updatedAt: new Date(location.timestamp),
});

export const useDriverRealtimeLocation = (
  allocation: DriverAllocationRecord | null
): UseDriverRealtimeLocationResult => {
  const [currentLocation, setCurrentLocation] =
    useState<DriverAllocationLiveLocation | null>(allocation?.currentLocation ?? null);
  const [trackingStatus, setTrackingStatus] = useState<TrackingStatus>('idle');
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(
    allocation?.currentLocation?.updatedAt ?? null
  );
  const allocationId = allocation?.id ?? null;
  const isTrackingEnabled = allocation?.status === AllocationStatus.IN_TRANSIT;
  const locationSubscriptionRef = useRef<ExpoLocation.LocationSubscription | null>(
    null
  );
  const lastSyncedLocationRef = useRef<DriverAllocationLiveLocation | null>(
    allocation?.currentLocation ?? null
  );
  const lastSyncedAtRef = useRef<number>(
    allocation?.currentLocation?.updatedAt?.getTime() ?? 0
  );

  useEffect(() => {
    setCurrentLocation(allocation?.currentLocation ?? null);
    setLastUpdatedAt(allocation?.currentLocation?.updatedAt ?? null);
    lastSyncedLocationRef.current = allocation?.currentLocation ?? null;
    lastSyncedAtRef.current = allocation?.currentLocation?.updatedAt?.getTime() ?? 0;
  }, [allocation?.currentLocation, allocationId]);

  useEffect(() => {
    let isCancelled = false;

    const stopTracking = () => {
      locationSubscriptionRef.current?.remove();
      locationSubscriptionRef.current = null;
    };

    if (!allocationId || !isTrackingEnabled) {
      stopTracking();
      setTrackingStatus('idle');
      return () => {
        stopTracking();
      };
    }

    const syncLiveLocation = async (location: DriverAllocationLiveLocation) => {
      setCurrentLocation(location);
      setLastUpdatedAt(location.updatedAt ?? new Date());

      const lastSyncedLocation = lastSyncedLocationRef.current;
      const lastSyncedAt = lastSyncedAtRef.current;
      const movedDistance =
        lastSyncedLocation
          ? getDistanceBetweenMeters(lastSyncedLocation, location)
          : Infinity;
      const elapsedTime = Date.now() - lastSyncedAt;

      if (
        lastSyncedLocation &&
        movedDistance < LOCATION_SYNC_DISTANCE_METERS &&
        elapsedTime < LOCATION_SYNC_INTERVAL_MS
      ) {
        return;
      }

      try {
        await updateDriverAllocationLiveLocation(allocationId, location);
        lastSyncedLocationRef.current = location;
        lastSyncedAtRef.current = Date.now();
        setTrackingStatus('tracking');
      } catch {
        if (!isCancelled) {
          setTrackingStatus('error');
        }
      }
    };

    const startTracking = async () => {
      try {
        const servicesEnabled = await ExpoLocation.hasServicesEnabledAsync();

        if (!servicesEnabled) {
          if (!isCancelled) {
            setTrackingStatus('disabled');
          }
          return;
        }

        let permission = await ExpoLocation.getForegroundPermissionsAsync();

        if (!permission.granted) {
          permission = await ExpoLocation.requestForegroundPermissionsAsync();
        }

        if (!permission.granted) {
          if (!isCancelled) {
            setTrackingStatus('permission_denied');
          }
          return;
        }

        if (Platform.OS === 'android') {
          await ExpoLocation.enableNetworkProviderAsync().catch(() => undefined);
        }

        const currentPosition = await ExpoLocation.getCurrentPositionAsync({
          accuracy: ExpoLocation.Accuracy.High,
        });

        if (isCancelled) {
          return;
        }

        await syncLiveLocation(mapLocationObjectToLiveLocation(currentPosition));

        locationSubscriptionRef.current = await ExpoLocation.watchPositionAsync(
          {
            accuracy: ExpoLocation.Accuracy.High,
            timeInterval: LOCATION_SYNC_INTERVAL_MS,
            distanceInterval: LOCATION_SYNC_DISTANCE_METERS,
          },
          (position) => {
            void syncLiveLocation(mapLocationObjectToLiveLocation(position));
          }
        );

        if (!isCancelled) {
          setTrackingStatus('tracking');
        }
      } catch {
        if (!isCancelled) {
          setTrackingStatus('error');
        }
      }
    };

    void startTracking();

    return () => {
      isCancelled = true;
      stopTracking();
    };
  }, [allocationId, isTrackingEnabled]);

  const statusMessage = useMemo(() => {
    switch (trackingStatus) {
      case 'tracking':
        return 'Live GPS is updating your trip location.';
      case 'disabled':
        return 'Turn on your device location services to share your live trip position.';
      case 'permission_denied':
        return 'Allow location permission so your live trip position can be detected.';
      case 'error':
        return 'Live GPS could not be updated right now. The app will try again on the next trip refresh.';
      case 'idle':
      default:
        return 'Live GPS will start once the trip is marked In Transit.';
    }
  }, [trackingStatus]);

  return {
    currentLocation,
    trackingStatus,
    statusMessage,
    lastUpdatedAt,
  };
};
