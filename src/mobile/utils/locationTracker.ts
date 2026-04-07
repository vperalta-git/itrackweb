import { Location, MarkerData } from '../components/MapView';
import { AllocationStatus } from '../types';
import {
  findDriverAllocationLocation,
  getDriverAllocationDashboardRecord,
  getDriverAllocationLiveLocation,
  getDriverAllocationRoute,
  getDriverAllocations,
  type DriverAllocationRecord,
} from '../data/driver-allocation';

const getLatestDriverAllocation = (driverId: string): DriverAllocationRecord | null =>
  getDriverAllocationDashboardRecord(driverId) ??
  getDriverAllocations().find((allocation) => allocation.driverId === driverId) ??
  null;

export class LocationTracker {
  static getDriverLocation(driverId: string): Location | null {
    const allocation = getLatestDriverAllocation(driverId);

    if (!allocation) {
      return null;
    }

    if (allocation.status === AllocationStatus.IN_TRANSIT) {
      return getDriverAllocationLiveLocation(allocation);
    }

    return findDriverAllocationLocation(allocation.pickupId)?.location ?? null;
  }

  static getDriverRoute(driverId: string): Location[] {
    const allocation = getLatestDriverAllocation(driverId);

    if (!allocation) {
      return [];
    }

    return getDriverAllocationRoute(
      allocation.pickupId,
      allocation.destinationId
    )[0] ?? [];
  }

  static getDestinationLocation(destinationId: string): Location | null {
    return findDriverAllocationLocation(destinationId)?.location ?? null;
  }

  static calculateDistance(loc1: Location, loc2: Location): number {
    const R = 6371;
    const dLat = ((loc2.latitude - loc1.latitude) * Math.PI) / 180;
    const dLng = ((loc2.longitude - loc1.longitude) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((loc1.latitude * Math.PI) / 180) *
        Math.cos((loc2.latitude * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  static calculateETA(
    currentLocation: Location,
    destination: Location,
    speedKmh: number = 40
  ): number {
    const distance = this.calculateDistance(currentLocation, destination);
    return Math.ceil((distance / speedKmh) * 60);
  }

  static createDriverMarker(
    driverId: string,
    name: string,
    status: 'active' | 'inactive' = 'active'
  ): MarkerData | null {
    const location = this.getDriverLocation(driverId);

    if (!location) {
      return null;
    }

    return {
      id: driverId,
      location,
      title: name,
      description: status === 'active' ? 'Driver location' : 'Driver inactive',
      type: 'driver',
      status,
    };
  }

  static createDestinationMarker(
    destinationId: string,
    name: string
  ): MarkerData | null {
    const location = this.getDestinationLocation(destinationId);

    if (!location) {
      return null;
    }

    return {
      id: destinationId,
      location,
      title: name,
      type: 'destination',
    };
  }

  static getDriversForDisplay(
    driverIds: string[],
    driverNames: Record<string, string>,
    statuses: Record<string, 'active' | 'inactive'> = {}
  ): MarkerData[] {
    return driverIds
      .map((id) => {
        const status = statuses[id] || 'active';
        return this.createDriverMarker(id, driverNames[id], status);
      })
      .filter((marker): marker is MarkerData => marker !== null);
  }

  static simulateDriverMovement(
    currentLocation: Location,
    destinationLocation: Location,
    progress: number
  ): Location {
    const clampedProgress = Math.min(Math.max(progress, 0), 1);

    return {
      latitude:
        currentLocation.latitude +
        (destinationLocation.latitude - currentLocation.latitude) *
          clampedProgress,
      longitude:
        currentLocation.longitude +
        (destinationLocation.longitude - currentLocation.longitude) *
          clampedProgress,
      timestamp: Date.now(),
    };
  }
}

export default LocationTracker;
