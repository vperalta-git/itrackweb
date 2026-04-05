'use client'

import * as React from 'react'
import { ColumnDef } from '@tanstack/react-table'
import { usePathname } from 'next/navigation'
import {
  Plus,
  MoreHorizontal,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  Pencil,
  Trash2,
  ArrowUpDown,
  Filter,
  ClipboardCheck,
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
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getAuditActor, logAuditEvent } from '@/lib/audit-log'
import { Progress } from '@/components/ui/progress'
import { exportPdfReport } from '@/lib/export-pdf'
import { getRoleFromPathname } from '@/lib/rbac'
import { matchesScopedAgent, matchesScopedManager } from '@/lib/role-scope'
import { toast } from 'sonner'

// Types
interface PreparationRequest {
  id: string
  dateCreated: string
  conductionNumber: string
  unitName: string
  service: string
  salesAgent: string
  manager: string
  customerName: string
  contactNumber: string
  status: 'pending' | 'in-dispatch' | 'completed' | 'ready-for-release' | 'rejected'
  estimatedTime: string
  progress: number
  notes: string
}

interface ChecklistItem {
  id: string
  task: string
  completed: boolean
  completedBy?: string
  completedAt?: string
}

// Mock data - Isuzu vehicles
const mockRequests: PreparationRequest[] = [
  {
    id: '1',
    dateCreated: '2024-02-01',
    conductionNumber: 'LAG8821',
    unitName: 'mu-X',
    service: 'Detailing, Tinting',
    salesAgent: 'Anna Lim',
    manager: 'Carlos Garcia',
    customerName: 'Andrea Villanueva',
    contactNumber: '09171234567',
    status: 'in-dispatch',
    estimatedTime: '3 hours',
    progress: 60,
    notes: 'Customer pickup scheduled for Feb 5',
  },
  {
    id: '2',
    dateCreated: '2024-02-02',
    conductionNumber: 'DRV1020',
    unitName: 'D-Max',
    service: 'Ceramic Coating',
    salesAgent: 'Juan Dela Cruz',
    manager: 'Carlos Garcia',
    customerName: 'Mark Anthony Lopez',
    contactNumber: '09184567890',
    status: 'pending',
    estimatedTime: '5 hours',
    progress: 10,
    notes: '',
  },
  {
    id: '3',
    dateCreated: '2024-01-28',
    conductionNumber: 'REL7744',
    unitName: 'mu-X',
    service: 'Accessories, Rust Proof',
    salesAgent: 'Anna Lim',
    manager: 'Carlos Garcia',
    customerName: 'Josefina Mendoza',
    contactNumber: '09201234567',
    status: 'completed',
    estimatedTime: '1 day',
    progress: 100,
    notes: 'Delivered to showroom',
  },
  {
    id: '4',
    dateCreated: '2024-02-03',
    conductionNumber: 'STK4401',
    unitName: 'Traviz',
    service: 'Detailing',
    salesAgent: 'Mike Santos',
    manager: 'Maria Santos',
    customerName: 'Antonio Garcia',
    contactNumber: '09204567890',
    status: 'in-dispatch',
    estimatedTime: '2 hours',
    progress: 20,
    notes: 'Standard preparation',
  },
  {
    id: '5',
    dateCreated: '2024-01-30',
    conductionNumber: 'PEN3344',
    unitName: 'NLR',
    service: 'Tinting',
    salesAgent: 'Pedro Reyes',
    manager: 'Carlos Garcia',
    customerName: 'Lorenzo Cruz',
    contactNumber: '09192345678',
    status: 'rejected',
    estimatedTime: '4 hours',
    progress: 0,
    notes: 'Vehicle already allocated',
  },
]

const availableVehicleStocks = [
  {
    id: '1',
    conductionNumber: 'ABC1234',
    vehicleName: 'mu-X LS-E 4x2 AT',
    salesAgent: 'Juan Dela Cruz',
    manager: 'Carlos Garcia',
  },
  {
    id: '4',
    conductionNumber: 'STK4401',
    vehicleName: 'Traviz L Utility Van',
    salesAgent: 'Mike Santos',
    manager: 'Maria Santos',
  },
  {
    id: '6',
    conductionNumber: 'NLR4021',
    vehicleName: 'NLR 4-Wheeler Aluminum Van',
    salesAgent: 'Liza Cruz',
    manager: 'Maria Santos',
  },
  {
    id: '7',
    conductionNumber: 'REL7744',
    vehicleName: 'mu-X LS-A 4x4 AT',
    salesAgent: 'Anna Lim',
    manager: 'Carlos Garcia',
  },
]

const requestedServiceOptions = [
  'Detailing',
  'Tinting',
  'Ceramic Coating',
  'Accessories',
  'Rust Proof',
] as const

const initialRequestForm = {
  vehicleId: '',
  requestedServices: [] as string[],
  customRequests: [] as string[],
  customRequestInput: '',
  customerName: '',
  contactNumber: '',
  notes: '',
}

const mobileNumberPattern = /^(09\d{9}|\+639\d{9})$/
const vehicleHistoryStorageKey = 'itrack.vehicle-history.records'

export default function PreparationPage() {
  const pathname = usePathname()
  const role = getRoleFromPathname(pathname)
  const [requests, setRequests] = React.useState<PreparationRequest[]>(mockRequests)
  const [selectedRequest, setSelectedRequest] = React.useState<PreparationRequest | null>(null)
  const [isNewRequestOpen, setIsNewRequestOpen] = React.useState(false)
  const [isViewDetailsOpen, setIsViewDetailsOpen] = React.useState(false)
  const [statusFilter, setStatusFilter] = React.useState<string>('all')
  const [requestForm, setRequestForm] = React.useState(initialRequestForm)
  const [requestBeingEdited, setRequestBeingEdited] = React.useState<PreparationRequest | null>(null)
  const [requestToDelete, setRequestToDelete] = React.useState<PreparationRequest | null>(null)
  const [requestToReadyForRelease, setRequestToReadyForRelease] =
    React.useState<PreparationRequest | null>(null)

  const scopedRequests = React.useMemo(
    () =>
      requests.filter(
        (request) =>
          matchesScopedAgent(role, request.salesAgent) &&
          matchesScopedManager(role, request.manager)
      ),
    [requests, role]
  )

  const scopedAvailableVehicleStocks = React.useMemo(
    () =>
      availableVehicleStocks.filter(
        (vehicle) =>
          matchesScopedAgent(role, vehicle.salesAgent) &&
          matchesScopedManager(role, vehicle.manager)
      ),
    [role]
  )

  const isValidMobileNumber = mobileNumberPattern.test(requestForm.contactNumber)

  const selectedChecklist = React.useMemo<ChecklistItem[]>(() => {
    if (!selectedRequest) return []

    const requestedTasks = selectedRequest.service
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)

    const completedCount =
      selectedRequest.status === 'completed' || selectedRequest.status === 'ready-for-release'
        ? requestedTasks.length
        : Math.min(
            requestedTasks.length,
            Math.floor((selectedRequest.progress / 100) * requestedTasks.length)
          )

    return requestedTasks.map((task, index) => ({
      id: `${selectedRequest.id}-${index + 1}`,
      task,
      completed: index < completedCount,
      completedBy:
        index < completedCount
          ? index % 2 === 0
            ? 'Dispatcher: Mike R.'
            : 'Dispatcher: Juan D.'
          : undefined,
      completedAt:
        index < completedCount
          ? `${selectedRequest.dateCreated} ${String(9 + index).padStart(2, '0')}:30`
          : undefined,
    }))
  }, [selectedRequest])

  const handleRequestDialogChange = (open: boolean) => {
    setIsNewRequestOpen(open)
    if (!open) {
      setRequestForm(initialRequestForm)
      setRequestBeingEdited(null)
    }
  }

  const openEditRequest = (request: PreparationRequest) => {
    const selectedServices = request.service
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)

    setRequestBeingEdited(request)
    setRequestForm({
      vehicleId: '',
      requestedServices: selectedServices.filter((item) =>
        requestedServiceOptions.includes(item as (typeof requestedServiceOptions)[number])
      ),
      customRequests: selectedServices.filter(
        (item) => !requestedServiceOptions.includes(item as (typeof requestedServiceOptions)[number])
      ),
      customRequestInput: '',
      customerName: request.customerName,
      contactNumber: request.contactNumber,
      notes: request.notes,
    })
    setIsNewRequestOpen(true)
  }

  const toggleRequestedService = (service: string, checked: boolean) => {
    setRequestForm((prev) => ({
      ...prev,
      requestedServices: checked
        ? [...prev.requestedServices, service]
        : prev.requestedServices.filter((item) => item !== service),
    }))
  }

  const addCustomRequest = () => {
    const value = requestForm.customRequestInput.trim()
    if (!value) return

    setRequestForm((prev) => ({
      ...prev,
      customRequests: prev.customRequests.includes(value)
        ? prev.customRequests
        : [...prev.customRequests, value],
      customRequestInput: '',
    }))
  }

  const removeCustomRequest = (request: string) => {
    setRequestForm((prev) => ({
      ...prev,
      customRequests: prev.customRequests.filter((item) => item !== request),
    }))
  }

  const submitRequest = () => {
    if (requestBeingEdited) {
      if (
        (requestForm.requestedServices.length === 0 && requestForm.customRequests.length === 0) ||
        !requestForm.customerName.trim() ||
        !isValidMobileNumber
      ) {
        return
      }

      const requestedServiceList = [...requestForm.requestedServices, ...requestForm.customRequests]

      const updatedRequest: PreparationRequest = {
        ...requestBeingEdited,
        service: requestedServiceList.join(', '),
        customerName: requestForm.customerName.trim(),
        contactNumber: requestForm.contactNumber.trim(),
        notes: requestForm.notes.trim(),
        estimatedTime: requestedServiceList.length > 2 ? '1 day' : '3 hours',
      }

      setRequests((current) =>
        current.map((item) => (item.id === requestBeingEdited.id ? updatedRequest : item))
      )
      setSelectedRequest((current) =>
        current?.id === requestBeingEdited.id ? updatedRequest : current
      )
      handleRequestDialogChange(false)
      logAuditEvent({
        user: getAuditActor(role),
        action: 'UPDATE',
        module: 'Preparation',
        description: `Updated preparation request ${updatedRequest.conductionNumber}.`,
      })
      toast.success('Preparation request updated.')
      return
    }

    const selectedVehicle = scopedAvailableVehicleStocks.find(
      (vehicle) => vehicle.id === requestForm.vehicleId
    )

    if (
      !selectedVehicle ||
      (requestForm.requestedServices.length === 0 && requestForm.customRequests.length === 0) ||
      !requestForm.customerName.trim() ||
      !isValidMobileNumber
    ) {
      return
    }

    const requestedServiceList = [...requestForm.requestedServices, ...requestForm.customRequests]
    const nextStatus = role === 'admin' || role === 'supervisor' ? 'in-dispatch' : 'pending'
    const nextRequest: PreparationRequest = {
      id: `PR-${Date.now()}`,
      dateCreated: new Date().toISOString().slice(0, 10),
      conductionNumber: selectedVehicle.conductionNumber,
      unitName: selectedVehicle.vehicleName,
      service: requestedServiceList.join(', '),
      salesAgent: selectedVehicle.salesAgent,
      manager: selectedVehicle.manager,
      customerName: requestForm.customerName.trim(),
      contactNumber: requestForm.contactNumber.trim(),
      status: nextStatus,
      estimatedTime: requestedServiceList.length > 2 ? '1 day' : '3 hours',
      progress: nextStatus === 'in-dispatch' ? 20 : 0,
      notes: requestForm.notes.trim(),
    }

    setRequests((current) => [nextRequest, ...current])
    handleRequestDialogChange(false)
    logAuditEvent({
      user: getAuditActor(role),
      action: 'CREATE',
      module: 'Preparation',
      description: `Created preparation request for ${nextRequest.conductionNumber}.`,
    })
    toast.success(
      nextStatus === 'in-dispatch'
        ? 'Preparation request sent straight to Dispatch.'
        : 'Preparation request submitted for admin/supervisor approval.'
    )
  }

  const handleDeleteRequest = () => {
    if (!requestToDelete) return

    setRequests((current) => current.filter((item) => item.id !== requestToDelete.id))
    setSelectedRequest((current) => (current?.id === requestToDelete.id ? null : current))
    setIsViewDetailsOpen(false)
    logAuditEvent({
      user: getAuditActor(role),
      action: 'DELETE',
      module: 'Preparation',
      description: `Deleted preparation request ${requestToDelete.conductionNumber}.`,
    })
    toast.success('Preparation request deleted.')
    setRequestToDelete(null)
  }

  const updateRequestStatus = (
    request: PreparationRequest,
    status: PreparationRequest['status']
  ) => {
    const updatedRequest: PreparationRequest = {
      ...request,
      status,
      progress:
        status === 'pending'
          ? 0
          : status === 'in-dispatch'
          ? Math.max(request.progress, 20)
          : status === 'completed' || status === 'ready-for-release'
          ? 100
          : request.progress,
    }

    setRequests((current) =>
      current.map((item) => (item.id === request.id ? updatedRequest : item))
    )
    setSelectedRequest((current) => (current?.id === request.id ? updatedRequest : current))
  }

  const handleApproveRequest = (request: PreparationRequest) => {
    updateRequestStatus(request, 'in-dispatch')
    logAuditEvent({
      user: getAuditActor(role),
      action: 'UPDATE',
      module: 'Preparation',
      description: `Approved preparation request ${request.conductionNumber}.`,
    })
    toast.success('Preparation request approved and sent to Dispatch.')
  }

  const handleRejectRequest = (request: PreparationRequest) => {
    updateRequestStatus(request, 'rejected')
    logAuditEvent({
      user: getAuditActor(role),
      action: 'UPDATE',
      module: 'Preparation',
      description: `Rejected preparation request ${request.conductionNumber}.`,
    })
    toast.success('Preparation request rejected.')
  }

  const handleReadyForRelease = () => {
    if (!requestToReadyForRelease) return

    const releasedAt = new Date().toISOString().slice(0, 16).replace('T', ' ')
    const preparationSteps = requestToReadyForRelease.service
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
      .map((task, index) => ({
        task,
        completedAt: `${requestToReadyForRelease.dateCreated} ${String(9 + index).padStart(2, '0')}:30`,
      }))

    const releasedHistoryRecord = {
      id: `VH-${requestToReadyForRelease.id}`,
      vehicleAddedAt: requestToReadyForRelease.dateCreated,
      unitName: requestToReadyForRelease.unitName,
      variation: '-',
      conductionNumber: requestToReadyForRelease.conductionNumber,
      bodyColor: '-',
      deliveryPickupAt: requestToReadyForRelease.dateCreated,
      preparationSteps,
      agentAssigned: requestToReadyForRelease.salesAgent,
      agentAssignedAt: requestToReadyForRelease.dateCreated,
      customerName: requestToReadyForRelease.customerName,
      customerContact: requestToReadyForRelease.contactNumber,
      releasedAt,
      status: 'released',
      historyEvents: [
        {
          at: requestToReadyForRelease.dateCreated,
          title: 'Vehicle preparation requested',
          detail: `Preparation request created for ${requestToReadyForRelease.unitName}.`,
        },
        {
          at: requestToReadyForRelease.dateCreated,
          title: 'Agent assigned',
          detail: `Handled by sales agent ${requestToReadyForRelease.salesAgent}.`,
        },
        {
          at: requestToReadyForRelease.dateCreated,
          title: 'Preparation dispatched',
          detail: `Request endorsed to Dispatch for ${requestToReadyForRelease.service}.`,
        },
        {
          at: releasedAt,
          title: 'Vehicle released',
          detail: `Released to ${requestToReadyForRelease.customerName}. Contact: ${requestToReadyForRelease.contactNumber}.`,
        },
      ],
    }

    if (typeof window !== 'undefined') {
      const existingRecords = window.localStorage.getItem(vehicleHistoryStorageKey)
      const parsedRecords = existingRecords ? JSON.parse(existingRecords) : []
      window.localStorage.setItem(
        vehicleHistoryStorageKey,
        JSON.stringify([releasedHistoryRecord, ...parsedRecords])
      )
      window.dispatchEvent(new Event('vehicle-history-updated'))
    }

    setRequests((current) =>
      current.filter((item) => item.id !== requestToReadyForRelease.id)
    )
    setSelectedRequest((current) =>
      current?.id === requestToReadyForRelease.id ? null : current
    )
    setIsViewDetailsOpen(false)
    logAuditEvent({
      user: getAuditActor(role),
      action: 'UPDATE',
      module: 'Preparation',
      description: `Released vehicle ${requestToReadyForRelease.conductionNumber} from preparation.`,
    })
    toast.success(
      `Vehicle released. SMS notification sent to ${requestToReadyForRelease.customerName} at ${requestToReadyForRelease.contactNumber}.`
    )
    setRequestToReadyForRelease(null)
  }

  // Column definitions
  const columns: ColumnDef<PreparationRequest>[] = [
    {
      accessorKey: 'dateCreated',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="-ml-4"
        >
          Date Created
          <ArrowUpDown className="ml-2 size-4" />
        </Button>
      ),
    },
    {
      accessorKey: 'conductionNumber',
      header: 'Conduction Number',
      cell: ({ row }) => (
        <span className="font-medium text-primary">{row.getValue('conductionNumber')}</span>
      ),
    },
    {
      accessorKey: 'unitName',
      header: 'Unit Name',
    },
    {
      accessorKey: 'service',
      header: 'Service',
      cell: ({ row }) => <span className="line-clamp-1">{row.getValue('service')}</span>,
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
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => <StatusBadge status={row.getValue('status')} />,
      filterFn: (row, id, value) => {
        if (value === 'all') return true
        return row.getValue(id) === value
      },
    },
    {
      accessorKey: 'estimatedTime',
      header: 'Estimated Time',
      cell: ({ row }) => (
        <div className="min-w-[160px] space-y-1">
          <div className="text-sm font-medium">{row.getValue('estimatedTime')}</div>
          <div className="flex items-center gap-2">
            <Progress value={row.original.progress} className="h-2 flex-1" />
            <span className="w-9 text-xs text-muted-foreground">{row.original.progress}%</span>
          </div>
        </div>
      ),
    },
    {
      id: 'actions',
      enableHiding: false,
      cell: ({ row }) => {
        const request = row.original

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
                  setSelectedRequest(request)
                  setIsViewDetailsOpen(true)
                }}
              >
                <Eye className="mr-2 size-4" />
                View Details
              </DropdownMenuItem>
              {(request.status === 'pending' || request.status === 'rejected') && (
                <DropdownMenuItem onClick={() => openEditRequest(request)}>
                  <Pencil className="mr-2 size-4" />
                  Edit Request
                </DropdownMenuItem>
              )}
              {request.status === 'pending' && (
                <>
                  <DropdownMenuItem
                    className="text-success"
                    onClick={() => handleApproveRequest(request)}
                  >
                    <CheckCircle className="mr-2 size-4" />
                    Approve
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-destructive"
                    onClick={() => handleRejectRequest(request)}
                  >
                    <XCircle className="mr-2 size-4" />
                    Reject
                  </DropdownMenuItem>
                </>
              )}
              {(request.status === 'pending' || request.status === 'rejected') && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive"
                    onClick={() => setRequestToDelete(request)}
                  >
                    <Trash2 className="mr-2 size-4" />
                    Delete Request
                  </DropdownMenuItem>
                </>
              )}
              {request.status === 'completed' && (
                <DropdownMenuItem onClick={() => setRequestToReadyForRelease(request)}>
                  <Clock className="mr-2 size-4" />
                  Ready for Release
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    },
  ]

  // Filter data
  const filteredRequests = React.useMemo(() => {
    if (statusFilter === 'all') return scopedRequests
    return scopedRequests.filter((r) => r.status === statusFilter)
  }, [scopedRequests, statusFilter])

  const handleExportPdf = () => {
    logAuditEvent({
      user: getAuditActor(role),
      action: 'EXPORT',
      module: 'Preparation',
      description: 'Exported Vehicle Preparation report.',
    })
    exportPdfReport({
      title: 'Vehicle Preparation Report',
      subtitle: 'Preparation requests and checklist progress',
      filename: 'vehicle-preparation-report',
      columns: [
        { header: 'Date Created', value: (row) => row.dateCreated },
        { header: 'Conduction Number', value: (row) => row.conductionNumber },
        { header: 'Unit Name', value: (row) => row.unitName },
        { header: 'Service', value: (row) => row.service },
        { header: 'Customer Name', value: (row) => row.customerName },
        { header: 'Contact Number', value: (row) => row.contactNumber },
        { header: 'Status', value: (row) => row.status },
        { header: 'Estimated Time', value: (row) => row.estimatedTime },
        { header: 'Progress', value: (row) => `${row.progress}%` },
      ],
      rows: filteredRequests,
    })
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Vehicle Preparation"
        description="Manage preparation requests. Checklists are completed by Dispatchers via mobile app."
      >
        <Dialog open={isNewRequestOpen} onOpenChange={handleRequestDialogChange}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="mr-2 size-4" />
              New Request
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {requestBeingEdited ? 'Edit Preparation Request' : 'New Preparation Request'}
              </DialogTitle>
              <DialogDescription>
                {requestBeingEdited
                  ? 'Update the request details and customer information.'
                  : 'Create a preparation request and capture the customer details for SMS updates.'}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="vehicle">Select Vehicle</Label>
                {requestBeingEdited ? (
                  <div className="rounded-lg border bg-muted/20 px-3 py-3 text-sm">
                    <p className="font-medium text-primary">{requestBeingEdited.conductionNumber}</p>
                    <p className="text-muted-foreground">{requestBeingEdited.unitName}</p>
                  </div>
                ) : (
                  <>
                    <Select
                      value={requestForm.vehicleId}
                      onValueChange={(value) =>
                        setRequestForm((prev) => ({ ...prev, vehicleId: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Choose an available vehicle" />
                      </SelectTrigger>
                      <SelectContent>
                            {scopedAvailableVehicleStocks.map((vehicle) => (
                              <SelectItem key={vehicle.id} value={vehicle.id}>
                                {vehicle.conductionNumber} - {vehicle.vehicleName}
                              </SelectItem>
                            ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Only vehicles with `Available` status from Vehicle Stocks are listed here.
                    </p>
                  </>
                )}
              </div>

              <div className="space-y-3">
                <Label>Requested Services</Label>
                <div className="grid gap-3 rounded-lg border p-4 sm:grid-cols-2">
                  {requestedServiceOptions.map((service) => (
                    <div key={service} className="flex items-center gap-3">
                      <Checkbox
                        id={`service-${service}`}
                        checked={requestForm.requestedServices.includes(service)}
                        onCheckedChange={(checked) =>
                          toggleRequestedService(service, checked === true)
                        }
                      />
                      <Label htmlFor={`service-${service}`} className="cursor-pointer font-normal">
                        {service}
                      </Label>
                    </div>
                  ))}
                </div>
                <div className="rounded-lg border border-dashed p-4">
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <Input
                      placeholder="Add custom request"
                      value={requestForm.customRequestInput}
                      onChange={(e) =>
                        setRequestForm((prev) => ({
                          ...prev,
                          customRequestInput: e.target.value,
                        }))
                      }
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          addCustomRequest()
                        }
                      }}
                    />
                    <Button type="button" variant="outline" onClick={addCustomRequest}>
                      Add Custom Request
                    </Button>
                  </div>
                  {requestForm.customRequests.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {requestForm.customRequests.map((request) => (
                        <button
                          key={request}
                          type="button"
                          onClick={() => removeCustomRequest(request)}
                          className="rounded-full border bg-muted px-3 py-1 text-xs font-medium text-foreground transition-colors hover:bg-accent"
                        >
                          {request} x
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="customer-name">Customer Name</Label>
                  <Input
                    id="customer-name"
                    placeholder="Enter customer name"
                    value={requestForm.customerName}
                    onChange={(e) =>
                      setRequestForm((prev) => ({
                        ...prev,
                        customerName: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contact-number">Contact No.</Label>
                  <Input
                    id="contact-number"
                    placeholder="09XXXXXXXXX"
                    value={requestForm.contactNumber}
                    onChange={(e) =>
                      setRequestForm((prev) => ({
                        ...prev,
                        contactNumber: e.target.value.replace(/[^\d+]/g, '').slice(0, 13),
                      }))
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Use `09XXXXXXXXX` or `+639XXXXXXXXX` for SMS notifications.
                  </p>
                  {requestForm.contactNumber.length > 0 && !isValidMobileNumber && (
                    <p className="text-xs text-destructive">
                      Enter a valid mobile number.
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  placeholder="Additional notes or instructions..."
                  value={requestForm.notes}
                  onChange={(e) =>
                    setRequestForm((prev) => ({ ...prev, notes: e.target.value }))
                  }
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => handleRequestDialogChange(false)}>
                Cancel
              </Button>
              <Button
                onClick={submitRequest}
                disabled={
                  (!requestBeingEdited && !requestForm.vehicleId) ||
                  (requestForm.requestedServices.length === 0 &&
                    requestForm.customRequests.length === 0) ||
                  !requestForm.customerName ||
                  !isValidMobileNumber
                }
              >
                {requestBeingEdited ? 'Save Changes' : 'Submit Request'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </PageHeader>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pending
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">
              {scopedRequests.filter((r) => r.status === 'pending').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              In Dispatch
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-info">
              {scopedRequests.filter((r) => r.status === 'in-dispatch').length}
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
              {scopedRequests.filter((r) => r.status === 'completed').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Ready for Release
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {scopedRequests.filter((r) => r.status === 'ready-for-release').length}
            </div>
          </CardContent>
        </Card>
      </div>

      <DataTable
        columns={columns}
        data={filteredRequests}
        searchKey="conductionNumber"
        searchPlaceholder="Search by conduction number..."
        exportConfig={{
          title: 'Vehicle Preparation Report',
          subtitle: 'Preparation requests listing',
          filename: 'vehicle-preparation-report',
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
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="in-dispatch">In Dispatch</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="ready-for-release">Ready for Release</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
        }
      />

      <Dialog open={isViewDetailsOpen} onOpenChange={setIsViewDetailsOpen}>
        <DialogContent className="w-[96vw] max-w-[96vw] sm:!max-w-[1600px] overflow-hidden p-0">
          <DialogHeader className="border-b border-border px-6 py-5 text-left">
            <DialogTitle className="text-xl">Preparation Details</DialogTitle>
            <DialogDescription>
              View and manage preparation checklist.
            </DialogDescription>
          </DialogHeader>
          {selectedRequest && (
            <div className="flex max-h-[85vh] flex-col">
              <div className="flex-1 overflow-y-auto px-6 py-6">
                <div className="space-y-6">
                <div className="flex flex-col gap-4 rounded-2xl border border-border/70 bg-gradient-to-br from-background to-muted/30 p-5 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-2">
                    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-primary/70">
                      Preparation Request
                    </div>
                    <div className="text-2xl font-semibold text-primary">
                      {selectedRequest.conductionNumber}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {selectedRequest.unitName} • {selectedRequest.service}
                    </div>
                  </div>
                  <div className="space-y-3 sm:min-w-56">
                    <div className="flex items-center justify-between gap-3">
                      <StatusBadge status={selectedRequest.status} />
                      <span className="text-sm font-medium">{selectedRequest.estimatedTime}</span>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Progress</span>
                        <span className="font-medium">{selectedRequest.progress}%</span>
                      </div>
                      <Progress value={selectedRequest.progress} className="h-2.5" />
                    </div>
                  </div>
                </div>

                <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
                  <div className="space-y-4">
                    <div className="rounded-2xl border border-border/70 bg-muted/30 p-5">
                      <h3 className="mb-4 text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                        Request Summary
                      </h3>
                      <div className="space-y-3">
                        <div className="flex justify-between gap-4 text-sm">
                          <span className="text-muted-foreground">Date Created</span>
                          <span className="font-medium">{selectedRequest.dateCreated}</span>
                        </div>
                        <div className="flex justify-between gap-4 text-sm">
                          <span className="text-muted-foreground">Conduction Number</span>
                          <span className="font-medium">{selectedRequest.conductionNumber}</span>
                        </div>
                        <div className="flex justify-between gap-4 text-sm">
                          <span className="text-muted-foreground">Unit Name</span>
                          <span className="font-medium">{selectedRequest.unitName}</span>
                        </div>
                        <div className="flex justify-between gap-4 text-sm">
                          <span className="text-muted-foreground">Service</span>
                          <span className="text-right font-medium">{selectedRequest.service}</span>
                        </div>
                        <div className="flex justify-between gap-4 text-sm">
                          <span className="text-muted-foreground">Customer</span>
                          <span className="text-right font-medium">{selectedRequest.customerName}</span>
                        </div>
                        <div className="flex justify-between gap-4 text-sm">
                          <span className="text-muted-foreground">Contact Number</span>
                          <span className="font-medium">{selectedRequest.contactNumber}</span>
                        </div>
                        <div className="flex justify-between gap-4 text-sm">
                          <span className="text-muted-foreground">Estimated Time</span>
                          <span className="font-medium">{selectedRequest.estimatedTime}</span>
                        </div>
                      </div>
                    </div>

                    {selectedRequest.notes && (
                      <div className="rounded-2xl border border-border/70 bg-background p-5">
                        <h3 className="mb-2 text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                          Notes
                        </h3>
                        <p className="text-sm leading-6 text-foreground/85">
                          {selectedRequest.notes}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="rounded-2xl border border-border/70 bg-background p-5">
                    <div className="mb-4 flex items-center justify-between gap-4">
                      <div>
                        <h3 className="flex items-center gap-2 text-base font-semibold">
                          <ClipboardCheck className="size-4 text-primary" />
                          Preparation Checklist
                        </h3>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Checklist items are completed by Dispatchers via the mobile app.
                        </p>
                      </div>
                      <div className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
                        {selectedChecklist.filter((c) => c.completed).length}/
                        {selectedChecklist.length} completed
                      </div>
                    </div>

                    <div className="space-y-2">
                      {selectedChecklist.map((item) => (
                        <div
                          key={item.id}
                          className={`rounded-xl border p-3 transition-colors ${
                            item.completed
                              ? 'border-success/20 bg-success/5'
                              : 'border-border/70 bg-muted/20'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <Checkbox
                              checked={item.completed}
                              disabled={true}
                              aria-label="Completed by Dispatcher (mobile only)"
                            />
                            <div className="min-w-0 flex-1">
                              <p
                                className={`text-sm ${
                                  item.completed ? 'text-muted-foreground line-through' : 'text-foreground'
                                }`}
                              >
                                {item.task}
                              </p>
                              {item.completed && item.completedBy && (
                                <p className="mt-1 text-[11px] text-muted-foreground">
                                  Completed by {item.completedBy} at {item.completedAt}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                      {selectedChecklist.length === 0 && (
                        <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
                          No preparation items were submitted for this request.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                </div>
              </div>

              <div className="border-t border-border bg-background px-6 py-4">
                <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                  {selectedRequest.status === 'completed' && (
                    <Button
                      onClick={() => setRequestToReadyForRelease(selectedRequest)}
                    >
                      <Clock className="mr-2 size-4" />
                      Ready for Release
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmActionDialog
        open={Boolean(requestToReadyForRelease)}
        onOpenChange={(open) => {
          if (!open) setRequestToReadyForRelease(null)
        }}
        title="Confirm Ready for Release"
        description={
          requestToReadyForRelease
            ? `Confirm that ${requestToReadyForRelease.conductionNumber} is ready for release? This will notify ${requestToReadyForRelease.customerName} via SMS at ${requestToReadyForRelease.contactNumber}.`
            : ''
        }
        confirmLabel="Confirm"
        onConfirm={handleReadyForRelease}
      />

      <ConfirmActionDialog
        open={Boolean(requestToDelete)}
        onOpenChange={(open) => {
          if (!open) setRequestToDelete(null)
        }}
        title="Delete Preparation Request"
        description={
          requestToDelete
            ? `Delete preparation request for ${requestToDelete.conductionNumber}? This action cannot be undone.`
            : ''
        }
        confirmLabel="Delete"
        onConfirm={handleDeleteRequest}
      />
    </div>
  )
}
