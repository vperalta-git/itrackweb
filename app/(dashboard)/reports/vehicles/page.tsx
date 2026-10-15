'use client'

import * as React from 'react'
import { BarChart3, Car, FileDown, Filter, TrendingDown, TrendingUp, Users } from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { PageHeader } from '@/components/page-header'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  deriveReleaseHistoryRecords,
  fetchReportSnapshot,
  type ReportSnapshot,
} from '@/lib/report-data'
import { formatDateTimeLabel, getEntityId, getFullName } from '@/lib/backend-helpers'
import { exportPdfReport } from '@/lib/export-pdf'

const currentYear = String(new Date().getFullYear())

const normalizeModelKey = (value: string) => value.trim().toLowerCase().replace(/\s+/g, '-')

const getYear = (value?: string | null) => {
  if (!value) return ''
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '' : String(date.getFullYear())
}

const safePercentageDelta = (current: number, previous: number) => {
  if (previous === 0) {
    return current === 0 ? 0 : 100
  }

  return ((current - previous) / previous) * 100
}

const average = (values: number[]) =>
  values.length ? values.reduce((total, value) => total + value, 0) / values.length : 0

export default function VehicleReportsPage() {
  const [snapshot, setSnapshot] = React.useState<ReportSnapshot | null>(null)
  const [selectedYear, setSelectedYear] = React.useState(currentYear)
  const [selectedModel, setSelectedModel] = React.useState('all')
  const [loadError, setLoadError] = React.useState<string | null>(null)

  React.useEffect(() => {
    let isMounted = true

    const loadReportData = async () => {
      try {
        const nextSnapshot = await fetchReportSnapshot()
        if (!isMounted) return

        setSnapshot(nextSnapshot)
      } catch (error) {
        if (!isMounted) return
        setSnapshot(null)
        setLoadError(error instanceof Error ? error.message : 'Unable to load report data.')
      }
    }

    void loadReportData()

    return () => {
      isMounted = false
    }
  }, [])

  const releaseHistory = React.useMemo(
    () => (snapshot ? deriveReleaseHistoryRecords(snapshot) : []),
    [snapshot]
  )

  const vehicleById = React.useMemo(
    () => new Map(snapshot?.vehicles.map((vehicle) => [getEntityId(vehicle), vehicle]) ?? []),
    [snapshot]
  )

  const modelOptions = React.useMemo(
    () =>
      snapshot
        ? Array.from(new Set(snapshot.vehicles.map((vehicle) => vehicle.unitName ?? '').filter(Boolean)))
            .sort((left, right) => left.localeCompare(right))
            .map((model) => ({
              label: model,
              value: normalizeModelKey(model),
            }))
        : [],
    [snapshot]
  )

  const availableYears = React.useMemo(() => {
    if (!snapshot) return [currentYear]

    return Array.from(
      new Set(
        [
          currentYear,
          ...snapshot.vehicles.map((vehicle) => getYear(vehicle.createdAt)),
          ...snapshot.unitAllocations.map((allocation) => getYear(allocation.createdAt)),
          ...releaseHistory.filter((record) => record.status === 'released').map((record) => getYear(record.releasedAtIso)),
        ].filter(Boolean)
      )
    ).sort((left, right) => Number(right) - Number(left))
  }, [releaseHistory, snapshot])

  const filteredVehicles = React.useMemo(() => {
    if (!snapshot) return []

    const releasedVehicleIds = new Set(
      releaseHistory.filter((record) => record.status === 'released').map((record) => record.vehicleId)
    )
    return snapshot.vehicles.filter(
      (vehicle) =>
        vehicle.status !== 'completed' &&
        !releasedVehicleIds.has(getEntityId(vehicle)) &&
        (selectedModel === 'all' || normalizeModelKey(vehicle.unitName ?? '') === selectedModel)
    )
  }, [releaseHistory, selectedModel, snapshot])

  const filteredReleaseHistory = React.useMemo(
    () =>
      releaseHistory.filter(
        (record) =>
          record.status === 'released' &&
          getYear(record.releasedAtIso) === selectedYear &&
          (selectedModel === 'all' || normalizeModelKey(record.unitName) === selectedModel)
      ),
    [releaseHistory, selectedModel, selectedYear]
  )

  const previousReleaseHistory = React.useMemo(
    () =>
      releaseHistory.filter(
        (record) =>
          record.status === 'released' &&
          getYear(record.releasedAtIso) === String(Number(selectedYear) - 1) &&
          (selectedModel === 'all' || normalizeModelKey(record.unitName) === selectedModel)
      ),
    [releaseHistory, selectedModel, selectedYear]
  )

  const filteredAllocations = React.useMemo(() => {
    if (!snapshot) return []

    return snapshot.unitAllocations.filter((allocation) => {
      const vehicle =
        allocation.vehicleId && typeof allocation.vehicleId === 'object'
          ? allocation.vehicleId
          : vehicleById.get(getEntityId(allocation.vehicleId))

      return (
        getYear(allocation.createdAt) === selectedYear &&
        (selectedModel === 'all' || normalizeModelKey(vehicle?.unitName ?? '') === selectedModel)
      )
    })
  }, [selectedModel, selectedYear, snapshot, vehicleById])

  const previousAllocations = React.useMemo(() => {
    if (!snapshot) return []

    return snapshot.unitAllocations.filter((allocation) => {
      const vehicle =
        allocation.vehicleId && typeof allocation.vehicleId === 'object'
          ? allocation.vehicleId
          : vehicleById.get(getEntityId(allocation.vehicleId))

      return (
        getYear(allocation.createdAt) === String(Number(selectedYear) - 1) &&
        (selectedModel === 'all' || normalizeModelKey(vehicle?.unitName ?? '') === selectedModel)
      )
    })
  }, [selectedModel, selectedYear, snapshot, vehicleById])

  const modelDistribution = React.useMemo(() => {
    const total = filteredVehicles.length
    const grouped = filteredVehicles.reduce<Record<string, number>>((accumulator, vehicle) => {
      const model = vehicle.unitName ?? 'Unknown'
      accumulator[model] = (accumulator[model] ?? 0) + 1
      return accumulator
    }, {})

    return Object.entries(grouped)
      .map(([model, count]) => ({
        model,
        count,
        percentage: total > 0 ? Number(((count / total) * 100).toFixed(1)) : 0,
      }))
      .sort((left, right) => right.count - left.count)
  }, [filteredVehicles])

  const topSellingUnits = React.useMemo(() => {
    const grouped = filteredReleaseHistory.reduce<Record<string, number>>((accumulator, record) => {
      const key = `${record.unitName} ${record.variation}`.trim()
      accumulator[key] = (accumulator[key] ?? 0) + 1
      return accumulator
    }, {})

    return Object.entries(grouped)
      .map(([unit, sold]) => ({ unit, sold }))
      .sort((left, right) => right.sold - left.sold)
  }, [filteredReleaseHistory])

  const agentPerformance = React.useMemo(() => {
    const totalByAgent = filteredAllocations.reduce<Record<string, number>>((accumulator, allocation) => {
      const agentName = getFullName(allocation.salesAgentId) || 'Unassigned'
      accumulator[agentName] = (accumulator[agentName] ?? 0) + 1
      return accumulator
    }, {})
    const completedByAgent = filteredReleaseHistory.reduce<Record<string, number>>((accumulator, record) => {
      accumulator[record.agentAssigned] = (accumulator[record.agentAssigned] ?? 0) + 1
      return accumulator
    }, {})
    const releasedVehicleIds = new Set(
      releaseHistory.filter((record) => record.status === 'released').map((record) => record.vehicleId)
    )
    const activeByAgent = filteredAllocations.reduce<Record<string, number>>((accumulator, allocation) => {
      if (
        ['pending', 'assigned', 'in_transit'].includes(allocation.status ?? '') &&
        !releasedVehicleIds.has(getEntityId(allocation.vehicleId))
      ) {
        const agentName = getFullName(allocation.salesAgentId) || 'Unassigned'
        accumulator[agentName] = (accumulator[agentName] ?? 0) + 1
      }
      return accumulator
    }, {})

    return Object.entries(totalByAgent)
      .map(([name, allocations]) => ({
        name,
        allocations,
        completed: completedByAgent[name] ?? 0,
        pending: activeByAgent[name] ?? 0,
      }))
      .sort((left, right) => right.allocations - left.allocations)
  }, [filteredAllocations, filteredReleaseHistory, releaseHistory])

  const averageDaysInStock = React.useMemo(
    () =>
      average(
        filteredReleaseHistory.map((record) => {
          const addedAt = new Date(record.vehicleAddedAtIso).getTime()
          const releasedAt = new Date(record.releasedAtIso).getTime()
          return (releasedAt - addedAt) / (1000 * 60 * 60 * 24)
        })
      ),
    [filteredReleaseHistory]
  )

  const previousAverageDaysInStock = React.useMemo(
    () =>
      average(
        previousReleaseHistory.map((record) => {
          const addedAt = new Date(record.vehicleAddedAtIso).getTime()
          const releasedAt = new Date(record.releasedAtIso).getTime()
          return (releasedAt - addedAt) / (1000 * 60 * 60 * 24)
        })
      ),
    [previousReleaseHistory]
  )

  const totalInventoryTrend = React.useMemo(() => {
    const currentCount = filteredVehicles.filter((vehicle) => getYear(vehicle.createdAt) === selectedYear).length
    const previousCount = filteredVehicles.filter(
      (vehicle) => getYear(vehicle.createdAt) === String(Number(selectedYear) - 1)
    ).length
    return safePercentageDelta(currentCount, previousCount)
  }, [filteredVehicles, selectedYear])

  const soldTrend = safePercentageDelta(filteredReleaseHistory.length, previousReleaseHistory.length)
  const allocationsTrend = safePercentageDelta(filteredAllocations.length, previousAllocations.length)
  const stockDaysTrend = previousAverageDaysInStock === 0 ? 0 : averageDaysInStock - previousAverageDaysInStock

  const handleExportReport = () => {
    if (!snapshot) return

    const modelLabel = modelOptions.find((model) => model.value === selectedModel)?.label ?? 'All Models'
    const rows = [
      { section: 'Summary', item: 'Current stock', value: String(filteredVehicles.length), details: 'Current stock for the selected model; excludes released/completed vehicles. All inventory dates.' },
      { section: 'Summary', item: 'Vehicles released', value: String(filteredReleaseHistory.length), details: `Released in ${selectedYear}; ${soldTrend.toFixed(1)}% change from previous year.` },
      { section: 'Summary', item: 'Average days in stock', value: averageDaysInStock.toFixed(1), details: 'Based on selected-year release dates and vehicle creation dates.' },
      { section: 'Summary', item: 'Total allocations', value: String(filteredAllocations.length), details: `Created in ${selectedYear}; ${allocationsTrend.toFixed(1)}% change from previous year.` },
      ...modelDistribution.map((model) => ({ section: 'Model distribution', item: model.model, value: String(model.count), details: `${model.percentage}% of current stock.` })),
      ...agentPerformance.map((agent) => ({ section: 'Agent performance', item: agent.name, value: String(agent.allocations), details: `${agent.completed} releases in ${selectedYear}; ${agent.pending} active allocations created in ${selectedYear}.` })),
      ...topSellingUnits.map((unit) => ({ section: 'Units released by model', item: unit.unit, value: String(unit.sold), details: `Released in ${selectedYear}.` })),
      ...filteredVehicles.map((vehicle) => ({ section: 'Current stock detail', item: vehicle.conductionNumber || getEntityId(vehicle), value: vehicle.unitName || 'Unknown model', details: `${vehicle.variation || '-'}; ${vehicle.bodyColor || '-'}; status: ${vehicle.status || 'unknown'}. Added: ${formatDateTimeLabel(vehicle.createdAt)}.` })),
      ...filteredAllocations.map((allocation) => {
        const vehicle = allocation.vehicleId && typeof allocation.vehicleId === 'object'
          ? allocation.vehicleId
          : vehicleById.get(getEntityId(allocation.vehicleId))
        return { section: 'Allocation detail', item: vehicle?.conductionNumber || getEntityId(allocation), value: getFullName(allocation.salesAgentId) || 'Unassigned', details: `${vehicle?.unitName || 'Unknown model'}; status: ${allocation.status || 'unknown'}. Created: ${formatDateTimeLabel(allocation.createdAt)}.` }
      }),
      ...filteredReleaseHistory.map((record) => ({ section: 'Release detail', item: record.conductionNumber || record.vehicleId, value: `${record.unitName} ${record.variation}`.trim(), details: `Released: ${record.releasedAt}. Agent: ${record.agentAssigned}.` })),
    ]

    exportPdfReport({
      title: 'Vehicle and Allocation Analytics Report',
      subtitle: `Year: ${selectedYear}; Model: ${modelLabel}. Year applies to releases and allocation creation dates. Inventory reflects current stock across all dates. Full selected data, including agents and models beyond the top five.`,
      filename: `vehicle-allocation-report-${selectedYear}-${selectedModel}`,
      columns: [
        { header: 'Section', value: (row) => row.section },
        { header: 'Item', value: (row) => row.item },
        { header: 'Value', value: (row) => row.value },
        { header: 'Details', value: (row) => row.details },
      ],
      rows,
    })
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Vehicle/Allocation Reports"
        description="Vehicle inventory analytics and agent allocation performance"
      >
        <Button variant="outline" onClick={handleExportReport} disabled={!snapshot}>
          <FileDown className="mr-2 size-4" />
          Export Report
        </Button>
      </PageHeader>

      {loadError && <p role="alert" className="text-sm text-destructive">{loadError} Reload this page to retry.</p>}

      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <Filter className="size-4 text-muted-foreground" />
          <span className="text-sm font-medium">Filters:</span>
        </div>
        <Select value={selectedYear} onValueChange={setSelectedYear}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {availableYears.map((year) => (
              <SelectItem key={year} value={year}>
                {year}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={selectedModel} onValueChange={setSelectedModel}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Models</SelectItem>
            {modelOptions.map((model) => (
              <SelectItem key={model.value} value={model.value}>
                {model.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <p className="text-sm text-muted-foreground">
        Inventory shows current stock for the selected model across all dates. Releases and allocations use the selected year.
      </p>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Current Stock</p>
                <p className="text-2xl font-bold">{filteredVehicles.length}</p>
              </div>
              <div className="flex items-center text-sm text-green-600">
                <TrendingUp className="mr-1 size-4" />
                {totalInventoryTrend >= 0 ? '+' : ''}
                {totalInventoryTrend.toFixed(0)}%
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Vehicles Released</p>
                <p className="text-2xl font-bold">{filteredReleaseHistory.length}</p>
              </div>
              <div className="flex items-center text-sm text-green-600">
                <TrendingUp className="mr-1 size-4" />
                {soldTrend >= 0 ? '+' : ''}
                {soldTrend.toFixed(0)}%
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg. Days in Stock</p>
                <p className="text-2xl font-bold">{averageDaysInStock.toFixed(0)}</p>
              </div>
              <div className="flex items-center text-sm text-red-600">
                <TrendingDown className="mr-1 size-4" />
                {stockDaysTrend >= 0 ? '+' : ''}
                {stockDaysTrend.toFixed(1)} days
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Allocations</p>
                <p className="text-2xl font-bold">{filteredAllocations.length}</p>
              </div>
              <div className="flex items-center text-sm text-green-600">
                <TrendingUp className="mr-1 size-4" />
                {allocationsTrend >= 0 ? '+' : ''}
                {allocationsTrend.toFixed(0)}%
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="size-5 text-primary" />
              Agent Performance
            </CardTitle>
            <CardDescription>Top performing sales agents by allocations</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Agent</TableHead>
                  <TableHead className="text-right">Total Allocations</TableHead>
                  <TableHead className="text-right">Releases</TableHead>
                  <TableHead className="text-right">Active Allocations</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {agentPerformance.slice(0, 5).map((agent) => (
                  <TableRow key={agent.name}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="size-8">
                          <AvatarFallback className="bg-primary/10 text-xs text-primary">
                            {agent.name
                              .split(' ')
                              .map((name) => name[0])
                              .join('')}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{agent.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">{agent.allocations}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant="secondary" className="bg-primary/10 text-primary">
                        {agent.completed}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant="secondary" className="bg-muted text-muted-foreground">
                        {agent.pending}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="size-5 text-primary" />
              Model Distribution
            </CardTitle>
            <CardDescription>Isuzu inventory breakdown by model</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={modelDistribution} layout="vertical">
                  <CartesianGrid
                    strokeDasharray="3 3"
                    className="stroke-muted"
                    horizontal={true}
                    vertical={false}
                  />
                  <XAxis type="number" className="text-xs" />
                  <YAxis dataKey="model" type="category" className="text-xs" width={80} />
                  <Tooltip />
                  <Bar dataKey="count" fill="var(--chart-1)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Car className="size-5 text-primary" />
            Top Selling Units
          </CardTitle>
          <CardDescription>Best selling Isuzu units this year</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Unit</TableHead>
                <TableHead className="text-right">Units Sold</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {topSellingUnits.slice(0, 5).map((item, index) => (
                <TableRow key={item.unit}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <span className="flex size-6 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                        {index + 1}
                      </span>
                      {item.unit}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">{item.sold}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
