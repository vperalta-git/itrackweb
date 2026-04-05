'use client'

import * as React from 'react'
import { ColumnDef } from '@tanstack/react-table'
import { usePathname } from 'next/navigation'
import {
  Plus,
  MoreHorizontal,
  Eye,
  UserPlus,
  FileDown,
  ArrowUpDown,
  Filter,
} from 'lucide-react'

import { DataTable } from '@/components/data-table'
import { PageHeader } from '@/components/page-header'
import { ConfirmActionDialog } from '@/components/confirm-action-dialog'
import { Button } from '@/components/ui/button'
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
import { exportPdfReport } from '@/lib/export-pdf'
import { getAuditActor, logAuditEvent } from '@/lib/audit-log'
import { getRoleFromPathname } from '@/lib/rbac'
import { toast } from 'sonner'

interface AgentAllocation {
  id: string
  unitName: string
  conductionNumber: string
  bodyColor: string
  variation: string
  assignedTo: string
  manager: string
}

const mockAllocations: AgentAllocation[] = [
  {
    id: '1',
    unitName: 'mu-X',
    conductionNumber: 'ABC1234',
    bodyColor: 'Silky White Pearl',
    variation: 'LS-E 4x2 AT',
    assignedTo: 'Juan Dela Cruz',
    manager: 'Maria Santos',
  },
  {
    id: '2',
    unitName: 'mu-X',
    conductionNumber: 'REL7744',
    bodyColor: 'Cosmic Black',
    variation: 'LS-A 4x4 AT',
    assignedTo: 'Anna Lim',
    manager: 'Maria Santos',
  },
  {
    id: '3',
    unitName: 'D-Max',
    conductionNumber: 'TRN5566',
    bodyColor: 'Obsidian Gray',
    variation: 'LS 4x4 MT',
    assignedTo: 'Pedro Reyes',
    manager: 'Carlos Garcia',
  },
  {
    id: '4',
    unitName: 'Traviz',
    conductionNumber: 'STK4401',
    bodyColor: 'Splash White',
    variation: 'L Utility Van',
    assignedTo: 'Mike Santos',
    manager: 'Carlos Garcia',
  },
]

const availableUnits = [
  {
    id: '1',
    unitName: 'mu-X',
    conductionNumber: 'ABC1234',
    bodyColor: 'Silky White Pearl',
    variation: 'LS-E 4x2 AT',
    status: 'available',
  },
  {
    id: '2',
    unitName: 'mu-X',
    conductionNumber: 'REL7744',
    bodyColor: 'Cosmic Black',
    variation: 'LS-A 4x4 AT',
    status: 'released',
  },
  {
    id: '3',
    unitName: 'D-Max',
    conductionNumber: 'TRN5566',
    bodyColor: 'Obsidian Gray',
    variation: 'LS 4x4 MT',
    status: 'pending',
  },
  {
    id: '4',
    unitName: 'Traviz',
    conductionNumber: 'STK4401',
    bodyColor: 'Splash White',
    variation: 'L Utility Van',
    status: 'in-stockyard',
  },
]

const managerOptions = ['All Managers', 'Maria Santos', 'Carlos Garcia'] as const

const agentsByManager: Record<string, string[]> = {
  'Maria Santos': ['Juan Dela Cruz', 'Anna Lim', 'Robert Mendoza'],
  'Carlos Garcia': ['Pedro Reyes', 'Mike Santos', 'Liza Cruz'],
}

const initialAllocationForm = {
  unitId: '',
  manager: '',
  agent: '',
}

export default function UnitAllocationPage() {
  const pathname = usePathname()
  const role = getRoleFromPathname(pathname)
  const [allocations, setAllocations] = React.useState<AgentAllocation[]>(mockAllocations)
  const [selectedAllocation, setSelectedAllocation] = React.useState<AgentAllocation | null>(null)
  const [isNewAllocationOpen, setIsNewAllocationOpen] = React.useState(false)
  const [isViewDetailsOpen, setIsViewDetailsOpen] = React.useState(false)
  const [isReassignOpen, setIsReassignOpen] = React.useState(false)
  const [managerFilter, setManagerFilter] = React.useState('All Managers')
  const [allocationForm, setAllocationForm] = React.useState(initialAllocationForm)
  const [allocationToRevoke, setAllocationToRevoke] = React.useState<AgentAllocation | null>(null)
  const [reassignForm, setReassignForm] = React.useState({
    manager: '',
    agent: '',
  })

  const visibleAgents = allocationForm.manager ? agentsByManager[allocationForm.manager] ?? [] : []
  const reassignAgents = reassignForm.manager ? agentsByManager[reassignForm.manager] ?? [] : []
  const allocatedConductionNumbers = React.useMemo(
    () => new Set(allocations.map((allocation) => allocation.conductionNumber)),
    [allocations]
  )
  const selectableUnits = React.useMemo(
    () =>
      availableUnits.filter(
        (unit) =>
          (unit.status === 'available' || unit.status === 'in-stockyard') &&
          !allocatedConductionNumbers.has(unit.conductionNumber)
      ),
    [allocatedConductionNumbers]
  )

  const handleOpenViewDetails = (allocation: AgentAllocation) => {
    setSelectedAllocation(allocation)
    setIsViewDetailsOpen(true)
  }

  const handleOpenReassign = (allocation: AgentAllocation) => {
    setSelectedAllocation(allocation)
    setReassignForm({
      manager: allocation.manager,
      agent: allocation.assignedTo,
    })
    setIsReassignOpen(true)
  }

  const handleReassignDialogChange = (open: boolean) => {
    setIsReassignOpen(open)
    if (!open) {
      setReassignForm({ manager: '', agent: '' })
    }
  }

  const handleSaveReassign = () => {
    if (!selectedAllocation || !reassignForm.manager || !reassignForm.agent) return

    setAllocations((current) =>
      current.map((allocation) =>
        allocation.id === selectedAllocation.id
          ? {
              ...allocation,
              manager: reassignForm.manager,
              assignedTo: reassignForm.agent,
            }
          : allocation
      )
    )

    setSelectedAllocation((current) =>
      current
        ? {
            ...current,
            manager: reassignForm.manager,
            assignedTo: reassignForm.agent,
          }
        : null
    )

    handleReassignDialogChange(false)
    logAuditEvent({
      user: getAuditActor(role),
      action: 'UPDATE',
      module: 'Allocation',
      description: `Reassigned ${selectedAllocation.conductionNumber} to ${reassignForm.agent} under ${reassignForm.manager}.`,
    })
    toast.success('Allocation reassigned.')
  }

  const handleCreateAllocation = () => {
    if (!allocationForm.manager || !allocationForm.agent || !allocationForm.unitId) return

    const selectedUnit = selectableUnits.find((unit) => unit.id === allocationForm.unitId)
    if (!selectedUnit) return

    const conductionNumberExists = allocations.some(
      (allocation) => allocation.conductionNumber === selectedUnit.conductionNumber
    )

    if (conductionNumberExists) {
      toast.error('This unit is already allocated.')
      return
    }

    const nextAllocation: AgentAllocation = {
      id: `AL-${Date.now()}`,
      unitName: selectedUnit.unitName,
      conductionNumber: selectedUnit.conductionNumber,
      bodyColor: selectedUnit.bodyColor,
      variation: selectedUnit.variation,
      assignedTo: allocationForm.agent,
      manager: allocationForm.manager,
    }

    setAllocations((current) => [nextAllocation, ...current])
    handleAllocationDialogChange(false)
    logAuditEvent({
      user: getAuditActor(role),
      action: 'CREATE',
      module: 'Allocation',
      description: `Created agent allocation for ${nextAllocation.conductionNumber} to ${nextAllocation.assignedTo}.`,
    })
    toast.success('Agent allocation created.')
  }

  const handleRevokeAllocation = () => {
    if (!allocationToRevoke) return

    setAllocations((current) =>
      current.filter((allocation) => allocation.id !== allocationToRevoke.id)
    )

    if (selectedAllocation?.id === allocationToRevoke.id) {
      setSelectedAllocation(null)
      setIsViewDetailsOpen(false)
      setIsReassignOpen(false)
    }

    setAllocationToRevoke(null)
    logAuditEvent({
      user: getAuditActor(role),
      action: 'DELETE',
      module: 'Allocation',
      description: `Revoked agent allocation for ${allocationToRevoke.conductionNumber}.`,
    })
    toast.success('Allocation revoked.')
  }

  const columns: ColumnDef<AgentAllocation>[] = [
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
      accessorKey: 'assignedTo',
      header: 'Assigned To',
      cell: ({ row }) => (
        <div>
          <span className="font-medium">{row.getValue('assignedTo')}</span>
          <p className="text-xs text-muted-foreground">{row.original.manager}</p>
        </div>
      ),
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
                onClick={() => handleOpenViewDetails(allocation)}
              >
                <Eye className="mr-2 size-4" />
                View Details
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleOpenReassign(allocation)}>
                <UserPlus className="mr-2 size-4" />
                Reassign
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => setAllocationToRevoke(allocation)}
              >
                Revoke Allocation
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    },
  ]

  const filteredAllocations = React.useMemo(() => {
    if (managerFilter === 'All Managers') return allocations
    return allocations.filter((allocation) => allocation.manager === managerFilter)
  }, [allocations, managerFilter])

  const handleExportPdf = () => {
    logAuditEvent({
      user: getAuditActor(role),
      action: 'EXPORT',
      module: 'Allocation',
      description: 'Exported Agent Allocation report.',
    })
    exportPdfReport({
      title: 'Agent Allocation Report',
      subtitle:
        managerFilter === 'All Managers'
          ? 'All managers'
          : `Manager: ${managerFilter}`,
      filename: 'agent-allocation-report',
      columns: [
        { header: 'Unit Name', value: (row) => row.unitName },
        { header: 'Conduction Number', value: (row) => row.conductionNumber },
        { header: 'Body Color', value: (row) => row.bodyColor },
        { header: 'Variation', value: (row) => row.variation },
        { header: 'Assigned To', value: (row) => row.assignedTo },
        { header: 'Manager', value: (row) => row.manager },
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
      description: `Exported agent allocation ${selectedAllocation.conductionNumber}.`,
    })
    exportPdfReport({
      title: `Agent Allocation ${selectedAllocation.conductionNumber}`,
      subtitle: `${selectedAllocation.unitName} • ${selectedAllocation.assignedTo}`,
      filename: `agent-allocation-${selectedAllocation.conductionNumber.toLowerCase()}`,
      columns: [
        { header: 'Unit Name', value: (row) => row.unitName },
        { header: 'Conduction Number', value: (row) => row.conductionNumber },
        { header: 'Body Color', value: (row) => row.bodyColor },
        { header: 'Variation', value: (row) => row.variation },
        { header: 'Assigned To', value: (row) => row.assignedTo },
        { header: 'Manager', value: (row) => row.manager },
      ],
      rows: [selectedAllocation],
    })
  }

  const handleAllocationDialogChange = (open: boolean) => {
    setIsNewAllocationOpen(open)
    if (!open) {
      setAllocationForm(initialAllocationForm)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Agent Allocation"
        description="Manage unit allocations across managers and their assigned agents"
      >
        <Dialog open={isNewAllocationOpen} onOpenChange={handleAllocationDialogChange}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="mr-2 size-4" />
              New Allocation
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle>New Agent Allocation</DialogTitle>
              <DialogDescription>
                Allocate a unit to an agent under a selected manager.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label>Select Manager</Label>
                <Select
                  value={allocationForm.manager}
                  onValueChange={(value) =>
                    setAllocationForm((prev) => ({ ...prev, manager: value, agent: '' }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a manager" />
                  </SelectTrigger>
                  <SelectContent>
                    {managerOptions
                      .filter((manager) => manager !== 'All Managers')
                      .map((manager) => (
                        <SelectItem key={manager} value={manager}>
                          {manager}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Select Agent</Label>
                <Select
                  value={allocationForm.agent}
                  onValueChange={(value) =>
                    setAllocationForm((prev) => ({ ...prev, agent: value }))
                  }
                  disabled={!allocationForm.manager}
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={
                        allocationForm.manager ? 'Choose an agent' : 'Select manager first'
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {visibleAgents.map((agent) => (
                      <SelectItem key={agent} value={agent}>
                        {agent}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Select Unit</Label>
                <Select
                  value={allocationForm.unitId}
                  onValueChange={(value) =>
                    setAllocationForm((prev) => ({ ...prev, unitId: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a unit" />
                  </SelectTrigger>
                  <SelectContent>
                    {selectableUnits.map((unit) => (
                      <SelectItem key={unit.id} value={unit.id}>
                        {unit.conductionNumber} - {unit.unitName} {unit.variation}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Only units with `In Stockyard` or `Available` status can be allocated.
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => handleAllocationDialogChange(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleCreateAllocation}
                disabled={!allocationForm.manager || !allocationForm.agent || !allocationForm.unitId}
              >
                Create Allocation
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </PageHeader>

      <DataTable
        columns={columns}
        data={filteredAllocations}
        searchKey="conductionNumber"
        searchPlaceholder="Search by conduction number..."
        exportConfig={{
          title: 'Agent Allocation Report',
          subtitle: managerFilter === 'All Managers' ? 'All managers' : `Manager: ${managerFilter}`,
          filename: 'agent-allocation-report',
        }}
        filterComponent={
          <div className="flex items-center gap-2">
            <Filter className="size-4 text-muted-foreground" />
            <Select value={managerFilter} onValueChange={setManagerFilter}>
              <SelectTrigger className="w-52">
                <SelectValue placeholder="All Managers" />
              </SelectTrigger>
              <SelectContent>
                {managerOptions.map((manager) => (
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
            <DialogTitle>Allocation Details</DialogTitle>
            <DialogDescription>
              Complete information about this agent allocation.
            </DialogDescription>
          </DialogHeader>
          {selectedAllocation && (
            <div className="mt-6 space-y-6">
              <div className="space-y-1">
                <span className="text-xl font-bold text-primary">
                  {selectedAllocation.conductionNumber}
                </span>
                <p className="text-sm text-muted-foreground">
                  {selectedAllocation.unitName} - {selectedAllocation.variation}
                </p>
              </div>

              <div className="space-y-4">
                <div className="rounded-lg bg-muted/50 p-4">
                  <h4 className="mb-3 text-sm font-medium">Unit Information</h4>
                  <div className="space-y-2">
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
                  </div>
                </div>

                <div className="rounded-lg bg-muted/50 p-4">
                  <h4 className="mb-3 text-sm font-medium">Assignment Details</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Assigned To</span>
                      <span className="font-medium">{selectedAllocation.assignedTo}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Manager</span>
                      <span className="font-medium">{selectedAllocation.manager}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-2 border-t pt-4">
                <Button className="flex-1" onClick={() => handleOpenReassign(selectedAllocation)}>
                  <UserPlus className="mr-2 size-4" />
                  Reassign
                </Button>
                <Button variant="outline" onClick={handleExportSelectedAllocation}>
                  <FileDown className="mr-2 size-4" />
                  Export
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isReassignOpen} onOpenChange={handleReassignDialogChange}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Reassign Allocation</DialogTitle>
            <DialogDescription>
              Update the assigned manager and agent for this unit.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Manager</Label>
              <Select
                value={reassignForm.manager}
                onValueChange={(value) =>
                  setReassignForm({
                    manager: value,
                    agent: '',
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose a manager" />
                </SelectTrigger>
                <SelectContent>
                  {managerOptions
                    .filter((manager) => manager !== 'All Managers')
                    .map((manager) => (
                      <SelectItem key={manager} value={manager}>
                        {manager}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Agent</Label>
              <Select
                value={reassignForm.agent}
                onValueChange={(value) =>
                  setReassignForm((prev) => ({ ...prev, agent: value }))
                }
                disabled={!reassignForm.manager}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={reassignForm.manager ? 'Choose an agent' : 'Select manager first'}
                  />
                </SelectTrigger>
                <SelectContent>
                  {reassignAgents.map((agent) => (
                    <SelectItem key={agent} value={agent}>
                      {agent}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedAllocation && (
              <div className="rounded-lg bg-muted/50 p-4 text-sm">
                <p className="font-medium text-primary">{selectedAllocation.conductionNumber}</p>
                <p className="text-muted-foreground">
                  {selectedAllocation.unitName} - {selectedAllocation.variation}
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => handleReassignDialogChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveReassign}
              disabled={!reassignForm.manager || !reassignForm.agent}
            >
              Save Reassignment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmActionDialog
        open={Boolean(allocationToRevoke)}
        onOpenChange={(open) => {
          if (!open) setAllocationToRevoke(null)
        }}
        title="Revoke Allocation"
        description={
          allocationToRevoke
            ? `Revoke allocation for ${allocationToRevoke.conductionNumber}? This will remove the assigned agent from this unit.`
            : ''
        }
        confirmLabel="Revoke"
        onConfirm={handleRevokeAllocation}
      />
    </div>
  )
}
