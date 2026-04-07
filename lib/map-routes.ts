export type MapPoint = {
  lat: number
  lng: number
}

type GoogleDirectionsResponse = {
  status?: string
  routes?: Array<{
    overview_polyline?: {
      points?: string
    }
  }>
}

type OsrmRouteResponse = {
  code?: string
  routes?: Array<{
    geometry?: {
      coordinates?: [number, number][]
    }
  }>
}

type RouteCacheEntry = {
  coordinates: MapPoint[] | null
  expiresAt: number
}

const ROUTE_CACHE_TTL_MS = 2 * 60 * 1000
const ROUTE_REFRESH_DISTANCE_METERS = 15
const routeCache = new Map<string, RouteCacheEntry>()
const inflightRouteRequests = new Map<string, Promise<MapPoint[] | null>>()

function formatCoordinate(value: number) {
  return value.toFixed(6)
}

function serializePoint(point: MapPoint) {
  return `${formatCoordinate(point.lat)},${formatCoordinate(point.lng)}`
}

function serializePointForRefresh(point: MapPoint) {
  const latitudeBucketSize = ROUTE_REFRESH_DISTANCE_METERS / 111320
  const longitudeBucketSize =
    ROUTE_REFRESH_DISTANCE_METERS /
    Math.max(111320 * Math.cos((point.lat * Math.PI) / 180), 0.000001)

  const latitudeBucket =
    Math.round(point.lat / latitudeBucketSize) * latitudeBucketSize
  const longitudeBucket =
    Math.round(point.lng / longitudeBucketSize) * longitudeBucketSize

  return `${formatCoordinate(latitudeBucket)},${formatCoordinate(longitudeBucket)}`
}

function getDirectionsApiKey() {
  return (
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_DIRECTIONS_API_KEY?.trim() ||
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim() ||
    null
  )
}

function decodePolyline(encoded: string): MapPoint[] {
  const coordinates: MapPoint[] = []
  let index = 0
  let latitude = 0
  let longitude = 0

  while (index < encoded.length) {
    let shift = 0
    let result = 0
    let byte = 0

    do {
      byte = encoded.charCodeAt(index++) - 63
      result |= (byte & 0x1f) << shift
      shift += 5
    } while (byte >= 0x20)

    const latitudeDelta = result & 1 ? ~(result >> 1) : result >> 1
    latitude += latitudeDelta

    shift = 0
    result = 0

    do {
      byte = encoded.charCodeAt(index++) - 63
      result |= (byte & 0x1f) << shift
      shift += 5
    } while (byte >= 0x20)

    const longitudeDelta = result & 1 ? ~(result >> 1) : result >> 1
    longitude += longitudeDelta

    coordinates.push({
      lat: latitude / 1e5,
      lng: longitude / 1e5,
    })
  }

  return coordinates
}

export async function resolveRoutePolyline(route: MapPoint[]) {
  if (route.length < 2) {
    return route
  }

  const apiKey = getDirectionsApiKey()
  const cacheKey = `${apiKey ?? 'osrm'}:${route.map(serializePointForRefresh).join('|')}`
  const cached = routeCache.get(cacheKey)

  if (cached && cached.expiresAt > Date.now()) {
    return cached.coordinates
  }

  if (cached) {
    routeCache.delete(cacheKey)
  }

  const existingRequest = inflightRouteRequests.get(cacheKey)
  if (existingRequest) {
    return existingRequest
  }

  const request = (async () => {
    try {
      const origin = serializePoint(route[0])
      const destination = serializePoint(route[route.length - 1])

      if (origin === destination) {
        return route
      }

      if (apiKey) {
        const waypoints = route
          .slice(1, -1)
          .slice(0, 23)
          .map((point) => `via:${serializePoint(point)}`)
        let directionsUrl =
          'https://maps.googleapis.com/maps/api/directions/json' +
          `?origin=${encodeURIComponent(origin)}` +
          `&destination=${encodeURIComponent(destination)}` +
          '&mode=driving' +
          '&departure_time=now' +
          '&traffic_model=best_guess' +
          `&key=${encodeURIComponent(apiKey)}`

        if (waypoints.length) {
          directionsUrl += `&waypoints=${encodeURIComponent(waypoints.join('|'))}`
        }

        const directionsResponse = await fetch(directionsUrl)

        if (directionsResponse.ok) {
          const payload = (await directionsResponse.json()) as GoogleDirectionsResponse
          const encodedPolyline = payload.routes?.[0]?.overview_polyline?.points

          if (payload.status === 'OK' && encodedPolyline) {
            const decodedRoute = decodePolyline(encodedPolyline)

            if (decodedRoute.length >= 2) {
              return decodedRoute
            }
          }
        }
      }

      const osrmCoordinates = route.map((point) => `${point.lng},${point.lat}`).join(';')
      const osrmResponse = await fetch(
        `https://router.project-osrm.org/route/v1/driving/${osrmCoordinates}?overview=full&geometries=geojson`
      )

      if (!osrmResponse.ok) {
        return null
      }

      const osrmPayload = (await osrmResponse.json()) as OsrmRouteResponse
      const coordinatesPath = osrmPayload.routes?.[0]?.geometry?.coordinates

      if (osrmPayload.code !== 'Ok' || !coordinatesPath?.length) {
        return null
      }

      const resolvedRoute = coordinatesPath.map(([lng, lat]) => ({ lat, lng }))
      return resolvedRoute.length >= 2 ? resolvedRoute : null
    } catch {
      return null
    } finally {
      inflightRouteRequests.delete(cacheKey)
    }
  })()

  inflightRouteRequests.set(cacheKey, request)

  const resolvedRoute = await request
  routeCache.set(cacheKey, {
    coordinates: resolvedRoute,
    expiresAt: Date.now() + ROUTE_CACHE_TTL_MS,
  })

  return resolvedRoute
}

export function hasDirectionsApiKey() {
  return Boolean(getDirectionsApiKey())
}
