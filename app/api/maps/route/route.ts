import { NextRequest, NextResponse } from 'next/server'

import { parseRoutePoints, resolveRouteData } from '@/lib/server-map-routes'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const points = parseRoutePoints(request.nextUrl.searchParams.get('points'))

  if (points.length < 2) {
    return NextResponse.json({ coordinates: null, distanceKm: null })
  }

  const route = await resolveRouteData(points)
  return NextResponse.json({
    coordinates: route?.coordinates ?? null,
    distanceKm: route?.distanceKm ?? null,
  })
}
