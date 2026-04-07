import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  LayoutChangeEvent,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import MapView, { Marker, Polyline } from 'react-native-maps';
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
  onMapPress?: (location: Location) => void;
  style?: ViewStyle;
  showClusters?: boolean;
  showScale?: boolean;
  mapChipLabel?: string;
}

type Bounds = {
  minLatitude: number;
  maxLatitude: number;
  minLongitude: number;
  maxLongitude: number;
};

type DirectionsResponse = {
  status?: string;
  routes?: Array<{
    overview_polyline?: {
      points?: string;
    };
  }>;
};

type OsrmRouteResponse = {
  code?: string;
  routes?: Array<{
    geometry?: {
      coordinates?: [number, number][];
    };
  }>;
};

type RuntimeExtra = {
  googleMapsDirectionsApiKey?: string | null;
  googleMapsApiKeys?: {
    android?: string | null;
    ios?: string | null;
  };
};

type RoutePolylineCacheEntry = {
  coordinates: Location[] | null;
  expiresAt: number;
};

const ROUTE_REFRESH_DISTANCE_METERS = 15;
const ROUTE_CACHE_TTL_MS = 2 * 60 * 1000;
const routePolylineCache = new Map<string, RoutePolylineCacheEntry>();
const inflightRoutePolylineRequests = new Map<
  string,
  Promise<Location[] | null>
>();

function getMarkerColor(type: string, status?: string) {
  switch (type) {
    case 'driver':
      return status === 'active'
        ? theme.colors.primary
        : theme.colors.textSubtle;
    case 'destination':
      return theme.colors.success;
    case 'checkpoint':
      return theme.colors.info;
    case 'custom':
      return theme.colors.secondary;
    default:
      return theme.colors.textSubtle;
  }
}

function getMarkerIconName(type: string) {
  switch (type) {
    case 'driver':
      return 'car-sport';
    case 'destination':
      return 'flag';
    case 'checkpoint':
      return 'ellipse';
    default:
      return 'location';
  }
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function formatCoordinate(value: number) {
  return value.toFixed(6);
}

function serializeLocation(point: Location) {
  return `${formatCoordinate(point.latitude)},${formatCoordinate(point.longitude)}`;
}

function serializeLocationForRefresh(point: Location) {
  const latitudeBucketSize = ROUTE_REFRESH_DISTANCE_METERS / 111320;
  const longitudeBucketSize =
    ROUTE_REFRESH_DISTANCE_METERS /
    Math.max(
      111320 * Math.cos((point.latitude * Math.PI) / 180),
      0.000001
    );

  const latitudeBucket =
    Math.round(point.latitude / latitudeBucketSize) * latitudeBucketSize;
  const longitudeBucket =
    Math.round(point.longitude / longitudeBucketSize) * longitudeBucketSize;

  return `${formatCoordinate(latitudeBucket)},${formatCoordinate(longitudeBucket)}`;
}

function serializeRegion(region: NonNullable<MapViewProps['initialRegion']>) {
  return [
    formatCoordinate(region.latitude),
    formatCoordinate(region.longitude),
    formatCoordinate(region.latitudeDelta),
    formatCoordinate(region.longitudeDelta),
  ].join('|');
}

function getRouteCacheKey(route: Location[]) {
  return route.map(serializeLocation).join('|');
}

function getRouteRefreshKey(route: Location[]) {
  return route.map(serializeLocationForRefresh).join('|');
}

function getRuntimeDirectionsApiKey() {
  const extra = (
    Constants.expoConfig?.extra ??
    (Constants as any).manifest?.extra ??
    (Constants as any).manifest2?.extra ??
    {}
  ) as RuntimeExtra;
  const platformKey =
    Platform.OS === 'ios'
      ? extra.googleMapsApiKeys?.ios
      : extra.googleMapsApiKeys?.android;

  return (
    extra.googleMapsDirectionsApiKey ??
    platformKey ??
    extra.googleMapsApiKeys?.android ??
    extra.googleMapsApiKeys?.ios ??
    null
  );
}

function decodePolyline(encoded: string): Location[] {
  const coordinates: Location[] = [];
  let index = 0;
  let latitude = 0;
  let longitude = 0;

  while (index < encoded.length) {
    let shift = 0;
    let result = 0;
    let byte;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    const latitudeDelta = result & 1 ? ~(result >> 1) : result >> 1;
    latitude += latitudeDelta;

    shift = 0;
    result = 0;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    const longitudeDelta = result & 1 ? ~(result >> 1) : result >> 1;
    longitude += longitudeDelta;

    coordinates.push({
      latitude: latitude / 1e5,
      longitude: longitude / 1e5,
    });
  }

  return coordinates;
}

async function resolveRoutePolyline(
  route: Location[],
  apiKey: string | null
): Promise<Location[] | null> {
  if (route.length < 2) {
    return route;
  }

  const cacheKey = `${apiKey ?? 'osrm'}:${getRouteCacheKey(route)}`;
  const cachedRoute = routePolylineCache.get(cacheKey);

  if (cachedRoute && cachedRoute.expiresAt > Date.now()) {
    return cachedRoute.coordinates;
  }

  if (cachedRoute) {
    routePolylineCache.delete(cacheKey);
  }

  const existingRequest = inflightRoutePolylineRequests.get(cacheKey);

  if (existingRequest) {
    return existingRequest;
  }

  const request = (async () => {
    try {
      const origin = serializeLocation(route[0]);
      const destination = serializeLocation(route[route.length - 1]);

      if (origin === destination) {
        return route;
      }

      if (apiKey) {
        const waypoints = route
          .slice(1, -1)
          .slice(0, 23)
          .map((point) => `via:${serializeLocation(point)}`);
        let directionsUrl =
          'https://maps.googleapis.com/maps/api/directions/json' +
          `?origin=${encodeURIComponent(origin)}` +
          `&destination=${encodeURIComponent(destination)}` +
          '&mode=driving' +
          '&departure_time=now' +
          '&traffic_model=best_guess' +
          `&key=${encodeURIComponent(apiKey)}`;

        if (waypoints.length) {
          directionsUrl += `&waypoints=${encodeURIComponent(waypoints.join('|'))}`;
        }

        const response = await fetch(directionsUrl);

        if (response.ok) {
          const payload = (await response.json()) as DirectionsResponse;
          const encodedPolyline = payload.routes?.[0]?.overview_polyline?.points;

          if (payload.status === 'OK' && encodedPolyline) {
            const decodedRoute = decodePolyline(encodedPolyline);

            if (decodedRoute.length >= 2) {
              return decodedRoute;
            }
          }
        }
      }

      const osrmCoordinates = route
        .map((point) => `${point.longitude},${point.latitude}`)
        .join(';');
      const osrmUrl =
        `https://router.project-osrm.org/route/v1/driving/${osrmCoordinates}` +
        '?overview=full&geometries=geojson';
      const osrmResponse = await fetch(osrmUrl);

      if (!osrmResponse.ok) {
        return null;
      }

      const osrmPayload = (await osrmResponse.json()) as OsrmRouteResponse;
      const osrmCoordinatesPath = osrmPayload.routes?.[0]?.geometry?.coordinates;

      if (osrmPayload.code !== 'Ok' || !osrmCoordinatesPath?.length) {
        return null;
      }

      const osrmRoute = osrmCoordinatesPath.map(([longitude, latitude]) => ({
        latitude,
        longitude,
      }));

      return osrmRoute.length >= 2 ? osrmRoute : null;
    } catch {
      return null;
    } finally {
      inflightRoutePolylineRequests.delete(cacheKey);
    }
  })();

  inflightRoutePolylineRequests.set(cacheKey, request);

  const resolvedRoute = await request;
  routePolylineCache.set(cacheKey, {
    coordinates: resolvedRoute,
    expiresAt: Date.now() + ROUTE_CACHE_TTL_MS,
  });

  return resolvedRoute;
}

function getBounds(
  points: Location[],
  initialRegion: NonNullable<MapViewProps['initialRegion']>
): Bounds {
  if (!points.length) {
    return {
      minLatitude: initialRegion.latitude - initialRegion.latitudeDelta / 2,
      maxLatitude: initialRegion.latitude + initialRegion.latitudeDelta / 2,
      minLongitude: initialRegion.longitude - initialRegion.longitudeDelta / 2,
      maxLongitude: initialRegion.longitude + initialRegion.longitudeDelta / 2,
    };
  }

  const latitudes = points.map((point) => point.latitude);
  const longitudes = points.map((point) => point.longitude);
  const minLatitude = Math.min(...latitudes);
  const maxLatitude = Math.max(...latitudes);
  const minLongitude = Math.min(...longitudes);
  const maxLongitude = Math.max(...longitudes);
  const latitudePadding = Math.max((maxLatitude - minLatitude) * 0.18, 0.01);
  const longitudePadding = Math.max(
    (maxLongitude - minLongitude) * 0.18,
    0.01
  );

  return {
    minLatitude: minLatitude - latitudePadding,
    maxLatitude: maxLatitude + latitudePadding,
    minLongitude: minLongitude - longitudePadding,
    maxLongitude: maxLongitude + longitudePadding,
  };
}

function projectPoint(point: Location, bounds: Bounds) {
  const latitudeRange = Math.max(
    bounds.maxLatitude - bounds.minLatitude,
    0.0001
  );
  const longitudeRange = Math.max(
    bounds.maxLongitude - bounds.minLongitude,
    0.0001
  );

  return {
    x:
      clamp(
        ((point.longitude - bounds.minLongitude) / longitudeRange) * 100,
        8,
        92
      ) / 100,
    y:
      clamp(
        (1 - (point.latitude - bounds.minLatitude) / latitudeRange) * 100,
        8,
        92
      ) / 100,
  };
}

export const MapViewComponent = ({
  markers = [],
  routes = [],
  initialRegion = {
    latitude: 14.5995,
    longitude: 120.9842,
    latitudeDelta: 0.18,
    longitudeDelta: 0.18,
  },
  onMarkerPress,
  onMapPress,
  style,
  showClusters = false,
  showScale = true,
  mapChipLabel = 'Live Map',
}: MapViewProps) => {
  const mapRef = useRef<MapView>(null);
  const routesRef = useRef(routes);
  const [nativeMapReady, setNativeMapReady] = useState(false);
  const [mockLayout, setMockLayout] = useState({ width: 0, height: 0 });
  const [resolvedRoutes, setResolvedRoutes] = useState<Location[][]>(routes);
  routesRef.current = routes;
  const directionsApiKey = useMemo(() => getRuntimeDirectionsApiKey(), []);
  const initialRegionKey = useMemo(
    () => serializeRegion(initialRegion),
    [
      initialRegion.latitude,
      initialRegion.longitude,
      initialRegion.latitudeDelta,
      initialRegion.longitudeDelta,
    ]
  );
  const routeRequestKey = useMemo(
    () => routes.map(getRouteRefreshKey).join('||'),
    [routes]
  );
  const displayRoutes = resolvedRoutes.length === routes.length ? resolvedRoutes : routes;
  const mapPoints = useMemo(
    () => [...markers.map((marker) => marker.location), ...displayRoutes.flat()],
    [displayRoutes, markers]
  );
  const bounds = useMemo(
    () => getBounds(mapPoints, initialRegion),
    [initialRegion, mapPoints]
  );

  useEffect(() => {
    let isActive = true;
    const requestedRoutes = routesRef.current;

    setResolvedRoutes((current) => {
      const currentKey = current.map(getRouteRefreshKey).join('||');
      return currentKey === routeRequestKey ? current : requestedRoutes;
    });

    void (async () => {
      const nextRoutes = await Promise.all(
        requestedRoutes.map((route) =>
          resolveRoutePolyline(route, directionsApiKey)
        )
      );

      if (!isActive) {
        return;
      }

      const fallbackRoutes = nextRoutes.map((route, index) =>
        route && route.length >= 2 ? route : requestedRoutes[index]
      );

      setResolvedRoutes((current) => {
        const nextResolvedRouteKey = fallbackRoutes
          .map(getRouteRefreshKey)
          .join('||');

        return nextResolvedRouteKey === current.map(getRouteRefreshKey).join('||')
          ? current
          : fallbackRoutes;
      });
    })();

    return () => {
      isActive = false;
    };
  }, [directionsApiKey, routeRequestKey]);

  useEffect(() => {
    if (nativeMapReady) {
      return undefined;
    }

    const fallbackTimer = setTimeout(() => {
      setNativeMapReady(true);
    }, 1500);

    return () => {
      clearTimeout(fallbackTimer);
    };
  }, [initialRegionKey, nativeMapReady]);

  const fitToMarkers = () => {
    if (!mapRef.current || !mapPoints.length) {
      return;
    }

    const edgePadding = {
      top: 40,
      right: 40,
      bottom: 40,
      left: 40,
    };

    if (mapPoints.length === 1) {
      mapRef.current.animateToRegion(
        {
          latitude: mapPoints[0].latitude,
          longitude: mapPoints[0].longitude,
          latitudeDelta: 0.02,
          longitudeDelta: 0.02,
        },
        350
      );

      return;
    }

    mapRef.current.fitToCoordinates(mapPoints, {
      animated: true,
      edgePadding,
    });
  };

  const getRouteColor = (index: number) => {
    const palette = [
      theme.colors.primary,
      theme.colors.info,
      theme.colors.warning,
      theme.colors.gray700,
    ];

    return palette[index % palette.length];
  };

  const handleMockLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setMockLayout((current) =>
      current.width === width && current.height === height
        ? current
        : { width, height }
    );
  };

  const handleMockMapPress = (event: LayoutChangeEvent | any) => {
    if (!onMapPress || !mockLayout.width || !mockLayout.height) {
      return;
    }

    const { locationX, locationY } = event.nativeEvent;
    const latitudeRatio = 1 - locationY / mockLayout.height;
    const longitudeRatio = locationX / mockLayout.width;

    onMapPress({
      latitude:
        bounds.minLatitude +
        (bounds.maxLatitude - bounds.minLatitude) * latitudeRatio,
      longitude:
        bounds.minLongitude +
        (bounds.maxLongitude - bounds.minLongitude) * longitudeRatio,
    });
  };

  const mockRouteSegments = useMemo(
    () =>
      displayRoutes.flatMap((route, routeIndex) =>
        route.slice(0, -1).map((point, index) => ({
          id: `mock-route-${routeIndex}-${index}`,
          start: projectPoint(point, bounds),
          end: projectPoint(route[index + 1], bounds),
          color: getRouteColor(routeIndex),
        }))
      ),
    [bounds, displayRoutes]
  );

  void showClusters;

  return (
    <View style={[styles.container, style]}>
      <MapView
        key={initialRegionKey}
        ref={mapRef}
        style={[
          StyleSheet.absoluteFillObject,
          !nativeMapReady ? styles.nativeMapHidden : null,
        ]}
        initialRegion={initialRegion}
        onMapReady={() => setNativeMapReady(true)}
        onPress={(event) => onMapPress?.(event.nativeEvent.coordinate)}
      >
        {displayRoutes.map((route, routeIndex) => (
          <Polyline
            key={`route-${routeIndex}`}
            coordinates={route}
            strokeColor={getRouteColor(routeIndex)}
            strokeWidth={4}
          />
        ))}

        {markers.map((marker) => (
          <Marker
            key={marker.id}
            coordinate={marker.location}
            onPress={() => onMarkerPress?.(marker)}
            title={marker.title}
            description={marker.description}
            pinColor={getMarkerColor(marker.type, marker.status)}
          >
            <View
              style={[
                styles.marker,
                {
                  backgroundColor: getMarkerColor(marker.type, marker.status),
                },
              ]}
            >
              <Ionicons
                name={getMarkerIconName(marker.type) as any}
                size={18}
                color={theme.colors.white}
              />
            </View>
          </Marker>
        ))}
      </MapView>

      {!nativeMapReady ? (
        <View style={styles.mockMapOverlay} onLayout={handleMockLayout}>
          <Pressable style={styles.mockMapPressLayer} onPress={handleMockMapPress}>
            <View style={styles.mockGrid}>
              {Array.from({ length: 4 }).map((_, index) => (
                <View
                  key={`mock-grid-h-${index}`}
                  style={[
                    styles.mockGridLine,
                    { top: `${20 + index * 20}%`, left: 0, right: 0, height: 1 },
                  ]}
                />
              ))}
              {Array.from({ length: 4 }).map((_, index) => (
                <View
                  key={`mock-grid-v-${index}`}
                  style={[
                    styles.mockGridLine,
                    {
                      left: `${20 + index * 20}%`,
                      top: 0,
                      bottom: 0,
                      width: 1,
                    },
                  ]}
                />
              ))}
            </View>

            {mockRouteSegments.map((segment) => {
              const startLeft = segment.start.x * mockLayout.width;
              const startTop = segment.start.y * mockLayout.height;
              const endLeft = segment.end.x * mockLayout.width;
              const endTop = segment.end.y * mockLayout.height;
              const deltaX = endLeft - startLeft;
              const deltaY = endTop - startTop;
              const length = Math.sqrt(deltaX ** 2 + deltaY ** 2);
              const angle = (Math.atan2(deltaY, deltaX) * 180) / Math.PI;
              const centerX = (startLeft + endLeft) / 2;
              const centerY = (startTop + endTop) / 2;

              return (
                <View
                  key={segment.id}
                  style={[
                    styles.mockRouteLine,
                    {
                      left: centerX - length / 2,
                      top: centerY - 1.5,
                      width: length,
                      backgroundColor: segment.color,
                      transform: [{ rotate: `${angle}deg` }],
                    },
                  ]}
                />
              );
            })}

            {markers.map((marker) => {
              const position = projectPoint(marker.location, bounds);

              return (
                <Pressable
                  key={`mock-${marker.id}`}
                  style={[
                    styles.mockMarkerWrap,
                    {
                      left: position.x * mockLayout.width - 18,
                      top: position.y * mockLayout.height - 18,
                    },
                  ]}
                  onPress={() => onMarkerPress?.(marker)}
                >
                  <View
                    style={[
                      styles.mockMarker,
                      {
                        backgroundColor: getMarkerColor(
                          marker.type,
                          marker.status
                        ),
                      },
                    ]}
                  >
                    <Ionicons
                      name={getMarkerIconName(marker.type) as any}
                      size={16}
                      color={theme.colors.white}
                    />
                  </View>
                </Pressable>
              );
            })}
          </Pressable>

          <View style={styles.mockHint}>
            <Ionicons
              name="map-outline"
              size={16}
              color={theme.colors.textMuted}
            />
            <Text style={styles.mockHintText}>
              Showing a preview while the native map initializes.
            </Text>
          </View>
        </View>
      ) : null}

      <View style={styles.mapChip}>
        <Text style={styles.mapChipText}>
          {!nativeMapReady ? `${mapChipLabel} Preview` : mapChipLabel}
        </Text>
      </View>

      {showScale && nativeMapReady && mapPoints.length ? (
        <Pressable style={styles.fitButton} onPress={fitToMarkers}>
          <Ionicons
            name="scan-outline"
            size={14}
            color={theme.colors.text}
          />
          <Text style={styles.fitButtonText}>Fit to View</Text>
        </Pressable>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: 400,
    borderRadius: theme.radius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    ...theme.shadows.md,
  },
  nativeMapHidden: {
    opacity: 0.01,
  },
  marker: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 3,
    borderColor: theme.colors.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mockMapOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#EDF5FB',
  },
  mockMapPressLayer: {
    flex: 1,
  },
  mockGrid: {
    ...StyleSheet.absoluteFillObject,
  },
  mockGridLine: {
    position: 'absolute',
    backgroundColor: 'rgba(81, 115, 148, 0.14)',
  },
  mockRouteLine: {
    position: 'absolute',
    height: 3,
    borderRadius: theme.radius.full,
    opacity: 0.9,
  },
  mockMarkerWrap: {
    position: 'absolute',
    marginLeft: -18,
    marginTop: -18,
  },
  mockMarker: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 3,
    borderColor: theme.colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    ...theme.shadows.sm,
  },
  mockHint: {
    position: 'absolute',
    left: theme.spacing.base,
    right: theme.spacing.base,
    bottom: theme.spacing.base,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radius.full,
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  mockHintText: {
    flex: 1,
    fontSize: 12,
    color: theme.colors.textMuted,
    fontFamily: theme.fonts.family.sans,
  },
  mapChip: {
    position: 'absolute',
    top: theme.spacing.base,
    left: theme.spacing.base,
    borderRadius: theme.radius.full,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  mapChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.text,
    fontFamily: theme.fonts.family.sans,
  },
  fitButton: {
    position: 'absolute',
    bottom: theme.spacing.base,
    right: theme.spacing.base,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radius.full,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  fitButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.text,
    fontFamily: theme.fonts.family.sans,
  },
});
