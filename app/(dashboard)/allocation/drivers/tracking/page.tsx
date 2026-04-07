'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  ArrowLeft,
  Filter,
  MapPin,
  Navigation,
  ExternalLink,
  RefreshCw,
  Truck,
  LocateFixed,
} from 'lucide-react'

import { PageHeader } from '@/components/page-header'
import { StatusBadge } from '@/components/status-badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { buildRolePath, getRoleFromPathname } from '@/lib/rbac'
import { matchesScopedAgent, matchesScopedManager } from '@/lib/role-scope'
import { hasDirectionsApiKey, resolveRoutePolyline, type MapPoint } from '@/lib/map-routes'
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
}

const DEFAULT_MAP_BOUNDS = {
  minLatitude: 14.49,
  maxLatitude: 14.66,
  minLongitude: 120.95,
  maxLongitude: 121.15,
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
  }
}

function getDriverMapBounds(driver: TrackingDriver | null) {
  if (!driver) {
    return DEFAULT_MAP_BOUNDS
  }

  const points = [
    driver.originCoordinates,
    driver.destinationCoordinates,
    driver.coordinates,
  ].filter(Boolean) as Array<{ lat: number; lng: number }>

  if (!points.length) {
    return DEFAULT_MAP_BOUNDS
  }

  const latitudes = points.map((point) => point.lat)
  const longitudes = points.map((point) => point.lng)
  const minLatitude = Math.min(...latitudes)
  const maxLatitude = Math.max(...latitudes)
  const minLongitude = Math.min(...longitudes)
  const maxLongitude = Math.max(...longitudes)
  const latitudePadding = Math.max((maxLatitude - minLatitude) * 0.35, 0.02)
  const longitudePadding = Math.max((maxLongitude - minLongitude) * 0.35, 0.02)

  return {
    minLatitude: minLatitude - latitudePadding,
    maxLatitude: maxLatitude + latitudePadding,
    minLongitude: minLongitude - longitudePadding,
    maxLongitude: maxLongitude + longitudePadding,
  }
}

function projectPoint(
  point: { lat: number; lng: number },
  bounds: ReturnType<typeof getDriverMapBounds>
) {
  const latitudeRange = Math.max(bounds.maxLatitude - bounds.minLatitude, 0.0001)
  const longitudeRange = Math.max(bounds.maxLongitude - bounds.minLongitude, 0.0001)

  const x = ((point.lng - bounds.minLongitude) / longitudeRange) * 100
  const y = (1 - (point.lat - bounds.minLatitude) / latitudeRange) * 100

  return {
    x: Math.min(Math.max(x, 8), 92),
    y: Math.min(Math.max(y, 8), 92),
  }
}

function getGoogleMapsDirectionsUrl(driver: TrackingDriver | null) {
  if (!driver) {
    return 'https://www.google.com/maps'
  }

  const origin = driver.status === 'in-transit' ? driver.coordinates : driver.originCoordinates
  const destination = driver.destinationCoordinates

  if (!origin || !destination) {
    return `https://www.google.com/maps/search/?api=1&query=${driver.coordinates.lat},${driver.coordinates.lng}`
  }

  return `https://www.google.com/maps/dir/?api=1&origin=${origin.lat},${origin.lng}&destination=${destination.lat},${destination.lng}&travelmode=driving`
}

export default function LiveTrackingPage() {
  const pathname = usePathname()
  const role = getRoleFromPathname(pathname)
  const [driverAllocations, setDriverAllocations] = React.useState<DriverAllocationRecord[]>(
    loadDriverAllocations()
  )
  const [searchTerm, setSearchTerm] = React.useState('')
  const [managerFilter, setManagerFilter] = React.useState('all')
  const [routePolyline, setRoutePolyline] = React.useState<MapPoint[]>([])
  const [isRefreshing, setIsRefreshing] = React.useState(false)
  const [lastUpdatedAt, setLastUpdatedAt] = React.useState<string | null>(null)

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
      .catch(() => {
        return null
      })

    const pollingInterval = window.setInterval(() => {
      void syncDriverAllocationsFromBackend()
        .then((nextAllocations) => {
          setDriverAllocations(nextAllocations)
          setLastUpdatedAt(
            new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
          )
        })
        .catch(() => {
          return null
        })
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

    const searchScopedDrivers = managerScopedDrivers.filter((driver) =>
      [driver.name, driver.vehicle, driver.stockNumber, driver.salesAgent, driver.manager]
        .join(' ')
        .toLowerCase()
        .includes(searchTerm.trim().toLowerCase())
    )

    return searchScopedDrivers
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
    let isActive = true

    const resolveRoute = async () => {
      if (!selectedDriver?.destinationCoordinates) {
        if (isActive) {
          setRoutePolyline([])
        }
        return
      }

      const routePoints = [selectedDriver.coordinates, selectedDriver.destinationCoordinates]
      const resolvedRoute = await resolveRoutePolyline(routePoints)

      if (!isActive) {
        return
      }

      setRoutePolyline(resolvedRoute && resolvedRoute.length >= 2 ? resolvedRoute : routePoints)
    }

    void resolveRoute()

    return () => {
      isActive = false
    }
  }, [selectedDriver])

  const googleMapsUrl = React.useMemo(
    () => getGoogleMapsDirectionsUrl(selectedDriver),
    [selectedDriver]
  )

  const handleRefresh = async () => {
    setIsRefreshing(true)
    const nextAllocations = await syncDriverAllocationsFromBackend().catch(() => null)
    if (nextAllocations && nextAllocations.length >= 0) {
      setDriverAllocations(nextAllocations)
      setLastUpdatedAt(new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }))
    }
    setIsRefreshing(false)
  }

  const mapBounds = React.useMemo(() => getDriverMapBounds(selectedDriver), [selectedDriver])
  const originPosition = React.useMemo(
    () =>
      selectedDriver?.originCoordinates
        ? projectPoint(selectedDriver.originCoordinates, mapBounds)
        : null,
    [mapBounds, selectedDriver]
  )
  const driverPosition = React.useMemo(
    () => (selectedDriver ? projectPoint(selectedDriver.coordinates, mapBounds) : null),
    [mapBounds, selectedDriver]
  )
  const destinationPosition = React.useMemo(
    () =>
      selectedDriver?.destinationCoordinates
        ? projectPoint(selectedDriver.destinationCoordinates, mapBounds)
        : null,
    [mapBounds, selectedDriver]
  )
  const routePath = React.useMemo(
    () =>
      routePolyline.length >= 2
        ? routePolyline
            .map((point) => {
              const position = projectPoint(point, mapBounds)
              return `${position.x},${position.y}`
            })
            .join(' ')
        : '',
    [mapBounds, routePolyline]
  )

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
              <LocateFixed className="size-5 text-primary" />
              Real-Time Route Map
            </CardTitle>
          </CardHeader>
          <CardContent>
            {scopedDrivers.length === 0 || !selectedDriver ? (
              <div className="flex h-[400px] items-center justify-center rounded-xl border border-dashed text-sm text-muted-foreground">
                No in-transit routes for your allocation scope.
              </div>
            ) : (
              <>
                <div className="relative h-[400px] w-full overflow-hidden rounded-xl border bg-[radial-gradient(circle_at_top,rgba(239,68,68,0.08),transparent_38%),linear-gradient(180deg,rgba(255,255,255,0.96),rgba(248,250,252,0.98))]">
                  <div className="absolute inset-0 opacity-60">
                    <div className="absolute inset-x-0 top-[20%] h-px bg-border/80" />
                    <div className="absolute inset-x-0 top-[40%] h-px bg-border/70" />
                    <div className="absolute inset-x-0 top-[60%] h-px bg-border/70" />
                    <div className="absolute inset-x-0 top-[80%] h-px bg-border/80" />
                    <div className="absolute inset-y-0 left-[20%] w-px bg-border/70" />
                    <div className="absolute inset-y-0 left-[40%] w-px bg-border/60" />
                    <div className="absolute inset-y-0 left-[60%] w-px bg-border/60" />
                    <div className="absolute inset-y-0 left-[80%] w-px bg-border/70" />
                  </div>

                  <svg
                    className="absolute inset-0 h-full w-full"
                    viewBox="0 0 100 100"
                    preserveAspectRatio="none"
                  >
                    {routePath ? (
                      <polyline
                        points={routePath}
                        fill="none"
                        stroke="var(--color-info)"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        opacity="0.9"
                      />
                    ) : null}
                    {routePath ? (
                      <polyline
                        points={routePath}
                        fill="none"
                        stroke="var(--color-primary)"
                        strokeWidth="0.7"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeDasharray="2.5 2.5"
                        opacity="0.95"
                      />
                    ) : null}
                  </svg>

                  {originPosition ? (
                    <div
                      className="absolute flex flex-col items-center"
                      style={{
                        left: `${originPosition.x}%`,
                        top: `${originPosition.y}%`,
                        transform: 'translate(-50%, -100%)',
                      }}
                    >
                      <div className="rounded-full border-2 border-muted-foreground bg-background p-2 shadow-sm">
                        <MapPin className="size-4 text-muted-foreground" />
                      </div>
                      <span className="mt-1 rounded bg-background px-1.5 py-0.5 text-[10px] shadow-sm">
                        Pickup
                      </span>
                    </div>
                  ) : null}

                  {driverPosition ? (
                    <div
                      className="absolute flex flex-col items-center animate-pulse"
                      style={{
                        left: `${driverPosition.x}%`,
                        top: `${driverPosition.y}%`,
                        transform: 'translate(-50%, -100%)',
                      }}
                    >
                      <div className="rounded-full bg-primary p-2 shadow-lg ring-4 ring-primary/15">
                        <Truck className="size-5 text-primary-foreground" />
                      </div>
                      <span className="mt-1 rounded bg-primary px-2 py-0.5 text-[10px] font-medium text-primary-foreground shadow-sm">
                        {selectedDriver.name.split(' ')[0]}
                      </span>
                    </div>
                  ) : null}

                  {destinationPosition ? (
                    <div
                      className="absolute flex flex-col items-center"
                      style={{
                        left: `${destinationPosition.x}%`,
                        top: `${destinationPosition.y}%`,
                        transform: 'translate(-50%, -100%)',
                      }}
                    >
                      <div className="rounded-full border-2 border-success bg-success p-2 shadow-sm">
                        <Navigation className="size-4 text-success-foreground" />
                      </div>
                      <span className="mt-1 rounded bg-success px-1.5 py-0.5 text-[10px] text-success-foreground shadow-sm">
                        Destination
                      </span>
                    </div>
                  ) : null}

                  <div className="absolute right-4 top-4 flex flex-col gap-2">
                    <Badge variant="secondary" className="justify-center bg-background/95">
                      {hasDirectionsApiKey() ? 'Google Directions route' : 'OSRM fallback route'}
                    </Badge>
                    <Button variant="outline" size="sm" className="bg-background/95" asChild>
                      <a
                        href={googleMapsUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <ExternalLink className="mr-2 size-4" />
                        Open in Maps
                      </a>
                    </Button>
                  </div>

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
                          <p className="font-semibold">{selectedDriver.distanceLeft}</p>
                        </div>
                      </div>
                      <div className="mt-3 flex items-center justify-between gap-4 text-[11px] text-muted-foreground">
                        <span>
                          Driver position: {selectedDriver.coordinates.lat.toFixed(4)},{' '}
                          {selectedDriver.coordinates.lng.toFixed(4)}
                        </span>
                        <span className="hidden sm:inline">
                          {lastUpdatedAt ? `Last synced ${lastUpdatedAt}` : 'Waiting for first sync'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

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
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
