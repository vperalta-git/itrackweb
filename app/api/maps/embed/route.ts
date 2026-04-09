import { NextRequest, NextResponse } from 'next/server'

import { parseRoutePoint, resolveRouteCoordinates } from '@/lib/server-map-routes'

type Coordinate = {
  latitude: number
  longitude: number
}

type GeoJsonFeature = {
  type: 'Feature'
  properties: Record<string, string | number>
  geometry: {
    type: 'Point' | 'LineString'
    coordinates: [number, number] | [number, number][]
  }
}

type GeoJsonFeatureCollection = {
  type: 'FeatureCollection'
  features: GeoJsonFeature[]
}

const DEFAULT_STYLE_OWNER = 'mapbox'
const DEFAULT_STYLE_ID = 'streets-v12'

export const dynamic = 'force-dynamic'

function getMapboxAccessToken() {
  return (
    process.env.MAPBOX_ACCESS_TOKEN?.trim() ||
    process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN?.trim() ||
    null
  )
}

function getMapboxStyleOwner() {
  return (
    process.env.MAPBOX_STYLE_OWNER?.trim() ||
    process.env.NEXT_PUBLIC_MAPBOX_STYLE_OWNER?.trim() ||
    DEFAULT_STYLE_OWNER
  )
}

function getMapboxStyleId() {
  return (
    process.env.MAPBOX_STYLE_ID?.trim() ||
    process.env.NEXT_PUBLIC_MAPBOX_STYLE_ID?.trim() ||
    DEFAULT_STYLE_ID
  )
}

function toLngLat(point: Coordinate): [number, number] {
  return [point.longitude, point.latitude]
}

function buildPlaceholderSvg(message: string) {
  const escapedMessage = message
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="720" viewBox="0 0 1200 720">
  <rect width="1200" height="720" fill="#f8fafc" />
  <rect x="32" y="32" width="1136" height="656" rx="28" fill="#ffffff" stroke="#e2e8f0" stroke-width="2" />
  <text x="600" y="340" text-anchor="middle" font-family="Arial, sans-serif" font-size="28" font-weight="700" fill="#0f172a">
    Map Preview Unavailable
  </text>
  <text x="600" y="388" text-anchor="middle" font-family="Arial, sans-serif" font-size="20" fill="#475569">
    ${escapedMessage}
  </text>
</svg>`
}

function buildPointFeature(
  point: Coordinate,
  markerColor: string,
  markerSymbol: string
): GeoJsonFeature {
  return {
    type: 'Feature',
    properties: {
      'marker-size': 'medium',
      'marker-symbol': markerSymbol,
      'marker-color': markerColor,
    },
    geometry: {
      type: 'Point',
      coordinates: toLngLat(point),
    },
  }
}

function buildLineFeature(points: [number, number][]): GeoJsonFeature {
  return {
    type: 'Feature',
    properties: {
      stroke: '#2563eb',
      'stroke-width': 4,
      'stroke-opacity': 0.9,
    },
    geometry: {
      type: 'LineString',
      coordinates: points,
    },
  }
}

function buildFeatureCollection(params: {
  origin?: Coordinate | null
  destination?: Coordinate | null
  focus?: Coordinate | null
  routeCoordinates?: [number, number][] | null
}) {
  const features: GeoJsonFeature[] = []

  if (params.routeCoordinates && params.routeCoordinates.length >= 2) {
    features.push(buildLineFeature(params.routeCoordinates))
  }

  if (params.origin) {
    features.push(buildPointFeature(params.origin, '#f97316', 'warehouse'))
  }

  if (params.destination) {
    features.push(buildPointFeature(params.destination, '#16a34a', 'marker'))
  }

  if (
    params.focus &&
    (!params.origin ||
      params.focus.latitude !== params.origin.latitude ||
      params.focus.longitude !== params.origin.longitude) &&
    (!params.destination ||
      params.focus.latitude !== params.destination.latitude ||
      params.focus.longitude !== params.destination.longitude)
  ) {
    features.push(buildPointFeature(params.focus, '#dc2626', 'car'))
  }

  return {
    type: 'FeatureCollection',
    features,
  } satisfies GeoJsonFeatureCollection
}

function buildStaticImageUrl(featureCollection: GeoJsonFeatureCollection, accessToken: string) {
  const styleOwner = getMapboxStyleOwner()
  const styleId = getMapboxStyleId()
  const overlay = `geojson(${encodeURIComponent(JSON.stringify(featureCollection))})`
  const url = new URL(
    `https://api.mapbox.com/styles/v1/${styleOwner}/${styleId}/static/${overlay}/auto/1200x720`
  )
  url.searchParams.set('padding', '56,56,56,56')
  url.searchParams.set('access_token', accessToken)
  return url.toString()
}

export async function GET(request: NextRequest) {
  const accessToken = getMapboxAccessToken()

  if (!accessToken) {
    return new NextResponse(
      buildPlaceholderSvg('Add MAPBOX_ACCESS_TOKEN to web-frontend/.env.local.'),
      {
        headers: {
          'Content-Type': 'image/svg+xml',
          'Cache-Control': 'no-store',
        },
      }
    )
  }

  const origin = parseRoutePoint(request.nextUrl.searchParams.get('origin'))
  const destination = parseRoutePoint(request.nextUrl.searchParams.get('destination'))
  const focus =
    parseRoutePoint(request.nextUrl.searchParams.get('place')) ?? destination ?? origin ?? null

  if (!origin && !destination && !focus) {
    return new NextResponse(buildPlaceholderSvg('Select route points to render the map preview.'), {
      headers: {
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'no-store',
      },
    })
  }

  let routeCoordinates: [number, number][] | null = null

  if (origin && destination) {
    try {
      routeCoordinates = await resolveRouteCoordinates([origin, destination])
    } catch {
      routeCoordinates = null
    }
  }

  const featureCollection = buildFeatureCollection({
    origin,
    destination,
    focus,
    routeCoordinates,
  })

  return NextResponse.redirect(buildStaticImageUrl(featureCollection, accessToken), {
    status: 307,
  })
}
