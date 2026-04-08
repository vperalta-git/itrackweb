import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  GestureResponderEvent,
  Image,
  LayoutChangeEvent,
  PixelRatio,
  Pressable,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Svg, { Polyline } from 'react-native-svg';
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

type MapboxDirectionsResponse = {
  code?: string;
  routes?: Array<{
    geometry?: {
      coordinates?: [number, number][];
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
  mapboxAccessToken?: string | null;
  mapboxStyleOwner?: string | null;
  mapboxStyleId?: string | null;
};

type RoutePolylineCacheEntry = {
  coordinates: Location[] | null;
  expiresAt: number;
};

type MapViewport = {
  minLatitude: number;
  maxLatitude: number;
  minLongitude: number;
  maxLongitude: number;
};

type MercatorBounds = {
  left: number;
  right: number;
  top: number;
  bottom: number;
};

type GestureTransform = {
  translateX: number;
  translateY: number;
  scale: number;
  focalX: number;
  focalY: number;
};

type ViewportProjection = MercatorBounds & {
  scale: number;
  offsetX: number;
  offsetY: number;
};

const ROUTE_REFRESH_DISTANCE_METERS = 15;
const ROUTE_CACHE_TTL_MS = 2 * 60 * 1000;
const MAX_STATIC_MAP_SIDE = 1280;
const MAX_MERCATOR_LATITUDE = 85.05112878;
const MIN_VIEWPORT_MERCATOR_SPAN = 0.000004;
const MIN_GESTURE_SCALE = 0.35;
const MAX_GESTURE_SCALE = 6;
const BUTTON_ZOOM_FACTOR = 1.35;
const DEFAULT_GESTURE_TRANSFORM: GestureTransform = {
  translateX: 0,
  translateY: 0,
  scale: 1,
  focalX: 0,
  focalY: 0,
};
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

function clampLatitude(value: number) {
  return clamp(value, -MAX_MERCATOR_LATITUDE, MAX_MERCATOR_LATITUDE);
}

function clampLongitude(value: number) {
  return clamp(value, -180, 180);
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

function getRuntimeMapboxConfig() {
  const extra = (
    Constants.expoConfig?.extra ??
    (Constants as any).manifest?.extra ??
    (Constants as any).manifest2?.extra ??
    {}
  ) as RuntimeExtra;

  return {
    accessToken: extra.mapboxAccessToken ?? null,
    styleOwner: extra.mapboxStyleOwner ?? 'mapbox',
    styleId: extra.mapboxStyleId ?? 'streets-v12',
  };
}

function longitudeToMercatorX(longitude: number) {
  return (clampLongitude(longitude) + 180) / 360;
}

function latitudeToMercatorY(latitude: number) {
  const radians = (clampLatitude(latitude) * Math.PI) / 180;
  const sine = Math.sin(radians);

  return 0.5 - Math.log((1 + sine) / (1 - sine)) / (4 * Math.PI);
}

function mercatorXToLongitude(value: number) {
  return value * 360 - 180;
}

function mercatorYToLatitude(value: number) {
  return (Math.atan(Math.sinh(Math.PI * (1 - 2 * value))) * 180) / Math.PI;
}

function createViewport(
  minLatitude: number,
  maxLatitude: number,
  minLongitude: number,
  maxLongitude: number
): MapViewport {
  const safeMinLatitude = clampLatitude(Math.min(minLatitude, maxLatitude));
  const safeMaxLatitude = clampLatitude(Math.max(minLatitude, maxLatitude));
  const safeMinLongitude = clampLongitude(Math.min(minLongitude, maxLongitude));
  const safeMaxLongitude = clampLongitude(Math.max(minLongitude, maxLongitude));
  const latitudeSpan = Math.max(safeMaxLatitude - safeMinLatitude, 0.0008);
  const longitudeSpan = Math.max(safeMaxLongitude - safeMinLongitude, 0.0008);

  return {
    minLatitude: clampLatitude(safeMinLatitude),
    maxLatitude: clampLatitude(safeMinLatitude + latitudeSpan),
    minLongitude: clampLongitude(safeMinLongitude),
    maxLongitude: clampLongitude(safeMinLongitude + longitudeSpan),
  };
}

function createViewportFromRegion(
  region: NonNullable<MapViewProps['initialRegion']>
) {
  return createViewport(
    region.latitude - region.latitudeDelta / 2,
    region.latitude + region.latitudeDelta / 2,
    region.longitude - region.longitudeDelta / 2,
    region.longitude + region.longitudeDelta / 2
  );
}

function viewportToMercatorBounds(viewport: MapViewport): MercatorBounds {
  return {
    left: longitudeToMercatorX(viewport.minLongitude),
    right: longitudeToMercatorX(viewport.maxLongitude),
    top: latitudeToMercatorY(viewport.maxLatitude),
    bottom: latitudeToMercatorY(viewport.minLatitude),
  };
}

function createViewportFromMercatorBounds(bounds: MercatorBounds) {
  const width = clamp(
    bounds.right - bounds.left,
    MIN_VIEWPORT_MERCATOR_SPAN,
    1
  );
  const height = clamp(
    bounds.bottom - bounds.top,
    MIN_VIEWPORT_MERCATOR_SPAN,
    1
  );
  const left = width >= 1 ? 0 : clamp(bounds.left, 0, 1 - width);
  const top = height >= 1 ? 0 : clamp(bounds.top, 0, 1 - height);

  return createViewport(
    mercatorYToLatitude(top + height),
    mercatorYToLatitude(top),
    mercatorXToLongitude(left),
    mercatorXToLongitude(left + width)
  );
}

function applyGestureTransformToViewport(
  viewport: MapViewport,
  transform: GestureTransform,
  layout: { width: number; height: number }
) {
  if (!layout.width || !layout.height) {
    return viewport;
  }

  const bounds = viewportToMercatorBounds(viewport);
  const width = bounds.right - bounds.left;
  const height = bounds.bottom - bounds.top;
  const scale = clamp(transform.scale, MIN_GESTURE_SCALE, MAX_GESTURE_SCALE);
  const nextWidth = clamp(width / scale, MIN_VIEWPORT_MERCATOR_SPAN, 1);
  const nextHeight = clamp(height / scale, MIN_VIEWPORT_MERCATOR_SPAN, 1);
  const focalXRatio = clamp(transform.focalX / layout.width, 0, 1);
  const focalYRatio = clamp(transform.focalY / layout.height, 0, 1);
  const focusX = bounds.left + width * focalXRatio;
  const focusY = bounds.top + height * focalYRatio;
  const horizontalShift =
    (transform.translateX / layout.width) * nextWidth;
  const verticalShift =
    (transform.translateY / layout.height) * nextHeight;
  const left = focusX - nextWidth * focalXRatio - horizontalShift;
  const top = focusY - nextHeight * focalYRatio - verticalShift;

  return createViewportFromMercatorBounds({
    left,
    right: left + nextWidth,
    top,
    bottom: top + nextHeight,
  });
}

function zoomViewport(
  viewport: MapViewport,
  scale: number,
  focalXRatio = 0.5,
  focalYRatio = 0.5
) {
  const bounds = viewportToMercatorBounds(viewport);
  const width = bounds.right - bounds.left;
  const height = bounds.bottom - bounds.top;
  const nextWidth = clamp(width / scale, MIN_VIEWPORT_MERCATOR_SPAN, 1);
  const nextHeight = clamp(height / scale, MIN_VIEWPORT_MERCATOR_SPAN, 1);
  const focusX = bounds.left + width * clamp(focalXRatio, 0, 1);
  const focusY = bounds.top + height * clamp(focalYRatio, 0, 1);
  const left = focusX - nextWidth * clamp(focalXRatio, 0, 1);
  const top = focusY - nextHeight * clamp(focalYRatio, 0, 1);

  return createViewportFromMercatorBounds({
    left,
    right: left + nextWidth,
    top,
    bottom: top + nextHeight,
  });
}

function areViewportsEqual(a: MapViewport, b: MapViewport) {
  return (
    a.minLatitude === b.minLatitude &&
    a.maxLatitude === b.maxLatitude &&
    a.minLongitude === b.minLongitude &&
    a.maxLongitude === b.maxLongitude
  );
}

function getViewportProjection(
  viewport: MapViewport,
  layout: { width: number; height: number }
): ViewportProjection {
  const bounds = viewportToMercatorBounds(viewport);
  const width = Math.max(bounds.right - bounds.left, 0.000001);
  const height = Math.max(bounds.bottom - bounds.top, 0.000001);
  const scale = Math.min(layout.width / width, layout.height / height);
  const renderedWidth = width * scale;
  const renderedHeight = height * scale;

  return {
    ...bounds,
    scale,
    offsetX: (layout.width - renderedWidth) / 2,
    offsetY: (layout.height - renderedHeight) / 2,
  };
}

function projectPoint(
  point: Location,
  viewport: MapViewport,
  layout: { width: number; height: number }
) {
  const projection = getViewportProjection(viewport, layout);
  const x =
    projection.offsetX +
    (longitudeToMercatorX(point.longitude) - projection.left) * projection.scale;
  const y =
    projection.offsetY +
    (latitudeToMercatorY(point.latitude) - projection.top) * projection.scale;

  return {
    x: clamp(x / layout.width, 0, 1),
    y: clamp(y / layout.height, 0, 1),
  };
}

function screenPointToLocation(
  x: number,
  y: number,
  viewport: MapViewport,
  layout: { width: number; height: number }
): Location {
  const projection = getViewportProjection(viewport, layout);
  const projectionWidth = projection.right - projection.left;
  const projectionHeight = projection.bottom - projection.top;
  const longitude = mercatorXToLongitude(
    projection.left +
      clamp((x - projection.offsetX) / projection.scale, 0, projectionWidth)
  );
  const latitude = mercatorYToLatitude(
    projection.top +
      clamp((y - projection.offsetY) / projection.scale, 0, projectionHeight)
  );

  return {
    latitude: clampLatitude(latitude),
    longitude: clampLongitude(longitude),
  };
}

function sampleRoutePoints(route: Location[], maxPoints: number) {
  if (route.length <= maxPoints) {
    return route;
  }

  const sampledRoute = [route[0]];
  const lastIndex = route.length - 1;
  const interiorSlots = maxPoints - 2;

  for (let index = 1; index <= interiorSlots; index += 1) {
    const routeIndex = Math.round((index * lastIndex) / (interiorSlots + 1));
    const point = route[routeIndex];

    if (!point) {
      continue;
    }

    if (
      serializeLocation(sampledRoute[sampledRoute.length - 1]) !==
      serializeLocation(point)
    ) {
      sampledRoute.push(point);
    }
  }

  if (
    serializeLocation(sampledRoute[sampledRoute.length - 1]) !==
    serializeLocation(route[lastIndex])
  ) {
    sampledRoute.push(route[lastIndex]);
  }

  return sampledRoute;
}

function buildStaticMapUrl(
  viewport: MapViewport,
  layout: { width: number; height: number },
  config: ReturnType<typeof getRuntimeMapboxConfig>
) {
  if (!config.accessToken || !layout.width || !layout.height) {
    return null;
  }

  const pixelRatio = Math.min(Math.max(Math.round(PixelRatio.get()), 1), 2);
  const rawWidth = layout.width * pixelRatio;
  const rawHeight = layout.height * pixelRatio;
  const scale = Math.min(
    MAX_STATIC_MAP_SIDE / Math.max(rawWidth, 1),
    MAX_STATIC_MAP_SIDE / Math.max(rawHeight, 1),
    1
  );
  const requestedWidth = Math.max(Math.round(rawWidth * scale), 1);
  const requestedHeight = Math.max(Math.round(rawHeight * scale), 1);
  const bbox = [
    formatCoordinate(viewport.minLongitude),
    formatCoordinate(viewport.minLatitude),
    formatCoordinate(viewport.maxLongitude),
    formatCoordinate(viewport.maxLatitude),
  ].join(',');

  return (
    `https://api.mapbox.com/styles/v1/${encodeURIComponent(config.styleOwner)}` +
    `/${encodeURIComponent(config.styleId)}/static/[${bbox}]` +
    `/${requestedWidth}x${requestedHeight}` +
    `?access_token=${encodeURIComponent(config.accessToken)}`
  );
}

async function resolveRoutePolyline(
  route: Location[],
  accessToken: string | null
): Promise<Location[] | null> {
  if (route.length < 2) {
    return route;
  }

  const cacheKey = `${accessToken ?? 'osrm'}:${getRouteCacheKey(route)}`;
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
      const mappedRoute = sampleRoutePoints(route, 25);
      const origin = serializeLocation(mappedRoute[0]);
      const destination = serializeLocation(
        mappedRoute[mappedRoute.length - 1]
      );

      if (origin === destination) {
        return route;
      }

      if (accessToken) {
        const coordinates = mappedRoute
          .map((point) => `${point.longitude},${point.latitude}`)
          .join(';');
        const directionsUrl =
          'https://api.mapbox.com/directions/v5/mapbox/driving-traffic/' +
          `${coordinates}` +
          '?alternatives=false&overview=full&geometries=geojson&steps=false' +
          `&access_token=${encodeURIComponent(accessToken)}`;
        const response = await fetch(directionsUrl);

        if (response.ok) {
          const payload = (await response.json()) as MapboxDirectionsResponse;
          const coordinatesPath = payload.routes?.[0]?.geometry?.coordinates;

          if (payload.code === 'Ok' && coordinatesPath?.length) {
            const mapboxRoute = coordinatesPath.map(([longitude, latitude]) => ({
              latitude,
              longitude,
            }));

            if (mapboxRoute.length >= 2) {
              return mapboxRoute;
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

function getViewportForPoints(
  points: Location[],
  initialRegion: NonNullable<MapViewProps['initialRegion']>
): MapViewport {
  if (!points.length) {
    return createViewportFromRegion(initialRegion);
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

  return createViewport(
    minLatitude - latitudePadding,
    maxLatitude + latitudePadding,
    minLongitude - longitudePadding,
    maxLongitude + longitudePadding
  );
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
  const routesRef = useRef(routes);
  const [layout, setLayout] = useState({ width: 0, height: 0 });
  const [viewport, setViewport] = useState(() =>
    createViewportFromRegion(initialRegion)
  );
  const viewportRef = useRef(viewport);
  const gestureOriginViewportRef = useRef(viewport);
  const interactionStateRef = useRef({
    isPanning: false,
    isPinching: false,
  });
  const gestureStateRef = useRef<GestureTransform>(DEFAULT_GESTURE_TRANSFORM);
  const [gestureTransform, setGestureTransform] = useState<GestureTransform>(
    DEFAULT_GESTURE_TRANSFORM
  );
  const [mapImageFailed, setMapImageFailed] = useState(false);
  const [resolvedRoutes, setResolvedRoutes] = useState<Location[][]>(routes);
  routesRef.current = routes;
  viewportRef.current = viewport;
  const mapboxConfig = useMemo(() => getRuntimeMapboxConfig(), []);
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
  const displayRoutes =
    resolvedRoutes.length === routes.length ? resolvedRoutes : routes;
  const mapPoints = useMemo(
    () => [...markers.map((marker) => marker.location), ...displayRoutes.flat()],
    [displayRoutes, markers]
  );
  const mapImageUrl = useMemo(
    () => buildStaticMapUrl(viewport, layout, mapboxConfig),
    [layout, mapboxConfig, viewport]
  );

  const syncGestureTransform = () => {
    const nextTransform = gestureStateRef.current;
    setGestureTransform((current) =>
      current.translateX === nextTransform.translateX &&
      current.translateY === nextTransform.translateY &&
      current.scale === nextTransform.scale &&
      current.focalX === nextTransform.focalX &&
      current.focalY === nextTransform.focalY
        ? current
        : { ...nextTransform }
    );
  };

  const beginGestureSequence = () => {
    if (
      !interactionStateRef.current.isPanning &&
      !interactionStateRef.current.isPinching
    ) {
      gestureOriginViewportRef.current = viewportRef.current;
      gestureStateRef.current = {
        ...DEFAULT_GESTURE_TRANSFORM,
        focalX: layout.width / 2,
        focalY: layout.height / 2,
      };
      syncGestureTransform();
    }
  };

  const finalizeGestureSequence = () => {
    if (
      interactionStateRef.current.isPanning ||
      interactionStateRef.current.isPinching
    ) {
      return;
    }

    const nextViewport = applyGestureTransformToViewport(
      gestureOriginViewportRef.current,
      gestureStateRef.current,
      layout
    );

    gestureOriginViewportRef.current = nextViewport;
    gestureStateRef.current = DEFAULT_GESTURE_TRANSFORM;
    setGestureTransform(DEFAULT_GESTURE_TRANSFORM);
    setViewport((current) =>
      areViewportsEqual(current, nextViewport) ? current : nextViewport
    );
  };

  useEffect(() => {
    const nextViewport = createViewportFromRegion(initialRegion);
    gestureOriginViewportRef.current = nextViewport;
    interactionStateRef.current = {
      isPanning: false,
      isPinching: false,
    };
    gestureStateRef.current = DEFAULT_GESTURE_TRANSFORM;
    setGestureTransform(DEFAULT_GESTURE_TRANSFORM);
    setViewport(nextViewport);
  }, [initialRegionKey]);

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
          resolveRoutePolyline(route, mapboxConfig.accessToken)
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
  }, [mapboxConfig.accessToken, routeRequestKey]);

  useEffect(() => {
    setMapImageFailed(false);
  }, [mapImageUrl]);

  const fitToMarkers = () => {
    if (!mapPoints.length) {
      return;
    }

    interactionStateRef.current = {
      isPanning: false,
      isPinching: false,
    };
    gestureStateRef.current = DEFAULT_GESTURE_TRANSFORM;
    setGestureTransform(DEFAULT_GESTURE_TRANSFORM);

    if (mapPoints.length === 1) {
      const nextViewport = createViewport(
        mapPoints[0].latitude - 0.01,
        mapPoints[0].latitude + 0.01,
        mapPoints[0].longitude - 0.01,
        mapPoints[0].longitude + 0.01
      );
      gestureOriginViewportRef.current = nextViewport;
      setViewport(nextViewport);
      return;
    }

    const nextViewport = getViewportForPoints(mapPoints, initialRegion);
    gestureOriginViewportRef.current = nextViewport;
    setViewport(nextViewport);
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

  const handleLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setLayout((current) =>
      current.width === width && current.height === height
        ? current
        : { width, height }
    );
  };

  const handleMapPressLayer = (event: GestureResponderEvent) => {
    if (!onMapPress || !layout.width || !layout.height) {
      return;
    }

    const { locationX, locationY } = event.nativeEvent;
    onMapPress(
      screenPointToLocation(
        locationX,
        locationY,
        viewport,
        layout
      )
    );
  };

  const handleZoomIn = () => {
    const nextViewport = zoomViewport(viewportRef.current, BUTTON_ZOOM_FACTOR);
    gestureOriginViewportRef.current = nextViewport;
    setViewport(nextViewport);
  };

  const handleZoomOut = () => {
    const nextViewport = zoomViewport(
      viewportRef.current,
      1 / BUTTON_ZOOM_FACTOR
    );
    gestureOriginViewportRef.current = nextViewport;
    setViewport(nextViewport);
  };

  const panGesture = useMemo(
    () =>
      Gesture.Pan()
        .enabled(Boolean(layout.width && layout.height))
        .runOnJS(true)
        .minDistance(3)
        .onBegin(() => {
          beginGestureSequence();
          interactionStateRef.current.isPanning = true;
        })
        .onUpdate((event) => {
          gestureStateRef.current = {
            ...gestureStateRef.current,
            translateX: event.translationX,
            translateY: event.translationY,
          };
          syncGestureTransform();
        })
        .onFinalize(() => {
          interactionStateRef.current.isPanning = false;
          finalizeGestureSequence();
        }),
    [layout.height, layout.width]
  );

  const pinchGesture = useMemo(
    () =>
      Gesture.Pinch()
        .enabled(Boolean(layout.width && layout.height))
        .runOnJS(true)
        .onBegin((event) => {
          beginGestureSequence();
          interactionStateRef.current.isPinching = true;
          gestureStateRef.current = {
            ...gestureStateRef.current,
            focalX: clamp(event.focalX, 0, layout.width),
            focalY: clamp(event.focalY, 0, layout.height),
          };
          syncGestureTransform();
        })
        .onUpdate((event) => {
          gestureStateRef.current = {
            ...gestureStateRef.current,
            scale: clamp(event.scale, MIN_GESTURE_SCALE, MAX_GESTURE_SCALE),
            focalX: clamp(event.focalX, 0, layout.width),
            focalY: clamp(event.focalY, 0, layout.height),
          };
          syncGestureTransform();
        })
        .onFinalize(() => {
          interactionStateRef.current.isPinching = false;
          finalizeGestureSequence();
        }),
    [layout.height, layout.width]
  );

  const mapGesture = useMemo(
    () => Gesture.Simultaneous(panGesture, pinchGesture),
    [panGesture, pinchGesture]
  );

  const routePolylines = useMemo(
    () =>
      !layout.width || !layout.height
        ? []
        : displayRoutes.flatMap((route, routeIndex) => {
            if (route.length < 2) {
              return [];
            }

            const points = route
              .map((point) => {
                const position = projectPoint(point, viewport, layout);
                return `${(position.x * layout.width).toFixed(2)},${(
                  position.y * layout.height
                ).toFixed(2)}`;
              })
              .join(' ');

            return points
              ? [
                  {
                    id: `route-${routeIndex}`,
                    points,
                    color: getRouteColor(routeIndex),
                  },
                ]
              : [];
          }),
    [displayRoutes, layout.height, layout.width, viewport]
  );

  void showClusters;
  const showFallbackHint = !mapboxConfig.accessToken || mapImageFailed;
  const fallbackHintText = !mapboxConfig.accessToken
    ? 'Add a Mapbox access token to load the live basemap.'
    : 'Unable to load the Mapbox basemap right now.';
  const focalOffsetX = gestureTransform.focalX - layout.width / 2;
  const focalOffsetY = gestureTransform.focalY - layout.height / 2;
  const panLayerStyle = {
    transform: [
      { translateX: gestureTransform.translateX },
      { translateY: gestureTransform.translateY },
    ],
  };
  const scaleLayerStyle = {
    transform: [
      { translateX: -focalOffsetX },
      { translateY: -focalOffsetY },
      { scale: gestureTransform.scale },
      { translateX: focalOffsetX },
      { translateY: focalOffsetY },
    ],
  };

  return (
    <View style={[styles.container, style]} onLayout={handleLayout}>
      <View key={initialRegionKey} style={styles.mapSurface}>
        <GestureDetector gesture={mapGesture}>
          <Pressable style={styles.mapPressLayer} onPress={handleMapPressLayer}>
            <View style={styles.mapViewport}>
              <View style={[styles.panLayer, panLayerStyle]}>
                <View style={[styles.scaleLayer, scaleLayerStyle]}>
                  <View style={styles.mapBackground}>
                    {Array.from({ length: 4 }).map((_, index) => (
                      <View
                        key={`grid-h-${index}`}
                        style={[
                          styles.gridLine,
                          {
                            top: `${20 + index * 20}%`,
                            left: 0,
                            right: 0,
                            height: 1,
                          },
                        ]}
                      />
                    ))}
                    {Array.from({ length: 4 }).map((_, index) => (
                      <View
                        key={`grid-v-${index}`}
                        style={[
                          styles.gridLine,
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

                  {mapImageUrl && !mapImageFailed ? (
                    <Image
                      source={{ uri: mapImageUrl }}
                      style={styles.mapImage}
                      resizeMode="cover"
                      onError={() => setMapImageFailed(true)}
                    />
                  ) : null}

                  {routePolylines.length ? (
                    <Svg
                      width={layout.width || 1}
                      height={layout.height || 1}
                      style={styles.routesOverlay}
                      pointerEvents="none"
                    >
                      {routePolylines.map((route) => (
                        <React.Fragment key={route.id}>
                          <Polyline
                            points={route.points}
                            fill="none"
                            stroke="rgba(255,255,255,0.95)"
                            strokeWidth={8}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          <Polyline
                            points={route.points}
                            fill="none"
                            stroke={route.color}
                            strokeWidth={4}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </React.Fragment>
                      ))}
                    </Svg>
                  ) : null}

                  {markers.map((marker) => {
                    const position = projectPoint(marker.location, viewport, layout);

                    return (
                      <Pressable
                        key={marker.id}
                        style={[
                          styles.markerWrap,
                          {
                            left: position.x * layout.width - 18,
                            top: position.y * layout.height - 18,
                          },
                        ]}
                        onPress={(event) => {
                          event.stopPropagation();
                          onMarkerPress?.(marker);
                        }}
                      >
                        <View
                          style={[
                            styles.marker,
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
                </View>
              </View>
            </View>
          </Pressable>
        </GestureDetector>

        {showFallbackHint ? (
          <View style={styles.mapHint}>
            <Ionicons
              name="map-outline"
              size={16}
              color={theme.colors.textMuted}
            />
            <Text style={styles.mapHintText}>{fallbackHintText}</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.mapChip}>
        <Text style={styles.mapChipText}>{mapChipLabel}</Text>
      </View>

      <View style={styles.controlStack}>
        {showScale && mapPoints.length ? (
          <Pressable style={styles.fitButton} onPress={fitToMarkers}>
            <Ionicons
              name="scan-outline"
              size={14}
              color={theme.colors.text}
            />
            <Text style={styles.fitButtonText}>Fit to View</Text>
          </Pressable>
        ) : null}

        <View style={styles.zoomControls}>
          <Pressable style={styles.zoomButton} onPress={handleZoomIn}>
            <Ionicons name="add" size={16} color={theme.colors.text} />
          </Pressable>
          <View style={styles.zoomDivider} />
          <Pressable style={styles.zoomButton} onPress={handleZoomOut}>
            <Ionicons name="remove" size={16} color={theme.colors.text} />
          </Pressable>
        </View>
      </View>
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
  mapSurface: {
    ...StyleSheet.absoluteFillObject,
  },
  mapViewport: {
    flex: 1,
    overflow: 'hidden',
  },
  panLayer: {
    flex: 1,
  },
  scaleLayer: {
    flex: 1,
  },
  mapBackground: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#EDF5FB',
  },
  gridLine: {
    position: 'absolute',
    backgroundColor: 'rgba(81, 115, 148, 0.14)',
  },
  mapImage: {
    ...StyleSheet.absoluteFillObject,
  },
  mapPressLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  routesOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  markerWrap: {
    position: 'absolute',
    marginLeft: -18,
    marginTop: -18,
  },
  marker: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 3,
    borderColor: theme.colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    ...theme.shadows.sm,
  },
  mapHint: {
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
  mapHintText: {
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
  controlStack: {
    position: 'absolute',
    top: theme.spacing.base,
    right: theme.spacing.base,
    alignItems: 'flex-end',
    gap: theme.spacing.sm,
  },
  fitButton: {
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
  zoomControls: {
    overflow: 'hidden',
    borderRadius: theme.radius.xl,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
  },
  zoomButton: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoomDivider: {
    height: 1,
    backgroundColor: theme.colors.border,
  },
});
