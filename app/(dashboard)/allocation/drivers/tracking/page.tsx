'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
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
import { getRelativeTime } from '@/lib/backend-helpers'
import {
  DRIVER_ALLOCATIONS_UPDATED_EVENT,
  DriverAllocationRecord,
  getDriverAllocationEtaLabel,
  getDriverAllocationLiveCoordinates,
  getDriverAllocationProgress,
  getDriverAllocationRemainingDistanceLabel,
  loadDriverAllocations,
  syncDriverAllocationsFromBackend,
} from '@/lib/driver-allocation-data'
import { buildRouteMapEmbedUrl } from '@/lib/map-location'
import { buildRolePath, getRoleFromPathname } from '@/lib/rbac'
import { matchesScopedAgent, matchesScopedManager } from '@/lib/role-scope'

type LiveRouteMetricsResponse = {
  coordinates?: [number, number][] | null
  distanceKm?: number | null
}

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
  progress: number
  eta: string
  distanceLeft: string
  coordinates: { lat: number; lng: number }
  originCoordinates: { lat: number; lng: number } | null
  destinationCoordinates: { lat: number; lng: number } | null
  currentLocationUpdatedAt: string | null
  hasLiveGps: boolean
}

function mapAllocationToTrackingDriver(allocation: DriverAllocationRecord): TrackingDriver {
  const vehicleLabel = `${allocation.unitName} ${allocation.variation}`.trim()
  const liveCoordinates = getDriverAllocationLiveCoordinates(allocation)
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
    progress: Math.round(getDriverAllocationProgress(allocation) * 100),
    eta: getDriverAllocationEtaLabel(allocation),
    distanceLeft:
      getDriverAllocationRemainingDistanceLabel(allocation) ??
      (allocation.status === 'pending'
        ? 'Not started'
        : allocation.status === 'assigned'
        ? 'Preparing departure'
        : allocation.status === 'available'
        ? 'At destination'
        : 'Completed'),
    coordinates: liveCoordinates
      ? { lat: liveCoordinates.latitude, lng: liveCoordinates.longitude }
      : originCoordinates ?? destinationCoordinates ?? { lat: 14.575, lng: 121.085 },
    originCoordinates,
    destinationCoordinates,
    currentLocationUpdatedAt: allocation.currentLocation?.updatedAt ?? null,
    hasLiveGps: Boolean(allocation.currentLocation),
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

export default function LiveTrackingPage() {
  const pathname = usePathname()
  const role = getRoleFromPathname(pathname)
  const [driverAllocations, setDriverAllocations] = React.useState<DriverAllocationRecord[]>(
    loadDriverAllocations()
  )
  const [searchTerm, setSearchTerm] = React.useState('')
  const [managerFilter, setManagerFilter] = React.useState('all')
  const [isRefreshing, setIsRefreshing] = React.useState(false)
  const [lastUpdatedAt, setLastUpdatedAt] = React.useState<string | null>(null)
  const [selectedDriverRouteDistanceKm, setSelectedDriverRouteDistanceKm] = React.useState<
    number | null
  >(null)

  React.useEffect(() => {
    const syncAllocations = () => {
      setDriverAllocations(loadDriverAllocations())
    }

    syncAllocations()
    void syncDriverAllocationsFromBackend()
      .then((nextAllocations) => {
        setDriverAllocations(nextAllocations)
        setLastUpdatedAt(new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }))
      })
      .catch(() => null)

    const pollingInterval = window.setInterval(() => {
      void syncDriverAllocationsFromBackend()
        .then((nextAllocations) => {
          setDriverAllocations(nextAllocations)
          setLastUpdatedAt(
            new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
          )
        })
        .catch(() => null)
    }, 15000)

    window.addEventListener(DRIVER_ALLOCATIONS_UPDATED_EVENT, syncAllocations)

    return () => {
      window.clearInterval(pollingInterval)
      window.removeEventListener(DRIVER_ALLOCATIONS_UPDATED_EVENT, syncAllocations)
    }
  }, [])

  const activeDrivers = React.useMemo(
    () =>
      driverAllocations
        .filter((allocation) => allocation.status === 'in-transit')
        .map(mapAllocationToTrackingDriver),
    [driverAllocations]
  )

  const availableManagers = React.useMemo(
    () => Array.from(new Set(activeDrivers.map((driver) => driver.manager).filter(Boolean))),
    [activeDrivers]
  )

  const scopedDrivers = React.useMemo(() => {
    const roleScopedDrivers = activeDrivers.filter(
      (driver) =>
        matchesScopedAgent(role, driver.salesAgent) &&
        matchesScopedManager(role, driver.manager)
    )

    const managerScopedDrivers =
      managerFilter === 'all'
        ? roleScopedDrivers
        : roleScopedDrivers.filter((driver) => driver.manager === managerFilter)

    return managerScopedDrivers.filter((driver) =>
      [driver.name, driver.vehicle, driver.stockNumber, driver.salesAgent, driver.manager]
        .join(' ')
        .toLowerCase()
        .includes(searchTerm.trim().toLowerCase())
    )
  }, [activeDrivers, managerFilter, role, searchTerm])

  const [selectedDriver, setSelectedDriver] = React.useState<TrackingDriver | null>(null)

  React.useEffect(() => {
    if (scopedDrivers.length > 0) {
      setSelectedDriver((current) =>
        current && scopedDrivers.some((driver) => driver.id === current.id)
          ? scopedDrivers.find((driver) => driver.id === current.id) ?? scopedDrivers[0]
          : scopedDrivers[0]
      )
      return
    }

    setSelectedDriver(null)
  }, [scopedDrivers])

  React.useEffect(() => {
    if (!selectedDriver?.destinationCoordinates) {
      setSelectedDriverRouteDistanceKm(null)
      return
    }

    const routeStart =
      selectedDriver.hasLiveGps && selectedDriver.coordinates
        ? selectedDriver.coordinates
        : selectedDriver.originCoordinates

    if (!routeStart) {
      setSelectedDriverRouteDistanceKm(null)
      return
    }

    let isCancelled = false

    const url = new URL('/api/maps/route', window.location.origin)
    url.searchParams.set(
      'points',
      [
        `${routeStart.lat.toFixed(6)},${routeStart.lng.toFixed(6)}`,
        `${selectedDriver.destinationCoordinates.lat.toFixed(6)},${selectedDriver.destinationCoordinates.lng.toFixed(6)}`,
      ].join(';')
    )

    void fetch(url, { cache: 'no-store' })
      .then(async (response) => {
        if (!response.ok) {
          return null
        }

        const payload = (await response.json()) as LiveRouteMetricsResponse
        return typeof payload.distanceKm === 'number' && Number.isFinite(payload.distanceKm)
          ? payload.distanceKm
          : null
      })
      .then((distanceKm) => {
        if (isCancelled) {
          return
        }

        setSelectedDriverRouteDistanceKm(distanceKm)
      })
      .catch(() => {
        if (isCancelled) {
          return
        }

        setSelectedDriverRouteDistanceKm(null)
      })

    return () => {
      isCancelled = true
    }
  }, [selectedDriver])

  const mapPreviewUrl = React.useMemo(() => getMapPreviewUrl(selectedDriver), [selectedDriver])

  const selectedDriverDistanceLeft = React.useMemo(() => {
    if (selectedDriverRouteDistanceKm !== null) {
      return `${selectedDriverRouteDistanceKm.toFixed(1)} km left`
    }

    return selectedDriver?.distanceLeft ?? null
  }, [selectedDriver, selectedDriverRouteDistanceKm])

  const handleRefresh = async () => {
    setIsRefreshing(true)
    const nextAllocations = await syncDriverAllocationsFromBackend().catch(() => null)

    if (nextAllocations) {
      setDriverAllocations(nextAllocations)
      setLastUpdatedAt(new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }))
    }

    setIsRefreshing(false)
  }

  const gpsStatusLabel = React.useMemo(() => {
    if (selectedDriver?.currentLocationUpdatedAt) {
      return `GPS updated ${getRelativeTime(selectedDriver.currentLocationUpdatedAt)}`
    }

    if (lastUpdatedAt) {
      return `Last synced ${lastUpdatedAt}`
    }

    return 'Waiting for first sync'
  }, [lastUpdatedAt, selectedDriver?.currentLocationUpdatedAt])

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
        <Button variant="outline" size="sm" onClick={() => void handleRefresh()}>
          <RefreshCw className={`mr-2 size-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </PageHeader>

      <div className="flex items-center gap-4">
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

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Truck className="size-5 text-primary" />
                {role === 'admin' || role === 'supervisor' ? 'Live Routes' : 'Tracked Units'}
              </span>
              <Badge variant="secondary">{scopedDrivers.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[500px]">
              <div className="space-y-1 p-4 pt-0">
                {scopedDrivers.map((driver) => (
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
                              style={{ width: `${driver.progress}%` }}
                            />
                          </div>
                          <span className="text-xs text-muted-foreground">{driver.progress}%</span>
                        </div>
                        <p className="mt-1 text-[10px] text-muted-foreground">
                          ETA: {driver.eta} &bull; {driver.distanceLeft}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Car className="size-5 text-primary" />
              Real-Time Route Map
            </CardTitle>
          </CardHeader>
          <CardContent>
            <>
              <div className="relative h-[400px] overflow-hidden rounded-xl border bg-background">
                <RouteMapFrame
                  title={
                    selectedDriver
                      ? `Live route map for ${selectedDriver.name}`
                      : 'Default live tracking map view'
                  }
                  origin={selectedDriver?.originCoordinates}
                  destination={selectedDriver?.destinationCoordinates}
                  focus={selectedDriver?.coordinates}
                  routeOrigin={selectedDriver?.hasLiveGps ? selectedDriver.coordinates : undefined}
                />

                <div className="absolute right-4 top-4 flex flex-col gap-2">
                  <Badge variant="secondary" className="justify-center bg-background/95">
                    {selectedDriver
                      ? selectedDriver.hasLiveGps
                        ? 'Live GPS position'
                        : 'Route fallback from dispatch data'
                      : 'Pan and zoom enabled'}
                  </Badge>
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
                    No in-transit routes are selected right now. The map stays available so you can
                    move around and zoom before a route comes in.
                  </div>
                ) : (
                  <div className="pointer-events-none absolute bottom-4 left-4 right-4">
                    <div className="rounded-lg border bg-background/95 p-4 shadow-lg backdrop-blur">
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
                      <div className="mt-4 grid grid-cols-3 gap-4 text-center">
                        <div>
                          <p className="text-xs text-muted-foreground">Progress</p>
                          <p className="font-semibold text-primary">{selectedDriver.progress}%</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">ETA</p>
                          <p className="font-semibold">{selectedDriver.eta}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Distance Left</p>
                          <p className="font-semibold">{selectedDriverDistanceLeft}</p>
                        </div>
                      </div>
                      <div className="mt-3 flex items-center justify-between gap-4 text-[11px] text-muted-foreground">
                        <span>
                          Driver position: {selectedDriver.coordinates.lat.toFixed(4)},{' '}
                          {selectedDriver.coordinates.lng.toFixed(4)}
                        </span>
                        <span className="hidden sm:inline">{gpsStatusLabel}</span>
                      </div>
                    </div>
                  </div>
                )}

                {selectedDriver?.hasLiveGps ? (
                  <div className="pointer-events-none absolute left-4 top-4 rounded-lg border bg-background/92 px-3 py-2 shadow-sm backdrop-blur">
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
                        <span className="size-2.5 rounded-full bg-[#dc2626]" />
                        <span>Live Vehicle</span>
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
                </div>
              ) : null}
            </>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
