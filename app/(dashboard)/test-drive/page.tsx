'use client'

import * as React from 'react'
import { ColumnDef } from '@tanstack/react-table'
import { usePathname } from 'next/navigation'
import { Plus, MoreHorizontal, Eye, CheckCircle, XCircle, Edit, Trash2, FileDown, ArrowUpDown, Filter, Calendar, Car, Clock } from 'lucide-react'
import { PageHeader } from '@/components/page-header'
import { StatusBadge } from '@/components/status-badge'
import { DataTable } from '@/components/data-table'
import { ConfirmActionDialog } from '@/components/confirm-action-dialog'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getAuditActor, logAuditEvent } from '@/lib/audit-log'
import { exportPdfReport } from '@/lib/export-pdf'
import { getRoleFromPathname, type Role } from '@/lib/rbac'
import { getScopedRoleData, matchesScopedAgent } from '@/lib/role-scope'
import { toast } from 'sonner'

interface TestDriveRequest {
  id: string
  requestNumber: string
  customerName: string
  customerPhone: string
  customerEmail?: string
  vehicleStockNumber: string
  vehicleName: string
  scheduledDate: string
  scheduledTime: string
  salesAgent: string
  requestedByName: string
  requestedByRole: Role
  status: 'pending' | 'approved' | 'completed' | 'cancelled' | 'no-show'
  notes: string
}

interface TestDriveVehicle {
  id: string
  vehicleStockNumber: string
  vehicleName: string
  status: string
  allocatedTo: string | null
}

type FormState = {
  customerName: string
  customerPhone: string
  vehicleId: string
  scheduledAt: string
  notes: string
}

const requestsSeed: TestDriveRequest[] = [
  { id: '1', requestNumber: 'TD-2024-001', customerName: 'Maria Clara Santos', customerPhone: '+63 917 111 2222', customerEmail: 'maria.santos@email.com', vehicleStockNumber: 'IP-2024-001', vehicleName: 'Isuzu mu-X LS-E 4x2 AT', scheduledDate: '2024-02-06', scheduledTime: '10:00 AM', salesAgent: 'Juan Dela Cruz', requestedByName: 'Juan Dela Cruz', requestedByRole: 'sales-agent', status: 'approved', notes: 'First time buyer, interested in SUV' },
  { id: '2', requestNumber: 'TD-2024-002', customerName: 'Roberto Fernandez', customerPhone: '+63 918 222 3333', customerEmail: 'roberto.f@email.com', vehicleStockNumber: 'IP-2024-007', vehicleName: 'Isuzu mu-X LS-A 4x4 AT', scheduledDate: '2024-02-06', scheduledTime: '2:00 PM', salesAgent: 'Anna Lim', requestedByName: 'Carlos Garcia', requestedByRole: 'manager', status: 'pending', notes: 'Upgrading from old SUV' },
  { id: '3', requestNumber: 'TD-2024-003', customerName: 'Christine Reyes', customerPhone: '+63 919 333 4444', customerEmail: 'christine.r@email.com', vehicleStockNumber: 'IP-2024-002', vehicleName: 'Isuzu D-Max LS 4x4 MT', scheduledDate: '2024-02-05', scheduledTime: '11:00 AM', salesAgent: 'Pedro Reyes', requestedByName: 'Pedro Reyes', requestedByRole: 'sales-agent', status: 'completed', notes: 'Very interested, follow up tomorrow' },
  { id: '4', requestNumber: 'TD-2024-004', customerName: 'Antonio Garcia', customerPhone: '+63 920 444 5555', customerEmail: 'antonio.g@email.com', vehicleStockNumber: 'IP-2024-004', vehicleName: 'Isuzu Traviz L Utility Van', scheduledDate: '2024-02-04', scheduledTime: '3:00 PM', salesAgent: 'Juan Dela Cruz', requestedByName: 'Juan Dela Cruz', requestedByRole: 'sales-agent', status: 'no-show', notes: 'Did not show up, attempted to contact' },
]

const vehicles: TestDriveVehicle[] = [
  { id: 'ip-001', vehicleStockNumber: 'ABC1234', vehicleName: 'Isuzu mu-X LS-E 4x2 AT', status: 'available', allocatedTo: 'Juan Dela Cruz' },
  { id: 'ip-006', vehicleStockNumber: 'NLR4021', vehicleName: 'Isuzu NLR 4-Wheeler Aluminum Van', status: 'available', allocatedTo: null },
  { id: 'ip-009', vehicleStockNumber: 'AVA5512', vehicleName: 'Isuzu D-Max LS 4x2 AT', status: 'available', allocatedTo: null },
  { id: 'ip-010', vehicleStockNumber: 'TRN5566', vehicleName: 'Isuzu D-Max LS 4x4 MT', status: 'pending', allocatedTo: 'Pedro Reyes' },
]

const emptyForm: FormState = { customerName: '', customerPhone: '', vehicleId: '', scheduledAt: '', notes: '' }
const isApprover = (role: Role) => role === 'admin' || role === 'supervisor'
const formatDate = (value: string) => new Intl.DateTimeFormat('en-PH', { month: 'short', day: '2-digit', year: 'numeric' }).format(new Date(value))
const formatTime = (value: string) => new Intl.DateTimeFormat('en-PH', { hour: 'numeric', minute: '2-digit', hour12: true }).format(new Date(value))

export default function TestDrivePage() {
  const pathname = usePathname()
  const role = getRoleFromPathname(pathname)
  const scope = getScopedRoleData(role)
  const [testDrives, setTestDrives] = React.useState(requestsSeed)
  const [selected, setSelected] = React.useState<TestDriveRequest | null>(null)
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [sheetOpen, setSheetOpen] = React.useState(false)
  const [requestToDelete, setRequestToDelete] = React.useState<TestDriveRequest | null>(null)
  const [requestToApprove, setRequestToApprove] = React.useState<TestDriveRequest | null>(null)
  const [requestToReject, setRequestToReject] = React.useState<TestDriveRequest | null>(null)
  const [requestToComplete, setRequestToComplete] = React.useState<TestDriveRequest | null>(null)
  const [statusFilter, setStatusFilter] = React.useState('all')
  const [editingId, setEditingId] = React.useState<string | null>(null)
  const [form, setForm] = React.useState<FormState>(emptyForm)

  const requesterName = role === 'manager' ? scope.managerName ?? 'Manager' : role === 'sales-agent' ? scope.agentName ?? 'Sales Agent' : role === 'supervisor' ? 'Supervisor' : 'Administrator'
  const ownerAgent = role === 'sales-agent' ? scope.agentName ?? 'Sales Agent' : role === 'manager' ? scope.agentNames[0] ?? scope.managerName ?? 'Manager' : 'Admin Pool'

  const scoped = React.useMemo(() => testDrives.filter((request) => {
    if (role === 'admin' || role === 'supervisor') return true
    if (role === 'manager') return (request.requestedByRole === 'manager' && request.requestedByName === scope.managerName) || matchesScopedAgent(role, request.salesAgent) || matchesScopedAgent(role, request.requestedByName)
    return request.requestedByName === scope.agentName || request.salesAgent === scope.agentName
  }), [role, scope.agentName, scope.managerName, testDrives])

  const filtered = React.useMemo(() => statusFilter === 'all' ? scoped : scoped.filter((td) => td.status === statusFilter), [scoped, statusFilter])
  const reservedVehicleStockNumbers = React.useMemo(
    () =>
      new Set(
        testDrives
          .filter(
            (request) =>
              request.id !== editingId &&
              (request.status === 'pending' || request.status === 'approved')
          )
          .map((request) => request.vehicleStockNumber)
      ),
    [editingId, testDrives]
  )
  const baseVehicles = React.useMemo(
    () =>
      vehicles.filter(
        (v) =>
          v.status === 'available' &&
          !v.allocatedTo &&
          !reservedVehicleStockNumbers.has(v.vehicleStockNumber)
      ),
    [reservedVehicleStockNumbers]
  )
  const dialogVehicles = React.useMemo(() => {
    if (!editingId) return baseVehicles
    const current = testDrives.find((r) => r.id === editingId)
    const currentVehicle = vehicles.find((v) => v.vehicleStockNumber === current?.vehicleStockNumber)
    if (!currentVehicle || baseVehicles.some((v) => v.id === currentVehicle.id)) return baseVehicles
    return [currentVehicle, ...baseVehicles]
  }, [baseVehicles, editingId, testDrives])
  const liveSelected = React.useMemo(() => selected ? testDrives.find((r) => r.id === selected.id) ?? null : null, [selected, testDrives])

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((current) => ({ ...current, [key]: value }))
  const resetForm = () => { setEditingId(null); setForm(emptyForm) }
  const openNew = () => { resetForm(); setDialogOpen(true) }
  const openEdit = (request: TestDriveRequest) => {
    const vehicle = vehicles.find((item) => item.vehicleStockNumber === request.vehicleStockNumber)
    setEditingId(request.id)
    setForm({ customerName: request.customerName, customerPhone: request.customerPhone, vehicleId: vehicle?.id ?? '', scheduledAt: new Date(`${request.scheduledDate} ${request.scheduledTime}`).toISOString().slice(0, 16), notes: request.notes })
    setDialogOpen(true)
  }
  const updateStatus = (id: string, status: TestDriveRequest['status']) => {
    setTestDrives((current) => current.map((request) => request.id === id ? { ...request, status } : request))
    setSelected((current) => current && current.id === id ? { ...current, status } : current)
  }
  const removeRequest = (id: string) => {
    setTestDrives((current) => current.filter((request) => request.id !== id))
    if (selected?.id === id) { setSelected(null); setSheetOpen(false) }
  }
  const confirmDeleteRequest = () => {
    if (!requestToDelete) return
    removeRequest(requestToDelete.id)
    logAuditEvent({
      user: getAuditActor(role),
      action: 'DELETE',
      module: 'Test Drive',
      description: `Deleted test drive request ${requestToDelete.requestNumber}.`,
    })
    setRequestToDelete(null)
    toast.success('Test drive request deleted.')
  }
  const confirmApproveRequest = () => {
    if (!requestToApprove) return
    updateStatus(requestToApprove.id, 'approved')
    logAuditEvent({
      user: getAuditActor(role),
      action: 'UPDATE',
      module: 'Test Drive',
      description: `Approved test drive request ${requestToApprove.requestNumber}.`,
    })
    setRequestToApprove(null)
    toast.success('Test drive request approved.')
  }
  const confirmRejectRequest = () => {
    if (!requestToReject) return
    updateStatus(requestToReject.id, 'cancelled')
    logAuditEvent({
      user: getAuditActor(role),
      action: 'UPDATE',
      module: 'Test Drive',
      description: `Rejected test drive request ${requestToReject.requestNumber}.`,
    })
    setRequestToReject(null)
    toast.success('Test drive request rejected.')
  }
  const confirmCompleteRequest = () => {
    if (!requestToComplete) return
    updateStatus(requestToComplete.id, 'completed')
    logAuditEvent({
      user: getAuditActor(role),
      action: 'UPDATE',
      module: 'Test Drive',
      description: `Marked test drive request ${requestToComplete.requestNumber} as completed.`,
    })
    setRequestToComplete(null)
    toast.success('Test drive marked as completed.')
  }
  const saveRequest = () => {
    const vehicle = dialogVehicles.find((item) => item.id === form.vehicleId)
    if (!vehicle || !form.customerName.trim() || !form.customerPhone.trim() || !form.scheduledAt) return
    const existing = editingId ? testDrives.find((request) => request.id === editingId) : null
    const next: TestDriveRequest = {
      id: editingId ?? `td-${Date.now()}`,
      requestNumber: existing?.requestNumber ?? `TD-2024-${String(testDrives.length + 1).padStart(3, '0')}`,
      customerName: form.customerName.trim(),
      customerPhone: form.customerPhone.trim(),
      vehicleStockNumber: vehicle.vehicleStockNumber,
      vehicleName: vehicle.vehicleName,
      scheduledDate: formatDate(form.scheduledAt),
      scheduledTime: formatTime(form.scheduledAt),
      salesAgent: existing?.salesAgent ?? ownerAgent,
      requestedByName: existing?.requestedByName ?? requesterName,
      requestedByRole: existing?.requestedByRole ?? role,
      status: existing?.status ?? (isApprover(role) ? 'approved' : 'pending'),
      notes: form.notes.trim(),
    }
    setTestDrives((current) => editingId ? current.map((request) => request.id === editingId ? next : request) : [next, ...current])
    setSelected((current) => current && current.id === next.id ? next : current)
    setDialogOpen(false)
    logAuditEvent({
      user: getAuditActor(role),
      action: editingId ? 'UPDATE' : 'CREATE',
      module: 'Test Drive',
      description: `${editingId ? 'Updated' : 'Created'} test drive request ${next.requestNumber}.`,
    })
    toast.success(editingId ? 'Test drive request updated.' : 'Test drive request created.')
    resetForm()
  }
  const exportList = () => {
    logAuditEvent({
      user: getAuditActor(role),
      action: 'EXPORT',
      module: 'Test Drive',
      description: 'Exported Test Drive Requests report.',
    })
    exportPdfReport({
      title: 'Test Drive Requests Report',
      subtitle: statusFilter === 'all' ? 'All test drive requests' : `Status: ${statusFilter}`,
      filename: 'test-drive-requests-report',
      columns: [
        { header: 'Request No.', value: (row) => row.requestNumber },
        { header: 'Customer Name', value: (row) => row.customerName },
        { header: 'Phone', value: (row) => row.customerPhone },
        { header: 'Vehicle', value: (row) => row.vehicleName },
        { header: 'Conduction Number', value: (row) => row.vehicleStockNumber },
        { header: 'Scheduled Date', value: (row) => `${row.scheduledDate} ${row.scheduledTime}` },
        { header: 'Requested By', value: (row) => row.requestedByName },
        { header: 'Status', value: (row) => row.status },
      ],
      rows: filtered,
    })
  }
  const exportOne = (request: TestDriveRequest) => {
    logAuditEvent({
      user: getAuditActor(role),
      action: 'EXPORT',
      module: 'Test Drive',
      description: `Exported test drive request ${request.requestNumber}.`,
    })
    exportPdfReport({
      title: `Test Drive Request ${request.requestNumber}`,
      subtitle: `${request.customerName} - ${request.vehicleName}`,
      filename: request.requestNumber.toLowerCase(),
      columns: [
        { header: 'Request No.', value: (row) => row.requestNumber },
        { header: 'Customer', value: (row) => row.customerName },
        { header: 'Contact', value: (row) => row.customerPhone },
        { header: 'Vehicle', value: (row) => row.vehicleName },
        { header: 'Conduction Number', value: (row) => row.vehicleStockNumber },
        { header: 'Schedule', value: (row) => `${row.scheduledDate} ${row.scheduledTime}` },
        { header: 'Requested By', value: (row) => row.requestedByName },
        { header: 'Status', value: (row) => row.status },
        { header: 'Notes', value: (row) => row.notes || '-' },
      ],
      rows: [request],
    })
  }

  const columns: ColumnDef<TestDriveRequest>[] = [
    { accessorKey: 'vehicleName', header: ({ column }) => <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')} className="-ml-4">Vehicle<ArrowUpDown className="ml-2 size-4" /></Button>, cell: ({ row }) => <div><span className="font-medium">{row.getValue('vehicleName')}</span><p className="text-xs text-muted-foreground">{row.original.vehicleStockNumber}</p></div> },
    { accessorKey: 'scheduledDate', header: 'Date', cell: ({ row }) => <span className="font-medium">{row.getValue('scheduledDate')}</span> },
    { accessorKey: 'scheduledTime', header: 'Time', cell: ({ row }) => <span className="font-medium">{row.getValue('scheduledTime')}</span> },
    { accessorKey: 'customerName', header: 'Name', cell: ({ row }) => <div className="flex items-center gap-2"><Avatar className="size-7"><AvatarFallback className="text-[10px] bg-primary/10 text-primary">{(row.getValue('customerName') as string).split(' ').map((name) => name[0]).join('').slice(0, 2)}</AvatarFallback></Avatar><span className="font-medium">{row.getValue('customerName')}</span></div> },
    { accessorKey: 'customerPhone', header: 'Contact' },
    { accessorKey: 'status', header: 'Status', cell: ({ row }) => <StatusBadge status={row.getValue('status')} />, filterFn: (row, id, value) => value === 'all' ? true : row.getValue(id) === value },
    {
      id: 'actions',
      enableHiding: false,
      cell: ({ row }) => {
        const request = row.original
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild><Button variant="ghost" className="size-8 p-0"><span className="sr-only">Open menu</span><MoreHorizontal className="size-4" /></Button></DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => { setSelected(request); setSheetOpen(true) }}><Eye className="mr-2 size-4" />View Details</DropdownMenuItem>
              <DropdownMenuItem onClick={() => openEdit(request)}><Edit className="mr-2 size-4" />Edit</DropdownMenuItem>
              <DropdownMenuItem onClick={() => openEdit(request)}><Calendar className="mr-2 size-4" />Reschedule</DropdownMenuItem>
              <DropdownMenuItem className="text-destructive" onClick={() => setRequestToDelete(request)}><Trash2 className="mr-2 size-4" />Delete</DropdownMenuItem>
              {request.status === 'pending' && isApprover(role) && <DropdownMenuItem className="text-success" onClick={() => setRequestToApprove(request)}><CheckCircle className="mr-2 size-4" />Approve</DropdownMenuItem>}
              {request.status === 'pending' && isApprover(role) && <DropdownMenuItem className="text-destructive" onClick={() => setRequestToReject(request)}><XCircle className="mr-2 size-4" />Reject</DropdownMenuItem>}
              {request.status === 'approved' && <DropdownMenuItem onClick={() => setRequestToComplete(request)}><CheckCircle className="mr-2 size-4" />Mark Completed</DropdownMenuItem>}
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader title="Test Drive Requests" description={role === 'admin' || role === 'supervisor' ? 'Manage customer test drive scheduling' : role === 'manager' ? `Manage test drives for agents under ${scope.managerName}` : `Manage your test drive schedules as ${scope.agentName}`}>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm() }}>
          <DialogTrigger asChild><Button size="sm" onClick={openNew}><Plus className="mr-2 size-4" />New Request</Button></DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingId ? 'Edit Test Drive Request' : 'New Test Drive Request'}</DialogTitle>
              <DialogDescription>{isApprover(role) ? 'Requests made by admin or supervisor are approved immediately.' : 'Requests made by manager or sales agent stay pending until admin or supervisor approval.'}</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Customer Name</Label><Input placeholder="Full name" value={form.customerName} onChange={(event) => setField('customerName', event.target.value)} /></div>
                <div className="space-y-2"><Label>Phone Number</Label><Input placeholder="+63 9XX XXX XXXX" value={form.customerPhone} onChange={(event) => setField('customerPhone', event.target.value)} /></div>
              </div>
              <div className="space-y-2">
                <Label>Select Vehicle</Label>
                <Select value={form.vehicleId} onValueChange={(value) => setField('vehicleId', value)}>
                  <SelectTrigger><SelectValue placeholder="Choose an available unallocated vehicle" /></SelectTrigger>
                  <SelectContent>{dialogVehicles.map((vehicle) => <SelectItem key={vehicle.id} value={vehicle.id}>{vehicle.vehicleStockNumber} - {vehicle.vehicleName}</SelectItem>)}</SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">Only units with Available status and no existing agent allocation can be used for test drive.</p>
              </div>
              <div className="space-y-2">
                <Label>Date and Time</Label>
                <Input type="datetime-local" value={form.scheduledAt} onChange={(event) => setField('scheduledAt', event.target.value)} />
                <p className="text-xs text-muted-foreground">Use one field for the full schedule instead of a separate time dropdown.</p>
              </div>
              <div className="space-y-2"><Label>Notes</Label><Textarea placeholder="Additional notes..." value={form.notes} onChange={(event) => setField('notes', event.target.value)} /></div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setDialogOpen(false); resetForm() }}>Cancel</Button>
              <Button onClick={saveRequest}>{editingId ? 'Save Changes' : 'Schedule Test Drive'}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card><CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground"><Clock className="size-4" />Today&apos;s Schedule</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{filtered.filter((td) => td.scheduledDate === 'Feb 06, 2024').length}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Pending Approval</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-warning">{filtered.filter((td) => td.status === 'pending').length}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Completed This Week</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-success">{filtered.filter((td) => td.status === 'completed').length}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground"><Car className="size-4" />Available Units</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{baseVehicles.length}</div><p className="mt-1 text-xs text-muted-foreground">Available and not allocated to any agent</p></CardContent></Card>
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        searchKey="customerName"
        searchPlaceholder="Search by customer name..."
        exportConfig={{
          title: 'Test Drive Requests Report',
          subtitle: 'Test drive requests listing',
          filename: 'test-drive-requests-report',
        }}
        filterComponent={
          <div className="flex items-center gap-2">
            <Filter className="size-4 text-muted-foreground" />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40"><SelectValue placeholder="All Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
                <SelectItem value="no-show">No Show</SelectItem>
              </SelectContent>
            </Select>
          </div>
        }
      />

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="sm:max-w-lg">
          <SheetHeader><SheetTitle>Test Drive Details</SheetTitle><SheetDescription>Complete information about this test drive request.</SheetDescription></SheetHeader>
          {liveSelected && <div className="mt-6 space-y-6">
            <div className="flex items-center justify-between"><span className="text-xl font-bold text-primary">{liveSelected.requestNumber}</span><StatusBadge status={liveSelected.status} /></div>
            <div className="space-y-4">
              <div className="rounded-lg bg-muted/50 p-4"><h4 className="mb-3 text-sm font-medium">Customer Information</h4><div className="flex items-center gap-3"><Avatar className="size-10"><AvatarFallback className="bg-primary/10 text-primary">{liveSelected.customerName.split(' ').map((name) => name[0]).join('').slice(0, 2)}</AvatarFallback></Avatar><div><p className="font-medium">{liveSelected.customerName}</p><p className="text-sm text-muted-foreground">{liveSelected.customerPhone}</p></div></div></div>
              <div className="rounded-lg bg-muted/50 p-4"><h4 className="mb-3 text-sm font-medium">Schedule</h4><div className="space-y-2"><div className="flex justify-between"><span className="text-sm text-muted-foreground">Date</span><span className="font-medium">{liveSelected.scheduledDate}</span></div><div className="flex justify-between"><span className="text-sm text-muted-foreground">Time</span><span className="font-medium">{liveSelected.scheduledTime}</span></div><div className="flex justify-between"><span className="text-sm text-muted-foreground">Requested By</span><span className="font-medium">{liveSelected.requestedByName}</span></div></div></div>
              <div className="rounded-lg bg-muted/50 p-4"><h4 className="mb-3 text-sm font-medium">Vehicle</h4><div className="space-y-2"><div className="flex justify-between"><span className="text-sm text-muted-foreground">Vehicle</span><span className="font-medium">{liveSelected.vehicleName}</span></div><div className="flex justify-between"><span className="text-sm text-muted-foreground">Conduction Number</span><span className="font-medium">{liveSelected.vehicleStockNumber}</span></div></div></div>
              {liveSelected.notes && <div><h4 className="mb-2 text-sm font-medium">Notes</h4><p className="rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground">{liveSelected.notes}</p></div>}
            </div>
            <div className="flex gap-2 border-t pt-4">
              {liveSelected.status === 'pending' && isApprover(role) && <Button className="flex-1" onClick={() => setRequestToApprove(liveSelected)}><CheckCircle className="mr-2 size-4" />Approve</Button>}
              {liveSelected.status === 'pending' && isApprover(role) && <Button variant="outline" onClick={() => setRequestToReject(liveSelected)}><XCircle className="mr-2 size-4" />Reject</Button>}
              {liveSelected.status === 'approved' && <Button className="flex-1" onClick={() => setRequestToComplete(liveSelected)}><CheckCircle className="mr-2 size-4" />Mark Completed</Button>}
              <Button variant="outline" onClick={() => exportOne(liveSelected)}><FileDown className="mr-2 size-4" />Export</Button>
            </div>
          </div>}
        </SheetContent>
      </Sheet>

      <ConfirmActionDialog
        open={Boolean(requestToDelete)}
        onOpenChange={(open) => {
          if (!open) setRequestToDelete(null)
        }}
        title="Delete Test Drive Request"
        description={
          requestToDelete
            ? `Delete request ${requestToDelete.requestNumber} for ${requestToDelete.customerName}? This action cannot be undone.`
            : ''
        }
        confirmLabel="Delete"
        onConfirm={confirmDeleteRequest}
      />

      <ConfirmActionDialog
        open={Boolean(requestToApprove)}
        onOpenChange={(open) => {
          if (!open) setRequestToApprove(null)
        }}
        title="Approve Test Drive"
        description={
          requestToApprove
            ? `Approve request ${requestToApprove.requestNumber} for ${requestToApprove.customerName}?`
            : ''
        }
        confirmLabel="Approve"
        onConfirm={confirmApproveRequest}
      />

      <ConfirmActionDialog
        open={Boolean(requestToReject)}
        onOpenChange={(open) => {
          if (!open) setRequestToReject(null)
        }}
        title="Reject Test Drive"
        description={
          requestToReject
            ? `Reject request ${requestToReject.requestNumber} for ${requestToReject.customerName}?`
            : ''
        }
        confirmLabel="Reject"
        onConfirm={confirmRejectRequest}
      />

      <ConfirmActionDialog
        open={Boolean(requestToComplete)}
        onOpenChange={(open) => {
          if (!open) setRequestToComplete(null)
        }}
        title="Complete Test Drive"
        description={
          requestToComplete
            ? `Mark request ${requestToComplete.requestNumber} as completed?`
            : ''
        }
        confirmLabel="Mark Completed"
        onConfirm={confirmCompleteRequest}
      />
    </div>
  )
}
