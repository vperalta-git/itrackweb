'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  ArrowLeft,
  MapPin,
  Navigation,
  Truck,
  RefreshCw,
  Filter,
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
  loadDriverAllocations,
} from '@/lib/driver-allocation-data'

function mapAllocationToTrackingDriver(allocation: DriverAllocationRecord) {
  const vehicleLabel = `${allocation.unitName} ${allocation.variation}`.trim()

  if (allocation.status === 'pending') {
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
      progress: 0,
      eta: 'Awaiting driver acceptance',
      distanceLeft: 'Not started',
      coordinates: { lat: 14.575, lng: 121.085 },
    }
  }

  if (allocation.status === 'available') {
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
      progress: 100,
      eta: 'On site',
      distanceLeft: 'At Isuzu Pasig',
      coordinates: { lat: 14.575, lng: 121.085 },
    }
  }

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
    progress: 65,
    eta: '18 mins',
    distanceLeft: '2 km left',
    coordinates: { lat: 14.5547, lng: 121.0244 },
  }
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
  const [lastRefresh, setLastRefresh] = React.useState(new Date())

  React.useEffect(() => {
    const syncAllocations = () => {
      setDriverAllocations(loadDriverAllocations())
    }

    syncAllocations()
    window.addEventListener(DRIVER_ALLOCATIONS_UPDATED_EVENT, syncAllocations)

    return () => {
      window.removeEventListener(DRIVER_ALLOCATIONS_UPDATED_EVENT, syncAllocations)
    }
  }, [])

  const activeDrivers = React.useMemo(
    () =>
      driverAllocations
        .filter((allocation) =>
          ['pending', 'in-transit', 'available'].includes(allocation.status)
        )
        .map(mapAllocationToTrackingDriver),
    [driverAllocations]
  )

  const availableManagers = React.useMemo(
    () => Array.from(new Set(activeDrivers.map((driver) => driver.manager))),
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
  }, [managerFilter, role, searchTerm, statusFilter])

  const [selectedDriver, setSelectedDriver] = React.useState<(typeof activeDrivers)[number] | null>(null)

  React.useEffect(() => {
    if (scopedDrivers.length > 0) {
      setSelectedDriver(scopedDrivers[0])
      return
    }
    setSelectedDriver(null)
  }, [scopedDrivers])

  const handleRefresh = () => {
    setLastRefresh(new Date())
  }

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
              role === 'admin' || role === 'supervisor'
                ? 'allocation/drivers'
                : 'dashboard'
            )}
          >
            <ArrowLeft className="mr-2 size-4" />
            {role === 'admin' || role === 'supervisor'
              ? 'Back to Allocations'
              : 'Back to Dashboard'}
          </Link>
        </Button>
        <Button variant="outline" size="sm" onClick={handleRefresh}>
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
        {/* Active Drivers List */}
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
                    className={`w-full text-left p-4 rounded-lg transition-colors ${
                      selectedDriver?.id === driver.id
                        ? 'bg-primary/10 border border-primary/20'
                        : 'hover:bg-muted/50'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <Avatar className="size-10">
                        <AvatarFallback className="bg-primary/10 text-primary text-sm">
                          {driver.name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="font-medium truncate">{driver.name}</p>
                          <StatusBadge status={driver.status} />
                        </div>
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                          {driver.vehicle}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                            <div
                              className="h-full bg-primary rounded-full transition-all"
                              style={{ width: `${driver.progress}%` }}
                            />
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {driver.progress}%
                          </span>
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-1">
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

        {/* Map Area */}
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
            {/* Placeholder Map */}
            <div className="relative w-full h-[400px] rounded-xl bg-muted/50 overflow-hidden border">
              {/* Map placeholder with grid pattern */}
              <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.03)_1px,transparent_1px)] bg-[size:20px_20px]" />
              
              {/* Mock Map Markers */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="relative w-full h-full">
                  {/* Origin Marker */}
                  <div
                    className="absolute flex flex-col items-center"
                    style={{ left: '25%', top: '60%', transform: 'translate(-50%, -100%)' }}
                  >
                    <div className="p-2 rounded-full bg-muted border-2 border-muted-foreground">
                      <MapPin className="size-4 text-muted-foreground" />
                    </div>
                    <span className="text-[10px] mt-1 bg-background px-1.5 py-0.5 rounded shadow-sm">
                      Origin
                    </span>
                  </div>

                  {/* Driver Marker (animated) */}
                  <div
                    className="absolute flex flex-col items-center animate-pulse"
                    style={{ 
                      left: `${25 + (selectedDriver.progress * 0.5)}%`, 
                      top: `${60 - (selectedDriver.progress * 0.2)}%`, 
                      transform: 'translate(-50%, -100%)' 
                    }}
                  >
                    <div className="p-2 rounded-full bg-primary shadow-lg">
                      <Truck className="size-5 text-primary-foreground" />
                    </div>
                    <span className="text-[10px] mt-1 bg-primary text-primary-foreground px-2 py-0.5 rounded shadow-sm font-medium">
                      {selectedDriver.name.split(' ')[0]}
                    </span>
                  </div>

                  {/* Destination Marker */}
                  <div
                    className="absolute flex flex-col items-center"
                    style={{ left: '75%', top: '30%', transform: 'translate(-50%, -100%)' }}
                  >
                    <div className="p-2 rounded-full bg-success border-2 border-success">
                      <Navigation className="size-4 text-success-foreground" />
                    </div>
                    <span className="text-[10px] mt-1 bg-success text-success-foreground px-1.5 py-0.5 rounded shadow-sm">
                      Destination
                    </span>
                  </div>

                  {/* Route line */}
                  <svg className="absolute inset-0 w-full h-full pointer-events-none">
                    <path
                      d="M 25% 60% Q 50% 45%, 75% 30%"
                      fill="none"
                      stroke="var(--chart-1)"
                      strokeWidth="2"
                      strokeDasharray="8 4"
                      opacity="0.5"
                    />
                  </svg>
                </div>
              </div>

              {/* Map Controls Placeholder */}
              <div className="absolute top-4 right-4 flex flex-col gap-2">
                <Button variant="outline" size="icon" className="size-8 bg-background">
                  +
                </Button>
                <Button variant="outline" size="icon" className="size-8 bg-background">
                  -
                </Button>
              </div>

              {/* Info overlay */}
              <div className="absolute bottom-4 left-4 right-4">
                <div className="bg-background/95 backdrop-blur rounded-lg p-4 shadow-lg border">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <Avatar className="size-10">
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {selectedDriver.name.split(' ').map(n => n[0]).join('')}
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
                </div>
              </div>
            </div>

            {/* Route Details */}
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="p-4 rounded-lg bg-muted/50">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                  <MapPin className="size-4" />
                  From
                </div>
                <p className="font-medium">{selectedDriver.origin}</p>
              </div>
              <div className="p-4 rounded-lg bg-muted/50">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
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
