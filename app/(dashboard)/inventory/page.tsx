'use client'

import * as React from 'react'
import { Badge } from '@/components/ui/badge'
import { useNotificationRecord } from '@/hooks/use-notification-record'
import { ColumnDef, type Column } from '@tanstack/react-table'
import Link from 'next/link'
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
import { SearchableSelect } from '@/components/searchable-select'
import { AssignedAgentDisplay } from '@/components/assigned-agent-display'
import { StatusBadge } from '@/components/status-badge'
import { DataTable } from '@/components/data-table'
import { ConfirmActionDialog } from '@/components/confirm-action-dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
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
  getVisibleInventoryVehicles,
  summarizeInventory,
  syncInventoryVehiclesFromBackend,
  updateInventoryVehicleRecord,
  type InventoryVehicle as Vehicle,
} from '@/lib/inventory-data'
import { buildRolePath, getRoleFromPathname } from '@/lib/rbac'
import {
  loadUnitSetupConfig,
  subscribeToUnitSetup,
  type UnitSetupRecord,
} from '@/lib/unit-setup-data'
import { loadUsers, syncUsersFromBackend } from '@/lib/user-data'
import { toast } from 'sonner'

const initialAddVehicleForm = {
  unitName: '',
  variation: '',
  conductionNumber: '',
  bodyColor: '',
  status: '',
  notes: '',
}

const emptyEditVehicleForm = {
  unitName: '',
  variation: '',
  conductionNumber: '',
  bodyColor: '',
  status: '' as Vehicle['status'] | '',
  notes: '',
}

const bodyColorSwatches: Record<string, string> = {
  'Valencia Orange': '#d86c1f',
  'Red Spinel': '#9c2338',
  'Mercury Silver': '#b0b5bb',
  'Galena Gray': '#6b7077',
  'Onyx Black': '#1f2124',
  'Splash White': '#f7f7f2',
  'Satin White Pearl': '#f4f2eb',
  'Eiger Grey': '#7d8086',
  'Cosmic Silver': '#c0c5cc',
  'Biarritz Blue': '#2e5a8c',
  'White': '#ffffff',
}

const getBodyColorSwatch = (bodyColor: string) =>
  bodyColorSwatches[bodyColor] ?? '#cbd5e1'

type StockViewMode = 'vehicles' | 'stock-count'

type StockCountRow = {
  id: string
  unitName: string
  variation: string
  bodyColor: string
  stockCount: number
}

const normalizeStockCountValue = (value: string) => value.trim() || 'Unspecified'

function SortableColumnHeader<TData, TValue>({
  column,
  label,
}: {
  column: Column<TData, TValue>
  label: string
}) {
  return (
    <Button
      variant="ghost"
      onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
      className="h-auto w-full min-w-0 shrink justify-start gap-1 whitespace-normal px-0 py-0 text-left font-semibold leading-tight hover:bg-transparent hover:text-foreground"
    >
      <span className="min-w-0 whitespace-normal">{label}</span>
      <ArrowUpDown className="size-3.5 shrink-0" />
    </Button>
  )
}

function findUnitConfig(unitSetup: UnitSetupRecord[], unitName: string) {
  return unitSetup.find((unit) => unit.unitName === unitName) ?? null
}

function getVariationOptions(unitSetup: UnitSetupRecord[], unitName: string) {
  return findUnitConfig(unitSetup, unitName)?.variations ?? []
}

function getBodyColorOptions(
  unitSetup: UnitSetupRecord[],
  unitName: string,
  variationName: string
) {
  const variation = getVariationOptions(unitSetup, unitName).find(
    (entry) => entry.name === variationName
  )

  return variation?.bodyColors ?? []
}

function reconcileVehicleForm<
  T extends {
    unitName: string
    variation: string
    bodyColor: string
  },
>(form: T, unitSetup: UnitSetupRecord[]) {
  if (!form.unitName) return form

  const unitConfig = findUnitConfig(unitSetup, form.unitName)
  if (!unitConfig) {
    return {
      ...form,
      unitName: '',
      variation: '',
      bodyColor: '',
    }
  }

  const variationExists = unitConfig.variations.some(
    (variation) => variation.name === form.variation
  )
  if (!variationExists) {
    return {
      ...form,
      variation: '',
      bodyColor: '',
    }
  }

  const colorOptions = getBodyColorOptions(unitSetup, form.unitName, form.variation)
  if (!colorOptions.includes(form.bodyColor)) {
    return {
      ...form,
      bodyColor: '',
    }
  }

  return form
}

function InventoryPageContent() {
  const pathname = usePathname()
  const role = getRoleFromPathname(pathname)
  const [unitSetup, setUnitSetup] = React.useState<UnitSetupRecord[]>(() => loadUnitSetupConfig())
  const [vehicles, setVehicles] = React.useState<Vehicle[]>(() => loadInventoryVehicles())
  const [selectedVehicle, setSelectedVehicle] = React.useState<Vehicle | null>(null)
  const [isAddDialogOpen, setIsAddDialogOpen] = React.useState(false)
  const [isViewDetailsOpen, setIsViewDetailsOpen] = React.useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false)
  const [vehicleToDelete, setVehicleToDelete] = React.useState<Vehicle | null>(null)
  const [statusFilter, setStatusFilter] = React.useState<string>('all')
  const [modelFilter, setModelFilter] = React.useState('all')
  const [modelPage, setModelPage] = React.useState(1)
  useNotificationRecord(vehicles, (record) => { setSelectedVehicle(record); setIsViewDetailsOpen(true) })

  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const status = params.get('status')
    if (status && ['all', 'available', 'allocated', 'preparation', 'in-transit', 'released'].includes(status)) setStatusFilter(status)
    if (params.get('model')) setModelFilter(params.get('model')!)
  }, [pathname])
  const [stockViewMode, setStockViewMode] = React.useState<StockViewMode>('vehicles')
  const [addVehicleForm, setAddVehicleForm] = React.useState(initialAddVehicleForm)
  const [editVehicleForm, setEditVehicleForm] = React.useState(emptyEditVehicleForm)
  const [users, setUsers] = React.useState(() => loadUsers())
  const [isSaving, setIsSaving] = React.useState(false)
  const [loadError, setLoadError] = React.useState<string | null>(null)
  const [lastRefreshed, setLastRefreshed] = React.useState<string | null>(null)

  const refreshInventory = React.useCallback(async () => {
    try {
      setVehicles(await syncInventoryVehiclesFromBackend())
      setLoadError(null)
      setLastRefreshed(new Date().toLocaleTimeString())
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Unable to refresh vehicle stocks.')
    }
  }, [])

  React.useEffect(() => subscribeToUnitSetup(setUnitSetup), [])

  React.useEffect(() => {
    void syncUsersFromBackend().then(setUsers).catch(() => null)
  }, [])

  React.useEffect(() => {
    setAddVehicleForm((current) => reconcileVehicleForm(current, unitSetup))
    setEditVehicleForm((current) => reconcileVehicleForm(current, unitSetup))
  }, [unitSetup])

  const unitNameOptions = React.useMemo(
    () =>
      unitSetup.map((unit) => ({
        value: unit.unitName,
        keywords: unit.variations.flatMap((variation) => [
          variation.name,
          ...variation.bodyColors,
        ]),
      })),
    [unitSetup]
  )

  const variationOptions = React.useMemo(
    () => getVariationOptions(unitSetup, addVehicleForm.unitName),
    [addVehicleForm.unitName, unitSetup]
  )

  const bodyColorOptions = React.useMemo(
    () => getBodyColorOptions(unitSetup, addVehicleForm.unitName, addVehicleForm.variation),
    [addVehicleForm.unitName, addVehicleForm.variation, unitSetup]
  )

  const userAvatarByName = React.useMemo(
    () =>
      new Map(
        users.map((user) => [`${user.firstName} ${user.lastName}`.trim(), user.avatarUrl ?? ''])
      ),
    [users]
  )

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
    if (isSaving) return
    if (
      !addVehicleForm.unitName ||
      !addVehicleForm.variation ||
      addVehicleForm.conductionNumber.length < 6 ||
      !addVehicleForm.bodyColor ||
      !addVehicleForm.status
    ) {
      toast.error('Complete the required fields and enter a 6–7 character conduction number.')
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

    try {
      setIsSaving(true)
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
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to add the vehicle.')
    } finally {
      setIsSaving(false)
    }
  }

  const editVariationOptions = React.useMemo(
    () => getVariationOptions(unitSetup, editVehicleForm.unitName),
    [editVehicleForm.unitName, unitSetup]
  )

  const editBodyColorOptions = React.useMemo(
    () => getBodyColorOptions(unitSetup, editVehicleForm.unitName, editVehicleForm.variation),
    [editVehicleForm.unitName, editVehicleForm.variation, unitSetup]
  )

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
      unitName: vehicle.unitName,
      variation: vehicle.variation,
      conductionNumber: vehicle.conductionNumber,
      bodyColor: vehicle.bodyColor,
      status: vehicle.status,
      notes: vehicle.notes ?? '',
    })
    setIsEditDialogOpen(true)
  }

  const handleSaveEdit = async () => {
    if (isSaving) return
    if (!selectedVehicle) return
    if (!editVehicleForm.unitName || !editVehicleForm.variation || !editVehicleForm.bodyColor || !editVehicleForm.status) {
      toast.error('Complete the required vehicle details.')
      return
    }

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

    try {
      setIsSaving(true)
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
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to update the vehicle.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteVehicle = async () => {
    if (isSaving) return
    if (!vehicleToDelete) return

    try {
      setIsSaving(true)
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
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to delete the vehicle.')
    } finally {
      setIsSaving(false)
    }
  }

  // Column definitions
  const columns: ColumnDef<Vehicle>[] = [
    {
      accessorKey: 'unitName',
      meta: {
        headerClassName: 'w-[12%]',
        cellClassName: 'whitespace-normal break-words align-top',
      },
      header: ({ column }) => (
        <SortableColumnHeader column={column} label="Unit Name" />
      ),
      cell: ({ row }) => <span className="font-medium">{row.getValue('unitName')}</span>,
    },
    {
      accessorKey: 'conductionNumber',
      meta: {
        headerClassName: 'w-[12%]',
        cellClassName: 'whitespace-normal break-words align-top',
      },
      header: 'Conduction No.',
      cell: ({ row }) => (
        <span className="font-medium text-primary">{row.getValue('conductionNumber')}</span>
      ),
    },
    {
      accessorKey: 'bodyColor',
      meta: {
        headerClassName: 'w-[12%]',
        cellClassName: 'whitespace-normal break-words align-top',
      },
      header: 'Body Color',
      cell: ({ row }) => {
        const bodyColor = row.getValue('bodyColor') as string
        const swatchColor = getBodyColorSwatch(bodyColor)

        return (
          <div className="flex items-center gap-2">
            <span
              className="size-3 rounded-full border border-slate-300 ring-1 ring-white/95 shadow-[0_1px_2px_rgba(15,23,42,0.08),0_3px_8px_rgba(15,23,42,0.12)] dark:border-slate-500 dark:ring-slate-950/70 dark:shadow-[0_1px_2px_rgba(0,0,0,0.2),0_3px_8px_rgba(0,0,0,0.28)]"
              style={{ backgroundColor: swatchColor }}
              aria-hidden="true"
            />
            <span>{bodyColor}</span>
          </div>
        )
      },
    },
    {
      accessorKey: 'variation',
      meta: {
        headerClassName: 'w-[22%]',
        cellClassName: 'whitespace-normal break-words align-top',
      },
      header: 'Variation',
    },
    {
      accessorKey: 'assignedAgent',
      meta: {
        headerClassName: 'w-[18%]',
        cellClassName: 'whitespace-normal break-words align-top',
      },
      header: 'Assigned Agent',
      cell: ({ row }) => (
        <AssignedAgentDisplay
          agentName={row.original.assignedAgent}
          avatarUrl={userAvatarByName.get(row.original.assignedAgent) || ''}
          secondaryText={row.original.manager}
        />
      ),
    },
    {
      accessorKey: 'ageInStorage',
      meta: {
        headerClassName: 'w-[10%]',
      },
      header: ({ column }) => (
        <SortableColumnHeader column={column} label="Age (In Storage)" />
      ),
      cell: ({ row }) => `${row.getValue('ageInStorage')} days`,
    },
    {
      accessorKey: 'dateAdded',
      meta: {
        headerClassName: 'w-[10%]',
      },
      header: 'Date Added',
    },
    {
      accessorKey: 'status',
      meta: {
        headerClassName: 'w-[10%]',
      },
      header: 'Status',
      cell: ({ row }) => <StatusBadge status={row.getValue('status')} />,
      filterFn: (row, id, value) => {
        if (value === 'all') return true
        return row.getValue(id) === value
      },
    },
    {
      id: 'actions',
      meta: {
        headerClassName: 'w-[4rem]',
        cellClassName: 'whitespace-nowrap text-right',
      },
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

  const stockCountColumns: ColumnDef<StockCountRow>[] = [
    {
      accessorKey: 'unitName',
      meta: {
        headerClassName: 'w-[28%]',
        cellClassName: 'whitespace-normal break-words align-top',
      },
      header: ({ column }) => (
        <SortableColumnHeader column={column} label="Unit Name" />
      ),
      cell: ({ row }) => <span className="font-medium">{row.getValue('unitName')}</span>,
    },
    {
      accessorKey: 'variation',
      meta: {
        headerClassName: 'w-[34%]',
        cellClassName: 'whitespace-normal break-words align-top',
      },
      header: 'Variation',
    },
    {
      accessorKey: 'bodyColor',
      meta: {
        headerClassName: 'w-[24%]',
        cellClassName: 'whitespace-normal break-words align-top',
      },
      header: 'Body Color',
      cell: ({ row }) => {
        const bodyColor = row.getValue('bodyColor') as string
        const swatchColor = getBodyColorSwatch(bodyColor)

        return (
          <div className="flex items-center gap-2">
            <span
              className="size-3 rounded-full border border-slate-300 ring-1 ring-white/95 shadow-[0_1px_2px_rgba(15,23,42,0.08),0_3px_8px_rgba(15,23,42,0.12)] dark:border-slate-500 dark:ring-slate-950/70 dark:shadow-[0_1px_2px_rgba(0,0,0,0.2),0_3px_8px_rgba(0,0,0,0.28)]"
              style={{ backgroundColor: swatchColor }}
              aria-hidden="true"
            />
            <span>{bodyColor}</span>
          </div>
        )
      },
    },
    {
      accessorKey: 'stockCount',
      meta: {
        headerClassName: 'w-[14%] text-right',
        cellClassName: 'text-right align-top',
      },
      header: ({ column }) => (
        <div className="flex justify-end">
          <SortableColumnHeader column={column} label="Stock Count" />
        </div>
      ),
      cell: ({ row }) => (
        <span className="font-semibold text-primary">{row.getValue('stockCount')}</span>
      ),
    },
  ]

  const visibleVehicles = React.useMemo(
    () => getVisibleInventoryVehicles(vehicles, role), [vehicles, role]
  )
  const summary = React.useMemo(() => summarizeInventory(visibleVehicles), [visibleVehicles])
  React.useEffect(() => { setModelPage((page) => Math.min(page, Math.max(1, Math.ceil(summary.byModel.length / 12)))) }, [summary.byModel.length])
  const filteredVehicles = React.useMemo(
    () => visibleVehicles.filter((vehicle) => {
      const statusMatches = statusFilter === 'all' ? vehicle.status !== 'released'
        : statusFilter === 'allocated' ? vehicle.status !== 'released' && Boolean(vehicle.assignedAgentId)
        : statusFilter === 'preparation' ? ['in-dispatch', 'ready-for-release'].includes(vehicle.status)
        : vehicle.status === statusFilter
      return statusMatches && (modelFilter === 'all' || (vehicle.unitName.trim() || 'Unspecified') === modelFilter)
    }),
    [visibleVehicles, statusFilter, modelFilter]
  )

  const stockCountRows = React.useMemo(() => {
    const groupedRows = new Map<string, StockCountRow>()

    filteredVehicles.forEach((vehicle) => {
      const unitName = normalizeStockCountValue(vehicle.unitName)
      const variation = normalizeStockCountValue(vehicle.variation)
      const bodyColor = normalizeStockCountValue(vehicle.bodyColor)
      const key = [unitName, variation, bodyColor]
        .map((value) => value.toLocaleLowerCase())
        .join('||')

      const existingRow = groupedRows.get(key)
      if (existingRow) {
        existingRow.stockCount += 1
        return
      }

      groupedRows.set(key, {
        id: key,
        unitName,
        variation,
        bodyColor,
        stockCount: 1,
      })
    })

    return Array.from(groupedRows.values()).sort((a, b) => {
      const unitSort = a.unitName.localeCompare(b.unitName)
      if (unitSort !== 0) return unitSort

      const variationSort = a.variation.localeCompare(b.variation)
      if (variationSort !== 0) return variationSort

      return a.bodyColor.localeCompare(b.bodyColor)
    })
  }, [filteredVehicles])

  React.useEffect(() => {
    void refreshInventory()
  }, [refreshInventory])

  const handleExportPdf = () => {
    logAuditEvent({
      user: getAuditActor(role),
      action: 'EXPORT',
      module: 'Inventory',
      description: 'Exported Vehicle Stocks report.',
    })
    exportPdfReport({
      title: 'Vehicle Stocks Report',
      subtitle: `Vehicle stock listing - Status: ${statusFilter === 'all' ? 'Current Stock' : statusFilter}`,
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

  const inventoryFilterComponent = (
    <div className="flex flex-wrap items-center gap-2">
      <Filter className="size-4 text-muted-foreground" />
      <Select
        value={stockViewMode}
        onValueChange={(value) => setStockViewMode(value as StockViewMode)}
      >
        <SelectTrigger className="w-44">
          <SelectValue placeholder="Stock View" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="vehicles">Vehicle List</SelectItem>
          <SelectItem value="stock-count">Stock Count</SelectItem>
        </SelectContent>
      </Select>
      <Select value={statusFilter} onValueChange={setStatusFilter}>
        <SelectTrigger className="w-40">
          <SelectValue placeholder="All Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Current Stock</SelectItem>
          <SelectItem value="allocated">Allocated Units</SelectItem>
          <SelectItem value="preparation">All Preparation</SelectItem>
          <SelectItem value="in-stockyard">In Stockyard</SelectItem>
          <SelectItem value="available">Available</SelectItem>
          <SelectItem value="in-transit">In Transit</SelectItem>
          <SelectItem value="pending">Pending</SelectItem>
          <SelectItem value="in-dispatch">Under Preparation</SelectItem>
          <SelectItem value="ready-for-release">Ready for Release</SelectItem>
          <SelectItem value="maintenance">Maintenance</SelectItem>
          <SelectItem value="released">Released / Completed</SelectItem>
        </SelectContent>
      </Select>
    </div>
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title="Vehicle Stocks"
        description={
          role === 'sales-agent'
            ? 'Your assigned units and eligible shared stock'
            : role === 'manager'
            ? "Your team's assigned units and eligible shared stock"
            : role !== 'admin' && role !== 'supervisor'
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
            <DialogContent className="w-[98vw] max-w-7xl">
              <DialogHeader>
                <DialogTitle>Add New Vehicle</DialogTitle>
                <DialogDescription>
                  Enter the unit details below to add it to vehicle stocks.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                {unitSetup.length === 0 && (
                  <div className="rounded-2xl border border-[#f1b6bb] bg-[#fff5f5] px-4 py-3 text-sm text-[#7f0912]">
                    No dropdown options are configured yet. Set them up first in{' '}
                    <Link
                      href={buildRolePath(role, 'unit-setup')}
                      className="font-semibold underline underline-offset-2"
                    >
                      Unit Setup
                    </Link>
                    .
                  </div>
                )}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
                  <div className="space-y-2">
                    <Label htmlFor="unit-name">Unit Name</Label>
                    <SearchableSelect
                      value={addVehicleForm.unitName}
                      onValueChange={(value) =>
                        setAddVehicleForm((prev) => ({
                          ...prev,
                          unitName: value,
                          variation: '',
                          bodyColor: '',
                        }))
                      }
                      options={unitNameOptions}
                      placeholder="Select unit name"
                      searchPlaceholder="Search unit names..."
                      emptyText="No unit names configured."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="variation">Variation</Label>
                    <SearchableSelect
                      value={addVehicleForm.variation}
                      onValueChange={(value) =>
                        setAddVehicleForm((prev) => ({
                          ...prev,
                          variation: value,
                          bodyColor: '',
                        }))
                      }
                      disabled={!addVehicleForm.unitName}
                      options={variationOptions.map((variation) => ({
                        value: variation.name,
                        keywords: [
                          variation.transmission ?? '',
                          variation.drivetrain ?? '',
                          variation.bodyType ?? '',
                          ...variation.bodyColors,
                        ],
                      }))}
                      placeholder={
                        addVehicleForm.unitName ? 'Select variation' : 'Select unit name first'
                      }
                      searchPlaceholder="Search variations..."
                      emptyText="No variations available."
                      contentClassName="sm:max-w-[48rem]"
                    />
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
                    <SearchableSelect
                      value={addVehicleForm.bodyColor}
                      onValueChange={(value) =>
                        setAddVehicleForm((prev) => ({
                          ...prev,
                          bodyColor: value,
                        }))
                      }
                      disabled={!addVehicleForm.variation}
                      options={bodyColorOptions.map((bodyColor) => ({
                        value: bodyColor,
                      }))}
                      placeholder={
                        addVehicleForm.variation
                          ? 'Select body color'
                          : 'Select variation first'
                      }
                      searchPlaceholder="Search body colors..."
                      emptyText="No body colors available."
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
                    isSaving || !addVehicleForm.unitName ||
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

      {loadError && (
        <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {loadError} Displayed records may be out of date. Reload the page to retry.
        </p>
      )}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        {[
          ['Total Current Stock', summary.current, 'all'], ['Available Units', summary.available, 'available'],
          ['Allocated Units', summary.allocated, 'allocated'], ['In Transit', summary.inTransit, 'in-transit'],
          ['Under Preparation', summary.underPreparation, 'preparation'], ['Released / Completed', summary.released, 'released'],
        ].map(([label, value, filter]) => (
          <Card key={label} className={statusFilter === filter ? 'border-primary' : ''}><CardContent className="p-0"><button type="button" aria-pressed={statusFilter === filter}
            className="h-full w-full p-4 text-left transition-colors hover:bg-muted/50" onClick={() => { setStatusFilter(String(filter)); setModelFilter('all') }}>
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="mt-1 text-2xl font-semibold">{value}</p>
          </button></CardContent></Card>
        ))}
      </div>
      <div className="rounded-lg border p-4 text-sm">
        <p className="font-medium">Current Stock by Vehicle Model</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {summary.byModel.length ? summary.byModel.slice((modelPage - 1) * 12, modelPage * 12).map(({ model, count }) => (
            <button key={model} type="button" aria-pressed={modelFilter === model} className={`flex items-center justify-between gap-3 rounded-lg border p-3 text-left transition-colors hover:bg-muted/50 ${modelFilter === model ? 'border-primary bg-primary/10' : ''}`}
              onClick={() => { setModelFilter(modelFilter === model ? 'all' : model); if (statusFilter === 'released') setStatusFilter('all') }}>
              <span className="min-w-0 truncate font-medium" title={model}>{model}</span><Badge variant="secondary" className="tabular-nums">{count}</Badge>
            </button>
          )) : <span className="text-muted-foreground">No current stock in your visible records.</span>}
        </div>
        {modelFilter !== 'all' && <Button size="sm" variant="link" onClick={() => setModelFilter('all')}>Clear model filter: {modelFilter}</Button>}
        {summary.byModel.length > 12 && <div className="mt-3 flex items-center gap-3"><Button size="sm" variant="outline" disabled={modelPage === 1} onClick={() => setModelPage((page) => page - 1)}>Previous</Button><span>Page {modelPage} of {Math.ceil(summary.byModel.length / 12)}</span><Button size="sm" variant="outline" disabled={modelPage * 12 >= summary.byModel.length} onClick={() => setModelPage((page) => page + 1)}>Next</Button></div>}
        <p className="mt-3 text-xs text-muted-foreground">
          Totals cover all records visible to your account; table filters apply below. Allocated units overlap status totals.
          {lastRefreshed ? ` Last refreshed ${lastRefreshed}.` : ''}
        </p>
      </div>
      {stockViewMode === 'vehicles' ? (
        <DataTable
          columns={columns}
          data={filteredVehicles}
          paginationResetKey={`${statusFilter}:${modelFilter}`}
          tableClassName="min-w-[1180px] table-fixed"
          searchKey="conductionNumber"
          searchPlaceholder="Search by conduction number..."
          exportConfig={{
            title: 'Vehicle Stocks Report',
            subtitle: `Vehicle stock listing - Status: ${statusFilter === 'all' ? 'Current Stock' : statusFilter}`,
            filename: 'vehicle-stocks-report',
          }}
          filterComponent={inventoryFilterComponent}
        />
      ) : (
        <DataTable
          columns={stockCountColumns}
          data={stockCountRows}
          paginationResetKey={`${statusFilter}:${modelFilter}`}
          tableClassName="min-w-[760px] table-fixed"
          searchKey="unitName"
          searchPlaceholder="Search by unit name..."
          exportConfig={{
            title: 'Vehicle Stock Count Report',
            subtitle: `Grouped by unit, variation, and body color - Status: ${statusFilter === 'all' ? 'Current Stock' : statusFilter}`,
            filename: 'vehicle-stock-count-report',
          }}
          filterComponent={inventoryFilterComponent}
        />
      )}

      <Dialog open={isViewDetailsOpen} onOpenChange={setIsViewDetailsOpen}>
            <DialogContent className="w-[96vw] max-w-4xl">
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
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
              <div className="space-y-2">
                <Label>Unit Name</Label>
                <SearchableSelect
                  value={editVehicleForm.unitName}
                  onValueChange={(value) =>
                    setEditVehicleForm((prev) => ({
                      ...prev,
                      unitName: value,
                      variation: '',
                      bodyColor: '',
                    }))
                  }
                  options={unitNameOptions}
                  placeholder="Select unit name"
                  searchPlaceholder="Search unit names..."
                  emptyText="No unit names configured."
                />
              </div>
              <div className="space-y-2">
                <Label>Variation</Label>
                <SearchableSelect
                  value={editVehicleForm.variation}
                  onValueChange={(value) =>
                    setEditVehicleForm((prev) => ({ ...prev, variation: value, bodyColor: '' }))
                  }
                  disabled={!editVehicleForm.unitName}
                  options={editVariationOptions.map((variation) => ({
                    value: variation.name,
                    keywords: [
                      variation.transmission ?? '',
                      variation.drivetrain ?? '',
                      variation.bodyType ?? '',
                      ...variation.bodyColors,
                    ],
                  }))}
                  placeholder="Select variation"
                  searchPlaceholder="Search variations..."
                  emptyText="No variations available."
                  contentClassName="sm:max-w-[48rem]"
                />
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
                <SearchableSelect
                  value={editVehicleForm.bodyColor}
                  onValueChange={(value) =>
                    setEditVehicleForm((prev) => ({ ...prev, bodyColor: value }))
                  }
                  disabled={!editVehicleForm.variation}
                  options={editBodyColorOptions.map((bodyColor) => ({ value: bodyColor }))}
                  placeholder={
                    editVehicleForm.variation ? 'Select body color' : 'Select variation first'
                  }
                  searchPlaceholder="Search body colors..."
                  emptyText="No body colors available."
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

export default function InventoryPage() {
  return <React.Suspense fallback={<p className="p-4 text-sm text-muted-foreground">Loading records?</p>}><InventoryPageContent /></React.Suspense>
}
