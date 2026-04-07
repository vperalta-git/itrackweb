'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { ColumnDef } from '@tanstack/react-table'
import {
  Plus,
  MoreHorizontal,
  Eye,
  MapPin,
  FileDown,
  Pencil,
  ArrowUpDown,
  Filter,
  Phone,
  Truck,
} from 'lucide-react'

import { DataTable } from '@/components/data-table'
import { PageHeader } from '@/components/page-header'
import { StatusBadge } from '@/components/status-badge'
import { ConfirmActionDialog } from '@/components/confirm-action-dialog'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { getAuditActor, logAuditEvent } from '@/lib/audit-log'
import {
  createDriverAllocationRecord,
  deleteDriverAllocationRecord,
  DriverAllocationRecord,
  loadDriverAllocations,
  syncDriverAllocationsFromBackend,
  updateDriverAllocationRecord,
} from '@/lib/driver-allocation-data'
import {
  INVENTORY_UPDATED_EVENT,
  InventoryVehicle,
  loadInventoryVehicles,
  syncInventoryVehiclesFromBackend,
} from '@/lib/inventory-data'
import { buildRolePath, getRoleFromPathname } from '@/lib/rbac'
import { exportPdfReport } from '@/lib/export-pdf'
import { matchesScopedAgent, matchesScopedManager } from '@/lib/role-scope'
import { loadUsers, syncUsersFromBackend, SystemUser, USERS_UPDATED_EVENT } from '@/lib/user-data'
import { toast } from 'sonner'

type DriverAllocation = DriverAllocationRecord

const initialAssignmentForm = {
  unitId: '',
  driverId: '',
  pickupLocation: '',
  destination: '',
}

const locationSuggestions = [
  'Isuzu Laguna Stockyard',
  'Isuzu Pasig',
  'Customer Location, Quezon City',
  'Customer Location, Mandaluyong',
  'Customer Location, Pasig',
  'Ready for agent turnover',
] as const

function normalizeInventoryStatus(status: string) {
  return status.trim().toLowerCase().replace(/\s+/g, '-')
}

export default function DriverAllocationPage() {
  const router = useRouter()
  const pathname = usePathname()
  const role = getRoleFromPathname(pathname)
  const [inventoryVehicles, setInventoryVehicles] = React.useState<InventoryVehicle[]>(
    loadInventoryVehicles()
  )
  const [users, setUsers] = React.useState<SystemUser[]>(loadUsers())
  const [allocations, setAllocations] = React.useState<DriverAllocation[]>(loadDriverAllocations())
  const [selectedAllocation, setSelectedAllocation] = React.useState<DriverAllocation | null>(null)
  const [isNewAllocationOpen, setIsNewAllocationOpen] = React.useState(false)
  const [isViewDetailsOpen, setIsViewDetailsOpen] = React.useState(false)
  const [statusFilter, setStatusFilter] = React.useState<string>('all')
  const [managerFilter, setManagerFilter] = React.useState<string>('all')
  const [assignmentForm, setAssignmentForm] = React.useState(initialAssignmentForm)
  const [assignmentBeingEdited, setAssignmentBeingEdited] =
    React.useState<DriverAllocation | null>(null)
  const [allocationToCancel, setAllocationToCancel] =
    React.useState<DriverAllocation | null>(null)

  React.useEffect(() => {
    if (role === 'sales-agent' || role === 'manager') {
      router.replace(buildRolePath(role, 'allocation/drivers/tracking'))
    }
  }, [role, router])

  React.useEffect(() => {
    const syncInventory = () => {
      setInventoryVehicles(loadInventoryVehicles())
    }

    syncInventory()
    void syncInventoryVehiclesFromBackend()
      .then((nextVehicles) => {
        setInventoryVehicles(nextVehicles)
      })
      .catch(() => {
        return null
      })
    window.addEventListener(INVENTORY_UPDATED_EVENT, syncInventory)

    return () => {
      window.removeEventListener(INVENTORY_UPDATED_EVENT, syncInventory)
    }
  }, [])

  React.useEffect(() => {
    const syncUsers = () => {
      setUsers(loadUsers())
    }

    syncUsers()
    void syncUsersFromBackend()
      .then((nextUsers) => {
        setUsers(nextUsers)
      })
      .catch(() => {
        return null
      })
    window.addEventListener(USERS_UPDATED_EVENT, syncUsers)

    return () => {
      window.removeEventListener(USERS_UPDATED_EVENT, syncUsers)
    }
  }, [])

  React.useEffect(() => {
    let isMounted = true

    const loadBackendAllocations = async () => {
      try {
        const nextAllocations = await syncDriverAllocationsFromBackend()
        if (isMounted) {
          setAllocations(nextAllocations)
        }
      } catch {
        return
      }
    }

    void loadBackendAllocations()

    return () => {
      isMounted = false
    }
  }, [])

  const handleAssignmentDialogChange = (open: boolean) => {
    setIsNewAllocationOpen(open)
    if (!open) {
      setAssignmentForm(initialAssignmentForm)
      setAssignmentBeingEdited(null)
    }
  }

  const allocatedConductionNumbers = React.useMemo(
    () =>
      new Set(
        allocations
          .filter(
            (allocation) =>
              allocation.id !== assignmentBeingEdited?.id &&
              allocation.status !== 'cancelled'
          )
          .map((allocation) => allocation.conductionNumber)
      ),
    [allocations, assignmentBeingEdited]
  )

  const selectableUnits = React.useMemo(
    () =>
      inventoryVehicles.filter(
        (vehicle) =>
          (vehicle.conductionNumber === assignmentBeingEdited?.conductionNumber ||
            normalizeInventoryStatus(vehicle.status) === 'in-stockyard') &&
          !allocatedConductionNumbers.has(vehicle.conductionNumber)
      ),
    [allocatedConductionNumbers, assignmentBeingEdited, inventoryVehicles]
  )

  const unavailableDriverNames = React.useMemo(
    () =>
      new Set(
        allocations
          .filter(
            (allocation) =>
              allocation.id !== assignmentBeingEdited?.id &&
              (allocation.status === 'pending' || allocation.status === 'in-transit')
          )
          .map((allocation) => allocation.assignedDriver)
      ),
    [allocations, assignmentBeingEdited]
  )

  const drivers = React.useMemo(
    () =>
      users
        .filter((user) => user.role === 'driver' && user.status === 'active')
        .map((user) => ({
          id: user.id,
          name: `${user.firstName} ${user.lastName}`.trim(),
          phone: user.phone,
        })),
    [users]
  )

  const selectableDrivers = React.useMemo(
    () =>
      drivers.filter((driver) => !unavailableDriverNames.has(driver.name)),
    [unavailableDriverNames]
  )

  const openEditAssignment = (allocation: DriverAllocation) => {
    const unitMatch = inventoryVehicles.find(
      (vehicle) => vehicle.conductionNumber === allocation.conductionNumber
    )
    const driverMatch = drivers.find(
      (driver) => driver.id === allocation.driverId || driver.name === allocation.assignedDriver
    )

    setAssignmentBeingEdited(allocation)
    setAssignmentForm({
      unitId: unitMatch?.id ?? '',
      driverId: driverMatch?.id ?? '',
      pickupLocation: allocation.pickupLocation,
      destination: allocation.destination,
    })
    setIsNewAllocationOpen(true)
  }

  const createAssignment = async () => {
    const selectedUnit = inventoryVehicles.find((vehicle) => vehicle.id === assignmentForm.unitId)
    const selectedDriver = drivers.find((driver) => driver.id === assignmentForm.driverId)

    if (
      !selectedUnit ||
      !selectedDriver ||
      !assignmentForm.pickupLocation.trim() ||
      !assignmentForm.destination.trim()
    ) {
      return
    }

    try {
      if (assignmentBeingEdited) {
        const nextAllocations = await updateDriverAllocationRecord(assignmentBeingEdited.id, {
          managerId: null,
          vehicleId: selectedUnit.id,
          driverId: selectedDriver.id,
          pickupLocation: assignmentForm.pickupLocation.trim(),
          destination: assignmentForm.destination.trim(),
          status: assignmentBeingEdited.status,
        })

        const updatedAllocation =
          nextAllocations.find((allocation) => allocation.id === assignmentBeingEdited.id) ?? null

        setAllocations(nextAllocations)
        setSelectedAllocation(updatedAllocation)
        handleAssignmentDialogChange(false)
        logAuditEvent({
          user: getAuditActor(role),
          action: 'UPDATE',
          module: 'Allocation',
          description: `Updated driver allocation ${selectedUnit.conductionNumber} for ${selectedDriver.name}.`,
        })
        toast.success('Driver assignment updated.')
        return
      }

      const nextAllocations = await createDriverAllocationRecord({
        managerId: null,
        vehicleId: selectedUnit.id,
        driverId: selectedDriver.id,
        pickupLocation: assignmentForm.pickupLocation.trim(),
        destination: assignmentForm.destination.trim(),
      })

      setAllocations(nextAllocations)
      handleAssignmentDialogChange(false)
      logAuditEvent({
        user: getAuditActor(role),
        action: 'CREATE',
        module: 'Allocation',
        description: `Created driver allocation ${selectedUnit.conductionNumber} for ${selectedDriver.name}.`,
      })
      toast.success('Driver assignment created and sent to the driver for acceptance.')
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Unable to save the driver assignment right now.'
      )
    }
  }

  const handleCancelAllocation = async () => {
    if (!allocationToCancel) return

    const nextAllocations = await deleteDriverAllocationRecord(allocationToCancel.id)
    setAllocations(nextAllocations)
    setSelectedAllocation((current) =>
      current?.id === allocationToCancel.id ? null : current
    )
    setIsViewDetailsOpen(false)
    logAuditEvent({
      user: getAuditActor(role),
      action: 'DELETE',
      module: 'Allocation',
      description: `Cancelled driver allocation ${allocationToCancel.conductionNumber}.`,
    })
    setAllocationToCancel(null)
    toast.success('Driver allocation cancelled.')
  }

  const columns: ColumnDef<DriverAllocation>[] = [
    {
      accessorKey: 'date',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="-ml-4"
        >
          Date
          <ArrowUpDown className="ml-2 size-4" />
        </Button>
      ),
    },
    {
      accessorKey: 'unitName',
      header: 'Unit Name',
    },
    {
      accessorKey: 'conductionNumber',
      header: 'Conduction Number',
      cell: ({ row }) => (
        <span className="font-medium text-primary">{row.getValue('conductionNumber')}</span>
      ),
    },
    {
      accessorKey: 'bodyColor',
      header: 'Body Color',
    },
    {
      accessorKey: 'variation',
      header: 'Variation',
    },
    {
      accessorKey: 'salesAgent',
      header: 'Sales Agent',
      cell: ({ row }) => (
        <div>
          <span className="font-medium">{row.getValue('salesAgent')}</span>
          <p className="text-xs text-muted-foreground">{row.original.manager}</p>
        </div>
      ),
    },
    {
      accessorKey: 'assignedDriver',
      header: 'Assigned Driver',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Avatar className="size-7">
            <AvatarFallback className="bg-primary/10 text-[10px] text-primary">
              {(row.getValue('assignedDriver') as string)
                .split(' ')
                .map((name) => name[0])
                .join('')}
            </AvatarFallback>
          </Avatar>
          <div>
            <span className="font-medium">{row.getValue('assignedDriver')}</span>
            <p className="text-xs text-muted-foreground">{row.original.driverPhone}</p>
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => <StatusBadge status={row.getValue('status')} />,
      filterFn: (row, id, value) => {
        if (value === 'all') return true
        return row.getValue(id) === value
      },
    },
    {
      id: 'actions',
      enableHiding: false,
      cell: ({ row }) => {
        const allocation = row.original

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="size-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => {
                  setSelectedAllocation(allocation)
                  setIsViewDetailsOpen(true)
                }}
              >
                <Eye className="mr-2 size-4" />
                View Details
              </DropdownMenuItem>
              {allocation.status === 'pending' && (
                <DropdownMenuItem onClick={() => openEditAssignment(allocation)}>
                  <Pencil className="mr-2 size-4" />
                  Edit Assignment
                </DropdownMenuItem>
              )}
              {allocation.status === 'in-transit' && (
                <DropdownMenuItem asChild>
                  <Link href={buildRolePath(role, 'allocation/drivers/tracking')}>
                    <MapPin className="mr-2 size-4" />
                    Track Location
                  </Link>
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              {allocation.status === 'pending' && (
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={() => setAllocationToCancel(allocation)}
                >
                  Cancel Allocation
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    },
  ]

  const filteredAllocations = React.useMemo(() => {
    const scopedAllocations = allocations.filter(
      (allocation) =>
        matchesScopedAgent(role, allocation.salesAgent) &&
        matchesScopedManager(role, allocation.manager)
    )

    const managerScopedAllocations =
      managerFilter === 'all'
        ? scopedAllocations
        : scopedAllocations.filter((allocation) => allocation.manager === managerFilter)

    if (statusFilter === 'all') return managerScopedAllocations
    return managerScopedAllocations.filter((allocation) => allocation.status === statusFilter)
  }, [allocations, managerFilter, role, statusFilter])

  const availableManagers = React.useMemo(
    () => Array.from(new Set(allocations.map((allocation) => allocation.manager))),
    [allocations]
  )

  const handleExportPdf = () => {
    logAuditEvent({
      user: getAuditActor(role),
      action: 'EXPORT',
      module: 'Allocation',
      description: 'Exported Driver Allocation report.',
    })
    exportPdfReport({
      title: 'Driver Allocation Report',
      subtitle:
        statusFilter === 'all'
          ? 'All driver allocations'
          : `Status: ${statusFilter}`,
      filename: 'driver-allocation-report',
      columns: [
        { header: 'Date', value: (row) => row.date },
        { header: 'Unit Name', value: (row) => row.unitName },
        { header: 'Conduction Number', value: (row) => row.conductionNumber },
        { header: 'Body Color', value: (row) => row.bodyColor },
        { header: 'Variation', value: (row) => row.variation },
        { header: 'Assigned Driver', value: (row) => row.assignedDriver },
        { header: 'Driver Phone', value: (row) => row.driverPhone },
        { header: 'Pickup Location', value: (row) => row.pickupLocation },
        { header: 'Destination', value: (row) => row.destination },
        { header: 'Status', value: (row) => row.status },
      ],
      rows: filteredAllocations,
    })
  }

  const handleExportSelectedAllocation = () => {
    if (!selectedAllocation) return

    logAuditEvent({
      user: getAuditActor(role),
      action: 'EXPORT',
      module: 'Allocation',
      description: `Exported driver allocation ${selectedAllocation.conductionNumber}.`,
    })
    exportPdfReport({
      title: `Driver Allocation ${selectedAllocation.conductionNumber}`,
      subtitle: `${selectedAllocation.unitName} • ${selectedAllocation.assignedDriver}`,
      filename: `driver-allocation-${selectedAllocation.conductionNumber.toLowerCase()}`,
      columns: [
        { header: 'Date', value: (row) => row.date },
        { header: 'Unit Name', value: (row) => row.unitName },
        { header: 'Conduction Number', value: (row) => row.conductionNumber },
        { header: 'Body Color', value: (row) => row.bodyColor },
        { header: 'Variation', value: (row) => row.variation },
        { header: 'Sales Agent', value: (row) => row.salesAgent },
        { header: 'Manager', value: (row) => row.manager },
        { header: 'Assigned Driver', value: (row) => row.assignedDriver },
        { header: 'Driver Phone', value: (row) => row.driverPhone },
        { header: 'Pickup Location', value: (row) => row.pickupLocation },
        { header: 'Destination', value: (row) => row.destination },
        { header: 'Status', value: (row) => row.status },
      ],
      rows: [selectedAllocation],
    })
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Driver Allocation"
        description="Manage assigned drivers for released or in-transit units"
      >
        <Button variant="outline" size="sm" asChild>
          <Link href={buildRolePath(role, 'allocation/drivers/tracking')}>
            <MapPin className="mr-2 size-4" />
            Live Tracking
          </Link>
        </Button>
        <Dialog open={isNewAllocationOpen} onOpenChange={handleAssignmentDialogChange}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="mr-2 size-4" />
                New Assignment
              </Button>
            </DialogTrigger>
          <DialogContent className="w-[96vw] max-w-[96vw] sm:!max-w-[1500px]">
            <DialogHeader>
              <DialogTitle>
                {assignmentBeingEdited ? 'Edit Driver Assignment' : 'New Driver Assignment'}
              </DialogTitle>
              <DialogDescription>
                {assignmentBeingEdited
                  ? 'Update the assigned unit and driver while the request is still pending.'
                  : 'Assign a driver to an eligible vehicle unit. New assignments are sent ASAP and stay pending until the driver accepts in mobile.'}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-6 py-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Select Unit</Label>
                  <Select
                    value={assignmentForm.unitId}
                    onValueChange={(value) =>
                      setAssignmentForm((current) => ({ ...current, unitId: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a unit" />
                    </SelectTrigger>
                    <SelectContent>
                      {selectableUnits.length > 0 ? (
                        selectableUnits.map((unit) => (
                          <SelectItem key={unit.id} value={unit.id}>
                            {unit.conductionNumber} - {unit.unitName} {unit.variation}
                          </SelectItem>
                        ))
                      ) : (
                        <div className="px-2 py-3 text-sm text-muted-foreground">
                          No stockyard units available.
                        </div>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Select Driver</Label>
                  <Select
                    value={assignmentForm.driverId}
                    onValueChange={(value) =>
                      setAssignmentForm((current) => ({ ...current, driverId: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a driver" />
                    </SelectTrigger>
                    <SelectContent>
                      {selectableDrivers.length > 0 ? (
                        selectableDrivers.map((driver) => (
                          <SelectItem key={driver.id} value={driver.id}>
                            {driver.name}
                          </SelectItem>
                        ))
                      ) : (
                        <div className="px-2 py-3 text-sm text-muted-foreground">
                          No active drivers available.
                        </div>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
                <div className="space-y-4">
                  <div className="rounded-xl border bg-muted/20 p-4">
                    <div className="mb-3 flex flex-wrap gap-2">
                      {locationSuggestions.slice(0, 2).map((location) => (
                        <Button
                          key={`pickup-${location}`}
                          type="button"
                          variant={
                            assignmentForm.pickupLocation === location ? 'default' : 'outline'
                          }
                          size="sm"
                          onClick={() =>
                            setAssignmentForm((current) => ({
                              ...current,
                              pickupLocation: location,
                            }))
                          }
                        >
                          {location.replace('Isuzu ', '').replace(' Stockyard', '')}
                        </Button>
                      ))}
                    </div>
                    <div className="space-y-2">
                      <Label>Pickup Location</Label>
                      <Input
                        list="pickup-location-options"
                        placeholder="Search pickup location"
                        value={assignmentForm.pickupLocation}
                        onChange={(event) =>
                          setAssignmentForm((current) => ({
                            ...current,
                            pickupLocation: event.target.value,
                          }))
                        }
                      />
                    </div>
                  </div>

                  <div className="rounded-xl border bg-muted/20 p-4">
                    <div className="mb-3 flex flex-wrap gap-2">
                      {locationSuggestions.slice(0, 2).map((location) => (
                        <Button
                          key={`destination-${location}`}
                          type="button"
                          variant={
                            assignmentForm.destination === location ? 'default' : 'outline'
                          }
                          size="sm"
                          onClick={() =>
                            setAssignmentForm((current) => ({
                              ...current,
                              destination: location,
                            }))
                          }
                        >
                          {location.replace('Isuzu ', '').replace(' Stockyard', '')}
                        </Button>
                      ))}
                    </div>
                    <div className="space-y-2">
                      <Label>Drop-off Destination</Label>
                      <Input
                        list="destination-location-options"
                        placeholder="Search destination"
                        value={assignmentForm.destination}
                        onChange={(event) =>
                          setAssignmentForm((current) => ({
                            ...current,
                            destination: event.target.value,
                          }))
                        }
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Route Preview</Label>
                  <div className="flex h-full min-h-[290px] flex-col rounded-xl border bg-muted/10 p-4">
                    {assignmentForm.pickupLocation && assignmentForm.destination ? (
                      <>
                        <div className="relative flex-1 overflow-hidden rounded-xl border bg-[linear-gradient(rgba(191,10,26,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(191,10,26,0.05)_1px,transparent_1px)] bg-[size:22px_22px]">
                          <svg className="absolute inset-0 h-full w-full">
                            <path
                              d="M 20% 75% Q 45% 55%, 80% 28%"
                              fill="none"
                              stroke="var(--primary)"
                              strokeWidth="3"
                              strokeDasharray="10 6"
                              opacity="0.8"
                            />
                          </svg>
                          <div className="absolute left-[18%] top-[72%] flex -translate-x-1/2 -translate-y-1/2 items-center gap-2 rounded-full bg-background px-3 py-1.5 shadow-sm">
                            <div className="size-2 rounded-full bg-primary" />
                            <span className="text-xs font-medium">Point A</span>
                          </div>
                          <div className="absolute left-[80%] top-[28%] flex -translate-x-1/2 -translate-y-1/2 items-center gap-2 rounded-full bg-background px-3 py-1.5 shadow-sm">
                            <div className="size-2 rounded-full bg-success" />
                            <span className="text-xs font-medium">Point B</span>
                          </div>
                        </div>
                        <div className="mt-4 space-y-2 rounded-lg border bg-background p-3 text-sm">
                          <p>
                            <span className="font-semibold text-primary">Pickup:</span>{' '}
                            {assignmentForm.pickupLocation}
                          </p>
                          <p>
                            <span className="font-semibold text-primary">Destination:</span>{' '}
                            {assignmentForm.destination}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Route preview placeholder only. Point-to-point directions API will be integrated later.
                          </p>
                        </div>
                      </>
                    ) : (
                      <div className="flex flex-1 items-center justify-center rounded-xl border border-dashed text-center text-sm text-muted-foreground">
                        Select pickup and drop-off locations to preview the route.
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <datalist id="pickup-location-options">
                {locationSuggestions.map((location) => (
                  <option key={`pickup-option-${location}`} value={location} />
                ))}
              </datalist>
              <datalist id="destination-location-options">
                {locationSuggestions.map((location) => (
                  <option key={`destination-option-${location}`} value={location} />
                ))}
              </datalist>

              <div className="rounded-lg border border-dashed px-4 py-3 text-sm text-muted-foreground">
                The assignment will be dispatched immediately after saving. Driver status starts as <span className="font-medium text-foreground">Pending</span> until the driver accepts on mobile.
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => handleAssignmentDialogChange(false)}>
                Cancel
              </Button>
              <Button
                onClick={createAssignment}
                disabled={
                  !assignmentForm.unitId ||
                  !assignmentForm.driverId ||
                  !assignmentForm.pickupLocation.trim() ||
                  !assignmentForm.destination.trim()
                }
              >
                {assignmentBeingEdited ? 'Save Changes' : 'Create Assignment'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Truck className="size-4" />
              In Transit
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-info">
              {allocations.filter((allocation) => allocation.status === 'in-transit').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pending Dispatch
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">
              {allocations.filter((allocation) => allocation.status === 'pending').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Completed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">
              {allocations.filter((allocation) => allocation.status === 'completed').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Drivers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{drivers.length}</div>
          </CardContent>
        </Card>
      </div>

      <DataTable
        columns={columns}
        data={filteredAllocations}
        searchKey="conductionNumber"
        searchPlaceholder="Search by conduction number..."
        exportConfig={{
          title: 'Driver Allocation Report',
          subtitle: 'Driver allocation listing',
          filename: 'driver-allocation-report',
        }}
        filterComponent={
          <div className="flex items-center gap-2">
            <Filter className="size-4 text-muted-foreground" />
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
        }
      />

      <Dialog open={isViewDetailsOpen} onOpenChange={setIsViewDetailsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Assignment Details</DialogTitle>
            <DialogDescription>
              Complete information about this driver assignment.
            </DialogDescription>
          </DialogHeader>
          {selectedAllocation && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <span className="text-xl font-bold text-primary">
                  {selectedAllocation.conductionNumber}
                </span>
                <StatusBadge status={selectedAllocation.status} />
              </div>

              <div className="space-y-4">
                <div className="rounded-lg bg-muted/50 p-4">
                  <h4 className="mb-3 text-sm font-medium">Unit Information</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Date</span>
                      <span className="font-medium">{selectedAllocation.date}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Unit Name</span>
                      <span className="font-medium">{selectedAllocation.unitName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Conduction Number</span>
                      <span className="font-medium">{selectedAllocation.conductionNumber}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Body Color</span>
                      <span className="font-medium">{selectedAllocation.bodyColor}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Variation</span>
                      <span className="font-medium">{selectedAllocation.variation}</span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-sm text-muted-foreground">Pickup</span>
                      <span className="text-right font-medium">{selectedAllocation.pickupLocation}</span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-sm text-muted-foreground">Destination</span>
                      <span className="text-right font-medium">{selectedAllocation.destination}</span>
                    </div>
                  </div>
                </div>

                <div className="rounded-lg bg-muted/50 p-4">
                  <h4 className="mb-3 text-sm font-medium">Driver Information</h4>
                  <div className="flex items-center gap-3">
                    <Avatar className="size-10">
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {selectedAllocation.assignedDriver
                          .split(' ')
                          .map((name) => name[0])
                          .join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{selectedAllocation.assignedDriver}</p>
                      <p className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Phone className="size-3" />
                        {selectedAllocation.driverPhone}
                      </p>
                    </div>
                  </div>
                  <p className="mt-4 text-xs text-muted-foreground">
                    Live tracking becomes available to admin, supervisor, the assigned sales agent,
                    and that agent&apos;s manager once the driver accepts this assignment in mobile.
                  </p>
                </div>
              </div>

              <div className="flex gap-2 border-t pt-4">
                {selectedAllocation.status === 'pending' && (
                  <Button
                    className="flex-1"
                    onClick={() => {
                      setIsViewDetailsOpen(false)
                      openEditAssignment(selectedAllocation)
                    }}
                  >
                    <Pencil className="mr-2 size-4" />
                    Edit Assignment
                  </Button>
                )}
                {selectedAllocation.status === 'in-transit' && (
                  <Button className="flex-1" asChild>
                    <Link href={buildRolePath(role, 'allocation/drivers/tracking')}>
                      <MapPin className="mr-2 size-4" />
                      Track Location
                    </Link>
                  </Button>
                )}
                <Button variant="outline" onClick={handleExportSelectedAllocation}>
                  <FileDown className="mr-2 size-4" />
                  Export
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmActionDialog
        open={Boolean(allocationToCancel)}
        onOpenChange={(open) => {
          if (!open) setAllocationToCancel(null)
        }}
        title="Cancel Driver Allocation"
        description={
          allocationToCancel
            ? `Cancel driver allocation for ${allocationToCancel.conductionNumber}? This will remove the assignment from the table.`
            : ''
        }
        confirmLabel="Cancel Allocation"
        onConfirm={handleCancelAllocation}
      />
    </div>
  )
}
