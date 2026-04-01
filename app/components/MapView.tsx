import React, { useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  ViewStyle,
  Text,
  Dimensions,
  Pressable,
} from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { theme } from '../constants/theme';

export interface Location {
  latitude: number;
  longitude: number;
  timestamp?: number;
  accuracy?: number;
}

export interface MarkerData {
  id: string;
  location: Location;
  title: string;
  description?: string;
  type: 'driver' | 'destination' | 'checkpoint' | 'custom';
  status?: string;
  icon?: React.ReactNode;
}

interface MapViewProps {
  markers?: MarkerData[];
  routes?: Location[][];
  initialRegion?: {
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
  };
  onMarkerPress?: (marker: MarkerData) => void;
  style?: ViewStyle;
  showClusters?: boolean;
  showScale?: boolean;
}

const getMarkerColor = (type: string, status?: string) => {
  switch (type) {
    case 'driver':
      return status === 'active' ? theme.colors.primary : theme.colors.gray400;
    case 'destination':
      return '#22c55e';
    case 'checkpoint':
      return '#3b82f6';
    case 'custom':
      return theme.colors.secondary;
    default:
      return theme.colors.gray400;
  }
};

const getMarkerLabel = (type: string) => {
  switch (type) {
    case 'driver':
      return '🚗';
    case 'destination':
      return '📍';
    case 'checkpoint':
      return '🔵';
    default:
      return '📌';
  }
};

export const MapViewComponent = ({
  markers = [],
  routes = [],
  initialRegion = {
    latitude: 40.7128,
    longitude: -74.006,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  },
  onMarkerPress,
  style,
  showClusters = false,
  showScale = true,
}: MapViewProps) => {
  const mapRef = useRef<MapView>(null);

  const handleMarkerPress = (marker: MarkerData) => {
    if (onMarkerPress) {
      onMarkerPress(marker);
    }
  };

  const fitToMarkers = () => {
    if (mapRef.current && markers.length > 0) {
      mapRef.current.fitToElements(true);
    }
  };

  const getRouteColor = (index: number) => {
    const colors = [theme.colors.primary, '#3b82f6', '#8b5cf6', '#ec4899'];
    return colors[index % colors.length];
  };

  return (
    <View
      style={[
        {
          width: '100%',
          height: 400,
          borderRadius: theme.radius.lg,
          overflow: 'hidden',
        },
        style,
      ]}
    >
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFillObject}
        initialRegion={initialRegion}
        provider={PROVIDER_GOOGLE}
        loadingEnabled
        loadingIndicatorColor={theme.colors.primary}
      >
        {/* Render routes */}
        {routes.map((route, routeIndex) => (
          <Polyline
            key={`route-${routeIndex}`}
            coordinates={route}
            strokeColor={getRouteColor(routeIndex)}
            strokeWidth={3}
            lineDashPattern={[10, 5]}
          />
        ))}

        {/* Render markers */}
        {markers.map((marker) => (
          <Marker
            key={marker.id}
            coordinate={marker.location}
            onPress={() => handleMarkerPress(marker)}
            title={marker.title}
            description={marker.description}
            pinColor={getMarkerColor(marker.type, marker.status)}
          >
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: getMarkerColor(marker.type, marker.status),
                borderWidth: 3,
                borderColor: theme.colors.white,
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <Text style={{ fontSize: 20 }}>
                {getMarkerLabel(marker.type)}
              </Text>
            </View>
          </Marker>
        ))}
      </MapView>

      {showScale && markers.length > 1 && (
        <Pressable
          style={{
            position: 'absolute',
            bottom: 16,
            right: 16,
            backgroundColor: theme.colors.white,
            paddingHorizontal: 12,
            paddingVertical: 8,
            borderRadius: theme.radius.md,
            borderWidth: 1,
            borderColor: theme.colors.gray200,
          }}
          onPress={fitToMarkers}
        >
          <Text
            style={{
              fontSize: 12,
              fontWeight: '600',
              color: theme.colors.primary,
              fontFamily: theme.fonts.family.sans,
            }}
          >
            Fit to View
          </Text>
        </Pressable>
      )}
    </View>
  );
};

const styles = StyleSheet.create({});
