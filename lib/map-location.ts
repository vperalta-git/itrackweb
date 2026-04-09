import type { BackendRouteStop } from '@/lib/backend-helpers'

export type MapCoordinatesInput =
  | { lat: number; lng: number }
  | { latitude: number; longitude: number }

export type MapLocationSuggestion = {
  id: string
  label: string
  address: string
  latitude: number
  longitude: number
}

type MapSearchResponse = {
  results?: MapLocationSuggestion[]
}

function formatCoordinate(value: number) {
  return value.toFixed(6)
}

function getLatitude(point: MapCoordinatesInput) {
  return 'lat' in point ? point.lat : point.latitude
}

function getLongitude(point: MapCoordinatesInput) {
  return 'lng' in point ? point.lng : point.longitude
}

export function buildCoordinateQuery(point: MapCoordinatesInput | null | undefined) {
  if (!point) {
    return null
  }

  return `${formatCoordinate(getLatitude(point))},${formatCoordinate(getLongitude(point))}`
}

export function buildRouteMapEmbedUrl(params: {
  origin?: MapCoordinatesInput | null
  destination?: MapCoordinatesInput | null
  focus?: MapCoordinatesInput | null
}) {
  const origin = buildCoordinateQuery(params.origin)
  const destination = buildCoordinateQuery(params.destination)
  const focus = buildCoordinateQuery(params.focus ?? params.destination ?? params.origin)

  if (!origin && !destination && !focus) {
    return null
  }

  const searchParams = new URLSearchParams()

  if (origin) {
    searchParams.set('origin', origin)
  }

  if (destination) {
    searchParams.set('destination', destination)
  }

  if (focus) {
    searchParams.set('place', focus)
  }

  return `/api/maps/embed?${searchParams.toString()}`
}

export function formatMapLocationLabel(location: MapLocationSuggestion | null | undefined) {
  if (!location) {
    return ''
  }

  const normalizedLabel = location.label.trim().toLowerCase()
  const normalizedAddress = location.address.trim().toLowerCase()

  if (!normalizedAddress || normalizedAddress === normalizedLabel) {
    return location.label
  }

  if (normalizedAddress.startsWith(normalizedLabel)) {
    return location.address
  }

  return `${location.label}, ${location.address}`
}

export function mapLocationSuggestionToRouteStop(
  location: MapLocationSuggestion
): BackendRouteStop {
  return {
    name: location.label,
    address: location.address,
    latitude: location.latitude,
    longitude: location.longitude,
  }
}

export function mapRouteStopToLocationSuggestion(
  stop: BackendRouteStop | null | undefined,
  fallbackId?: string | null
): MapLocationSuggestion | null {
  if (!stop) {
    return null
  }

  return {
    id:
      fallbackId?.trim() ||
      `${formatCoordinate(stop.latitude)},${formatCoordinate(stop.longitude)}`,
    label: stop.name,
    address: stop.address,
    latitude: stop.latitude,
    longitude: stop.longitude,
  }
}

export function areRouteStopsEquivalent(
  left: MapLocationSuggestion | null | undefined,
  right: MapLocationSuggestion | null | undefined
) {
  if (!left || !right) {
    return false
  }

  return (
    formatCoordinate(left.latitude) === formatCoordinate(right.latitude) &&
    formatCoordinate(left.longitude) === formatCoordinate(right.longitude)
  )
}

export async function searchMapLocations(query: string, limit = 5) {
  const trimmedQuery = query.trim()

  if (!trimmedQuery) {
    return [] as MapLocationSuggestion[]
  }

  try {
    const response = await fetch(
      `/api/maps/search?q=${encodeURIComponent(trimmedQuery)}&limit=${encodeURIComponent(
        String(limit)
      )}`,
      {
        cache: 'no-store',
      }
    )

    if (!response.ok) {
      return [] as MapLocationSuggestion[]
    }

    const payload = (await response.json()) as MapSearchResponse
    return Array.isArray(payload.results) ? payload.results : []
  } catch {
    return [] as MapLocationSuggestion[]
  }
}
