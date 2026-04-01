import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { theme } from '../../constants/theme';
import { Button } from '../../components';
import { MapViewComponent } from '../../components/MapView';
import { TripDetailsOverlay } from '../../components/TripDetailsOverlay';
import LocationTracker from '../../utils/locationTracker';

const mockActiveTrip = {
  driverId: 'driver-1',
  driverName: 'John Doe',
  vehicleId: 'v-001',
  vehicleNumber: 'MH 02 AB 1234',
  destination: 'Downtown Location',
  distance: 12.5,
  eta: 15,
  status: 'active' as const,
  startTime: '2:00 PM',
  currentSpeed: 45,
  route: 'Central Stockyard → Downtown Location',
  notes: 'High priority delivery. Handle with care.',
};

export default function DriverDashboard() {
  const [selectedTrip] = useState(mockActiveTrip);

  // Get driver location and markers
  const driverMarker = LocationTracker.createDriverMarker(
    'driver-1',
    'You',
    'active'
  );

  const destMarker = LocationTracker.createDestinationMarker(
    'dest-2',
    'Downtown Location'
  );

  const markers = [driverMarker, destMarker].filter(m => m !== null);
  const routes = [LocationTracker.getDriverRoute('driver-1')];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Live Map */}
        {driverMarker && destMarker && (
          <MapViewComponent
            markers={markers}
            routes={routes}
            initialRegion={{
              latitude: driverMarker.location.latitude,
              longitude: driverMarker.location.longitude,
              latitudeDelta: 0.05,
              longitudeDelta: 0.05,
            }}
            style={styles.mapContainer}
          />
        )}

        {/* Trip Details */}
        <TripDetailsOverlay trip={selectedTrip} style={styles.tripOverlay} />

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <Button
            title="Start Trip"
            variant="primary"
            onPress={() => console.log('Start trip')}
            fullWidth
            size="large"
          />
          <Button
            title="End Trip"
            variant="danger"
            onPress={() => console.log('End trip')}
            fullWidth
            size="large"
          />
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
    backgroundColor: theme.colors.white,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24,
  },
  mapContainer: {
    marginBottom: 16,
    height: 350,
  },
  tripOverlay: {
    marginBottom: 16,
  },
  actionButtons: {
    gap: 12,
    marginBottom: 20,
  },
});
