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

export default function DriverDetailScreen() {
  const router = useRouter();
  const { driverId } = useLocalSearchParams();

  // Mock driver data
  const driver = {
    id: driverId || '1',
    name: 'John Doe',
    phone: '+91-9876543210',
    email: 'john.doe@example.com',
    licenseNumber: 'DL0123456789',
    licenseExpiry: '2025-06-15',
    assignedVehicle: 'MH 02 AB 1234',
    status: 'active',
    joinDate: '2023-01-15',
    tripsCompleted: 247,
    averageRating: 4.8,
    documents: {
      license: 'verified',
      insurance: 'verified',
      background: 'verified',
    },
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header
        title="Driver Details"
        leftIcon={
          <Text style={{ fontSize: 20, color: theme.colors.gray900 }}>{'←'}</Text>
        }
        onLeftPress={() => router.back()}
      />

      <ScrollView contentContentSize={styles.scrollContent}>
        {/* Driver Profile Card */}
        <Card style={styles.card} variant="elevated">
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 12,
            }}
          >
            <View>
              <Text style={styles.cardTitle}>{driver.name}</Text>
              <Text style={styles.cardSubtitle}>{driver.email}</Text>
            </View>
            <StatusBadge status="active" label="Active" />
          </View>
        </Card>

        {/* Contact Information */}
        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>Contact Information</Text>
          {[
            { label: 'Phone', value: driver.phone },
            { label: 'Email', value: driver.email },
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
              <Text style={styles.label}>{item.label}</Text>
              <Text style={styles.value}>{item.value}</Text>
            </View>
          ))}
        </Card>

        {/* License Information */}
        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>License Information</Text>
          {[
            { label: 'License #', value: driver.licenseNumber },
            { label: 'Expiry Date', value: driver.licenseExpiry },
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
              <Text style={styles.label}>{item.label}</Text>
              <Text style={styles.value}>{item.value}</Text>
            </View>
          ))}
        </Card>

        {/* Assignment */}
        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>Current Assignment</Text>
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              paddingVertical: 10,
            }}
          >
            <Text style={styles.label}>Assigned Vehicle</Text>
            <Text style={styles.value}>{driver.assignedVehicle}</Text>
          </View>
        </Card>

        {/* Performance */}
        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>Performance</Text>
          {[
            { label: 'Trips Completed', value: driver.tripsCompleted.toString() },
            { label: 'Average Rating', value: `${driver.averageRating}/5.0` },
            { label: 'Joined Date', value: driver.joinDate },
          ].map((item, index) => (
            <View
              key={index}
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                paddingVertical: 10,
                borderBottomWidth: index < 2 ? 1 : 0,
                borderBottomColor: theme.colors.gray200,
              }}
            >
              <Text style={styles.label}>{item.label}</Text>
              <Text style={styles.value}>{item.value}</Text>
            </View>
          ))}
        </Card>

        {/* Documents */}
        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>Documents</Text>
          {Object.entries(driver.documents).map((item, index) => (
            <View
              key={index}
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                paddingVertical: 10,
                borderBottomWidth: index < 2 ? 1 : 0,
                borderBottomColor: theme.colors.gray200,
              }}
            >
              <Text style={styles.label}>
                {item[0].charAt(0).toUpperCase() + item[0].slice(1)}
              </Text>
              <StatusBadge
                status="completed"
                label={item[1]}
                size="small"
              />
            </View>
          ))}
        </Card>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <Button
            title="Edit Driver"
            variant="primary"
            onPress={() => console.log('Edit driver')}
            fullWidth
            style={{ marginBottom: 12 }}
          />
          <Button
            title="View Trips"
            variant="secondary"
            onPress={() => console.log('View trips')}
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
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
});
