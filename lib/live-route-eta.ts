'use client'

import { getDriverAllocationGpsState, type DriverAllocationRecord } from '@/lib/driver-allocation-data'
import type { RouteResolution } from '@/lib/server-map-routes'

type Point = { latitude: number; longitude: number }
export type LiveRoadEstimate = RouteResolution & { origin: Point; destination: Point }
const MIN_REQUEST_INTERVAL_MS = 30_000
const REFRESH_INTERVAL_MS = 60_000
const MAX_ESTIMATE_AGE_MS = 90_000
const MOVEMENT_METERS = 75
const requests = new Map<string, { attemptedAt: number; estimate: LiveRoadEstimate | null; pending?: Promise<LiveRoadEstimate | null> }>()

function distanceMeters(left: Point, right: Point) {
  const radians = Math.PI / 180
  const a = Math.sin((right.latitude - left.latitude) * radians / 2) ** 2 +
    Math.cos(left.latitude * radians) * Math.cos(right.latitude * radians) *
    Math.sin((right.longitude - left.longitude) * radians / 2) ** 2
  return 6371000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(Math.max(0, 1 - a)))
}

function validPoint(point: Point | null | undefined): point is Point {
  return Boolean(point && Number.isFinite(point.latitude) && Number.isFinite(point.longitude) &&
    Math.abs(point.latitude) <= 90 && Math.abs(point.longitude) <= 180)
}

export function getCurrentRoadEstimate(allocation: DriverAllocationRecord, estimate: LiveRoadEstimate | null | undefined, now = Date.now()) {
  const gps = getDriverAllocationGpsState(allocation, now)
  if (gps.state !== 'live' || !gps.location || !estimate || !validPoint(allocation.destinationLocationDetails)) return null
  const age = now - new Date(estimate.calculatedAt).getTime()
  if (!Number.isFinite(age) || age < 0 || age > MAX_ESTIMATE_AGE_MS ||
      distanceMeters(estimate.destination, allocation.destinationLocationDetails) > 1 ||
      distanceMeters(estimate.origin, gps.location) > MOVEMENT_METERS * 2) return null
  return estimate
}

export function formatRoadTravelTime(seconds: number) {
  if (seconds > 0 && seconds < 60) return 'Less than 1 min'
  const minutes = Math.ceil(seconds / 60)
  const hours = Math.floor(minutes / 60)
  return hours ? `${hours} hr${minutes % 60 ? ` ${minutes % 60} mins` : ''}` : `${minutes} mins`
}

export function getRoadEstimateSource(estimate: LiveRoadEstimate) {
  return estimate.trafficAware ? 'Traffic-aware road estimate'
    : estimate.source === 'osrm' ? 'Standard road estimate · OSRM fallback, no traffic'
      : 'Standard road estimate · Traffic data unavailable'
}

export async function requestLiveRoadEstimate(allocation: DriverAllocationRecord, now = Date.now()): Promise<LiveRoadEstimate | null> {
  const gps = getDriverAllocationGpsState(allocation, now)
  const destination = allocation.destinationLocationDetails
  // Never route from an outdated fix and then present it as a current ETA.
  if (gps.state !== 'live' || !gps.location || !validPoint(destination)) return null
  const origin = gps.location
  const key = `${allocation.id}:${destination.latitude.toFixed(6)},${destination.longitude.toFixed(6)}`
  let entry = requests.get(key)
  if (entry?.pending) return entry.pending
  if (entry && (now - entry.attemptedAt < MIN_REQUEST_INTERVAL_MS ||
      (entry.estimate && now - entry.attemptedAt < REFRESH_INTERVAL_MS && distanceMeters(entry.estimate.origin, origin) < MOVEMENT_METERS))) return entry.estimate
  if (!entry) {
    if (requests.size >= 256) requests.delete(requests.keys().next().value!)
    entry = { attemptedAt: now, estimate: null }
    requests.set(key, entry)
  }
  entry.attemptedAt = now
  const currentEntry = entry
  currentEntry.pending = (async () => {
    try {
      const points = `${origin.latitude.toFixed(6)},${origin.longitude.toFixed(6)};${destination.latitude.toFixed(6)},${destination.longitude.toFixed(6)}`
      const response = await fetch(`/api/maps/route?points=${encodeURIComponent(points)}`, { cache: 'no-store', signal: AbortSignal.timeout(25_000) })
      if (!response.ok) return currentEntry.estimate
      const route = await response.json() as RouteResolution
      if (typeof route.durationSeconds !== 'number' || !Number.isFinite(route.durationSeconds) || route.durationSeconds < 0 ||
          typeof route.distanceKm !== 'number' || !Number.isFinite(route.distanceKm) || route.distanceKm < 0 ||
          !Array.isArray(route.coordinates) || route.coordinates.length < 2 ||
          !Number.isFinite(new Date(route.calculatedAt).getTime()) ||
          !['mapbox-traffic', 'mapbox-driving', 'osrm'].includes(route.source)) return currentEntry.estimate
      currentEntry.estimate = { ...route, origin, destination: { latitude: destination.latitude, longitude: destination.longitude } }
      return currentEntry.estimate
    } catch {
      return currentEntry.estimate
    } finally {
      currentEntry.pending = undefined
    }
  })()
  return currentEntry.pending
}
