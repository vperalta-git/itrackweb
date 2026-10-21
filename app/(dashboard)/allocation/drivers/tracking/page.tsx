'use client'

import * as React from 'react'
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
  RefreshCw,
  Truck,
  TriangleAlert,
  Clock,
  CheckCircle2,
  WifiOff,
} from 'lucide-react'

import { RouteMapFrame } from '@/components/route-map-frame'
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
import { buildRouteMapEmbedUrl } from '@/lib/map-location'
import { buildRolePath, getRoleFromPathname } from '@/lib/rbac'
import { matchesScopedAgent, matchesScopedManager } from '@/lib/role-scope'
import { requestLiveRoadEstimate, getCurrentRoadEstimate, formatRoadTravelTime, getRoadEstimateSource, type LiveRoadEstimate } from '@/lib/live-route-eta'
import { getGpsHealthIndicator, getEtaReliability, getDeliveryDelay, summarizeDeliveries, matchesDeliveryMonitoringFilter, isActiveDelivery, notifySignificantDeliveryDelay, type DeliveryMonitoringFilter } from '@/lib/delivery-monitoring'
import { getSessionUser } from '@/lib/session'

type TrackingDriver = {
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

function getMapPreviewUrl(driver: TrackingDriver | null) {
  if (!driver) {
    return null
  }

  return buildRouteMapEmbedUrl({
    origin: driver.originCoordinates,
    destination: driver.destinationCoordinates,
    focus: driver.coordinates,
  })
}

function LiveTrackingContent() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const requestedAllocationId = searchParams.get('allocation')
  const appliedAllocationId = React.useRef<string | null>(null)
  const role = getRoleFromPathname(pathname)
  const [driverAllocations, setDriverAllocations] = React.useState<DriverAllocationRecord[]>(
    loadDriverAllocations()
  )
  const [searchTerm, setSearchTerm] = React.useState('')
  const [managerFilter, setManagerFilter] = React.useState('all')
  const [isRefreshing, setIsRefreshing] = React.useState(false)
  const [refreshError, setRefreshError] = React.useState<string | null>(null)
  const [clockMs, setClockMs] = React.useState(Date.now)
  const [lastUpdatedAt, setLastUpdatedAt] = React.useState<string | null>(null)
  const [roadEstimates, setRoadEstimates] = React.useState<Record<string, LiveRoadEstimate>>({})
  const [monitoringFilter, setMonitoringFilter] = React.useState<DeliveryMonitoringFilter>('active')

  React.useEffect(() => {
    const syncAllocations = () => {
      setDriverAllocations(loadDriverAllocations())
      setClockMs(Date.now())
    }

    syncAllocations()
    void syncDriverAllocationsFromBackend()
      .then((nextAllocations) => {
        setDriverAllocations(nextAllocations)
        setClockMs(Date.now())
        setRefreshError(null)
        setLastUpdatedAt(new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }))
      })
      .catch((error: unknown) => setRefreshError(error instanceof Error ? error.message : 'Unable to refresh tracking.'))

    const pollingInterval = window.setInterval(() => {
      setClockMs(Date.now())
      void syncDriverAllocationsFromBackend()
        .then((nextAllocations) => {
          setDriverAllocations(nextAllocations)
          setClockMs(Date.now())
          setRefreshError(null)
          setLastUpdatedAt(
            new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
          )
        })
        .catch((error: unknown) => setRefreshError(error instanceof Error ? error.message : 'Unable to refresh tracking.'))
    }, 15000)

    window.addEventListener(DRIVER_ALLOCATIONS_UPDATED_EVENT, syncAllocations)

    return () => {
      window.clearInterval(pollingInterval)
      window.removeEventListener(DRIVER_ALLOCATIONS_UPDATED_EVENT, syncAllocations)
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
    const requestedDriver = scopedDrivers.find((driver) => driver.id === requestedAllocationId)
    if (requestedDriver && appliedAllocationId.current !== requestedAllocationId) {
      appliedAllocationId.current = requestedAllocationId
      setSelectedDriver(requestedDriver)
      return
    }
    if (scopedDrivers.length > 0) {
      setSelectedDriver((current) =>
        current && scopedDrivers.some((driver) => driver.id === current.id)
          ? scopedDrivers.find((driver) => driver.id === current.id) ?? scopedDrivers[0]
          : scopedDrivers[0]
      )
      return
    }

    setSelectedDriver(null)
  }, [scopedDrivers, requestedAllocationId])

  const mapPreviewUrl = React.useMemo(() => getMapPreviewUrl(selectedDriver), [selectedDriver])

  const handleRefresh = async () => {
    setIsRefreshing(true)
    const nextAllocations = await syncDriverAllocationsFromBackend().catch((error: unknown) => {
      setRefreshError(error instanceof Error ? error.message : 'Unable to refresh tracking.')
      return null
    })

    if (nextAllocations) {
      setDriverAllocations(nextAllocations)
      setClockMs(Date.now())
      setRefreshError(null)
      setLastUpdatedAt(new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }))
    }

    setIsRefreshing(false)
  }

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
        <Button variant="outline" size="sm" onClick={() => void handleRefresh()} disabled={isRefreshing}>
          <RefreshCw className={`mr-2 size-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh
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

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Truck className="size-5 text-primary" />
                {monitoringFilter === 'completed' ? 'Completed Deliveries' : monitoringFilter === 'delayed' ? 'Delayed Deliveries' : role === 'admin' || role === 'supervisor' ? 'Live Routes' : 'Tracked Units'}
              </span>
              <Badge variant="secondary">{scopedDrivers.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className={scopedDrivers.some((driver) => !driver.trackingIssue) ? 'h-[320px]' : 'h-auto'}>
              <div className="space-y-1 p-4 pt-0">
                {scopedDrivers.length === 0 && <p className="p-4 text-sm text-muted-foreground">{monitoringFilter === 'delayed' && summary.delayAssessable === 0 ? 'Delay status unavailable. A recorded trip plan and current ETA are required.' : 'No deliveries match your filters.'}</p>}
                {scopedDrivers.length > 0 && scopedDrivers.every((driver) => driver.trackingIssue) && <p className="p-4 text-sm text-muted-foreground">Active deliveries with unavailable GPS are listed below.</p>}
                {scopedDrivers.filter((driver) => !driver.trackingIssue).map((driver) => (
                  <button
                    key={driver.id}
                    onClick={() => setSelectedDriver(driver)}
                    className={`w-full rounded-lg p-4 text-left transition-colors ${
                      selectedDriver?.id === driver.id
                        ? 'border border-primary/20 bg-primary/10'
                        : 'hover:bg-muted/50'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <Avatar className="size-10">
                        <AvatarFallback className="bg-primary/10 text-sm text-primary">
                          {driver.name
                            .split(' ')
                            .map((name) => name[0])
                            .join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <p className="truncate font-medium">{driver.name}</p>
                          <StatusBadge status={driver.status} />
                        </div>
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">
                          {driver.vehicle}
                        </p>
                        <div className="mt-2 flex items-center gap-2">
                          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                            <div
                              className="h-full rounded-full bg-primary transition-all"
                              style={{ width: `${driver.progress ?? 0}%` }}
                            />
                          </div>
                          <span className="text-xs text-muted-foreground">{driver.progress === null ? 'Unavailable' : `${driver.progress}%${driver.gpsLabel !== 'Live' ? ' (last known)' : ''}`}</span>
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-2"><Badge variant="secondary" className={driver.gpsColor}>{driver.gpsLabel}</Badge><span className="text-xs text-muted-foreground">Updated {driver.lastGpsAge}</span></div>
                        <p className="mt-1 text-xs text-muted-foreground">Estimated Travel Time: {driver.eta}</p>
                        {driver.expectedArrival && <p className="mt-1 text-xs text-muted-foreground">Expected Arrival: {driver.expectedArrival}</p>}
                        <p className="mt-1 text-xs text-muted-foreground">Remaining Road Distance: {driver.distanceLeft}</p>
                        <p className="mt-1 text-xs font-medium">{driver.etaReliability}</p>
                        {driver.etaCalculatedAt && <p className="mt-1 text-xs text-muted-foreground">ETA calculated: {new Date(driver.etaCalculatedAt).toLocaleString()}</p>}
                        {driver.routeSource && <p className="mt-1 text-[10px] text-muted-foreground">{driver.routeSource}</p>}
                        {driver.lastKnownEta && <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">Last Known ETA: {driver.lastKnownEta}</p>}
                        {isActiveDelivery(driver) && <p title={driver.delay.reason} className={`mt-2 rounded-md px-2 py-1 text-xs ${driver.delay.state === 'delayed' ? driver.delay.significant ? 'border border-orange-400 bg-orange-100 font-semibold text-orange-950 dark:border-orange-700 dark:bg-orange-950 dark:text-orange-200' : 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300' : 'text-muted-foreground'}`}>{driver.delay.state === 'delayed' && <TriangleAlert className="mr-1 inline size-3" />}{driver.delay.label}</p>}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </ScrollArea>
            <section aria-labelledby="disconnected-drivers-heading" className="border-t border-red-200 bg-red-50/50 p-4 dark:border-red-900 dark:bg-red-950/20">
              <h3 id="disconnected-drivers-heading" className="flex items-center justify-between gap-2 font-semibold">
                <span className="flex items-center gap-2"><TriangleAlert className="size-5 text-red-600 dark:text-red-400" />Disconnected Drivers</span>
                <Badge className="bg-red-600 text-white hover:bg-red-600" aria-label={`${disconnectedDrivers.length} disconnected drivers`}>{disconnectedDrivers.length}</Badge>
              </h3>
              {disconnectedDrivers.length === 0 ? (
                <p className="mt-3 text-sm text-muted-foreground">All active drivers are trackable</p>
              ) : (
                <div className="mt-3 max-h-[360px] space-y-3 overflow-y-auto">
                  {disconnectedDrivers.map((driver) => (
                    <button key={driver.id} onClick={() => selectDriver(driver)} aria-pressed={selectedDriver?.id === driver.id}
                      className={`w-full rounded-lg border bg-background p-3 text-left text-sm transition-colors hover:bg-red-50 dark:hover:bg-red-950/40 ${selectedDriver?.id === driver.id ? 'border-red-500 ring-1 ring-red-500' : 'border-red-200 dark:border-red-900'}`}>
                      <span className="flex flex-wrap items-center gap-2 font-semibold"><TriangleAlert className="size-4 text-red-600 dark:text-red-400" />{driver.name || 'Unassigned driver'}<Badge className="bg-red-600 text-white hover:bg-red-600">{driver.urgent ? 'Alert' : 'Awaiting GPS'}</Badge></span>
                      <span className="mt-1 block text-xs text-muted-foreground">{driver.vehicle} · {driver.stockNumber}</span>
                      <span className="mt-2 block font-medium text-red-700 dark:text-red-400">{driver.trackingIssue}</span>
                      <Badge variant="secondary" className={`mt-1 ${driver.gpsColor}`}>{driver.gpsLabel}</Badge>
                      <span className="mt-1 block text-xs">Last GPS update: {driver.lastGpsAge}</span>
                      <span className="mt-1 block text-xs text-muted-foreground">Last known location: {driver.coordinates ? `${driver.coordinates.lat.toFixed(5)}, ${driver.coordinates.lng.toFixed(5)}` : 'Unavailable — no GPS fix recorded'}</span>
                      <span className="mt-1 block text-xs text-muted-foreground">{driver.trackingGap}</span>
                      <span className="mt-1 block text-xs font-medium">{driver.eta}</span>
                      {driver.lastKnownEta && <span className="mt-1 block text-xs text-muted-foreground">Last Known ETA: {driver.lastKnownEta}</span>}
                      <span className="mt-1 block text-xs text-muted-foreground">{driver.etaReliability}{driver.etaCalculatedAt ? ` · Calculated ${new Date(driver.etaCalculatedAt).toLocaleString()}` : ''}</span>
                      <span className="mt-1 block text-xs text-muted-foreground">{driver.delay.label}</span>
                      <span className="mt-1 block text-xs text-muted-foreground">Last Known Road Distance: {driver.distanceLeft}</span>
                      <span className="mt-2 block text-xs font-medium underline">View delivery and last known position</span>
                    </button>
                  ))}
                </div>
              )}
            </section>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Car className="size-5 text-primary" />
              Shipment Route Map
            </CardTitle>
          </CardHeader>
          <CardContent>
            <>
              <div className="relative overflow-hidden rounded-xl border bg-background">
                <RouteMapFrame
                  className="h-[400px]"
                  title={
                    selectedDriver
                      ? `Shipment route for ${selectedDriver.name}`
                      : 'Default live tracking map view'
                  }
                  origin={selectedDriver?.originCoordinates}
                  destination={selectedDriver?.destinationCoordinates}
                  focus={selectedDriver?.coordinates}
                  routeOrigin={selectedDriver?.hasGps ? selectedDriver.coordinates : undefined}
                  focusState={selectedDriver?.gpsLabel === 'Live' ? 'live' : 'warning'}
                  focusLabel={selectedDriver ? `${selectedDriver.trackingIssue ?? selectedDriver.gpsLabel} — Last GPS update: ${selectedDriver.lastGpsAge}` : undefined}
                  resolvedRoute={selectedDriver?.routeEstimate?.coordinates ?? null}
                />

                <div className="absolute right-4 top-4 flex flex-col gap-2">
                  {selectedDriver && <Badge variant="secondary" className={`max-w-[260px] justify-center whitespace-normal text-center ${selectedDriver.gpsColor}`}>
                    {selectedDriver.gpsLabel} · {selectedDriver.lastGpsAge}
                  </Badge>}
                  {selectedDriver && mapPreviewUrl ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="bg-background/95"
                      asChild
                    >
                      <a href={mapPreviewUrl} target="_blank" rel="noreferrer">
                        <ExternalLink className="mr-2 size-4" />
                        Open Mapbox View
                      </a>
                    </Button>
                  ) : null}
                </div>

                {!selectedDriver ? (
                  <div className="pointer-events-none absolute left-4 top-4 max-w-xs rounded-lg border bg-background/90 px-3 py-2 text-xs text-muted-foreground shadow-sm">
                    Select a delivery to view its route. The map remains available for navigation.
                  </div>
                ) : (
                  <div className="border-t bg-background">
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <Avatar className="size-10">
                            <AvatarFallback className="bg-primary/10 text-primary">
                              {selectedDriver.name
                                .split(' ')
                                .map((name) => name[0])
                                .join('')}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-semibold">{selectedDriver.name}</p>
                            <p className="text-xs text-muted-foreground">{selectedDriver.vehicle}</p>
                          </div>
                        </div>
                      </div>
                      <div className="mt-4 grid grid-cols-1 gap-3 text-center sm:grid-cols-3">
                        <div>
                          <p className="text-xs text-muted-foreground">{isLastKnown ? 'Last Known Progress' : 'Progress'}</p>
                          <p className="font-semibold text-primary">{selectedDriver.progress === null ? 'Unavailable' : `${selectedDriver.progress}%`}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Estimated Travel Time</p>
                          <p className="font-semibold">{selectedDriver.eta}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">{isLastKnown ? 'Last Known Road Distance' : 'Remaining Road Distance'}</p>
                          <p className="font-semibold">{selectedDriver.distanceLeft}</p>
                        </div>
                      </div>
                      {selectedDriver.expectedArrival && <p className="mt-2 text-center text-sm font-semibold">Expected Arrival: {selectedDriver.expectedArrival}</p>}
                      <div className="mt-2 flex flex-wrap items-center justify-center gap-2 text-xs"><Badge variant={selectedDriver.etaReliability === 'Last Known ETA' ? 'outline' : 'secondary'}>{selectedDriver.etaReliability}</Badge>{selectedDriver.etaCalculatedAt && <span className="text-muted-foreground">Calculated {new Date(selectedDriver.etaCalculatedAt).toLocaleString()}</span>}</div>
                      {selectedDriver.routeSource && <p className="mt-1 text-center text-xs text-muted-foreground">{selectedDriver.routeSource}</p>}
                      {selectedDriver.lastKnownEta && <p className="mt-2 text-xs text-amber-700 dark:text-amber-400">Last Known ETA: {selectedDriver.lastKnownEta}</p>}
                      <div className="mt-3 flex items-center justify-between gap-4 text-[11px] text-muted-foreground">
                        <span>
                          {selectedDriver.coordinates
                            ? `${isLastKnown ? 'Last known location' : 'Live GPS position'}: ${selectedDriver.coordinates.lat.toFixed(4)}, ${selectedDriver.coordinates.lng.toFixed(4)}`
                            : 'No driver GPS fix. Map shows planned pickup and destination only.'}
                        </span>
                        <span className="hidden sm:inline">{gpsStatusLabel}</span>
                      </div>
                    </div>
                  </div>
                )}

                {selectedDriver?.hasGps ? (
                  <div className="border-t bg-muted/30 px-4 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                      Map Legend
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-foreground">
                      <div className="flex items-center gap-2">
                        <span className="size-2.5 rounded-full bg-[#f97316]" />
                        <span>Pickup</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="size-2.5 rounded-full bg-[#16a34a]" />
                        <span>Destination</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`size-2.5 rounded-full ${selectedDriver.gpsLabel === 'Live' ? 'bg-blue-600' : 'bg-red-600'}`} />
                        <span>{selectedDriver.gpsLabel === 'Live' ? 'Live Vehicle' : 'Last Known Vehicle'}</span>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>

              {selectedDriver ? (
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div className="rounded-lg bg-muted/50 p-4">
                    <div className="mb-1 flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="size-4" />
                      From
                    </div>
                    <p className="font-medium">{selectedDriver.origin}</p>
                  </div>
                  <div className="rounded-lg bg-muted/50 p-4">
                    <div className="mb-1 flex items-center gap-2 text-sm text-muted-foreground">
                      <Navigation className="size-4" />
                      To
                    </div>
                    <p className="font-medium">{selectedDriver.destination}</p>
                  </div>
                  <div className="rounded-lg bg-muted/50 p-4 text-sm sm:col-span-2">
                    <div className="mb-2 flex flex-wrap items-center gap-2"><span>Delivery Status:</span><StatusBadge status={selectedDriver.status} /></div>
                    <p>Tracking Status: <Badge variant="secondary" className={selectedDriver.gpsColor}>{selectedDriver.gpsLabel}</Badge></p>
                    {isActiveDelivery(selectedDriver) && <div className={`mt-3 rounded-lg p-3 ${selectedDriver.delay.state === 'delayed' ? selectedDriver.delay.significant ? 'border-2 border-orange-500 bg-orange-100 text-orange-950 dark:bg-orange-950 dark:text-orange-200' : 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200' : 'border text-muted-foreground'}`}>
                      <p className="font-medium">{selectedDriver.delay.state === 'delayed' && <TriangleAlert className="mr-1 inline size-4" />}{selectedDriver.delay.label}</p>
                      {selectedDriver.delay.reason && <p className="mt-1 text-xs">{selectedDriver.delay.reason}</p>}
                      {selectedDriver.delay.plannedArrivalAt && <p className="mt-1 text-xs">Expected Arrival (trip plan): {new Date(selectedDriver.delay.plannedArrivalAt).toLocaleString()}</p>}
                      {selectedDriver.delay.calculatedArrivalAt && <p className="mt-1 text-xs">Updated Arrival: {new Date(selectedDriver.delay.calculatedArrivalAt).toLocaleString()}</p>}
                    </div>}
                    <p className="mt-1">Last GPS update: {selectedDriver.lastGpsAge}{selectedDriver.currentLocationUpdatedAt && Number.isFinite(new Date(selectedDriver.currentLocationUpdatedAt).getTime()) ? ` (${new Date(selectedDriver.currentLocationUpdatedAt).toLocaleString()})` : ''}</p>
                    <p>Last known location: {selectedDriver.coordinates ? `${selectedDriver.coordinates.lat.toFixed(5)}, ${selectedDriver.coordinates.lng.toFixed(5)}` : 'Unavailable'}</p>
                    <p className="mt-1">Scheduled shipment: {selectedDriver.scheduledShipmentAt ? new Date(selectedDriver.scheduledShipmentAt).toLocaleString() : 'Not scheduled'}</p>
                    <p>Actual start: {selectedDriver.actualStartTime ? new Date(selectedDriver.actualStartTime).toLocaleString() : 'Not started'}</p>
                    <p>Actual end: {selectedDriver.completedAt ? new Date(selectedDriver.completedAt).toLocaleString() : 'Not completed'}</p>
                  </div>
                </div>
              ) : null}
            </>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default function LiveTrackingPage() {
  return <React.Suspense fallback={<p className="p-6 text-sm text-muted-foreground">Loading live tracking...</p>}><LiveTrackingContent /></React.Suspense>
}
