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
import { BackendPopulatedUser, getEntityId } from '@/lib/backend-helpers'
import {
  deriveReleaseHistoryRecords,
  fetchReportSnapshot,
  type ReleaseHistoryRecord,
  type ReleaseHistoryStatus,
} from '@/lib/report-data'
import { getRoleFromPathname } from '@/lib/rbac'
import { getSessionUser } from '@/lib/session'

const statusLabels: Record<ReleaseHistoryStatus, string> = {
  'in-preparation': 'In Preparation',
  'ready-for-pickup': 'Ready for Pickup',
  released: 'Released',
}

const statusBadgeClasses: Record<ReleaseHistoryStatus, string> = {
  'in-preparation': 'border-warning/30 bg-warning/10 text-warning',
  'ready-for-pickup': 'border-info/30 bg-info/10 text-info',
  released: 'border-success/30 bg-success/10 text-success',
}

const buildPreparationSummary = (steps: ReleaseHistoryRecord['preparationSteps']) =>
  steps.map((step) => `${step.completedAt} - ${step.task}`).join('\n')

const buildHistorySummary = (events: ReleaseHistoryRecord['historyEvents']) =>
  events.map((event) => `${event.at} - ${event.title}: ${event.detail}`).join('\n')

const getFullName = (value?: { firstName?: string; lastName?: string } | null) =>
  `${value?.firstName ?? ''} ${value?.lastName ?? ''}`.trim()

export default function VehicleHistoryPage() {
  const pathname = usePathname()
  const role = getRoleFromPathname(pathname)
  const sessionUser = getSessionUser()
  const currentUserName = React.useMemo(
    () => getFullName(sessionUser),
    [sessionUser]
  )
  const [users, setUsers] = React.useState<BackendPopulatedUser[]>([])
  const [records, setRecords] = React.useState<ReleaseHistoryRecord[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [statusFilter, setStatusFilter] = React.useState<'all' | ReleaseHistoryStatus>('all')
  const [searchTerm, setSearchTerm] = React.useState('')
  const [currentPage, setCurrentPage] = React.useState(1)
  const [itemsPerPage, setItemsPerPage] = React.useState(10)
  const [selectedRecord, setSelectedRecord] = React.useState<ReleaseHistoryRecord | null>(null)
  const [isDetailsOpen, setIsDetailsOpen] = React.useState(false)

  React.useEffect(() => {
    let isMounted = true

    const loadHistory = async () => {
      setIsLoading(true)

      try {
        const snapshot = await fetchReportSnapshot()
        if (!isMounted) return

        setUsers(snapshot.users)
        setRecords(deriveReleaseHistoryRecords(snapshot))
      } catch {
        if (!isMounted) return
        setUsers([])
        setRecords([])
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    void loadHistory()

    return () => {
      isMounted = false
    }
  }, [])

  const scopedAgentNames = React.useMemo(() => {
    if (role === 'manager') {
      return users
        .filter(
          (user) => user.role === 'sales_agent' && getEntityId(user.managerId) === sessionUser?.id
        )
        .map(getFullName)
        .filter(Boolean)
    }

    if (role === 'sales-agent') {
      return currentUserName ? [currentUserName] : []
    }

    return []
  }, [currentUserName, role, sessionUser?.id, users])

  const filteredRecords = React.useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase()

    return records.filter((record) => {
      const matchesScope =
        role === 'admin' || role === 'supervisor'
          ? true
          : role === 'manager'
          ? scopedAgentNames.includes(record.agentAssigned)
          : record.agentAssigned === currentUserName
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
  }, [currentUserName, records, role, scopedAgentNames, searchTerm, statusFilter])

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
      subtitle: 'Complete unit history from backend preparation and release records',
      filename: 'vehicle-history-report',
      layout: 'cards',
      recordTitle: (row) => `${row.conductionNumber} - ${row.unitName}`,
      recordSubtitle: (row) => `${row.variation} - ${row.bodyColor}`,
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

  const handleOpenDetails = (record: ReleaseHistoryRecord) => {
    setSelectedRecord(record)
    setIsDetailsOpen(true)
  }

  const handleExportSingleRecord = (record: ReleaseHistoryRecord) => {
    exportPdfReport({
      title: 'Release History Report',
      subtitle: 'Complete unit history from backend preparation and release records',
      filename: `vehicle-history-${record.conductionNumber.toLowerCase()}`,
      layout: 'cards',
      recordTitle: (row) => `${row.conductionNumber} - ${row.unitName}`,
      recordSubtitle: (row) => `${row.variation} - ${row.bodyColor}`,
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
            ? 'Complete release history with dated events from backend preparation records'
            : role === 'manager'
            ? `Release history for released units handled by agents under ${currentUserName || 'your team'}`
            : `Release history for ${currentUserName || 'your account'}`
        }
      >
        <Button variant="outline" onClick={handleExportPdf} disabled={filteredRecords.length === 0}>
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
          onValueChange={(value) => setStatusFilter(value as 'all' | ReleaseHistoryStatus)}
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
                {isLoading
                  ? 'Loading backend release history...'
                  : `Showing ${paginatedRecords.length} of ${filteredRecords.length} record${filteredRecords.length === 1 ? '' : 's'}`}
              </CardDescription>
            </div>
            <div className="text-sm text-muted-foreground">
              Page {currentPage} of {totalPages}
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-0">
          {isLoading ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              Loading release history records...
            </div>
          ) : filteredRecords.length === 0 ? (
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
        <DialogContent className="w-[96vw] max-w-[96vw] overflow-hidden p-0 sm:!max-w-[1600px]">
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
                      {selectedRecord.preparationSteps.length > 0 ? (
                        selectedRecord.preparationSteps.map((step, index) => (
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
                        ))
                      ) : (
                        <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
                          No completed checklist items were stored for this release.
                        </div>
                      )}
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
                        key={`${selectedRecord.id}-${event.atIso}-${event.title}`}
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
