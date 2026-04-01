import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { theme } from '../../constants/theme';
import { Header, Card, StatusBadge, Button, ProgressBar, MapViewComponent } from '../../components';
import LocationTracker from '../../utils/locationTracker';

export default function TripDetailScreen() {
  const router = useRouter();
  const { tripId } = useLocalSearchParams();

  // Mock trip data
  const trip = {
    id: tripId || '1',
    vehicleNumber: 'MH 02 AB 1234',
    destination: 'Downtown Location',
    status: 'active' as const,
    startTime: '2:00 PM',
    estimatedEndTime: '2:15 PM',
    distance: 12.5,
    completedDistance: 8.3,
    eta: 5,
    currentSpeed: 45,
    route: 'Central Stockyard → Downtown Location',
    stops: ['Stop 1: City Center', 'Stop 2: Main Street'],
    notes: 'High priority delivery. Handle with care.',
  };

  // Get location markers for the map
  const driverMarker = LocationTracker.createDriverMarker('driver-1', 'You', 'active');
  const destMarker = LocationTracker.createDestinationMarker('dest-2', 'Downtown Location');
  const markers = [driverMarker, destMarker].filter(m => m !== null);
  const routes = [LocationTracker.getDriverRoute('driver-1')];

  const completionPercentage = (trip.completedDistance / trip.distance) * 100;

  return (
    <SafeAreaView style={styles.container}>
      <Header
        title="Trip Details"
        leftIcon={
          <Text style={{ fontSize: 20, color: theme.colors.gray900 }}>{'←'}</Text>
        }
        onLeftPress={() => router.back()}
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Trip Status Card */}
        <Card style={styles.card} variant="elevated">
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 12,
            }}
          >
            <Text style={styles.cardTitle}>{trip.vehicleNumber}</Text>
            <StatusBadge status={trip.status} label="In Transit" />
          </View>
          <Text style={styles.cardSubtitle}>{trip.destination}</Text>
        </Card>

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

        {/* Progress */}
        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>Trip Progress</Text>
          <ProgressBar
            progress={completionPercentage}
            label="Distance Covered"
            showPercentage
            style={{ marginBottom: 16 }}
          />
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
            }}
          >
            <Text style={styles.label}>
              {trip.completedDistance.toFixed(1)} / {trip.distance.toFixed(1)} km
            </Text>
          </View>
        </Card>

        {/* Trip Details */}
        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>Trip Information</Text>
          {[
            { label: 'Start Time', value: trip.startTime },
            { label: 'Estimated End', value: trip.estimatedEndTime },
            { label: 'ETA', value: `${trip.eta} min` },
            { label: 'Current Speed', value: `${trip.currentSpeed} km/h` },
          ].map((item, index) => (
            <View
              key={index}
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                paddingVertical: 10,
                borderBottomWidth: index < 3 ? 1 : 0,
                borderBottomColor: theme.colors.gray200,
              }}
            >
              <Text style={styles.label}>{item.label}</Text>
              <Text style={styles.value}>{item.value}</Text>
            </View>
          ))}
        </Card>

        {/* Route Information */}
        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>Route</Text>
          <Text
            style={{
              fontSize: 13,
              color: theme.colors.gray900,
              marginBottom: 12,
              fontFamily: theme.fonts.family.sans,
              fontWeight: '600',
            }}
          >
            {trip.route}
          </Text>
          <Text style={{ fontSize: 12, color: theme.colors.gray600, fontFamily: theme.fonts.family.sans, marginBottom: 12 }}>
            Scheduled Stops:
          </Text>
          {trip.stops.map((stop, index) => (
            <View
              key={index}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                marginBottom: 8,
              }}
            >
              <Text style={{ marginRight: 8, color: theme.colors.primary }}>•</Text>
              <Text style={{ fontSize: 13, color: theme.colors.gray700, fontFamily: theme.fonts.family.sans }}>
                {stop}
              </Text>
            </View>
          ))}
        </Card>

        {/* Notes */}
        {trip.notes && (
          <Card style={styles.card}>
            <Text style={styles.sectionTitle}>Notes</Text>
            <Text
              style={{
                fontSize: 13,
                color: theme.colors.gray700,
                lineHeight: 20,
                fontFamily: theme.fonts.family.sans,
              }}
            >
              {trip.notes}
            </Text>
          </Card>
        )}

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <Button
            title="Report Issue"
            variant="secondary"
            onPress={() => console.log('Report issue')}
            fullWidth
            style={{ marginBottom: 12 }}
          />
          <Button
            title="Complete Trip"
            variant="primary"
            onPress={() => console.log('Complete trip')}
            fullWidth
          />
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
    padding: 16,
    paddingBottom: 32,
  },
  card: {
    marginBottom: 16,
  },
  mapContainer: {
    marginBottom: 16,
    height: 300,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.gray900,
    fontFamily: theme.fonts.family.sans,
  },
  cardSubtitle: {
    fontSize: 14,
    color: theme.colors.gray600,
    fontFamily: theme.fonts.family.sans,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.gray900,
    marginBottom: 12,
    fontFamily: theme.fonts.family.sans,
  },
  label: {
    fontSize: 13,
    color: theme.colors.gray600,
    fontFamily: theme.fonts.family.sans,
  },
  value: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.gray900,
    fontFamily: theme.fonts.family.sans,
  },
  actionButtons: {
    marginTop: 8,
  },
});
