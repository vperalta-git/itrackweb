import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';
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
export const DriverTrackingContext = createContext<(UseDriverRealtimeLocationResult & { allocationId: string | null }) | null>(null);

// Screens read one driver publisher owned by the authenticated app shell.
// Navigation between trip details and other modules must not stop tracking.
export const useDriverRealtimeLocation = (allocation: DriverAllocationRecord | null): UseDriverRealtimeLocationResult => {
  const shared = useContext(DriverTrackingContext);
  return shared && shared.allocationId === allocation?.id ? shared : {
    currentLocation: allocation?.currentLocation ?? null, lastUpdatedAt: allocation?.currentLocation?.updatedAt ?? null,
    trackingStatus: 'idle', statusMessage: 'Live GPS starts when your assigned trip is in transit.',
  };
};

const LOCATION_SYNC_DISTANCE_METERS = 8;
const LOCATION_SYNC_INTERVAL_MS = 5_000;
const STATIONARY_HEARTBEAT_MS = 15_000;

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
  speed: typeof location.coords.speed === 'number' ? location.coords.speed : null,
  heading:
    typeof location.coords.heading === 'number' ? location.coords.heading : null,
  updatedAt: new Date(location.timestamp),
});

export const useDriverLocationPublisher = (
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
    let syncInFlight = false;
    let positionRequestInFlight = false;
    let heartbeat: ReturnType<typeof setInterval> | null = null;
    let resumeSubscription: ReturnType<typeof AppState.addEventListener> | null = null;

    const stopTracking = () => {
      locationSubscriptionRef.current?.remove();
      locationSubscriptionRef.current = null;
      if (heartbeat) clearInterval(heartbeat);
      resumeSubscription?.remove();
    };

    if (!allocationId || !isTrackingEnabled) {
      stopTracking();
      setTrackingStatus('idle');
      return () => {
        stopTracking();
      };
    }

    const syncLiveLocation = async (location: DriverAllocationLiveLocation) => {
      if (isCancelled || syncInFlight || !location.updatedAt ||
          Date.now() - location.updatedAt.getTime() > 60_000 ||
          location.accuracy != null && location.accuracy > 35) return;

      const lastSyncedLocation = lastSyncedLocationRef.current;
      const lastSyncedAt = lastSyncedAtRef.current;
      const movedDistance =
        lastSyncedLocation
          ? getDistanceBetweenMeters(lastSyncedLocation, location)
          : Infinity;
      const elapsedTime = Date.now() - lastSyncedAt;

      const movementThreshold = Math.max(LOCATION_SYNC_DISTANCE_METERS, Math.min(20, location.accuracy ?? 8));
      if (elapsedTime < LOCATION_SYNC_INTERVAL_MS || lastSyncedLocation && movedDistance < movementThreshold && elapsedTime < STATIONARY_HEARTBEAT_MS) {
        return;
      }

      syncInFlight = true;
      try {
        const saved = await updateDriverAllocationLiveLocation(allocationId, location);
        if (isCancelled) return;
        lastSyncedLocationRef.current = saved.currentLocation ?? location;
        lastSyncedAtRef.current = Date.now();
        setCurrentLocation(saved.currentLocation ?? null);
        setLastUpdatedAt(saved.currentLocation?.updatedAt ?? null);
        const accepted = saved.currentLocation?.updatedAt && Date.now() - saved.currentLocation.updatedAt.getTime() < 60_000;
        setTrackingStatus(accepted ? 'tracking' : 'error');
      } catch {
        if (!isCancelled) {
          setTrackingStatus('error');
        }
      } finally { syncInFlight = false; }
    };

    const requestFreshPosition = async () => {
      if (isCancelled || positionRequestInFlight || AppState.currentState !== 'active') return;
      positionRequestInFlight = true;
      try {
        const position = await ExpoLocation.getCurrentPositionAsync({ accuracy: ExpoLocation.Accuracy.High });
        await syncLiveLocation(mapLocationObjectToLiveLocation(position));
      } catch {
        if (!isCancelled) setTrackingStatus('error');
      } finally {
        positionRequestInFlight = false;
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

        if (isCancelled) return;
        // Subscribe before waiting for a high accuracy initial fix.
        const subscription = await ExpoLocation.watchPositionAsync(
          {
            accuracy: ExpoLocation.Accuracy.High,
            timeInterval: LOCATION_SYNC_INTERVAL_MS,
            distanceInterval: 0,
          },
          (position) => {
            void syncLiveLocation(mapLocationObjectToLiveLocation(position));
          }
        );
        if (isCancelled) { subscription.remove(); return; }
        locationSubscriptionRef.current = subscription;
        // A recent cached fix can be sent with its original sample timestamp.
        void ExpoLocation.getLastKnownPositionAsync({ maxAge: 30_000, requiredAccuracy: 35 })
          .then((position) => { if (position) void syncLiveLocation(mapLocationObjectToLiveLocation(position)); })
          .catch(() => undefined);
        void requestFreshPosition();
        heartbeat = setInterval(() => {
          if (Date.now() - lastSyncedAtRef.current >= STATIONARY_HEARTBEAT_MS) void requestFreshPosition();
        }, STATIONARY_HEARTBEAT_MS);
      } catch {
        if (!isCancelled) {
          setTrackingStatus('error');
        }
      }
    };

    resumeSubscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active') return;
      if (locationSubscriptionRef.current) void requestFreshPosition();
      else void startTracking();
    });
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
