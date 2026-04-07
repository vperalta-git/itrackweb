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

const FALLBACK_ORIGIN = { x: 25, y: 60 }
const FALLBACK_DRIVER = { x: 45, y: 48 }
const FALLBACK_DESTINATION = { x: 75, y: 30 }
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

function getMapPointPositions(driver: TrackingDriver | null) {
  if (!driver?.originCoordinates || !driver.destinationCoordinates) {
    return {
      origin: FALLBACK_ORIGIN,
      driver: FALLBACK_DRIVER,
      destination: FALLBACK_DESTINATION,
    }
  }

  const bounds = getDriverMapBounds(driver)
  const minLatitude = bounds.minLatitude
  const maxLatitude = bounds.maxLatitude
  const minLongitude = bounds.minLongitude
  const maxLongitude = bounds.maxLongitude

  const normalize = (latitude: number, longitude: number) => {
    const xRatio =
      maxLongitude === minLongitude
        ? 0.5
        : (longitude - minLongitude) / (maxLongitude - minLongitude)
    const yRatio =
      maxLatitude === minLatitude
        ? 0.5
        : 1 - (latitude - minLatitude) / (maxLatitude - minLatitude)

    return {
      x: 12 + xRatio * 76,
      y: 12 + yRatio * 76,
    }
  }

  return {
    origin: normalize(driver.originCoordinates.lat, driver.originCoordinates.lng),
    driver: normalize(driver.coordinates.lat, driver.coordinates.lng),
    destination: normalize(driver.destinationCoordinates.lat, driver.destinationCoordinates.lng),
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

function getOpenStreetMapEmbedUrl(driver: TrackingDriver | null) {
  const bounds = getDriverMapBounds(driver)
  const bbox = [
    bounds.minLongitude,
    bounds.minLatitude,
    bounds.maxLongitude,
    bounds.maxLatitude,
  ]
    .map((value) => value.toFixed(6))
    .join('%2C')

  return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik`
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
  const [statusFilter, setStatusFilter] = React.useState('all')
  const [managerFilter, setManagerFilter] = React.useState('all')

  React.useEffect(() => {
    const syncAllocations = () => {
      setDriverAllocations(loadDriverAllocations())
    }

    syncAllocations()
    void syncDriverAllocationsFromBackend()
      .then((nextAllocations) => {
        setDriverAllocations(nextAllocations)
      })
      .catch(() => {
        return null
      })

    window.addEventListener(DRIVER_ALLOCATIONS_UPDATED_EVENT, syncAllocations)

    return () => {
      window.removeEventListener(DRIVER_ALLOCATIONS_UPDATED_EVENT, syncAllocations)
    }
  }, [])

  const activeDrivers = React.useMemo(
    () =>
      driverAllocations
        .filter((allocation) =>
          ['pending', 'assigned', 'in-transit', 'available'].includes(allocation.status)
        )
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

    if (statusFilter === 'all') return searchScopedDrivers
    return searchScopedDrivers.filter((driver) => driver.status === statusFilter)
  }, [activeDrivers, managerFilter, role, searchTerm, statusFilter])

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

  const markerPositions = React.useMemo(
    () => getMapPointPositions(selectedDriver),
    [selectedDriver]
  )
  const openStreetMapUrl = React.useMemo(
    () => getOpenStreetMapEmbedUrl(selectedDriver),
    [selectedDriver]
  )
  const googleMapsUrl = React.useMemo(
    () => getGoogleMapsDirectionsUrl(selectedDriver),
    [selectedDriver]
  )

  const handleRefresh = async () => {
    const nextAllocations = await syncDriverAllocationsFromBackend().catch(() => null)
    if (nextAllocations) {
      setDriverAllocations(nextAllocations)
    }
  }

  const routeControlPoint = React.useMemo(
    () => ({
      x: (markerPositions.origin.x + markerPositions.destination.x) / 2,
      y: Math.max(Math.min(markerPositions.origin.y, markerPositions.destination.y) - 12, 8),
    }),
    [markerPositions]
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
          <RefreshCw className="mr-2 size-4" />
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
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="assigned">Assigned</SelectItem>
            <SelectItem value="in-transit">In Transit</SelectItem>
            <SelectItem value="available">Available</SelectItem>
          </SelectContent>
        </Select>
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
                {role === 'admin' || role === 'supervisor' ? 'Active Drivers' : 'Tracked Units'}
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
              <MapPin className="size-5 text-primary" />
              Location Map
            </CardTitle>
          </CardHeader>
          <CardContent>
            {scopedDrivers.length === 0 || !selectedDriver ? (
              <div className="flex h-[400px] items-center justify-center rounded-xl border border-dashed text-sm text-muted-foreground">
                No active tracked units for your allocation scope.
              </div>
            ) : (
              <>
                <div className="relative h-[400px] w-full overflow-hidden rounded-xl border bg-muted/50">
                  <iframe
                    title={`${selectedDriver.name} live trip map`}
                    src={openStreetMapUrl}
                    className="absolute inset-0 h-full w-full border-0"
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                  />

                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-background/10 via-transparent to-background/25" />

                  <div className="pointer-events-none absolute inset-0">
                    <svg
                      className="absolute inset-0 h-full w-full pointer-events-none"
                      viewBox="0 0 100 100"
                      preserveAspectRatio="none"
                    >
                      <path
                        d={`M ${markerPositions.origin.x} ${markerPositions.origin.y} Q ${routeControlPoint.x} ${routeControlPoint.y}, ${markerPositions.destination.x} ${markerPositions.destination.y}`}
                        fill="none"
                        stroke="var(--chart-1)"
                        strokeWidth="1.8"
                        strokeDasharray="4 3"
                        opacity="0.7"
                      />
                    </svg>

                    <div
                      className="absolute flex flex-col items-center"
                      style={{
                        left: `${markerPositions.origin.x}%`,
                        top: `${markerPositions.origin.y}%`,
                        transform: 'translate(-50%, -100%)',
                      }}
                    >
                      <div className="rounded-full border-2 border-muted-foreground bg-muted p-2">
                        <MapPin className="size-4 text-muted-foreground" />
                      </div>
                      <span className="mt-1 rounded bg-background px-1.5 py-0.5 text-[10px] shadow-sm">
                        Origin
                      </span>
                    </div>

                    <div
                      className="absolute flex flex-col items-center animate-pulse"
                      style={{
                        left: `${markerPositions.driver.x}%`,
                        top: `${markerPositions.driver.y}%`,
                        transform: 'translate(-50%, -100%)',
                      }}
                    >
                      <div className="rounded-full bg-primary p-2 shadow-lg">
                        <Truck className="size-5 text-primary-foreground" />
                      </div>
                      <span className="mt-1 rounded bg-primary px-2 py-0.5 text-[10px] font-medium text-primary-foreground shadow-sm">
                        {selectedDriver.name.split(' ')[0]}
                      </span>
                    </div>

                    <div
                      className="absolute flex flex-col items-center"
                      style={{
                        left: `${markerPositions.destination.x}%`,
                        top: `${markerPositions.destination.y}%`,
                        transform: 'translate(-50%, -100%)',
                      }}
                    >
                      <div className="rounded-full border-2 border-success bg-success p-2">
                        <Navigation className="size-4 text-success-foreground" />
                      </div>
                      <span className="mt-1 rounded bg-success px-1.5 py-0.5 text-[10px] text-success-foreground shadow-sm">
                        Destination
                      </span>
                    </div>
                  </div>

                  <div className="absolute right-4 top-4 flex flex-col gap-2">
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
                          Real map base via OpenStreetMap
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
