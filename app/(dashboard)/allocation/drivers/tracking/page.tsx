'use client'

import * as React from 'react'
import { DriverMonitoringTable } from '@/components/driver-monitoring-table'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import {
  ArrowLeft,
  Car,
  ExternalLink,
  Filter,
  LocateFixed,
  MapPin,
  Navigation,
  Truck,
  TriangleAlert,
  Clock,
  CheckCircle2,
  WifiOff,
} from 'lucide-react'

import { PageHeader } from '@/components/page-header'
import { StatusBadge } from '@/components/status-badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DRIVER_ALLOCATIONS_UPDATED_EVENT,
  DriverAllocationRecord,
  getDriverAllocationGpsState,
  getDriverAllocationTrackingHealth,
  getDriverAllocationProgress,
  loadDriverAllocations,
  syncDriverAllocationsFromBackend,
} from '@/lib/driver-allocation-data'
import { buildRolePath, getRoleFromPathname } from '@/lib/rbac'
import { matchesScopedAgent, matchesScopedManager } from '@/lib/role-scope'
import { requestLiveRoadEstimate, getCurrentRoadEstimate, formatRoadTravelTime, getRoadEstimateSource, type LiveRoadEstimate } from '@/lib/live-route-eta'
import { getGpsHealthIndicator, getEtaReliability, getDeliveryDelay, summarizeDeliveries, matchesDeliveryMonitoringFilter, isActiveDelivery, notifySignificantDeliveryDelay, type DeliveryMonitoringFilter } from '@/lib/delivery-monitoring'
import { getSessionUser } from '@/lib/session'
import { syncUsersFromBackend, type SystemUser } from '@/lib/user-data'

export type TrackingDriver = {
  id: string
  name: string
  phone: string
  vehicle: string
  stockNumber: string
  salesAgent: string
  manager: string
  status: DriverAllocationRecord['status']
  origin: string
  destination: string
  progress: number | null
  eta: string
  distanceLeft: string
  expectedArrival: string | null
  lastKnownEta: string | null
  routeEstimate: LiveRoadEstimate | null
  routeSource: string | null
  etaReliability: string
  etaCalculatedAt: string | null
  delay: ReturnType<typeof getDeliveryDelay>
  coordinates: { lat: number; lng: number } | null
  originCoordinates: { lat: number; lng: number } | null
  destinationCoordinates: { lat: number; lng: number } | null
  currentLocationUpdatedAt: string | null
  hasGps: boolean
  gpsState: 'live' | 'last-known' | 'stale' | 'unavailable'
  gpsLabel: string
  gpsColor: string
  trackingIssue: string | null
  urgent: boolean
  lastGpsAge: string
  trackingGap: string
  scheduledShipmentAt: string | null
  actualStartTime: string | null
  completedAt: string | null
}

function mapAllocationToTrackingDriver(allocation: DriverAllocationRecord, now: number, estimate?: LiveRoadEstimate): TrackingDriver {
  const vehicleLabel = `${allocation.unitName} ${allocation.variation}`.trim()
  const gps = getDriverAllocationGpsState(allocation, now)
  const health = getDriverAllocationTrackingHealth(allocation, now)
  const indicator = getGpsHealthIndicator(allocation, now)
  const reliability = getEtaReliability(allocation, estimate, now)
  const liveCoordinates = gps.location
  const currentEstimate = getCurrentRoadEstimate(allocation, estimate, now)
  const knownEstimate = estimate && allocation.destinationLocationDetails &&
    estimate.destination.latitude === allocation.destinationLocationDetails.latitude &&
    estimate.destination.longitude === allocation.destinationLocationDetails.longitude ? estimate : null
  const originCoordinates = allocation.pickupLocationDetails
    ? {
        lat: allocation.pickupLocationDetails.latitude,
        lng: allocation.pickupLocationDetails.longitude,
      }
    : null
  const destinationCoordinates = allocation.destinationLocationDetails
    ? {
        lat: allocation.destinationLocationDetails.latitude,
        lng: allocation.destinationLocationDetails.longitude,
      }
    : null

  return {
    id: allocation.id,
    name: allocation.assignedDriver,
    phone: allocation.driverPhone,
    vehicle: vehicleLabel,
    stockNumber: allocation.conductionNumber,
    salesAgent: allocation.salesAgent,
    manager: allocation.manager,
    status: allocation.status,
    origin: allocation.pickupLocation,
    destination: allocation.destination,
    progress: liveCoordinates ? Math.round((gps.state !== 'live' &&
      typeof allocation.routeProgress === 'number' && Number.isFinite(allocation.routeProgress)
      ? Math.min(1, Math.max(0, allocation.routeProgress)) : getDriverAllocationProgress(allocation)) * 100) : null,
    eta: currentEstimate ? formatRoadTravelTime(currentEstimate.durationSeconds)
      : allocation.status === 'pending' || allocation.status === 'assigned' ? 'Awaiting departure'
      : allocation.status === 'available' || allocation.status === 'completed' ? 'Delivery completed'
      : gps.state !== 'live' ? 'ETA Unavailable: GPS Tracking Lost' : 'ETA Unavailable: Road estimate not available',
    distanceLeft: currentEstimate ? `${currentEstimate.distanceKm!.toFixed(1)} km`
      : knownEstimate ? `Last known: ${knownEstimate.distanceKm!.toFixed(1)} km` : 'Unavailable',
    expectedArrival: currentEstimate ? new Date(new Date(currentEstimate.calculatedAt).getTime() + currentEstimate.durationSeconds * 1000)
      .toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : null,
    lastKnownEta: !currentEstimate && knownEstimate ? `${formatRoadTravelTime(knownEstimate.durationSeconds)} (calculated ${new Date(knownEstimate.calculatedAt).toLocaleString()})` : null,
    routeEstimate: currentEstimate ?? knownEstimate,
    routeSource: currentEstimate ? getRoadEstimateSource(currentEstimate) : null,
    etaReliability: reliability.label,
    etaCalculatedAt: reliability.calculatedAt,
    delay: getDeliveryDelay(allocation, estimate, now),
    coordinates: liveCoordinates
      ? { lat: liveCoordinates.latitude, lng: liveCoordinates.longitude }
      : null,
    originCoordinates,
    destinationCoordinates,
    currentLocationUpdatedAt: allocation.currentLocation?.updatedAt ?? null,
    hasGps: Boolean(liveCoordinates),
    gpsState: gps.state,
    gpsLabel: indicator.label,
    gpsColor: indicator.color,
    trackingIssue: health.issue,
    urgent: health.urgent,
    lastGpsAge: health.lastGpsAge,
    trackingGap: health.trackingGap,
    scheduledShipmentAt: allocation.scheduledShipmentAt ?? null,
    actualStartTime: allocation.actualStartTime ?? null,
    completedAt: allocation.completedAt ?? null,
  }
}

function LiveTrackingContent() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const requestedAllocationId = searchParams.get('allocation')
  const requestedNotice = searchParams.get('notice') ?? ''
  const appliedAllocationId = React.useRef<string | null>(null)
  const role = getRoleFromPathname(pathname)
  const [driverAllocations, setDriverAllocations] = React.useState<DriverAllocationRecord[]>(
    loadDriverAllocations()
  )
  const [searchTerm, setSearchTerm] = React.useState('')
  const [managerFilter, setManagerFilter] = React.useState('all')
  const [refreshError, setRefreshError] = React.useState<string | null>(null)
  const [clockMs, setClockMs] = React.useState(Date.now)
  const [lastUpdatedAt, setLastUpdatedAt] = React.useState<string | null>(null)
  const [roadEstimates, setRoadEstimates] = React.useState<Record<string, LiveRoadEstimate>>({})
  const [monitoringFilter, setMonitoringFilter] = React.useState<DeliveryMonitoringFilter>('all')
  const [driverDirectory, setDriverDirectory] = React.useState<SystemUser[]>([])
  React.useEffect(() => {
    if (role !== 'admin' && role !== 'supervisor') return
    let active = true
    void syncUsersFromBackend().then((users) => { if (active) setDriverDirectory(users.filter((user) => user.role === 'driver' && user.status === 'active')) }).catch(() => undefined)
    return () => { active = false }
  }, [role])
  const [detailsOpen, setDetailsOpen] = React.useState(false)

  React.useEffect(() => {
    const syncAllocations = () => {
      setDriverAllocations(loadDriverAllocations())
      setClockMs(Date.now())
    }

    let active = true
    let refreshing = false
    const refresh = async () => {
      setClockMs(Date.now())
      if (refreshing || document.visibilityState === 'hidden') return
      refreshing = true
      try {
        const records = await syncDriverAllocationsFromBackend()
        if (!active) return
        setDriverAllocations(records)
        setRefreshError(null)
        setLastUpdatedAt(new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }))
      } catch (error) { if (active) setRefreshError(error instanceof Error ? error.message : 'Unable to refresh tracking.') }
      finally { refreshing = false }
    }
    syncAllocations()
    void refresh()
    const onVisible = () => { if (document.visibilityState === 'visible') void refresh() }
    const pollingInterval = window.setInterval(() => void refresh(), 5000)
    window.addEventListener(DRIVER_ALLOCATIONS_UPDATED_EVENT, syncAllocations)
    window.addEventListener('focus', onVisible)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      active = false
      window.clearInterval(pollingInterval)
      window.removeEventListener(DRIVER_ALLOCATIONS_UPDATED_EVENT, syncAllocations)
      window.removeEventListener('focus', onVisible)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [])

  React.useEffect(() => {
    let isMounted = true
    const liveAllocations = driverAllocations.filter((allocation) => getDriverAllocationGpsState(allocation, clockMs).state === 'live')
    void Promise.all(liveAllocations.map(async (allocation) => ({
      id: allocation.id, estimate: await requestLiveRoadEstimate(allocation, clockMs),
    }))).then((results) => {
      if (!isMounted) return
      const hasNewEstimate = results.some((result) => result.estimate && roadEstimates[result.id] !== result.estimate)
      if (!hasNewEstimate) return
      setRoadEstimates((current) => {
        const changes = results.filter((result) => result.estimate && current[result.id] !== result.estimate)
        return changes.length ? { ...current, ...Object.fromEntries(changes.map((result) => [result.id, result.estimate!])) } : current
      })
      setClockMs(Date.now())
    })
    return () => { isMounted = false }
  }, [driverAllocations, clockMs, roadEstimates])

  const permittedAllocations = React.useMemo(() => [...new Map(driverAllocations.map((allocation) => [allocation.id, allocation])).values()]
    .filter((allocation) => matchesScopedAgent(role, allocation.salesAgent) && matchesScopedManager(role, allocation.manager)), [driverAllocations, role])
  const summary = React.useMemo(() => summarizeDeliveries(permittedAllocations, roadEstimates, clockMs), [permittedAllocations, roadEstimates, clockMs])

  const matchingDrivers = React.useMemo(() => permittedAllocations
    .filter((allocation) => matchesDeliveryMonitoringFilter(allocation, monitoringFilter, roadEstimates[allocation.id], clockMs))
    .map((allocation) => mapAllocationToTrackingDriver(allocation, clockMs, roadEstimates[allocation.id])), [permittedAllocations, monitoringFilter, roadEstimates, clockMs])

  const availableManagers = React.useMemo(
    () => Array.from(new Set(permittedAllocations.map((allocation) => allocation.manager).filter(Boolean))),
    [permittedAllocations]
  )

  const disconnectedDrivers = React.useMemo(() => permittedAllocations.filter((allocation) => isActiveDelivery(allocation))
    .map((allocation) => mapAllocationToTrackingDriver(allocation, clockMs, roadEstimates[allocation.id]))
    .filter((driver) => driver.trackingIssue), [permittedAllocations, clockMs, roadEstimates])
  const urgentDrivers = disconnectedDrivers.filter((driver) => driver.urgent)

  React.useEffect(() => {
    if (role !== 'admin' && role !== 'supervisor') return
    const user = getSessionUser()
    if (!user?.id) return
    for (const allocation of permittedAllocations) {
      void notifySignificantDeliveryDelay(allocation, roadEstimates[allocation.id], user.id, clockMs)
    }
  }, [permittedAllocations, roadEstimates, clockMs, role])

  const scopedDrivers = React.useMemo(() => {
    const managerScopedDrivers =
      managerFilter === 'all'
        ? matchingDrivers
        : matchingDrivers.filter((driver) => driver.manager === managerFilter)

    return managerScopedDrivers.filter((driver) =>
      [driver.name, driver.vehicle, driver.stockNumber, driver.salesAgent, driver.manager]
        .join(' ')
        .toLowerCase()
        .includes(searchTerm.trim().toLowerCase())
    )
  }, [matchingDrivers, managerFilter, searchTerm])

  const [selectedDriver, setSelectedDriver] = React.useState<TrackingDriver | null>(null)

  const selectDriver = (driver: TrackingDriver) => {
    setDetailsOpen(true)
    setSearchTerm('')
    setManagerFilter('all')
    setMonitoringFilter('active')
    setSelectedDriver(driver)
  }

  React.useEffect(() => {
    if (requestedAllocationId) {
      setSearchTerm('')
      setManagerFilter('all')
      setMonitoringFilter('active')
    }
  }, [requestedAllocationId])

  React.useEffect(() => {
    const requested = permittedAllocations.find((allocation) => allocation.id === requestedAllocationId)
    const requestedDriver = requested ? mapAllocationToTrackingDriver(requested, clockMs, roadEstimates[requested.id]) : null
    const notificationKey = `${requestedAllocationId}:${requestedNotice}`
    if (requestedDriver && appliedAllocationId.current !== notificationKey) {
      appliedAllocationId.current = notificationKey
      setSelectedDriver(requestedDriver)
      setDetailsOpen(true)
      return
    }
    setSelectedDriver((current) => {
      if (!current) return null
      const latest = permittedAllocations.find((allocation) => allocation.id === current.id)
      return latest ? mapAllocationToTrackingDriver(latest, clockMs, roadEstimates[latest.id]) : current
    })
  }, [scopedDrivers, requestedAllocationId, requestedNotice, permittedAllocations, clockMs, roadEstimates])

  const gpsStatusLabel = selectedDriver
    ? `${selectedDriver.gpsLabel} · Last GPS update: ${selectedDriver.lastGpsAge}`
    : 'No shipment selected'
  const isLastKnown = selectedDriver?.gpsLabel !== 'Live'
  const monitoringCards = [
    { key: 'active' as const, label: 'Active Deliveries', count: summary.active, Icon: Truck, color: 'text-primary', detail: 'Pending, assigned, and in transit' },
    { key: 'delayed' as const, label: 'Delayed Deliveries', count: summary.delayed, Icon: Clock, color: 'text-amber-700 dark:text-amber-400', detail: summary.active > 0 && summary.delayAssessable === 0 ? 'Delay status unavailable' : `${summary.delayAssessable} reliable arrival comparisons` },
    { key: 'untrackable' as const, label: 'GPS Disconnected / Untrackable', count: summary.untrackable, Icon: WifiOff, color: 'text-red-600 dark:text-red-400', detail: 'Active trips with unavailable tracking' },
    { key: 'completed' as const, label: 'Completed Deliveries', count: summary.completed, Icon: CheckCircle2, color: 'text-emerald-700 dark:text-emerald-400', detail: 'Delivered or completed records' },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Live Tracking"
        description={
          role === 'sales-agent'
            ? 'Real-time location tracking for your allocated units'
            : role === 'manager'
            ? 'Real-time location tracking for units assigned to your agents'
            : 'Real-time location tracking for active deliveries'
        }
      >
        <Button variant="outline" size="sm" asChild>
          <Link
            href={buildRolePath(
              role,
              role === 'admin' || role === 'supervisor' ? 'allocation/drivers' : 'dashboard'
            )}
          >
            <ArrowLeft className="mr-2 size-4" />
            {role === 'admin' || role === 'supervisor'
              ? 'Back to Allocations'
              : 'Back to Dashboard'}
          </Link>
        </Button>
      </PageHeader>

      {urgentDrivers.length > 0 && (
        <div role="alert" className="rounded-xl border-2 border-red-600 bg-red-50 p-4 text-red-900 dark:border-red-500 dark:bg-red-950/60 dark:text-red-100">
          <div className="flex items-start gap-3">
            <TriangleAlert className="mt-0.5 size-6 shrink-0 text-red-600 dark:text-red-400" />
            <div className="min-w-0 flex-1">
              <p className="font-bold">URGENT: {urgentDrivers.length} active {urgentDrivers.length === 1 ? 'delivery has' : 'deliveries have'} lost GPS tracking.</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {urgentDrivers.map((driver) => (
                  <button key={driver.id} onClick={() => selectDriver(driver)} className="rounded-md border border-red-300 bg-background/70 px-3 py-2 text-left text-sm underline-offset-2 hover:underline dark:border-red-800">
                    <span className="font-semibold">{driver.name || 'Unassigned driver'}</span> · {driver.trackingGap} · View tracking
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {refreshError && <p role="alert" className="rounded-lg border border-destructive/30 p-3 text-sm text-destructive">
        {refreshError} Showing last fetched records; GPS freshness is shown separately.
      </p>}
      <p className="text-xs text-muted-foreground">{lastUpdatedAt ? `Records last refreshed ${lastUpdatedAt}. ` : 'Waiting for records. '}
        GPS labels use the fix timestamp, not the refresh time.
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <Input
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          placeholder="Search driver, unit, stock number, or manager"
          className="max-w-sm"
        />
        <div className="flex items-center gap-2">
          <Filter className="size-4 text-muted-foreground" />
        </div>
        <Select value={managerFilter} onValueChange={setManagerFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All Managers" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Managers</SelectItem>
            {availableManagers.map((manager) => (
              <SelectItem key={manager} value={manager}>
                {manager}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Delivery monitoring summary">
        {monitoringCards.map(({ key, label, count, Icon, color, detail }) => (
          <Card key={key} className={`gap-0 overflow-hidden p-0 ${monitoringFilter === key ? 'border-primary ring-1 ring-primary/30' : ''}`}>
            <button type="button" aria-pressed={monitoringFilter === key} className="h-full w-full p-4 text-left transition-colors hover:bg-muted/50"
              onClick={() => { setMonitoringFilter(key); setSearchTerm(''); setManagerFilter('all') }}>
              <span className="flex items-start justify-between gap-2 text-sm font-medium"><span>{label}</span><Icon className={`size-5 shrink-0 ${color}`} /></span>
              <span className={`mt-2 block text-3xl font-bold tabular-nums ${color}`}>{count}</span>
              <span className="mt-1 block text-xs text-muted-foreground">{detail}</span>
            </button>
          </Card>
        ))}
      </div>

      <Button variant="outline" aria-pressed={monitoringFilter === 'all'} onClick={() => { setMonitoringFilter('all'); setSearchTerm(''); setManagerFilter('all') }}>All drivers</Button>
      <DriverMonitoringTable drivers={scopedDrivers} selected={selectedDriver} onSelect={setSelectedDriver}
        idleDrivers={monitoringFilter === 'all' && managerFilter === 'all' ? driverDirectory.filter((user) =>
          !permittedAllocations.some((allocation) => allocation.driverId === user.id && isActiveDelivery(allocation)) &&
          `${user.firstName} ${user.lastName} ${user.phone}`.toLowerCase().includes(searchTerm.trim().toLowerCase())) : []}
        open={detailsOpen} onOpenChange={setDetailsOpen}
        driverId={permittedAllocations.find((allocation) => allocation.id === selectedDriver?.id)?.driverId} />
    </div>
  )
}

export default function LiveTrackingPage() {
  return <React.Suspense fallback={<p className="p-6 text-sm text-muted-foreground">Loading live tracking...</p>}><LiveTrackingContent /></React.Suspense>
}
