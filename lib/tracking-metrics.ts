export type TrackingPoint = { lat: number; lng: number }
export function validTrackingPoint(point: TrackingPoint | null | undefined): TrackingPoint | null {
  return point && Number.isFinite(point.lat) && Number.isFinite(point.lng) && Math.abs(point.lat) <= 90 && Math.abs(point.lng) <= 180 ? point : null
}
export function remainingRouteKey(start: TrackingPoint | null, end: TrackingPoint | null) {
  return start && end ? `${start.lat.toFixed(6)},${start.lng.toFixed(6)};${end.lat.toFixed(6)},${end.lng.toFixed(6)}` : null
}
export function formatRemainingRouteDistance(distance: unknown, hasLiveGps: boolean) {
  if (typeof distance !== 'number' || !Number.isFinite(distance) || distance < 0) return 'Distance unavailable'
  return `${distance.toFixed(1)} km ${hasLiveGps ? 'left' : 'dispatch route (GPS unavailable)'}`
}
