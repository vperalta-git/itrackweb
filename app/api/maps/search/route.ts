import { NextRequest, NextResponse } from 'next/server'

import type { MapLocationSuggestion } from '@/lib/map-location'

type MapboxFeature = {
  id?: string
  geometry?: {
    coordinates?: [number, number]
  }
  properties?: {
    mapbox_id?: string
    name?: string
    full_address?: string
    place_formatted?: string
    coordinates?: {
      latitude?: number
      longitude?: number
      routable_points?: Array<{
        latitude?: number
        longitude?: number
      }>
    }
  }
}

type MapboxGeocodingResponse = {
  features?: MapboxFeature[]
}

type OpenStreetMapResult = {
  place_id?: number | string
  lat?: string
  lon?: string
  name?: string
  display_name?: string
}

const DEFAULT_LIMIT = 5
const MAX_LIMIT = 8

export const dynamic = 'force-dynamic'

function getMapboxAccessToken() {
  return (
    process.env.MAPBOX_ACCESS_TOKEN?.trim() ||
    process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN?.trim() ||
    null
  )
}

function parseLimit(value: string | null) {
  const parsed = Number(value)

  if (!Number.isFinite(parsed)) {
    return DEFAULT_LIMIT
  }

  return Math.min(Math.max(Math.round(parsed), 1), MAX_LIMIT)
}

function dedupeResults(results: MapLocationSuggestion[], limit: number) {
  const seen = new Set<string>()

  return results
    .filter((result) => {
      const key = `${result.address.toLowerCase()}|${result.latitude.toFixed(6)}|${result.longitude.toFixed(6)}`

      if (seen.has(key)) {
        return false
      }

      seen.add(key)
      return true
    })
    .slice(0, limit)
}

function mapMapboxResult(result: MapboxFeature): MapLocationSuggestion | null {
  const routablePoint = result.properties?.coordinates?.routable_points?.[0]
  const latitude =
    routablePoint?.latitude ??
    result.properties?.coordinates?.latitude ??
    result.geometry?.coordinates?.[1]
  const longitude =
    routablePoint?.longitude ??
    result.properties?.coordinates?.longitude ??
    result.geometry?.coordinates?.[0]
  const address =
    result.properties?.full_address?.trim() ||
    [result.properties?.name?.trim(), result.properties?.place_formatted?.trim()]
      .filter(Boolean)
      .join(', ')
      .trim()

  if (
    typeof latitude !== 'number' ||
    typeof longitude !== 'number' ||
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    !address
  ) {
    return null
  }

  return {
    id:
      result.properties?.mapbox_id?.trim() ||
      result.id?.trim() ||
      `${latitude.toFixed(6)},${longitude.toFixed(6)}`,
    label: result.properties?.name?.trim() || address.split(',')[0]?.trim() || 'Pinned location',
    address,
    latitude,
    longitude,
  }
}

function mapOpenStreetMapResult(result: OpenStreetMapResult): MapLocationSuggestion | null {
  const latitude = Number(result.lat)
  const longitude = Number(result.lon)
  const address = result.display_name?.trim()

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || !address) {
    return null
  }

  return {
    id: String(result.place_id ?? `${latitude.toFixed(6)},${longitude.toFixed(6)}`),
    label: result.name?.trim() || address.split(',')[0]?.trim() || 'Pinned location',
    address,
    latitude,
    longitude,
  }
}

async function searchMapbox(query: string, limit: number) {
  const accessToken = getMapboxAccessToken()

  if (!accessToken) {
    return [] as MapLocationSuggestion[]
  }

  const url = new URL('https://api.mapbox.com/search/geocode/v6/forward')
  url.searchParams.set('q', query)
  url.searchParams.set('country', 'PH')
  url.searchParams.set('language', 'en')
  url.searchParams.set('autocomplete', 'true')
  url.searchParams.set('types', 'address,street,neighborhood,locality,place,district,postcode')
  url.searchParams.set('limit', String(limit))
  url.searchParams.set('access_token', accessToken)

  const response = await fetch(url, {
    cache: 'no-store',
  })

  if (!response.ok) {
    return [] as MapLocationSuggestion[]
  }

  const payload = (await response.json()) as MapboxGeocodingResponse

  if (!Array.isArray(payload.features)) {
    return [] as MapLocationSuggestion[]
  }

  return dedupeResults(
    payload.features
      .map((result) => mapMapboxResult(result))
      .filter((result): result is MapLocationSuggestion => result !== null),
    limit
  )
}

async function searchOpenStreetMap(query: string, limit: number) {
  const url = new URL('https://nominatim.openstreetmap.org/search')
  url.searchParams.set('q', query)
  url.searchParams.set('format', 'jsonv2')
  url.searchParams.set('addressdetails', '1')
  url.searchParams.set('countrycodes', 'ph')
  url.searchParams.set('limit', String(limit))

  const response = await fetch(url, {
    cache: 'no-store',
    headers: {
      Accept: 'application/json',
      'User-Agent': 'i-track-web/0.1',
    },
  })

  if (!response.ok) {
    return [] as MapLocationSuggestion[]
  }

  const payload = (await response.json()) as OpenStreetMapResult[]

  if (!Array.isArray(payload)) {
    return [] as MapLocationSuggestion[]
  }

  return dedupeResults(
    payload
      .map((result) => mapOpenStreetMapResult(result))
      .filter((result): result is MapLocationSuggestion => result !== null),
    limit
  )
}

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get('q')?.trim() ?? ''
  const limit = parseLimit(request.nextUrl.searchParams.get('limit'))

  if (!query) {
    return NextResponse.json({ results: [] })
  }

  try {
    const mapboxResults = await searchMapbox(query, limit)

    if (mapboxResults.length) {
      return NextResponse.json({ results: mapboxResults })
    }
  } catch {
    // Fall through to the OpenStreetMap lookup below.
  }

  try {
    const osmResults = await searchOpenStreetMap(query, limit)
    return NextResponse.json({ results: osmResults })
  } catch {
    return NextResponse.json({ results: [] })
  }
}
