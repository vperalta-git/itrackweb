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
import { getEntityId, getFullName } from '@/lib/backend-helpers'

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

  React.useEffect(() => {
    let isMounted = true

    const loadReportData = async () => {
      try {
        const nextSnapshot = await fetchReportSnapshot()
        if (!isMounted) return

        setSnapshot(nextSnapshot)
      } catch {
        if (!isMounted) return
        setSnapshot(null)
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
          ...snapshot.vehicles.map((vehicle) => getYear(vehicle.createdAt)),
          ...snapshot.unitAllocations.map((allocation) => getYear(allocation.createdAt)),
          ...releaseHistory.map((record) => record.releasedAtIso.slice(0, 4)),
        ].filter(Boolean)
      )
    ).sort((left, right) => Number(right) - Number(left))
  }, [releaseHistory, snapshot])

  const filteredVehicles = React.useMemo(() => {
    if (!snapshot) return []

    return snapshot.vehicles.filter(
      (vehicle) =>
        selectedModel === 'all' || normalizeModelKey(vehicle.unitName ?? '') === selectedModel
    )
  }, [selectedModel, snapshot])

  const filteredReleaseHistory = React.useMemo(
    () =>
      releaseHistory.filter(
        (record) =>
          record.releasedAtIso.slice(0, 4) === selectedYear &&
          (selectedModel === 'all' || normalizeModelKey(record.unitName) === selectedModel)
      ),
    [releaseHistory, selectedModel, selectedYear]
  )

  const previousReleaseHistory = React.useMemo(
    () =>
      releaseHistory.filter(
        (record) =>
          record.releasedAtIso.slice(0, 4) === String(Number(selectedYear) - 1) &&
          (selectedModel === 'all' || normalizeModelKey(record.unitName) === selectedModel)
      ),
    [releaseHistory, selectedModel, selectedYear]
  )

  const filteredAllocations = React.useMemo(() => {
    if (!snapshot) return []

    return snapshot.unitAllocations.filter((allocation) => {
      const vehicle =
        allocation.vehicleId && typeof allocation.vehicleId === 'object' ? allocation.vehicleId : null

      return (
        getYear(allocation.createdAt) === selectedYear &&
        (selectedModel === 'all' || normalizeModelKey(vehicle?.unitName ?? '') === selectedModel)
      )
    })
  }, [selectedModel, selectedYear, snapshot])

  const previousAllocations = React.useMemo(() => {
    if (!snapshot) return []

    return snapshot.unitAllocations.filter((allocation) => {
      const vehicle =
        allocation.vehicleId && typeof allocation.vehicleId === 'object' ? allocation.vehicleId : null

      return (
        getYear(allocation.createdAt) === String(Number(selectedYear) - 1) &&
        (selectedModel === 'all' || normalizeModelKey(vehicle?.unitName ?? '') === selectedModel)
      )
    })
  }, [selectedModel, selectedYear, snapshot])

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
      .slice(0, 5)
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

    return Object.entries(totalByAgent)
      .map(([name, allocations]) => ({
        name,
        allocations,
        completed: completedByAgent[name] ?? 0,
        pending: Math.max(allocations - (completedByAgent[name] ?? 0), 0),
      }))
      .sort((left, right) => right.allocations - left.allocations)
      .slice(0, 5)
  }, [filteredAllocations, filteredReleaseHistory])

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

  return (
    <div className="space-y-6">
      <PageHeader
        title="Vehicle/Allocation Reports"
        description="Vehicle inventory analytics and agent allocation performance"
      >
        <Button variant="outline">
          <FileDown className="mr-2 size-4" />
          Export Report
        </Button>
      </PageHeader>

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

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Inventory</p>
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
                <p className="text-sm text-muted-foreground">Vehicles Sold</p>
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
                  <TableHead className="text-right">Completed</TableHead>
                  <TableHead className="text-right">Pending</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {agentPerformance.map((agent) => (
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
              {topSellingUnits.map((item, index) => (
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
