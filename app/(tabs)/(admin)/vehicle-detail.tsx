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
import { Header, Card, StatusBadge, Button } from '../../components';

export default function VehicleDetailScreen() {
  const router = useRouter();
  const { vehicleId } = useLocalSearchParams();

  // Mock vehicle data
  const vehicle = {
    id: vehicleId || '1',
    number: 'MH 02 AB 1234',
    type: 'SUV',
    model: 'Tesla Model S',
    registrationNumber: 'RJ-1234567',
    chassisNumber: 'JHRJ5DA1XXX00001',
    engineNumber: 'ENG123456',
    color: 'White',
    mileage: 15240,
    status: 'active',
    lastService: '2024-03-15',
    nextService: '2024-06-15',
    insuranceExpiry: '2024-12-31',
    registrationExpiry: '2025-03-20',
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header
        title="Vehicle Details"
        leftIcon={
          <Text style={{ fontSize: 20, color: theme.colors.gray900 }}>{'←'}</Text>
        }
        onLeftPress={() => router.back()}
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Vehicle Number Card */}
        <Card style={styles.card} variant="elevated">
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 12,
            }}
          >
            <Text style={styles.cardTitle}>{vehicle.number}</Text>
            <StatusBadge status="active" label="Active" />
          </View>
          <Text style={styles.cardSubtitle}>{vehicle.model}</Text>
        </Card>

        {/* Basic Details */}
        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>Basic Information</Text>
          {[
            { label: 'Type', value: vehicle.type },
            { label: 'Model', value: vehicle.model },
            { label: 'Color', value: vehicle.color },
            { label: 'Registration', value: vehicle.registrationNumber },
            { label: 'Chassis #', value: vehicle.chassisNumber },
            { label: 'Engine #', value: vehicle.engineNumber },
          ].map((item, index) => (
            <View
              key={index}
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                paddingVertical: 10,
                borderBottomWidth: index < 5 ? 1 : 0,
                borderBottomColor: theme.colors.gray200,
              }}
            >
              <Text style={styles.label}>{item.label}</Text>
              <Text style={styles.value}>{item.value}</Text>
            </View>
          ))}
        </Card>

        {/* Maintenance */}
        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>Maintenance Schedule</Text>
          {[
            { label: 'Last Service', value: vehicle.lastService, icon: '✓' },
            { label: 'Next Service', value: vehicle.nextService, icon: '📅' },
          ].map((item, index) => (
            <View
              key={index}
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                paddingVertical: 10,
                borderBottomWidth: index < 1 ? 1 : 0,
                borderBottomColor: theme.colors.gray200,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={{ marginRight: 8 }}>{item.icon}</Text>
                <Text style={styles.label}>{item.label}</Text>
              </View>
              <Text style={styles.value}>{item.value}</Text>
            </View>
          ))}
        </Card>

        {/* Documentation */}
        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>Documentation Expiry</Text>
          {[
            { label: 'Insurance', value: vehicle.insuranceExpiry, icon: '📄' },
            { label: 'Registration', value: vehicle.registrationExpiry, icon: '📋' },
          ].map((item, index) => (
            <View
              key={index}
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                paddingVertical: 10,
                borderBottomWidth: index < 1 ? 1 : 0,
                borderBottomColor: theme.colors.gray200,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={{ marginRight: 8 }}>{item.icon}</Text>
                <Text style={styles.label}>{item.label}</Text>
              </View>
              <Text style={styles.value}>{item.value}</Text>
            </View>
          ))}
        </Card>

        {/* Current Mileage */}
        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>Current Status</Text>
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              paddingVertical: 10,
            }}
          >
            <Text style={styles.label}>Mileage</Text>
            <Text style={styles.value}>{vehicle.mileage} km</Text>
          </View>
        </Card>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <Button
            title="Edit Vehicle"
            variant="primary"
            onPress={() => console.log('Edit vehicle')}
            fullWidth
            style={{ marginBottom: 12 }}
          />
          <Button
            title="View History"
            variant="secondary"
            onPress={() => console.log('View history')}
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
