import Constants from 'expo-constants';

type RoutePoint = {
  latitude: number;
  longitude: number;
};

type RuntimeExtra = {
  mapboxAccessToken?: string | null;
};

type MapboxDirectionsResponse = {
  code?: string;
  routes?: Array<{
    distance?: number;
    geometry?: {
      coordinates?: [number, number][];
    };
  }>;
};

type OsrmRouteResponse = {
  code?: string;
  routes?: Array<{
    distance?: number;
    geometry?: {
      coordinates?: [number, number][];
    };
  }>;
};

type RouteMetrics = {
  coordinates: RoutePoint[] | null;
  distanceKm: number | null;
};

const ROUTE_CACHE_TTL_MS = 2 * 60 * 1000;
const routeMetricsCache = new Map<
  string,
  {
    value: RouteMetrics;
    expiresAt: number;
  }
>();
const inflightRouteMetricsRequests = new Map<string, Promise<RouteMetrics>>();

function getRuntimeExtra() {
  return (
    Constants.expoConfig?.extra ??
    (Constants as any).manifest?.extra ??
    (Constants as any).manifest2?.extra ??
    {}
  ) as RuntimeExtra;
}

function getRuntimeMapboxAccessToken() {
  return getRuntimeExtra().mapboxAccessToken ?? null;
}

function formatCoordinate(value: number) {
  return value.toFixed(6);
}

function serializeRoutePoint(point: RoutePoint) {
  return `${formatCoordinate(point.latitude)},${formatCoordinate(point.longitude)}`;
}

function getRouteCacheKey(points: RoutePoint[], accessToken: string | null) {
  return `${accessToken ?? 'osrm'}:${points.map(serializeRoutePoint).join('|')}`;
}

function calculateDistanceKmFromCoordinates(points: RoutePoint[]) {
  let totalDistanceKm = 0;

  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1];
    const next = points[index];
    const latitudeDelta = ((next.latitude - previous.latitude) * Math.PI) / 180;
    const longitudeDelta = ((next.longitude - previous.longitude) * Math.PI) / 180;
    const previousLatitudeRadians = (previous.latitude * Math.PI) / 180;
    const nextLatitudeRadians = (next.latitude * Math.PI) / 180;
    const haversine =
      Math.sin(latitudeDelta / 2) ** 2 +
      Math.cos(previousLatitudeRadians) *
        Math.cos(nextLatitudeRadians) *
        Math.sin(longitudeDelta / 2) ** 2;

    totalDistanceKm +=
      2 * 6371 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
  }

  return totalDistanceKm;
}

function normalizeCoordinates(coordinates: unknown) {
  if (!Array.isArray(coordinates) || coordinates.length < 2) {
    return null;
  }

  const normalized = coordinates
    .filter(
      (value): value is [number, number] =>
        Array.isArray(value) &&
        value.length === 2 &&
        typeof value[0] === 'number' &&
        typeof value[1] === 'number' &&
        Number.isFinite(value[0]) &&
        Number.isFinite(value[1])
    )
    .map(([longitude, latitude]) => ({
      latitude,
      longitude,
    }));

  return normalized.length >= 2 ? normalized : null;
}

function normalizeDistanceKm(distanceMeters: unknown) {
  if (typeof distanceMeters !== 'number' || !Number.isFinite(distanceMeters) || distanceMeters < 0) {
    return null;
  }

  return distanceMeters / 1000;
}

function serializeDirectionsCoordinates(points: RoutePoint[]) {
  return points.map((point) => `${point.longitude},${point.latitude}`).join(';');
}

async function resolveMapboxRouteMetrics(points: RoutePoint[], accessToken: string) {
  const url =
    'https://api.mapbox.com/directions/v5/mapbox/driving-traffic/' +
    `${serializeDirectionsCoordinates(points)}` +
    '?alternatives=false&overview=full&geometries=geojson&steps=false' +
    `&access_token=${encodeURIComponent(accessToken)}`;
  const response = await fetch(url);

  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as MapboxDirectionsResponse;
  const coordinates = normalizeCoordinates(payload.routes?.[0]?.geometry?.coordinates);

  if (!coordinates) {
    return null;
  }

  return {
    coordinates,
    distanceKm:
      normalizeDistanceKm(payload.routes?.[0]?.distance) ??
      calculateDistanceKmFromCoordinates(coordinates),
  } satisfies RouteMetrics;
}

async function resolveOsrmRouteMetrics(points: RoutePoint[]) {
  const url =
    `https://router.project-osrm.org/route/v1/driving/${serializeDirectionsCoordinates(points)}` +
    '?overview=full&geometries=geojson';
  const response = await fetch(url);

  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as OsrmRouteResponse;

  if (payload.code !== 'Ok') {
    return null;
  }

  const coordinates = normalizeCoordinates(payload.routes?.[0]?.geometry?.coordinates);

  if (!coordinates) {
    return null;
  }

  return {
    coordinates,
    distanceKm:
      normalizeDistanceKm(payload.routes?.[0]?.distance) ??
      calculateDistanceKmFromCoordinates(coordinates),
  } satisfies RouteMetrics;
}

export async function resolveRouteMetrics(points: RoutePoint[]) {
  if (points.length < 2) {
    return {
      coordinates: points.length ? points : null,
      distanceKm: null,
    } satisfies RouteMetrics;
  }

  const accessToken = getRuntimeMapboxAccessToken();
  const cacheKey = getRouteCacheKey(points, accessToken);
  const cached = routeMetricsCache.get(cacheKey);

  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }

  if (cached) {
    routeMetricsCache.delete(cacheKey);
  }

  const inflightRequest = inflightRouteMetricsRequests.get(cacheKey);

  if (inflightRequest) {
    return inflightRequest;
  }

  const request = (async () => {
    try {
      if (accessToken) {
        const mapboxRoute = await resolveMapboxRouteMetrics(points, accessToken);

        if (mapboxRoute) {
          return mapboxRoute;
        }
      }
    } catch {
      // Fall through to OSRM.
    }

    try {
      const osrmRoute = await resolveOsrmRouteMetrics(points);

      if (osrmRoute) {
        return osrmRoute;
      }
    } catch {
      // Ignore and fall back to straight points.
    } finally {
      inflightRouteMetricsRequests.delete(cacheKey);
    }

    return {
      coordinates: points,
      distanceKm: calculateDistanceKmFromCoordinates(points),
    } satisfies RouteMetrics;
  })();

  inflightRouteMetricsRequests.set(cacheKey, request);

  const resolved = await request;
  routeMetricsCache.set(cacheKey, {
    value: resolved,
    expiresAt: Date.now() + ROUTE_CACHE_TTL_MS,
  });

  return resolved;
}
