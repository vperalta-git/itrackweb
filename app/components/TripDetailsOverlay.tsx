import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ViewStyle,
} from 'react-native';
import { theme } from '../constants/theme';
import { StatusBadge } from './StatusBadge';

export interface TripDetails {
  driverId: string;
  driverName: string;
  vehicleId: string;
  vehicleNumber: string;
  destination: string;
  distance: number; // km
  eta: number; // minutes
  status: 'active' | 'completed' | 'cancelled' | 'pending';
  startTime: string;
  currentSpeed: number; // km/h
  route: string;
  notes?: string;
}

interface TripDetailsOverlayProps {
  trip: TripDetails;
  onClose?: () => void;
  style?: ViewStyle;
}

export const TripDetailsOverlay = ({
  trip,
  onClose,
  style,
}: TripDetailsOverlayProps) => {
  const statusMap = {
    active: { status: 'active' as const, label: 'In Transit' },
    completed: { status: 'completed' as const, label: 'Completed' },
    cancelled: { status: 'cancelled' as const, label: 'Cancelled' },
    pending: { status: 'pending' as const, label: 'Pending' },
  };

  const currentStatus = statusMap[trip.status];

  return (
    <View
      style={[
        {
          backgroundColor: theme.colors.white,
          borderRadius: theme.radius.lg,
          padding: 16,
          marginHorizontal: 16,
          marginBottom: 16,
          borderWidth: 1,
          borderColor: theme.colors.gray200,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          elevation: 3,
        },
        style,
      ]}
    >
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: 12,
        }}
      >
        <View style={{ flex: 1 }}>
          <Text
            style={{
              fontSize: 16,
              fontWeight: '700',
              color: theme.colors.gray900,
              fontFamily: theme.fonts.family.sans,
              marginBottom: 4,
            }}
          >
            {trip.driverName}
          </Text>
          <Text
            style={{
              fontSize: 13,
              color: theme.colors.gray600,
              fontFamily: theme.fonts.family.sans,
            }}
          >
            {trip.vehicleNumber}
          </Text>
        </View>
        <StatusBadge status={currentStatus.status} label={currentStatus.label} />
      </View>

      <View
        style={{
          borderTopWidth: 1,
          borderTopColor: theme.colors.gray200,
          paddingTop: 12,
          marginBottom: 12,
        }}
      >
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            marginBottom: 8,
          }}
        >
          <Text
            style={{
              fontSize: 13,
              color: theme.colors.gray600,
              fontFamily: theme.fonts.family.sans,
            }}
          >
            Destination
          </Text>
          <Text
            style={{
              fontSize: 13,
              fontWeight: '600',
              color: theme.colors.gray900,
              fontFamily: theme.fonts.family.sans,
            }}
          >
            {trip.destination}
          </Text>
        </View>

        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            marginBottom: 8,
          }}
        >
          <Text
            style={{
              fontSize: 13,
              color: theme.colors.gray600,
              fontFamily: theme.fonts.family.sans,
            }}
          >
            Distance
          </Text>
          <Text
            style={{
              fontSize: 13,
              fontWeight: '600',
              color: theme.colors.gray900,
              fontFamily: theme.fonts.family.sans,
            }}
          >
            {trip.distance.toFixed(1)} km
          </Text>
        </View>

        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            marginBottom: 8,
          }}
        >
          <Text
            style={{
              fontSize: 13,
              color: theme.colors.gray600,
              fontFamily: theme.fonts.family.sans,
            }}
          >
            ETA
          </Text>
          <Text
            style={{
              fontSize: 13,
              fontWeight: '600',
              color: theme.colors.gray900,
              fontFamily: theme.fonts.family.sans,
            }}
          >
            {trip.eta} min
          </Text>
        </View>

        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
          }}
        >
          <Text
            style={{
              fontSize: 13,
              color: theme.colors.gray600,
              fontFamily: theme.fonts.family.sans,
            }}
          >
            Current Speed
          </Text>
          <Text
            style={{
              fontSize: 13,
              fontWeight: '600',
              color: theme.colors.gray900,
              fontFamily: theme.fonts.family.sans,
            }}
          >
            {trip.currentSpeed} km/h
          </Text>
        </View>
      </View>

      {trip.notes && (
        <View
          style={{
            backgroundColor: theme.colors.gray50,
            paddingHorizontal: 12,
            paddingVertical: 8,
            borderRadius: theme.radius.md,
          }}
        >
          <Text
            style={{
              fontSize: 12,
              color: theme.colors.gray700,
              fontFamily: theme.fonts.family.sans,
              lineHeight: 18,
            }}
          >
            {trip.notes}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({});
