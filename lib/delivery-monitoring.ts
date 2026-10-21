'use client'

import { GPS_FRESH_FOR_MS, getDriverAllocationGpsState, getDriverAllocationTrackingHealth, type DriverAllocationRecord } from '@/lib/driver-allocation-data'
import { getCurrentRoadEstimate, type LiveRoadEstimate } from '@/lib/live-route-eta'
import { createNotificationRecord } from '@/lib/notifications-data'
import { requestWebNotificationRefresh } from '@/lib/notification-preferences'

export type DeliveryMonitoringFilter = 'active' | 'delayed' | 'untrackable' | 'completed'
export const SIGNIFICANT_DELAY_MINUTES = 10 // Existing safety monitor's minimum ETA grace.
const activeStatuses = new Set(['pending', 'assigned', 'in-transit'])
const completedStatuses = new Set(['available', 'completed'])

export function isActiveDelivery(allocation: Pick<DriverAllocationRecord, 'status'>) {
  return activeStatuses.has(allocation.status)
}

export function getGpsHealthIndicator(allocation: DriverAllocationRecord, now = Date.now()) {
  const gps = getDriverAllocationGpsState(allocation, now)
  const timestamp = new Date(allocation.currentLocation?.updatedAt ?? '').getTime()
  // There is no independent phone-connectivity field in the current API.
  if (gps.location && Number.isFinite(timestamp) && timestamp <= now && now - timestamp <= GPS_FRESH_FOR_MS && isActiveDelivery(allocation)) return { label: 'Live', color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' }
  if (gps.location && Number.isFinite(timestamp) && timestamp <= now) return { label: isActiveDelivery(allocation) ? 'Stale GPS' : 'Last Known GPS', color: 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300' }
  return { label: 'Tracking Unavailable', color: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300' }
}

export function getEtaReliability(allocation: DriverAllocationRecord, estimate: LiveRoadEstimate | undefined, now = Date.now()) {
  const current = getCurrentRoadEstimate(allocation, estimate, now)
  const known = estimate && allocation.destinationLocationDetails &&
    estimate.destination.latitude === allocation.destinationLocationDetails.latitude &&
    estimate.destination.longitude === allocation.destinationLocationDetails.longitude ? estimate : null
  return {
    label: current ? current.trafficAware && current.source === 'mapbox-traffic' ? 'Traffic-aware ETA' : 'Road-based ETA'
      : known ? 'Last Known ETA' : 'ETA Unavailable',
    calculatedAt: (current ?? known)?.calculatedAt ?? null,
    current: Boolean(current),
  }
}

export function getDeliveryDelay(allocation: DriverAllocationRecord, estimate: LiveRoadEstimate | undefined, now = Date.now()) {
  const start = new Date(allocation.actualStartTime ?? '').getTime()
  const duration = allocation.estimatedDuration
  // scheduledShipmentAt is a departure date. Only a recorded positive trip
  // duration plus its actual start supplies an existing expected-arrival plan.
  const planned = Number.isFinite(start) && start <= now && typeof duration === 'number' && Number.isFinite(duration) && duration > 0
    ? start + duration * 60_000 : null
  const current = getCurrentRoadEstimate(allocation, estimate, now)
  const arrival = current ? new Date(current.calculatedAt).getTime() + current.durationSeconds * 1000 : null
  if (planned === null || arrival === null) return {
    state: 'unavailable' as const, minutes: null, significant: false,
    label: 'Delay status unavailable',
    reason: planned === null ? 'No expected arrival is recorded in the trip plan.' : 'A current, reliable ETA is required.',
    plannedArrivalAt: planned === null ? null : new Date(planned).toISOString(), calculatedArrivalAt: null,
  }
  const minutes = Math.max(0, Math.ceil((arrival - planned) / 60_000))
  return {
    state: minutes > 0 ? 'delayed' as const : 'on-time' as const,
    minutes, significant: minutes >= SIGNIFICANT_DELAY_MINUTES,
    label: minutes > 0 ? `Delayed by ${minutes} minute${minutes === 1 ? '' : 's'}` : 'On time', reason: '',
    plannedArrivalAt: new Date(planned).toISOString(), calculatedArrivalAt: new Date(arrival).toISOString(),
  }
}

export function summarizeDeliveries(allocations: DriverAllocationRecord[], estimates: Record<string, LiveRoadEstimate>, now = Date.now()) {
  const unique = [...new Map(allocations.map((allocation) => [allocation.id, allocation])).values()]
  const summary = { active: 0, delayed: 0, untrackable: 0, completed: 0, delayAssessable: 0 }
  for (const allocation of unique) {
    if (completedStatuses.has(allocation.status)) summary.completed++
    if (!isActiveDelivery(allocation)) continue
    summary.active++
    if (getDriverAllocationTrackingHealth(allocation, now).issue) summary.untrackable++
    const delay = getDeliveryDelay(allocation, estimates[allocation.id], now)
    if (delay.state !== 'unavailable') summary.delayAssessable++
    if (delay.state === 'delayed') summary.delayed++
  }
  return summary
}

export function matchesDeliveryMonitoringFilter(allocation: DriverAllocationRecord, filter: DeliveryMonitoringFilter, estimate: LiveRoadEstimate | undefined, now = Date.now()) {
  if (filter === 'completed') return completedStatuses.has(allocation.status)
  if (!isActiveDelivery(allocation)) return false
  if (filter === 'untrackable') return Boolean(getDriverAllocationTrackingHealth(allocation, now).issue)
  if (filter === 'delayed') return getDeliveryDelay(allocation, estimate, now).state === 'delayed'
  return true
}

const notifiedDelays = new Set<string>()
const delayStorageKey = 'itrack.delivery-delay-notifications'
const readNotifiedDelays = (): Record<string, boolean> => {
  try {
    const saved: unknown = JSON.parse(window.localStorage.getItem(delayStorageKey) ?? '{}')
    return saved && typeof saved === 'object' && !Array.isArray(saved) ? saved as Record<string, boolean> : {}
  } catch { return {} }
}
export async function notifySignificantDeliveryDelay(allocation: DriverAllocationRecord, estimate: LiveRoadEstimate | undefined, userId: string, now = Date.now()) {
  const delay = getDeliveryDelay(allocation, estimate, now)
  if (!userId || !delay.significant || !estimate) return
  const key = `${userId}:${allocation.id}:${delay.plannedArrivalAt}`
  if (notifiedDelays.has(key)) return
  const saved = readNotifiedDelays()
  if (saved[key]) { notifiedDelays.add(key); return }
  notifiedDelays.add(key) // Claim before awaiting, including overlapping refreshes.
  try {
    await createNotificationRecord({ userId, type: 'alert', title: 'Delivery delay projected',
      message: `${allocation.assignedDriver || 'Driver'} · ${allocation.conductionNumber}: ${delay.label.toLowerCase()}, based on the ETA calculated ${new Date(estimate.calculatedAt).toLocaleString()}.`,
      data: { entityType: 'driver_allocation', entityId: allocation.id, safetyAlertType: 'delivery_delay',
        delayMinutes: delay.minutes, plannedArrivalAt: delay.plannedArrivalAt, calculatedArrivalAt: delay.calculatedArrivalAt, calculatedAt: estimate.calculatedAt },
    })
    try { window.localStorage.setItem(delayStorageKey, JSON.stringify({ ...readNotifiedDelays(), [key]: true })) } catch { /* The session guard remains active. */ }
    requestWebNotificationRefresh()
  } catch {
    notifiedDelays.delete(key)
  }
}
