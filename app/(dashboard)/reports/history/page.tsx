'use client'

import * as React from 'react'
import { usePathname } from 'next/navigation'
import {
  CalendarClock,
  Car,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ClipboardCheck,
  Eye,
  FileDown,
  Filter,
  PackageCheck,
  Phone,
  UserRound,
} from 'lucide-react'

import { PageHeader } from '@/components/page-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { exportPdfReport } from '@/lib/export-pdf'
import { getRoleFromPathname } from '@/lib/rbac'
import { getScopedRoleData, matchesScopedAgent } from '@/lib/role-scope'

type VehicleLifecycleStatus = 'in-preparation' | 'ready-for-pickup' | 'released'

interface PreparationStep {
  task: string
  completedAt: string
}

interface VehicleHistoryEvent {
  at: string
  title: string
  detail: string
}

interface VehicleHistoryRecord {
  id: string
  vehicleAddedAt: string
  unitName: string
  variation: string
  conductionNumber: string
  bodyColor: string
  deliveryPickupAt: string
  preparationSteps: PreparationStep[]
  agentAssigned: string
  agentAssignedAt: string
  customerName: string
  customerContact: string
  releasedAt: string
  status: VehicleLifecycleStatus
  historyEvents: VehicleHistoryEvent[]
}

const vehicleHistoryStorageKey = 'itrack.vehicle-history.records'

const vehicleHistoryRecords: VehicleHistoryRecord[] = [
  {
    id: 'VH-001',
    vehicleAddedAt: '2024-01-15 08:30',
    unitName: 'mu-X',
    variation: 'LS-E 4x2 AT',
    conductionNumber: 'ABC1234',
    bodyColor: 'Silky White Pearl',
    deliveryPickupAt: '2024-01-20 14:00',
    preparationSteps: [
      { task: 'Exterior wash and polish', completedAt: '2024-01-21 09:10' },
      { task: 'Interior detailing', completedAt: '2024-01-21 10:25' },
      { task: 'Tint installation', completedAt: '2024-01-21 13:40' },
      { task: 'Final inspection', completedAt: '2024-01-21 16:00' },
    ],
    agentAssigned: 'Juan Dela Cruz',
    agentAssignedAt: '2024-01-19 11:15',
    customerName: 'Andrea Villanueva',
    customerContact: '09171234567',
    releasedAt: '2024-01-22 15:30',
    status: 'released',
    historyEvents: [
      {
        at: '2024-01-15 08:30',
        title: 'Vehicle added',
        detail: 'Unit entered inventory as mu-X LS-E 4x2 AT in Silky White Pearl.',
      },
      {
        at: '2024-01-19 11:15',
        title: 'Agent assigned',
        detail: 'Assigned to sales agent Juan Dela Cruz.',
      },
      {
        at: '2024-01-20 14:00',
        title: 'Delivery pickup scheduled',
        detail: 'Vehicle pulled for delivery and preparation handling.',
      },
      {
        at: '2024-01-21 16:00',
        title: 'Preparation completed',
        detail: 'Wash, detailing, tinting, and final inspection completed.',
      },
      {
        at: '2024-01-22 15:30',
        title: 'Vehicle released',
        detail: 'Released to Andrea Villanueva. Contact: 09171234567.',
      },
    ],
  },
  {
    id: 'VH-002',
    vehicleAddedAt: '2024-01-18 09:05',
    unitName: 'D-Max',
    variation: 'LS 4x4 MT',
    conductionNumber: 'TRN5566',
    bodyColor: 'Obsidian Gray',
    deliveryPickupAt: '2024-01-24 08:45',
    preparationSteps: [
      { task: 'Exterior wash and polish', completedAt: '2024-01-24 10:00' },
      { task: 'Rust proof application', completedAt: '2024-01-24 13:20' },
      { task: 'Accessories installation', completedAt: '2024-01-25 09:15' },
    ],
    agentAssigned: 'Pedro Reyes',
    agentAssignedAt: '2024-01-22 16:30',
    customerName: 'Mark Anthony Lopez',
    customerContact: '09184567890',
    releasedAt: 'Pending release',
    status: 'in-preparation',
    historyEvents: [
      {
        at: '2024-01-18 09:05',
        title: 'Vehicle added',
        detail: 'Unit entered inventory as D-Max LS 4x4 MT in Obsidian Gray.',
      },
      {
        at: '2024-01-22 16:30',
        title: 'Agent assigned',
        detail: 'Assigned to sales agent Pedro Reyes.',
      },
      {
        at: '2024-01-24 08:45',
        title: 'Delivery pickup started',
        detail: 'Vehicle pulled from yard for preparation and turnover processing.',
      },
      {
        at: '2024-01-25 09:15',
        title: 'Preparation in progress',
        detail: 'Wash, rust proofing, and accessories installation already completed.',
      },
    ],
  },
  {
    id: 'VH-003',
    vehicleAddedAt: '2024-01-20 10:10',
    unitName: 'mu-X',
    variation: 'RZ4E 4x2 AT',
    conductionNumber: 'LAG8821',
    bodyColor: 'Sapphire Blue',
    deliveryPickupAt: '2024-02-03 13:30',
    preparationSteps: [
      { task: 'Exterior wash and polish', completedAt: '2024-02-03 15:00' },
      { task: 'Interior deep cleaning', completedAt: '2024-02-03 16:20' },
      { task: 'Engine bay cleaning', completedAt: '2024-02-04 08:40' },
      { task: 'Quality assurance inspection', completedAt: '2024-02-04 11:10' },
    ],
    agentAssigned: 'Anna Lim',
    agentAssignedAt: '2024-02-01 10:50',
    customerName: 'Catherine Ramos',
    customerContact: '09192345678',
    releasedAt: '2024-02-04 17:45',
    status: 'released',
    historyEvents: [
      {
        at: '2024-01-20 10:10',
        title: 'Vehicle added',
        detail: 'Unit entered inventory as mu-X RZ4E 4x2 AT in Sapphire Blue.',
      },
      {
        at: '2024-02-01 10:50',
        title: 'Agent assigned',
        detail: 'Assigned to sales agent Anna Lim.',
      },
      {
        at: '2024-02-03 13:30',
        title: 'Delivery pickup scheduled',
        detail: 'Vehicle endorsed for customer pickup preparation.',
      },
      {
        at: '2024-02-04 11:10',
        title: 'Preparation completed',
        detail: 'Cleaning and quality assurance checklist finished.',
      },
      {
        at: '2024-02-04 17:45',
        title: 'Vehicle released',
        detail: 'Released to Catherine Ramos. Contact: 09192345678.',
      },
    ],
  },
  {
    id: 'VH-004',
    vehicleAddedAt: '2024-02-01 08:20',
    unitName: 'mu-X',
    variation: 'LS-A 4x4 AT',
    conductionNumber: 'REL7744',
    bodyColor: 'Cosmic Black',
    deliveryPickupAt: '2024-02-05 09:00',
    preparationSteps: [
      { task: 'Exterior wash and polish', completedAt: '2024-02-05 09:45' },
      { task: 'Interior detailing', completedAt: '2024-02-05 11:05' },
      { task: 'Accessories fitment', completedAt: '2024-02-05 14:30' },
      { task: 'Final inspection', completedAt: '2024-02-05 16:10' },
    ],
    agentAssigned: 'Anna Lim',
    agentAssignedAt: '2024-02-03 14:25',
    customerName: 'Josefina Mendoza',
    customerContact: '09201234567',
    releasedAt: '2024-02-06 10:20',
    status: 'released',
    historyEvents: [
      {
        at: '2024-02-01 08:20',
        title: 'Vehicle added',
        detail: 'Unit entered inventory as mu-X LS-A 4x4 AT in Cosmic Black.',
      },
      {
        at: '2024-02-03 14:25',
        title: 'Agent assigned',
        detail: 'Assigned to sales agent Anna Lim.',
      },
      {
        at: '2024-02-05 09:00',
        title: 'Delivery pickup started',
        detail: 'Vehicle moved to dispatch area for customer turnover.',
      },
      {
        at: '2024-02-05 16:10',
        title: 'Preparation completed',
        detail: 'Detailing, accessories fitment, and inspection completed.',
      },
      {
        at: '2024-02-06 10:20',
        title: 'Vehicle released',
        detail: 'Released to Josefina Mendoza. Contact: 09201234567.',
      },
    ],
  },
]

const statusLabels: Record<VehicleLifecycleStatus, string> = {
  'in-preparation': 'In Preparation',
  'ready-for-pickup': 'Ready for Pickup',
  released: 'Released',
}

const statusBadgeClasses: Record<VehicleLifecycleStatus, string> = {
  'in-preparation': 'border-warning/30 bg-warning/10 text-warning',
  'ready-for-pickup': 'border-info/30 bg-info/10 text-info',
  released: 'border-success/30 bg-success/10 text-success',
}

const buildPreparationSummary = (steps: PreparationStep[]) =>
  steps.map((step) => `${step.completedAt} - ${step.task}`).join('\n')

const buildHistorySummary = (events: VehicleHistoryEvent[]) =>
  events.map((event) => `${event.at} - ${event.title}: ${event.detail}`).join('\n')

export default function VehicleHistoryPage() {
  const pathname = usePathname()
  const role = getRoleFromPathname(pathname)
  const scope = getScopedRoleData(role)
  const [dynamicHistoryRecords, setDynamicHistoryRecords] = React.useState<VehicleHistoryRecord[]>([])
  const [statusFilter, setStatusFilter] = React.useState<'all' | VehicleLifecycleStatus>('all')
  const [searchTerm, setSearchTerm] = React.useState('')
  const [currentPage, setCurrentPage] = React.useState(1)
  const [itemsPerPage, setItemsPerPage] = React.useState(10)
  const [selectedRecord, setSelectedRecord] = React.useState<VehicleHistoryRecord | null>(null)
  const [isDetailsOpen, setIsDetailsOpen] = React.useState(false)

  React.useEffect(() => {
    const loadDynamicHistory = () => {
      if (typeof window === 'undefined') return
      const storedRecords = window.localStorage.getItem(vehicleHistoryStorageKey)
      setDynamicHistoryRecords(storedRecords ? JSON.parse(storedRecords) : [])
    }

    loadDynamicHistory()
    window.addEventListener('vehicle-history-updated', loadDynamicHistory)

    return () => {
      window.removeEventListener('vehicle-history-updated', loadDynamicHistory)
    }
  }, [])

  const filteredRecords = React.useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase()
    const mergedRecords = [...dynamicHistoryRecords, ...vehicleHistoryRecords]

    return mergedRecords.filter((record) => {
      const matchesScope = matchesScopedAgent(role, record.agentAssigned)
      const matchesReleasedScope =
        role === 'admin' || role === 'supervisor' ? true : record.status === 'released'
      const matchesStatus = statusFilter === 'all' || record.status === statusFilter
      const matchesSearch =
        normalizedSearch.length === 0 ||
        [
          record.conductionNumber,
          record.unitName,
          record.variation,
          record.customerName,
          record.agentAssigned,
        ]
          .join(' ')
          .toLowerCase()
          .includes(normalizedSearch)

      return matchesScope && matchesReleasedScope && matchesStatus && matchesSearch
    })
  }, [dynamicHistoryRecords, role, searchTerm, statusFilter])

  const totalReleased = filteredRecords.filter((record) => record.status === 'released').length
  const totalPreparationSteps = filteredRecords.reduce(
    (total, record) => total + record.preparationSteps.length,
    0
  )
  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / itemsPerPage))
  const paginatedRecords = React.useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    return filteredRecords.slice(startIndex, startIndex + itemsPerPage)
  }, [currentPage, filteredRecords, itemsPerPage])

  React.useEffect(() => {
    setCurrentPage(1)
  }, [itemsPerPage, searchTerm, statusFilter])

  React.useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages)
    }
  }, [currentPage, totalPages])

  const handleExportPdf = () => {
    exportPdfReport({
      title: 'Release History Report',
      subtitle: 'Complete unit history from inventory entry to release',
      filename: 'vehicle-history-report',
      layout: 'cards',
      recordTitle: (row) => `${row.conductionNumber} • ${row.unitName}`,
      recordSubtitle: (row) => `${row.variation} • ${row.bodyColor}`,
      columns: [
        { header: 'Vehicle Added', value: (row) => row.vehicleAddedAt },
        { header: 'Conduction Number', value: (row) => row.conductionNumber },
        { header: 'Unit Details', value: (row) => `${row.unitName}\n${row.variation}\n${row.bodyColor}` },
        { header: 'Delivery Pickup', value: (row) => row.deliveryPickupAt },
        { header: 'Preparation Done', value: (row) => buildPreparationSummary(row.preparationSteps) },
        { header: 'Agent Assigned', value: (row) => `${row.agentAssigned}\n${row.agentAssignedAt}` },
        { header: 'Customer', value: (row) => `${row.customerName}\n${row.customerContact}` },
        { header: 'Date Released', value: (row) => row.releasedAt },
        { header: 'History', value: (row) => buildHistorySummary(row.historyEvents), spanFull: true },
      ],
      rows: filteredRecords,
    })
  }

  const handleOpenDetails = (record: VehicleHistoryRecord) => {
    setSelectedRecord(record)
    setIsDetailsOpen(true)
  }

  const handleExportSingleRecord = (record: VehicleHistoryRecord) => {
    exportPdfReport({
      title: 'Release History Report',
      subtitle: 'Complete unit history from inventory entry to release',
      filename: `vehicle-history-${record.conductionNumber.toLowerCase()}`,
      layout: 'cards',
      recordTitle: (row) => `${row.conductionNumber} • ${row.unitName}`,
      recordSubtitle: (row) => `${row.variation} • ${row.bodyColor}`,
      columns: [
        { header: 'Vehicle Added', value: (row) => row.vehicleAddedAt },
        { header: 'Conduction Number', value: (row) => row.conductionNumber },
        {
          header: 'Unit Details',
          value: (row) => `${row.unitName}\n${row.variation}\n${row.bodyColor}`,
        },
        { header: 'Delivery Pickup', value: (row) => row.deliveryPickupAt },
        {
          header: 'Preparation Done',
          value: (row) => buildPreparationSummary(row.preparationSteps),
        },
        { header: 'Agent Assigned', value: (row) => `${row.agentAssigned}\n${row.agentAssignedAt}` },
        { header: 'Customer', value: (row) => `${row.customerName}\n${row.customerContact}` },
        { header: 'Date Released', value: (row) => row.releasedAt },
        { header: 'History', value: (row) => buildHistorySummary(row.historyEvents), spanFull: true },
      ],
      rows: [record],
    })
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Release History"
        description={
          role === 'admin' || role === 'supervisor'
            ? 'Complete release history with dated events from inventory entry up to release'
            : role === 'manager'
            ? `Release history for released units handled by agents under ${scope.managerName}`
            : `Release history for ${scope.agentName}`
        }
      >
        <Button variant="outline" onClick={handleExportPdf}>
          <FileDown className="mr-2 size-4" />
          Export Report
        </Button>
      </PageHeader>

      <div className="grid gap-3 md:grid-cols-3">
        <Card className="py-4">
          <CardContent className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Units</p>
              <p className="text-2xl font-bold">{filteredRecords.length}</p>
            </div>
            <Car className="size-5 text-primary" />
          </CardContent>
        </Card>
        <Card className="py-4">
          <CardContent className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Released</p>
              <p className="text-2xl font-bold">{totalReleased}</p>
            </div>
            <PackageCheck className="size-5 text-success" />
          </CardContent>
        </Card>
        <Card className="py-4">
          <CardContent className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Prep Steps</p>
              <p className="text-2xl font-bold">{totalPreparationSteps}</p>
            </div>
            <ClipboardCheck className="size-5 text-primary" />
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Filter className="size-4 text-muted-foreground" />
          Filters
        </div>
        <Input
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          placeholder="Search conduction number, unit, customer, or agent"
          className="lg:max-w-sm"
        />
        <Select
          value={statusFilter}
          onValueChange={(value) => setStatusFilter(value as 'all' | VehicleLifecycleStatus)}
        >
          <SelectTrigger className="w-full lg:w-52">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="in-preparation">In Preparation</SelectItem>
            <SelectItem value="ready-for-pickup">Ready for Pickup</SelectItem>
            <SelectItem value="released">Released</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card className="gap-0 overflow-hidden py-0">
        <CardHeader className="border-b bg-muted/20 px-5 py-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-base">Release History List</CardTitle>
              <CardDescription>
                Showing {paginatedRecords.length} of {filteredRecords.length} record{filteredRecords.length === 1 ? '' : 's'}
              </CardDescription>
            </div>
            <div className="text-sm text-muted-foreground">
              Page {currentPage} of {totalPages}
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-0">
        {filteredRecords.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              No release history records match the current filters.
            </div>
        ) : (
          paginatedRecords.map((record) => (
            <div key={record.id} className="border-b px-5 py-4 last:border-b-0">
              <div className="rounded-xl border bg-background p-4">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0 space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-base font-semibold text-primary">{record.conductionNumber}</p>
                      <Badge variant="outline" className={statusBadgeClasses[record.status]}>
                        {statusLabels[record.status]}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {record.unitName} {record.variation} in {record.bodyColor}
                    </p>
                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                      <div className="rounded-lg border bg-muted/20 p-3">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                          Added
                        </p>
                        <p className="mt-1 text-sm font-medium">{record.vehicleAddedAt}</p>
                      </div>
                      <div className="rounded-lg border bg-muted/20 p-3">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                          Pickup
                        </p>
                        <p className="mt-1 text-sm font-medium">{record.deliveryPickupAt}</p>
                      </div>
                      <div className="rounded-lg border bg-muted/20 p-3">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                          Agent
                        </p>
                        <p className="mt-1 text-sm font-medium">{record.agentAssigned}</p>
                      </div>
                      <div className="rounded-lg border bg-muted/20 p-3">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                          Customer
                        </p>
                        <p className="mt-1 text-sm font-medium">{record.customerName}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <div className="rounded-lg border bg-muted/20 px-3 py-2 text-right">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                        Released
                      </p>
                      <p className="mt-1 text-sm font-medium">{record.releasedAt}</p>
                    </div>
                    <Button variant="outline" onClick={() => handleExportSingleRecord(record)}>
                      <FileDown className="mr-2 size-4" />
                      Export Report
                    </Button>
                    <Button onClick={() => handleOpenDetails(record)}>
                      <Eye className="mr-2 size-4" />
                      View Details
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
        </CardContent>
      </Card>

      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="w-[96vw] max-w-[96vw] sm:!max-w-[1600px] overflow-hidden p-0">
          <DialogHeader className="border-b bg-gradient-to-r from-background via-muted/15 to-accent/20 px-6 py-5">
            <DialogTitle>Release History Details</DialogTitle>
            <DialogDescription>
              Complete unit history from inventory entry up to release.
            </DialogDescription>
          </DialogHeader>
          {selectedRecord && (
            <div className="max-h-[85vh] space-y-6 overflow-y-auto px-6 py-6">
              <div className="rounded-2xl border bg-gradient-to-br from-background to-muted/30 p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-2xl font-semibold text-primary">{selectedRecord.conductionNumber}</p>
                      <Badge variant="outline" className={statusBadgeClasses[selectedRecord.status]}>
                        {statusLabels[selectedRecord.status]}
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {selectedRecord.unitName} {selectedRecord.variation} in {selectedRecord.bodyColor}
                    </p>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-3 lg:min-w-[420px]">
                    <div className="rounded-xl border bg-background/90 p-3">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                        Added
                      </p>
                      <p className="mt-1 text-sm font-medium">{selectedRecord.vehicleAddedAt}</p>
                    </div>
                    <div className="rounded-xl border bg-background/90 p-3">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                        Pickup
                      </p>
                      <p className="mt-1 text-sm font-medium">{selectedRecord.deliveryPickupAt}</p>
                    </div>
                    <div className="rounded-xl border bg-background/90 p-3">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                        Released
                      </p>
                      <p className="mt-1 text-sm font-medium">{selectedRecord.releasedAt}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 xl:grid-cols-[1.02fr_0.98fr]">
                <div className="grid gap-4">
                  <div className="rounded-xl border bg-background p-4">
                    <h3 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                      Vehicle Information
                    </h3>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-lg bg-muted/20 p-3">
                        <p className="text-xs text-muted-foreground">Unit Name</p>
                        <p className="mt-1 text-sm font-medium">{selectedRecord.unitName}</p>
                      </div>
                      <div className="rounded-lg bg-muted/20 p-3">
                        <p className="text-xs text-muted-foreground">Variation</p>
                        <p className="mt-1 text-sm font-medium">{selectedRecord.variation}</p>
                      </div>
                      <div className="rounded-lg bg-muted/20 p-3">
                        <p className="text-xs text-muted-foreground">Conduction Number</p>
                        <p className="mt-1 text-sm font-medium">{selectedRecord.conductionNumber}</p>
                      </div>
                      <div className="rounded-lg bg-muted/20 p-3">
                        <p className="text-xs text-muted-foreground">Body Color</p>
                        <p className="mt-1 text-sm font-medium">{selectedRecord.bodyColor}</p>
                      </div>
                    </div>
                    <div className="mt-3 rounded-lg bg-muted/20 p-3 text-sm">
                      <p className="flex items-start gap-2">
                        <CalendarClock className="mt-0.5 size-4 text-primary" />
                        <span>Delivery Pickup: {selectedRecord.deliveryPickupAt}</span>
                      </p>
                    </div>
                  </div>

                  <div className="rounded-xl border bg-background p-4">
                    <h3 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                      Agent and Customer
                    </h3>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-lg bg-muted/20 p-3">
                        <div className="flex items-start gap-2">
                          <UserRound className="mt-0.5 size-4 text-primary" />
                          <div>
                            <p className="text-xs text-muted-foreground">Assigned Agent</p>
                            <p className="mt-1 text-sm font-medium">{selectedRecord.agentAssigned}</p>
                            <p className="mt-1 text-xs text-muted-foreground">{selectedRecord.agentAssignedAt}</p>
                          </div>
                        </div>
                      </div>
                      <div className="rounded-lg bg-muted/20 p-3">
                        <div className="flex items-start gap-2">
                          <Phone className="mt-0.5 size-4 text-primary" />
                          <div>
                            <p className="text-xs text-muted-foreground">Customer</p>
                            <p className="mt-1 text-sm font-medium">{selectedRecord.customerName}</p>
                            <p className="mt-1 text-xs text-muted-foreground">{selectedRecord.customerContact}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border bg-background p-4">
                    <h3 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                      Preparation Done
                    </h3>
                    <div className="mt-4 grid gap-3">
                      {selectedRecord.preparationSteps.map((step, index) => (
                        <div
                          key={`${selectedRecord.id}-${step.task}`}
                          className="flex items-start gap-3 rounded-xl border border-success/15 bg-success/5 p-3"
                        >
                          <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-success/15 text-xs font-semibold text-success">
                            {index + 1}
                          </div>
                          <div>
                            <p className="text-sm font-medium">{step.task}</p>
                            <p className="mt-1 text-xs text-muted-foreground">{step.completedAt}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border bg-background p-4">
                  <h3 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    Complete History Timeline
                  </h3>
                  <div className="mt-4 space-y-4">
                    {selectedRecord.historyEvents.map((event, index) => (
                      <div
                        key={`${selectedRecord.id}-${event.at}-${event.title}`}
                        className="flex gap-4 rounded-xl border bg-muted/10 p-3"
                      >
                        <div className="flex flex-col items-center">
                          <div className="size-3 rounded-full bg-primary" />
                          {index < selectedRecord.historyEvents.length - 1 && (
                            <div className="mt-2 h-full min-h-10 w-px bg-border" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary/80">
                            {event.at}
                          </p>
                          <p className="mt-1 text-sm font-semibold">{event.title}</p>
                          <p className="mt-1 text-sm leading-6 text-muted-foreground">
                            {event.detail}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {filteredRecords.length > 0 && (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-muted-foreground">
            {filteredRecords.length} row(s)
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Rows per page</span>
              <Select value={`${itemsPerPage}`} onValueChange={(value) => setItemsPerPage(Number(value))}>
                <SelectTrigger className="h-8 w-[70px]">
                  <SelectValue placeholder={itemsPerPage} />
                </SelectTrigger>
                <SelectContent side="top">
                  {[10, 20, 30, 40, 50].map((pageSize) => (
                    <SelectItem key={pageSize} value={`${pageSize}`}>
                      {pageSize}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              Page {currentPage} of {totalPages}
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                className="size-8"
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
              >
                <ChevronsLeft className="size-4" />
                <span className="sr-only">Go to first page</span>
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="size-8"
                onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="size-4" />
                <span className="sr-only">Go to previous page</span>
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="size-8"
                onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                disabled={currentPage === totalPages}
              >
                <ChevronRight className="size-4" />
                <span className="sr-only">Go to next page</span>
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="size-8"
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
              >
                <ChevronsRight className="size-4" />
                <span className="sr-only">Go to last page</span>
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
