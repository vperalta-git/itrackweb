import { Location, MarkerData } from '../components/MapView';

// Mock location data for different drivers
const mockDriverLocations: Record<string, Location[]> = {
  'driver-1': [
    { latitude: 40.7128, longitude: -74.006, timestamp: Date.now() },
    { latitude: 40.715, longitude: -74.008, timestamp: Date.now() - 60000 },
    { latitude: 40.717, longitude: -74.01, timestamp: Date.now() - 120000 },
  ],
  'driver-2': [
    { latitude: 40.71, longitude: -74.005, timestamp: Date.now() },
    { latitude: 40.712, longitude: -74.007, timestamp: Date.now() - 60000 },
    { latitude: 40.714, longitude: -74.009, timestamp: Date.now() - 120000 },
  ],
  'driver-3': [
    { latitude: 40.72, longitude: -74.002, timestamp: Date.now() },
    { latitude: 40.722, longitude: -74.004, timestamp: Date.now() - 60000 },
    { latitude: 40.724, longitude: -74.006, timestamp: Date.now() - 120000 },
  ],
};

// Mock destination data
const mockDestinations: Record<string, Location> = {
  'dest-1': { latitude: 40.753, longitude: -73.983 }, // Central Park area
  'dest-2': { latitude: 40.74, longitude: -74.002 }, // Near Wall Street
  'dest-3': { latitude: 40.747, longitude: -73.968 }, // Times Square
};

export class LocationTracker {
  static getDriverLocation(driverId: string): Location | null {
    const locations = mockDriverLocations[driverId];
    return locations ? locations[0] : null;
  }

  static getDriverRoute(driverId: string): Location[] {
    return mockDriverLocations[driverId] || [];
  }

  static getDestinationLocation(destinationId: string): Location | null {
    return mockDestinations[destinationId] || null;
  }

  static calculateDistance(loc1: Location, loc2: Location): number {
    const R = 6371; // Earth's radius in km
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
    return Math.ceil((distance / speedKmh) * 60); // Return in minutes
  }

  static createDriverMarker(
    driverId: string,
    name: string,
    status: 'active' | 'inactive' = 'active'
  ): MarkerData | null {
    const location = this.getDriverLocation(driverId);
    if (!location) return null;

    return {
      id: driverId,
      location,
      title: name,
      description: status === 'active' ? 'In Transit' : 'Idle',
      type: 'driver',
      status,
    };
  }

  static createDestinationMarker(
    destinationId: string,
    name: string
  ): MarkerData | null {
    const location = this.getDestinationLocation(destinationId);
    if (!location) return null;

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
      .filter((marker) => marker !== null) as MarkerData[];
  }

  static simulateDriverMovement(
    currentLocation: Location,
    destinationLocation: Location,
    progress: number
  ): Location {
    // progress is 0-1, representing how far along the route we are
    const clampedProgress = Math.min(Math.max(progress, 0), 1);

    return {
      latitude:
        currentLocation.latitude +
        (destinationLocation.latitude - currentLocation.latitude) * clampedProgress,
      longitude:
        currentLocation.longitude +
        (destinationLocation.longitude - currentLocation.longitude) * clampedProgress,
      timestamp: Date.now(),
    };
  }
}

export default LocationTracker;
