import { NextResponse } from 'next/server'

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

export async function GET() {
  return NextResponse.json({
    accessToken: getMapboxAccessToken(),
    styleOwner: getMapboxStyleOwner(),
    styleId: getMapboxStyleId(),
  })
}
