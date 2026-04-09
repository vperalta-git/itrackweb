import { useEffect, useMemo, useState } from 'react';

import {
  type DriverAllocationLiveLocation,
  type DriverAllocationRecord,
  findDriverAllocationLocation,
  formatDriverAllocationEta,
  formatDriverAllocationRemainingDistance,
} from '../data/driver-allocation';
import { resolveRouteMetrics } from '../utils/mapboxRouting';
import { AllocationStatus } from '../types';

type RouteMetricLocation = {
  latitude: number;
  longitude: number;
  accuracy?: number | null;
  timestamp?: number;
};

type UseDriverAllocationLiveRouteMetricsResult = {
  distanceKm: number | null;
  distanceLabel: string | null;
  etaLabel: string;
};

function serializePoint(point: RouteMetricLocation | null) {
  if (!point) {
    return 'none';
  }

  return `${point.latitude.toFixed(6)},${point.longitude.toFixed(6)}`;
}

export function useDriverAllocationLiveRouteMetrics(
  allocation: DriverAllocationRecord | null,
  currentLocation?: RouteMetricLocation | DriverAllocationLiveLocation | null
): UseDriverAllocationLiveRouteMetricsResult {
  const fallbackDistanceLabel = useMemo(
    () =>
      allocation ? formatDriverAllocationRemainingDistance(allocation) : null,
    [allocation]
  );
  const fallbackEtaLabel = useMemo(
    () => (allocation ? formatDriverAllocationEta(allocation) : 'Pending'),
    [allocation]
  );
  const [routeDistanceKm, setRouteDistanceKm] = useState<number | null>(null);

  const destination = useMemo(
    () => findDriverAllocationLocation(allocation?.destinationId ?? null),
    [allocation?.destinationId]
  );
  const routeStart = useMemo(() => {
    if (!allocation) {
      return null;
    }

    if (currentLocation) {
      return currentLocation;
    }

    if (allocation.currentLocation) {
      return allocation.currentLocation;
    }

    return findDriverAllocationLocation(allocation.pickupId)?.location ?? null;
  }, [allocation, currentLocation]);
  const routeKey = useMemo(
    () => `${allocation?.id ?? 'none'}:${serializePoint(routeStart)}:${serializePoint(destination?.location ?? null)}`,
    [allocation?.id, destination?.location, routeStart]
  );

  useEffect(() => {
    if (
      !allocation ||
      allocation.status !== AllocationStatus.IN_TRANSIT ||
      !routeStart ||
      !destination
    ) {
      setRouteDistanceKm(null);
      return;
    }

    let isCancelled = false;

    void resolveRouteMetrics([routeStart, destination.location])
      .then((result) => {
        if (isCancelled) {
          return;
        }

        setRouteDistanceKm(result.distanceKm ?? null);
      })
      .catch(() => {
        if (isCancelled) {
          return;
        }

        setRouteDistanceKm(null);
      });

    return () => {
      isCancelled = true;
    };
  }, [allocation, destination, routeKey, routeStart]);

  return {
    distanceKm: routeDistanceKm,
    distanceLabel:
      routeDistanceKm !== null
        ? `${routeDistanceKm.toFixed(1)} km left`
        : fallbackDistanceLabel,
    etaLabel:
      allocation
        ? formatDriverAllocationEta(allocation, routeDistanceKm ?? undefined)
        : fallbackEtaLabel,
  };
}
