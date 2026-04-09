type RoutePoint = {
  latitude: number
  longitude: number
}

type RouteCoordinates = [number, number][]

type MapboxDirectionsResponse = {
  routes?: Array<{
    distance?: number
    geometry?: {
      coordinates?: [number, number][]
    }
  }>
}

type OsrmRouteResponse = {
  code?: string
  routes?: Array<{
    distance?: number
    geometry?: {
      coordinates?: [number, number][]
    }
  }>
}

type RouteResolution = {
  coordinates: RouteCoordinates
  distanceKm: number | null
}

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

  if (!isFiniteCoordinate(latitude) || !isFiniteCoordinate(longitude)) {
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

async function resolveMapboxRoute(points: RoutePoint[]) {
  const accessToken = getMapboxAccessToken()

  if (!accessToken) {
    return null
  }

  const url = new URL(
    `https://api.mapbox.com/directions/v5/mapbox/driving/${serializeRoutePoints(points)}`
  )
  url.searchParams.set('access_token', accessToken)
  url.searchParams.set('alternatives', 'false')
  url.searchParams.set('geometries', 'geojson')
  url.searchParams.set('overview', 'full')
  url.searchParams.set('steps', 'false')

  const response = await fetch(url, {
    cache: 'no-store',
  })

  if (!response.ok) {
    return null
  }

  const payload = (await response.json()) as MapboxDirectionsResponse
  const coordinates = normalizeRouteCoordinates(payload.routes?.[0]?.geometry?.coordinates)

  if (!coordinates) {
    return null
  }

  return {
    coordinates,
    distanceKm:
      normalizeRouteDistanceKm(payload.routes?.[0]?.distance) ??
      calculatePolylineDistanceKm(coordinates),
  } satisfies RouteResolution
}

async function resolveOsrmRoute(points: RoutePoint[]) {
  const response = await fetch(
    `https://router.project-osrm.org/route/v1/driving/${serializeRoutePoints(points)}?overview=full&geometries=geojson`,
    {
      cache: 'no-store',
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

  if (!coordinates) {
    return null
  }

  return {
    coordinates,
    distanceKm:
      normalizeRouteDistanceKm(payload.routes?.[0]?.distance) ??
      calculatePolylineDistanceKm(coordinates),
  } satisfies RouteResolution
}

export async function resolveRouteData(points: RoutePoint[]) {
  if (points.length < 2) {
    return null
  }

  try {
    const mapboxRoute = await resolveMapboxRoute(points)

    if (mapboxRoute) {
      return mapboxRoute
    }
  } catch {
    // Fall through to OSRM fallback.
  }

  try {
    return await resolveOsrmRoute(points)
  } catch {
    return null
  }
}

export async function resolveRouteCoordinates(points: RoutePoint[]) {
  const route = await resolveRouteData(points)
  return route?.coordinates ?? null
}
