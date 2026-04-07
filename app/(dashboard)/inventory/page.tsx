'use client'

import * as React from 'react'
import { ColumnDef } from '@tanstack/react-table'
import { usePathname } from 'next/navigation'
import {
  Plus,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  FileDown,
  ArrowUpDown,
  Filter,
} from 'lucide-react'

import { PageHeader } from '@/components/page-header'
import { StatusBadge } from '@/components/status-badge'
import { DataTable } from '@/components/data-table'
import { ConfirmActionDialog } from '@/components/confirm-action-dialog'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { getAuditActor, logAuditEvent } from '@/lib/audit-log'
import { exportPdfReport } from '@/lib/export-pdf'
import {
  createInventoryVehicleRecord,
  deleteInventoryVehicleRecord,
  loadInventoryVehicles,
  syncInventoryVehiclesFromBackend,
  updateInventoryVehicleRecord,
  type InventoryVehicle as Vehicle,
} from '@/lib/inventory-data'
import { getRoleFromPathname } from '@/lib/rbac'
import {
  getScopedRoleData,
  matchesScopedAgent,
  matchesScopedManager,
} from '@/lib/role-scope'
import { toast } from 'sonner'

const unitVariationOptions = {
  'mu-X': ['LS-E 4x2 AT', 'RZ4E 4x2 AT', 'LS-A 4x4 AT'],
  'D-Max': ['LT 4x2 AT', 'LS 4x4 MT', 'LS 4x2 AT'],
  Traviz: ['L Utility Van', 'S Cab & Chassis'],
  Crosswind: ['XT', 'XUV'],
  NLR: ['4-Wheeler Aluminum Van', '4-Wheeler Dropside'],
  NMR: ['4-Wheeler Dropside', '4-Wheeler Cab & Chassis'],
  NPR: ['6-Wheeler', '6-Wheeler Aluminum Van'],
  NQR: ['Dropside', 'Van Body'],
} as const

type UnitName = keyof typeof unitVariationOptions

const initialAddVehicleForm = {
  unitName: '' as UnitName | '',
  variation: '',
  conductionNumber: '',
  bodyColor: '',
  status: '',
  notes: '',
}

const emptyEditVehicleForm = {
  unitName: '' as UnitName | '',
  variation: '',
  conductionNumber: '',
  bodyColor: '',
  status: '' as Vehicle['status'] | '',
  notes: '',
}

export default function InventoryPage() {
  const pathname = usePathname()
  const role = getRoleFromPathname(pathname)
  const scope = getScopedRoleData(role)
  const [vehicles, setVehicles] = React.useState<Vehicle[]>(() => loadInventoryVehicles())
  const [selectedVehicle, setSelectedVehicle] = React.useState<Vehicle | null>(null)
  const [isAddDialogOpen, setIsAddDialogOpen] = React.useState(false)
  const [isViewDetailsOpen, setIsViewDetailsOpen] = React.useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false)
  const [vehicleToDelete, setVehicleToDelete] = React.useState<Vehicle | null>(null)
  const [statusFilter, setStatusFilter] = React.useState<string>('all')
  const [addVehicleForm, setAddVehicleForm] = React.useState(initialAddVehicleForm)
  const [editVehicleForm, setEditVehicleForm] = React.useState(emptyEditVehicleForm)

  const variationOptions = addVehicleForm.unitName
    ? unitVariationOptions[addVehicleForm.unitName]
    : []

  const handleConductionNumberChange = (value: string) => {
    const sanitized = value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 7)
    setAddVehicleForm((prev) => ({ ...prev, conductionNumber: sanitized }))
  }

  const handleAddDialogChange = (open: boolean) => {
    setIsAddDialogOpen(open)
    if (!open) {
      setAddVehicleForm(initialAddVehicleForm)
    }
  }

  const handleAddVehicle = async () => {
    if (
      !addVehicleForm.unitName ||
      !addVehicleForm.variation ||
      addVehicleForm.conductionNumber.length < 6 ||
      !addVehicleForm.bodyColor ||
      !addVehicleForm.status
    ) {
      return
    }

    const normalizedConductionNumber = addVehicleForm.conductionNumber.trim().toUpperCase()
    const conductionNumberExists = vehicles.some(
      (vehicle) => vehicle.conductionNumber === normalizedConductionNumber
    )

    if (conductionNumberExists) {
      toast.error('Conduction number already exists in vehicle stocks.')
      return
    }

    const nextVehicles = await createInventoryVehicleRecord({
      unitName: addVehicleForm.unitName,
      variation: addVehicleForm.variation,
      conductionNumber: normalizedConductionNumber,
      bodyColor: addVehicleForm.bodyColor.trim(),
      status: addVehicleForm.status as Vehicle['status'],
      notes: addVehicleForm.notes.trim(),
    })

    setVehicles(nextVehicles)
    handleAddDialogChange(false)
    logAuditEvent({
      user: getAuditActor(role),
      action: 'CREATE',
      module: 'Inventory',
      description: `Added vehicle ${normalizedConductionNumber} (${addVehicleForm.unitName} ${addVehicleForm.variation}).`,
    })
    toast.success('Vehicle added to stocks.')
  }

  const editVariationOptions = editVehicleForm.unitName
    ? unitVariationOptions[editVehicleForm.unitName]
    : []

  const handleEditDialogChange = (open: boolean) => {
    setIsEditDialogOpen(open)
    if (!open) {
      setEditVehicleForm(emptyEditVehicleForm)
      setSelectedVehicle(null)
    }
  }

  const handleOpenEdit = (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle)
    setEditVehicleForm({
      unitName: vehicle.unitName as UnitName,
      variation: vehicle.variation,
      conductionNumber: vehicle.conductionNumber,
      bodyColor: vehicle.bodyColor,
      status: vehicle.status,
      notes: vehicle.notes ?? '',
    })
    setIsEditDialogOpen(true)
  }

  const handleSaveEdit = async () => {
    if (!selectedVehicle) return
    if (!editVehicleForm.unitName || !editVehicleForm.status) return

    const normalizedConductionNumber = editVehicleForm.conductionNumber.trim().toUpperCase()
    const conductionNumberExists = vehicles.some(
      (vehicle) =>
        vehicle.id !== selectedVehicle.id &&
        vehicle.conductionNumber === normalizedConductionNumber
    )

    if (conductionNumberExists) {
      toast.error('Conduction number already exists in vehicle stocks.')
      return
    }

    const nextVehicles = await updateInventoryVehicleRecord(selectedVehicle.id, {
      unitName: editVehicleForm.unitName,
      variation: editVehicleForm.variation,
      conductionNumber: normalizedConductionNumber,
      bodyColor: editVehicleForm.bodyColor.trim(),
      status: editVehicleForm.status,
      notes: editVehicleForm.notes.trim(),
    })

    const updatedVehicle =
      nextVehicles.find((vehicle) => vehicle.id === selectedVehicle.id) ?? null

    setVehicles(nextVehicles)
    setSelectedVehicle(updatedVehicle)

    handleEditDialogChange(false)
    logAuditEvent({
      user: getAuditActor(role),
      action: 'UPDATE',
      module: 'Inventory',
      description: `Updated vehicle ${updatedVehicle?.conductionNumber ?? normalizedConductionNumber}.`,
    })
    toast.success('Vehicle details updated.')
  }

  const handleDeleteVehicle = async () => {
    if (!vehicleToDelete) return

    const nextVehicles = await deleteInventoryVehicleRecord(vehicleToDelete.id)
    setVehicles(nextVehicles)

    if (selectedVehicle?.id === vehicleToDelete.id) {
      setSelectedVehicle(null)
      setIsViewDetailsOpen(false)
      setIsEditDialogOpen(false)
    }

    logAuditEvent({
      user: getAuditActor(role),
      action: 'DELETE',
      module: 'Inventory',
      description: `Deleted vehicle ${vehicleToDelete.conductionNumber} from stocks.`,
    })
    toast.success('Vehicle deleted from stocks.')
    setVehicleToDelete(null)
  }

  // Column definitions
  const columns: ColumnDef<Vehicle>[] = [
    {
      accessorKey: 'unitName',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="-ml-4"
        >
          Unit Name
          <ArrowUpDown className="ml-2 size-4" />
        </Button>
      ),
      cell: ({ row }) => <span className="font-medium">{row.getValue('unitName')}</span>,
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
      accessorKey: 'assignedAgent',
      header: 'Assigned Agent',
      cell: ({ row }) => (
        <div>
          <span className="font-medium">{row.getValue('assignedAgent')}</span>
          <p className="text-xs text-muted-foreground">{row.original.manager}</p>
        </div>
      ),
    },
    {
      accessorKey: 'ageInStorage',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="-ml-4"
        >
          Age (In Storage)
          <ArrowUpDown className="ml-2 size-4" />
        </Button>
      ),
      cell: ({ row }) => `${row.getValue('ageInStorage')} days`,
    },
    {
      accessorKey: 'dateAdded',
      header: 'Date Added',
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
        const vehicle = row.original

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
                  setSelectedVehicle(vehicle)
                  setIsViewDetailsOpen(true)
                }}
              >
                <Eye className="mr-2 size-4" />
                View Details
              </DropdownMenuItem>
              {(role === 'admin' || role === 'supervisor') && (
                <>
                  <DropdownMenuItem onClick={() => handleOpenEdit(vehicle)}>
                    <Edit className="mr-2 size-4" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive"
                    onClick={() => setVehicleToDelete(vehicle)}
                  >
                    <Trash2 className="mr-2 size-4" />
                    Delete
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    },
  ]

  // Filter data based on status
  const filteredVehicles = React.useMemo(() => {
    if (role === 'sales-agent' || role === 'manager') {
      const sharedVisibleVehicles = vehicles.filter((vehicle) => {
        const isVisibleStatus =
          vehicle.status === 'in-stockyard' || vehicle.status === 'available'

        const isAllocatedToAnotherAgent =
          role === 'sales-agent'
            ? vehicle.assignedAgent !== 'Unassigned' &&
              vehicle.assignedAgent !== scope.agentName
            : vehicle.assignedAgent !== 'Unassigned' &&
              !scope.agentNames.includes(vehicle.assignedAgent)

        return isVisibleStatus && !isAllocatedToAnotherAgent
      })

      if (statusFilter === 'all') return sharedVisibleVehicles
      return sharedVisibleVehicles.filter((vehicle) => vehicle.status === statusFilter)
    }

    const scopedVehicles = vehicles.filter(
      (vehicle) =>
        matchesScopedAgent(role, vehicle.assignedAgent) &&
        matchesScopedManager(role, vehicle.manager)
    )

    if (statusFilter === 'all') return scopedVehicles
    return scopedVehicles.filter((v) => v.status === statusFilter)
  }, [role, scope.agentName, scope.agentNames, vehicles, statusFilter])

  React.useEffect(() => {
    let isMounted = true

    const loadBackendVehicles = async () => {
      try {
        const nextVehicles = await syncInventoryVehiclesFromBackend()
        if (isMounted) {
          setVehicles(nextVehicles)
        }
      } catch {
        return
      }
    }

    void loadBackendVehicles()

    return () => {
      isMounted = false
    }
  }, [])

  const handleExportPdf = () => {
    logAuditEvent({
      user: getAuditActor(role),
      action: 'EXPORT',
      module: 'Inventory',
      description: 'Exported Vehicle Stocks report.',
    })
    exportPdfReport({
      title: 'Vehicle Stocks Report',
      subtitle: 'Current vehicle stock listing',
      filename: 'vehicle-stocks-report',
      columns: [
        { header: 'Unit Name', value: (row) => row.unitName },
        { header: 'Conduction Number', value: (row) => row.conductionNumber },
        { header: 'Body Color', value: (row) => row.bodyColor },
        { header: 'Variation', value: (row) => row.variation },
        { header: 'Age (In Storage)', value: (row) => `${row.ageInStorage} days` },
        { header: 'Date Added', value: (row) => row.dateAdded },
        { header: 'Status', value: (row) => row.status },
      ],
      rows: filteredVehicles,
    })
  }

  const handleExportSelectedVehicle = () => {
    if (!selectedVehicle) return

    logAuditEvent({
      user: getAuditActor(role),
      action: 'EXPORT',
      module: 'Inventory',
      description: `Exported vehicle details for ${selectedVehicle.conductionNumber}.`,
    })
    exportPdfReport({
      title: `Vehicle Details ${selectedVehicle.conductionNumber}`,
      subtitle: `${selectedVehicle.unitName} ${selectedVehicle.variation}`,
      filename: `vehicle-${selectedVehicle.conductionNumber.toLowerCase()}`,
      columns: [
        { header: 'Unit Name', value: (row) => row.unitName },
        { header: 'Conduction Number', value: (row) => row.conductionNumber },
        { header: 'Body Color', value: (row) => row.bodyColor },
        { header: 'Variation', value: (row) => row.variation },
        { header: 'Assigned Agent', value: (row) => row.assignedAgent },
        { header: 'Manager', value: (row) => row.manager },
        { header: 'Age In Storage', value: (row) => `${row.ageInStorage} days` },
        { header: 'Date Added', value: (row) => row.dateAdded },
        { header: 'Status', value: (row) => row.status },
        { header: 'Notes', value: (row) => row.notes || '-' },
      ],
      rows: [selectedVehicle],
    })
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Vehicle Stocks"
        description={
          role === 'sales-agent'
            ? 'View-only stock list for available and stockyard units not reserved by other agents'
            : role === 'manager'
            ? 'View-only stock list for available and stockyard units not reserved by agents outside your team'
            : role !== 'admin'
            ? 'View-only inventory for your allocated units'
            : 'Manage your vehicle inventory'
        }
      >
        {(role === 'admin' || role === 'supervisor') && (
          <Dialog open={isAddDialogOpen} onOpenChange={handleAddDialogChange}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="mr-2 size-4" />
                Add Vehicle
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Add New Vehicle</DialogTitle>
                <DialogDescription>
                  Enter the unit details below to add it to vehicle stocks.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="unit-name">Unit Name</Label>
                    <Select
                      value={addVehicleForm.unitName}
                      onValueChange={(value) =>
                        setAddVehicleForm((prev) => ({
                          ...prev,
                          unitName: value as UnitName,
                          variation: '',
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select unit name" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.keys(unitVariationOptions).map((unitName) => (
                          <SelectItem key={unitName} value={unitName}>
                            {unitName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="variation">Variation</Label>
                    <Select
                      value={addVehicleForm.variation}
                      onValueChange={(value) =>
                        setAddVehicleForm((prev) => ({ ...prev, variation: value }))
                      }
                      disabled={!addVehicleForm.unitName}
                    >
                      <SelectTrigger>
                        <SelectValue
                          placeholder={
                            addVehicleForm.unitName
                              ? 'Select variation'
                              : 'Select unit name first'
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {variationOptions.map((variation) => (
                          <SelectItem key={variation} value={variation}>
                            {variation}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="conduction-number">Conduction Number</Label>
                    <Input
                      id="conduction-number"
                      value={addVehicleForm.conductionNumber}
                      onChange={(e) => handleConductionNumberChange(e.target.value)}
                      minLength={6}
                      maxLength={7}
                      placeholder="ABC1234"
                    />
                    <p className="text-xs text-muted-foreground">
                      6 to 7 characters, uppercase letters and numbers only.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="body-color">Body Color</Label>
                    <Input
                      id="body-color"
                      placeholder="Enter body color"
                      value={addVehicleForm.bodyColor}
                      onChange={(e) =>
                        setAddVehicleForm((prev) => ({
                          ...prev,
                          bodyColor: e.target.value,
                        }))
                      }
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="vehicle-status">Status</Label>
                    <Select
                      value={addVehicleForm.status}
                      onValueChange={(value) =>
                        setAddVehicleForm((prev) => ({ ...prev, status: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="available">Available</SelectItem>
                        <SelectItem value="in-stockyard">In Stockyard</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    placeholder="Additional notes..."
                    value={addVehicleForm.notes}
                    onChange={(e) =>
                      setAddVehicleForm((prev) => ({ ...prev, notes: e.target.value }))
                    }
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => handleAddDialogChange(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleAddVehicle}
                  disabled={
                    !addVehicleForm.unitName ||
                    !addVehicleForm.variation ||
                    addVehicleForm.conductionNumber.length < 6 ||
                    !addVehicleForm.bodyColor ||
                    !addVehicleForm.status
                  }
                >
                  Add Vehicle
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </PageHeader>

      <DataTable
        columns={columns}
        data={filteredVehicles}
        searchKey="conductionNumber"
        searchPlaceholder="Search by conduction number..."
        exportConfig={{
          title: 'Vehicle Stocks Report',
          subtitle: 'Current vehicle stock listing',
          filename: 'vehicle-stocks-report',
        }}
        filterComponent={
          <div className="flex items-center gap-2">
            <Filter className="size-4 text-muted-foreground" />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="in-stockyard">In Stockyard</SelectItem>
                <SelectItem value="available">Available</SelectItem>
                {(role === 'admin' || role === 'supervisor') && (
                  <>
                    <SelectItem value="in-transit">In Transit</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="in-dispatch">In Dispatch</SelectItem>
                    <SelectItem value="released">Released</SelectItem>
                  </>
                )}
              </SelectContent>
            </Select>
          </div>
        }
      />

      <Dialog open={isViewDetailsOpen} onOpenChange={setIsViewDetailsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Vehicle Details</DialogTitle>
            <DialogDescription>
              Complete information about the selected vehicle.
            </DialogDescription>
          </DialogHeader>
          {selectedVehicle && (
            <div className="mt-6 space-y-6">
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold text-primary">
                  {selectedVehicle.conductionNumber}
                </span>
                <StatusBadge status={selectedVehicle.status} />
              </div>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-sm text-muted-foreground">Unit Name</span>
                    <p className="font-medium">{selectedVehicle.unitName}</p>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">Variation</span>
                    <p className="font-medium">{selectedVehicle.variation}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-sm text-muted-foreground">Body Color</span>
                    <p className="font-medium">{selectedVehicle.bodyColor}</p>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">Age in Storage</span>
                    <p className="font-medium">{selectedVehicle.ageInStorage} days</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-sm text-muted-foreground">Date Added</span>
                    <p className="font-medium">{selectedVehicle.dateAdded}</p>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">Status</span>
                    <p className="font-medium">
                      <StatusBadge status={selectedVehicle.status} />
                    </p>
                  </div>
                </div>
                {selectedVehicle.notes && (
                  <div>
                    <span className="text-sm text-muted-foreground">Notes</span>
                    <p className="font-medium">{selectedVehicle.notes}</p>
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-4 border-t">
                {(role === 'admin' || role === 'supervisor') && (
                  <Button
                    className="flex-1"
                    onClick={() => {
                      setIsViewDetailsOpen(false)
                      handleOpenEdit(selectedVehicle)
                    }}
                  >
                  <Edit className="mr-2 size-4" />
                  Edit
                  </Button>
                )}
                <Button variant="outline" onClick={handleExportSelectedVehicle}>
                  <FileDown className="mr-2 size-4" />
                  Export
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isEditDialogOpen} onOpenChange={handleEditDialogChange}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Vehicle</DialogTitle>
            <DialogDescription>
              Update the selected vehicle details.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Unit Name</Label>
                <Select
                  value={editVehicleForm.unitName}
                  onValueChange={(value) =>
                    setEditVehicleForm((prev) => ({
                      ...prev,
                      unitName: value as UnitName,
                      variation: '',
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select unit name" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.keys(unitVariationOptions).map((unitName) => (
                      <SelectItem key={unitName} value={unitName}>
                        {unitName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Variation</Label>
                <Select
                  value={editVehicleForm.variation}
                  onValueChange={(value) =>
                    setEditVehicleForm((prev) => ({ ...prev, variation: value }))
                  }
                  disabled={!editVehicleForm.unitName}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select variation" />
                  </SelectTrigger>
                  <SelectContent>
                    {editVariationOptions.map((variation) => (
                      <SelectItem key={variation} value={variation}>
                        {variation}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Conduction Number</Label>
                <Input
                  value={editVehicleForm.conductionNumber}
                  onChange={(e) =>
                    setEditVehicleForm((prev) => ({
                      ...prev,
                      conductionNumber: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 7),
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Body Color</Label>
                <Input
                  value={editVehicleForm.bodyColor}
                  onChange={(e) =>
                    setEditVehicleForm((prev) => ({ ...prev, bodyColor: e.target.value }))
                  }
                />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={editVehicleForm.status}
                  onValueChange={(value) =>
                    setEditVehicleForm((prev) => ({
                      ...prev,
                      status: value as Vehicle['status'],
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="available">Available</SelectItem>
                    <SelectItem value="in-stockyard">In Stockyard</SelectItem>
                    <SelectItem value="in-transit">In Transit</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="in-dispatch">In Dispatch</SelectItem>
                    <SelectItem value="released">Released</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={editVehicleForm.notes}
                onChange={(e) =>
                  setEditVehicleForm((prev) => ({ ...prev, notes: e.target.value }))
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => handleEditDialogChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveEdit}
              disabled={
                !editVehicleForm.unitName ||
                !editVehicleForm.variation ||
                editVehicleForm.conductionNumber.length < 6 ||
                !editVehicleForm.bodyColor ||
                !editVehicleForm.status
              }
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmActionDialog
        open={Boolean(vehicleToDelete)}
        onOpenChange={(open) => {
          if (!open) setVehicleToDelete(null)
        }}
        title="Delete Vehicle"
        description={
          vehicleToDelete
            ? `Delete ${vehicleToDelete.conductionNumber} from vehicle stocks? This action cannot be undone.`
            : ''
        }
        confirmLabel="Delete"
        onConfirm={handleDeleteVehicle}
      />
    </div>
  )
}
