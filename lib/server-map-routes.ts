type RoutePoint = {
  latitude: number
  longitude: number
}

type RouteCoordinates = [number, number][]

type MapboxDirectionsResponse = {
  routes?: Array<{
    distance?: number
    duration?: number
    legs?: Array<{ annotation?: { congestion_numeric?: Array<number | null> } }>
    geometry?: {
      coordinates?: [number, number][]
    }
  }>
}

type OsrmRouteResponse = {
  code?: string
  routes?: Array<{
    distance?: number
    duration?: number
    geometry?: {
      coordinates?: [number, number][]
    }
  }>
}

export type RouteResolution = {
  coordinates: RouteCoordinates
  distanceKm: number | null
  durationSeconds: number
  source: 'mapbox-traffic' | 'mapbox-driving' | 'osrm'
  trafficAware: boolean
  calculatedAt: string
}

const ROUTE_CACHE_MS = 60_000
const routeCache = new Map<string, { expires: number; promise: Promise<RouteResolution | null> }>()

function getMapboxAccessToken() {
  return (
    process.env.MAPBOX_ACCESS_TOKEN?.trim() ||
    process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN?.trim() ||
    null
  )
}

function isFiniteCoordinate(value: number) {
  return Number.isFinite(value)
}

export function parseRoutePoint(rawValue: string | null) {
  if (!rawValue) {
    return null
  }

  const [latitudeRaw, longitudeRaw] = rawValue.split(',').map((value) => value.trim())
  const latitude = Number(latitudeRaw)
  const longitude = Number(longitudeRaw)

  if (!latitudeRaw || !longitudeRaw || !isFiniteCoordinate(latitude) || !isFiniteCoordinate(longitude) || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) {
    return null
  }

  return {
    latitude,
    longitude,
  } satisfies RoutePoint
}

export function parseRoutePoints(rawValue: string | null) {
  if (!rawValue) {
    return [] as RoutePoint[]
  }

  return rawValue
    .split(';')
    .map((value) => parseRoutePoint(value))
    .filter((value): value is RoutePoint => value !== null)
}

function serializeRoutePoints(points: RoutePoint[]) {
  return points.map((point) => `${point.longitude},${point.latitude}`).join(';')
}

function normalizeRouteCoordinates(coordinates: unknown): RouteCoordinates | null {
  if (!Array.isArray(coordinates) || coordinates.length < 2) {
    return null
  }

  const normalizedCoordinates = coordinates.filter(
    (value): value is [number, number] =>
      Array.isArray(value) &&
      value.length === 2 &&
      typeof value[0] === 'number' &&
      typeof value[1] === 'number' &&
      isFiniteCoordinate(value[0]) &&
      isFiniteCoordinate(value[1])
  )

  return normalizedCoordinates.length >= 2 ? normalizedCoordinates : null
}

function normalizeRouteDistanceKm(distanceMeters: unknown) {
  if (typeof distanceMeters !== 'number' || !Number.isFinite(distanceMeters) || distanceMeters < 0) {
    return null
  }

  return distanceMeters / 1000
}

function calculatePolylineDistanceKm(coordinates: RouteCoordinates) {
  let totalDistanceKm = 0

  for (let index = 1; index < coordinates.length; index += 1) {
    const [previousLongitude, previousLatitude] = coordinates[index - 1]
    const [nextLongitude, nextLatitude] = coordinates[index]
    const latitudeDelta = ((nextLatitude - previousLatitude) * Math.PI) / 180
    const longitudeDelta = ((nextLongitude - previousLongitude) * Math.PI) / 180
    const previousLatitudeRadians = (previousLatitude * Math.PI) / 180
    const nextLatitudeRadians = (nextLatitude * Math.PI) / 180
    const haversine =
      Math.sin(latitudeDelta / 2) ** 2 +
      Math.cos(previousLatitudeRadians) *
        Math.cos(nextLatitudeRadians) *
        Math.sin(longitudeDelta / 2) ** 2

    totalDistanceKm += 2 * 6371 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine))
  }

  return totalDistanceKm
}

async function resolveMapboxRoute(points: RoutePoint[], profile: 'driving-traffic' | 'driving') {
  const accessToken = getMapboxAccessToken()

  if (!accessToken) {
    return null
  }

  const url = new URL(
    `https://api.mapbox.com/directions/v5/mapbox/${profile}/${serializeRoutePoints(points)}`
  )
  url.searchParams.set('access_token', accessToken)
  url.searchParams.set('alternatives', 'false')
  url.searchParams.set('geometries', 'geojson')
  url.searchParams.set('overview', 'full')
  url.searchParams.set('steps', 'false')
  url.searchParams.set('depart_at', 'now')
  if (profile === 'driving-traffic') url.searchParams.set('annotations', 'congestion_numeric')

  const response = await fetch(url, {
    cache: 'no-store',
    signal: AbortSignal.timeout(8000),
  })

  if (!response.ok) {
    return null
  }

  const payload = (await response.json()) as MapboxDirectionsResponse
  const coordinates = normalizeRouteCoordinates(payload.routes?.[0]?.geometry?.coordinates)
  const route = payload.routes?.[0]

  if (!coordinates || typeof route?.duration !== 'number' || !Number.isFinite(route.duration) || route.duration < 0) {
    return null
  }

  // A successful traffic-profile request can fall back to standard driving in
  // uncovered areas. Claim traffic awareness only when traffic data is present.
  const trafficAware = profile === 'driving-traffic' && Boolean(route.legs?.some((leg) =>
    leg.annotation?.congestion_numeric?.some((value) => typeof value === 'number' && Number.isFinite(value))
  ))
  return {
    coordinates,
    distanceKm:
      normalizeRouteDistanceKm(payload.routes?.[0]?.distance) ??
      calculatePolylineDistanceKm(coordinates),
    durationSeconds: route.duration,
    source: trafficAware ? 'mapbox-traffic' : 'mapbox-driving',
    trafficAware,
    calculatedAt: new Date().toISOString(),
  } satisfies RouteResolution
}

async function resolveOsrmRoute(points: RoutePoint[]) {
  const response = await fetch(
    `https://router.project-osrm.org/route/v1/driving/${serializeRoutePoints(points)}?overview=full&geometries=geojson`,
    {
      cache: 'no-store',
      signal: AbortSignal.timeout(8000),
    }
  )

  if (!response.ok) {
    return null
  }

  const payload = (await response.json()) as OsrmRouteResponse

  if (payload.code !== 'Ok') {
    return null
  }

  const coordinates = normalizeRouteCoordinates(payload.routes?.[0]?.geometry?.coordinates)
  const route = payload.routes?.[0]

  if (!coordinates || typeof route?.duration !== 'number' || !Number.isFinite(route.duration) || route.duration < 0) {
    return null
  }

  return {
    coordinates,
    distanceKm:
      normalizeRouteDistanceKm(payload.routes?.[0]?.distance) ??
      calculatePolylineDistanceKm(coordinates),
    durationSeconds: route.duration,
    source: 'osrm',
    trafficAware: false,
    calculatedAt: new Date().toISOString(),
  } satisfies RouteResolution
}

async function resolveUncachedRoute(points: RoutePoint[]) {
  if (points.length < 2) {
    return null
  }

  for (const profile of ['driving-traffic', 'driving'] as const) {
    try {
      const mapboxRoute = await resolveMapboxRoute(points, profile)
      if (mapboxRoute) return mapboxRoute
    } catch {
      // Try the standard driving profile, then the existing OSRM fallback.
    }
  }

  try {
    return await resolveOsrmRoute(points)
  } catch {
    return null
  }
}

export function resolveRouteData(points: RoutePoint[]): Promise<RouteResolution | null> {
  if (points.length < 2 || points.length > 25) return Promise.resolve(null)
  const key = serializeRoutePoints(points)
  const cached = routeCache.get(key)
  if (cached && cached.expires > Date.now()) return cached.promise
  if (routeCache.size >= 256) routeCache.delete(routeCache.keys().next().value!)
  const promise = resolveUncachedRoute(points)
  routeCache.set(key, { expires: Date.now() + ROUTE_CACHE_MS, promise })
  return promise
}

export async function resolveRouteCoordinates(points: RoutePoint[]) {
  const route = await resolveRouteData(points)
  return route?.coordinates ?? null
}
