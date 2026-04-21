'use client'

import * as React from 'react'
import { usePathname } from 'next/navigation'
import { BarChart3, Car, ClipboardCheck, Package, TrendingUp, Users } from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from 'recharts'

import { PageHeader } from '@/components/page-header'
import { MetricCard } from '@/components/metric-card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
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
import {
  INVENTORY_UPDATED_EVENT,
  loadInventoryVehicles,
  syncInventoryVehiclesFromBackend,
  type InventoryVehicle,
} from '@/lib/inventory-data'
import { getRoleFromPathname } from '@/lib/rbac'
import { getScopedRoleData, matchesScopedAgent, matchesScopedManager } from '@/lib/role-scope'
import { getSessionUser, getSessionUserFullName } from '@/lib/session'
import { loadUsers, syncUsersFromBackend, type SystemUser, USERS_UPDATED_EVENT } from '@/lib/user-data'

const statusLabels: Record<InventoryVehicle['status'], string> = {
  available: 'Available',
  'in-stockyard': 'In Stockyard',
  'in-transit': 'In Transit',
  pending: 'Pending',
  'in-dispatch': 'In Dispatch',
  released: 'Released',
}

const statusColors: Record<InventoryVehicle['status'], string> = {
  available: 'var(--chart-1)',
  'in-stockyard': 'var(--chart-4)',
  'in-transit': 'var(--chart-2)',
  pending: 'var(--chart-5)',
  'in-dispatch': 'var(--chart-3)',
  released: 'var(--muted)',
}

const statusOrder: InventoryVehicle['status'][] = [
  'available',
  'in-stockyard',
  'in-transit',
  'pending',
  'in-dispatch',
  'released',
]

const barChartConfig: ChartConfig = {
  count: {
    label: 'Vehicles',
    color: 'var(--chart-1)',
  },
}

type PeriodFilter = 'week' | 'month' | 'year'

const getPeriodStartDate = (period: PeriodFilter) => {
  const now = new Date()

  switch (period) {
    case 'week':
      return new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7)
    case 'year':
      return new Date(now.getFullYear() - 1, now.getMonth(), now.getDate())
    case 'month':
    default:
      return new Date(now.getFullYear(), now.getMonth() - 1, now.getDate())
  }
}

const isWithinPeriod = (value: string, period: PeriodFilter) => {
  const timestamp = new Date(value).getTime()

  if (Number.isNaN(timestamp)) {
    return false
  }

  return timestamp >= getPeriodStartDate(period).getTime()
}

export default function DashboardPage() {
  const pathname = usePathname()
  const role = getRoleFromPathname(pathname)
  const scope = getScopedRoleData(role)
  const currentUserName = getSessionUserFullName(getSessionUser())
  const isSalesAgent = role === 'sales-agent'
  const isManager = role === 'manager'
  const isAdminOrSupervisor = role === 'admin' || role === 'supervisor'
  const [vehicles, setVehicles] = React.useState<InventoryVehicle[]>(() => loadInventoryVehicles())
  const [users, setUsers] = React.useState<SystemUser[]>(() => loadUsers())
  const [vehicleStatusFilter, setVehicleStatusFilter] =
    React.useState<'week' | 'month' | 'year'>('month')
  const [modelPeriodFilter, setModelPeriodFilter] =
    React.useState<'week' | 'month' | 'year'>('month')
  const [agentManagerFilter, setAgentManagerFilter] = React.useState('all')
  const [agentPeriodFilter, setAgentPeriodFilter] =
    React.useState<'week' | 'month' | 'year'>('month')
  const [unitPeriodFilter, setUnitPeriodFilter] =
    React.useState<'week' | 'month' | 'year'>('month')
  const [modelLimit, setModelLimit] = React.useState('5')
  const [agentLimit, setAgentLimit] = React.useState('5')
  const [unitLimit, setUnitLimit] = React.useState('5')

  React.useEffect(() => {
    const syncInventory = () => {
      setVehicles(loadInventoryVehicles())
    }

    syncInventory()
    void syncInventoryVehiclesFromBackend()
      .then((nextVehicles) => {
        setVehicles(nextVehicles)
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
    void syncUsersFromBackend().then(setUsers).catch(() => null)
    window.addEventListener(USERS_UPDATED_EVENT, syncUsers)

    return () => {
      window.removeEventListener(USERS_UPDATED_EVENT, syncUsers)
    }
  }, [])

  const userAvatarByName = React.useMemo(
    () =>
      new Map(
        users.map((user) => [
          `${user.firstName} ${user.lastName}`.trim(),
          user.avatarUrl ?? '',
        ])
      ),
    [users]
  )

  const scopedVehicles = React.useMemo(
    () =>
      vehicles.filter(
        (vehicle) =>
          matchesScopedAgent(role, vehicle.assignedAgent) &&
          matchesScopedManager(role, vehicle.manager)
      ),
    [role, vehicles]
  )

  const vehiclesForStatusOverview = React.useMemo(
    () => scopedVehicles.filter((vehicle) => isWithinPeriod(vehicle.dateAdded, vehicleStatusFilter)),
    [scopedVehicles, vehicleStatusFilter]
  )

  const vehiclesForModelDistribution = React.useMemo(
    () => scopedVehicles.filter((vehicle) => isWithinPeriod(vehicle.dateAdded, modelPeriodFilter)),
    [modelPeriodFilter, scopedVehicles]
  )

  const vehiclesForAgentPerformance = React.useMemo(
    () => scopedVehicles.filter((vehicle) => isWithinPeriod(vehicle.dateAdded, agentPeriodFilter)),
    [agentPeriodFilter, scopedVehicles]
  )

  const vehiclesForTopSellingUnits = React.useMemo(() => {
    const sourceVehicles = isSalesAgent || isManager ? vehicles : scopedVehicles

    return sourceVehicles.filter((vehicle) => isWithinPeriod(vehicle.dateAdded, unitPeriodFilter))
  }, [isManager, isSalesAgent, scopedVehicles, unitPeriodFilter, vehicles])

  const totalVehicles = scopedVehicles.length
  const availableVehicles = scopedVehicles.filter((vehicle) => vehicle.status === 'available').length
  const ongoingShipment = scopedVehicles.filter((vehicle) => vehicle.status === 'in-transit').length
  const ongoingPreparation = scopedVehicles.filter(
    (vehicle) => vehicle.status === 'in-dispatch'
  ).length

  const displayedVehicleStats = React.useMemo(
    () =>
      statusOrder.map((status) => {
        const count = vehiclesForStatusOverview.filter((vehicle) => vehicle.status === status).length
        const percentage =
          vehiclesForStatusOverview.length > 0
            ? Math.round((count / vehiclesForStatusOverview.length) * 100)
            : 0

        return {
          status,
          count,
          percentage,
        }
      }),
    [vehicleStatusFilter, vehiclesForStatusOverview]
  )

  const displayedStatusPieData = displayedVehicleStats
    .filter((stat) => stat.count > 0)
    .map((stat) => ({
      name: statusLabels[stat.status],
      value: stat.count,
      color: statusColors[stat.status],
    }))

  const availableManagers = React.useMemo(
    () => Array.from(new Set(vehicles.map((vehicle) => vehicle.manager).filter(Boolean))).sort(),
    [vehicles]
  )

  const modelDistribution = React.useMemo(() => {
    const grouped = vehiclesForModelDistribution.reduce<Record<string, number>>((acc, vehicle) => {
      acc[vehicle.unitName] = (acc[vehicle.unitName] ?? 0) + 1
      return acc
    }, {})

    return Object.entries(grouped)
      .map(([model, count]) => ({ model, count }))
      .sort((a, b) => b.count - a.count)
  }, [vehiclesForModelDistribution])

  const displayedModelData =
    modelLimit === 'all' ? modelDistribution : modelDistribution.slice(0, Number(modelLimit))

  const agentPerformance = React.useMemo(() => {
    const grouped = vehiclesForAgentPerformance.reduce<
      Record<string, { name: string; manager: string; allocations: number; completed: number; active: number }>
    >((acc, vehicle) => {
      if (!vehicle.assignedAgent || vehicle.assignedAgent === 'Unassigned') return acc

      if (!acc[vehicle.assignedAgent]) {
        acc[vehicle.assignedAgent] = {
          name: vehicle.assignedAgent,
          manager: vehicle.manager,
          allocations: 0,
          completed: 0,
          active: 0,
        }
      }

      acc[vehicle.assignedAgent].allocations += 1
      if (vehicle.status === 'released') {
        acc[vehicle.assignedAgent].completed += 1
      } else {
        acc[vehicle.assignedAgent].active += 1
      }

      return acc
    }, {})

    return Object.values(grouped).sort((a, b) => b.allocations - a.allocations)
  }, [vehiclesForAgentPerformance])

  const filteredAgentPerformance = React.useMemo(() => {
    if (!isAdminOrSupervisor || agentManagerFilter === 'all') return agentPerformance
    return agentPerformance.filter((agent) => agent.manager === agentManagerFilter)
  }, [agentManagerFilter, agentPerformance, isAdminOrSupervisor])

  const displayedAgentPerformance =
    agentLimit === 'all'
      ? filteredAgentPerformance
      : filteredAgentPerformance.slice(0, Number(agentLimit))

  const topSellingUnits = React.useMemo(() => {
    const grouped = vehiclesForTopSellingUnits
      .filter((vehicle) => vehicle.status === 'released')
      .reduce<Record<string, { unit: string; sold: number }>>((acc, vehicle) => {
        const key = `${vehicle.unitName} ${vehicle.variation}`
        if (!acc[key]) {
          acc[key] = { unit: key, sold: 0 }
        }
        acc[key].sold += 1
        return acc
      }, {})

    return Object.values(grouped).sort((a, b) => b.sold - a.sold)
  }, [vehiclesForTopSellingUnits])

  const displayedTopSellingUnits =
    unitLimit === 'all' ? topSellingUnits : topSellingUnits.slice(0, Number(unitLimit))

  return (
    <div className="space-y-6">
        <PageHeader
          title="Dashboard"
          description={
            role === 'admin' || role === 'supervisor'
              ? `Welcome back ${currentUserName || 'User'}`
              : role === 'manager'
              ? `Vehicle analytics for agents under ${scope.managerName}.`
              : `Vehicle analytics for ${scope.agentName}.`
          }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total Vehicles"
          value={totalVehicles}
          description="In inventory"
          icon={Car}
        />
        <MetricCard
          title="Available Vehicles"
          value={availableVehicles}
          description="Ready for sale"
          icon={Package}
        />
        <MetricCard
          title="Active Shipment"
          value={ongoingShipment}
          description="Units in transit"
          icon={TrendingUp}
        />
        <MetricCard
          title="Active Vehicle Preparation"
          value={ongoingPreparation}
          description="Units in dispatch"
          icon={ClipboardCheck}
        />
      </div>

      {isAdminOrSupervisor ? (
        <div className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Package className="size-5 text-primary" />
                      Vehicle Status Overview
                    </CardTitle>
                    <CardDescription>
                      Distribution of vehicles by current inventory status
                    </CardDescription>
                  </div>
                  <Select
                    value={vehicleStatusFilter}
                    onValueChange={(value: 'week' | 'month' | 'year') => setVehicleStatusFilter(value)}
                  >
                    <SelectTrigger className="w-full sm:w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="week">Week</SelectItem>
                      <SelectItem value="month">Month</SelectItem>
                      <SelectItem value="year">Year</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-6 xl:flex-row">
                  <div className="flex-1 space-y-4">
                    {displayedVehicleStats.map((stat) => (
                      <div key={stat.status} className="flex items-center gap-4">
                        <div className="min-w-[112px] text-sm font-medium">{statusLabels[stat.status]}</div>
                        <div className="flex-1">
                          <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
                            <div
                              className="h-full rounded-full bg-primary transition-all duration-500"
                              style={{ width: `${stat.percentage}%` }}
                            />
                          </div>
                        </div>
                        <div className="flex min-w-[80px] items-baseline justify-end gap-1">
                          <span className="text-lg font-semibold">{stat.count}</span>
                          <span className="text-xs text-muted-foreground">({stat.percentage}%)</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mx-auto h-40 w-40 lg:mx-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={displayedStatusPieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={35}
                          outerRadius={60}
                          dataKey="value"
                          stroke="none"
                        >
                          {displayedStatusPieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="size-5 text-primary" />
                      Model Distribution
                    </CardTitle>
                    <CardDescription>Inventory units grouped by model</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Select
                      value={modelPeriodFilter}
                      onValueChange={(value: 'week' | 'month' | 'year') => setModelPeriodFilter(value)}
                    >
                      <SelectTrigger className="w-full sm:w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="week">Week</SelectItem>
                        <SelectItem value="month">Month</SelectItem>
                        <SelectItem value="year">Year</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={modelLimit} onValueChange={setModelLimit}>
                      <SelectTrigger className="w-full sm:w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="3">Top 3</SelectItem>
                        <SelectItem value="5">Top 5</SelectItem>
                        <SelectItem value="all">All</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {displayedModelData.length > 0 ? (
                  <ChartContainer config={barChartConfig} className="h-[320px] w-full">
                    <BarChart
                      data={displayedModelData}
                      layout="vertical"
                      margin={{ top: 5, right: 10, left: 0, bottom: 0 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        horizontal={true}
                        vertical={false}
                        className="stroke-muted"
                      />
                      <XAxis
                        type="number"
                        className="text-xs"
                        tick={{ fill: 'var(--muted-foreground)' }}
                      />
                      <YAxis
                        dataKey="model"
                        type="category"
                        className="text-xs"
                        tick={{ fill: 'var(--muted-foreground)' }}
                        width={70}
                      />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="count" fill="var(--chart-1)" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ChartContainer>
                ) : (
                  <div className="flex h-[320px] items-center justify-center rounded-xl border border-dashed text-sm text-muted-foreground">
                    No model distribution data available.
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="size-5 text-primary" />
                      Agent Performance
                    </CardTitle>
                    <CardDescription>
                      {agentManagerFilter !== 'all'
                        ? `Performance across sales agents under ${agentManagerFilter}`
                        : 'Performance across all sales agents'}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Select value={agentManagerFilter} onValueChange={setAgentManagerFilter}>
                      <SelectTrigger className="w-full sm:w-40">
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
                    <Select
                      value={agentPeriodFilter}
                      onValueChange={(value: 'week' | 'month' | 'year') => setAgentPeriodFilter(value)}
                    >
                      <SelectTrigger className="w-full sm:w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="week">Week</SelectItem>
                        <SelectItem value="month">Month</SelectItem>
                        <SelectItem value="year">Year</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={agentLimit} onValueChange={setAgentLimit}>
                      <SelectTrigger className="w-full sm:w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="3">Top 3</SelectItem>
                        <SelectItem value="5">Top 5</SelectItem>
                        <SelectItem value="all">All</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {displayedAgentPerformance.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Agent</TableHead>
                        <TableHead className="text-right">Total Allocations</TableHead>
                        <TableHead className="text-right">Released</TableHead>
                        <TableHead className="text-right">Active</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {displayedAgentPerformance.map((agent) => (
                        <TableRow key={agent.name}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="size-8">
                                <AvatarImage src={userAvatarByName.get(agent.name) || ''} alt={agent.name} />
                                <AvatarFallback className="bg-primary/10 text-xs text-primary">
                                  {agent.name.split(' ').map((name) => name[0]).join('')}
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
                              {agent.active}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="flex h-[260px] items-center justify-center rounded-xl border border-dashed text-sm text-muted-foreground">
                    No agent performance data available.
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Car className="size-5 text-primary" />
                      Top Selling Units
                    </CardTitle>
                    <CardDescription>
                      Released inventory grouped by unit and variation
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Select
                      value={unitPeriodFilter}
                      onValueChange={(value: 'week' | 'month' | 'year') => setUnitPeriodFilter(value)}
                    >
                      <SelectTrigger className="w-full sm:w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="week">Week</SelectItem>
                        <SelectItem value="month">Month</SelectItem>
                        <SelectItem value="year">Year</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={unitLimit} onValueChange={setUnitLimit}>
                      <SelectTrigger className="w-full sm:w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="3">Top 3</SelectItem>
                        <SelectItem value="5">Top 5</SelectItem>
                        <SelectItem value="all">All</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {displayedTopSellingUnits.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Unit</TableHead>
                        <TableHead className="text-right">Units Sold</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {displayedTopSellingUnits.map((item, index) => (
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
                ) : (
                  <div className="flex h-[260px] items-center justify-center rounded-xl border border-dashed text-sm text-muted-foreground">
                    No released units available yet.
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="size-5 text-primary" />
                  Model Distribution
                </CardTitle>
                <CardDescription>Inventory units grouped by model</CardDescription>
              </div>
              <div className="flex gap-2">
                <Select
                  value={modelPeriodFilter}
                  onValueChange={(value: 'week' | 'month' | 'year') => setModelPeriodFilter(value)}
                >
                  <SelectTrigger className="w-full sm:w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="week">Week</SelectItem>
                    <SelectItem value="month">Month</SelectItem>
                    <SelectItem value="year">Year</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={modelLimit} onValueChange={setModelLimit}>
                  <SelectTrigger className="w-full sm:w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="3">Top 3</SelectItem>
                    <SelectItem value="5">Top 5</SelectItem>
                    <SelectItem value="all">All</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {displayedModelData.length > 0 ? (
              <ChartContainer config={barChartConfig} className="h-[320px] w-full">
                <BarChart
                  data={displayedModelData}
                  layout="vertical"
                  margin={{ top: 5, right: 10, left: 0, bottom: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    horizontal={true}
                    vertical={false}
                    className="stroke-muted"
                  />
                  <XAxis
                    type="number"
                    className="text-xs"
                    tick={{ fill: 'var(--muted-foreground)' }}
                  />
                  <YAxis
                    dataKey="model"
                    type="category"
                    className="text-xs"
                    tick={{ fill: 'var(--muted-foreground)' }}
                    width={70}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="count" fill="var(--chart-1)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ChartContainer>
            ) : (
              <div className="flex h-[320px] items-center justify-center rounded-xl border border-dashed text-sm text-muted-foreground">
                No model distribution data available.
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Car className="size-5 text-primary" />
                  Top Selling Units
                </CardTitle>
                <CardDescription>
                  {isSalesAgent || isManager
                    ? 'Company-wide released inventory grouped by unit and variation'
                    : 'Released inventory grouped by unit and variation'}
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Select
                  value={unitPeriodFilter}
                  onValueChange={(value: 'week' | 'month' | 'year') => setUnitPeriodFilter(value)}
                >
                  <SelectTrigger className="w-full sm:w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="week">Week</SelectItem>
                    <SelectItem value="month">Month</SelectItem>
                    <SelectItem value="year">Year</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={unitLimit} onValueChange={setUnitLimit}>
                  <SelectTrigger className="w-full sm:w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="3">Top 3</SelectItem>
                    <SelectItem value="5">Top 5</SelectItem>
                    <SelectItem value="all">All</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {displayedTopSellingUnits.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Unit</TableHead>
                    <TableHead className="text-right">Units Sold</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayedTopSellingUnits.map((item, index) => (
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
            ) : (
              <div className="flex h-[260px] items-center justify-center rounded-xl border border-dashed text-sm text-muted-foreground">
                No released units available yet.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      )}

      {isManager && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="size-5 text-primary" />
                    Agent Performance
                  </CardTitle>
                  <CardDescription>
                    {isManager
                      ? `Performance across agents under ${scope.managerName}`
                      : isAdminOrSupervisor && agentManagerFilter !== 'all'
                      ? `Performance across sales agents under ${agentManagerFilter}`
                      : 'Performance across all sales agents'}
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  {isAdminOrSupervisor && (
                    <Select value={agentManagerFilter} onValueChange={setAgentManagerFilter}>
                      <SelectTrigger className="w-full sm:w-40">
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
                  )}
                  <Select
                    value={agentPeriodFilter}
                    onValueChange={(value: 'week' | 'month' | 'year') => setAgentPeriodFilter(value)}
                  >
                    <SelectTrigger className="w-full sm:w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="week">Week</SelectItem>
                      <SelectItem value="month">Month</SelectItem>
                      <SelectItem value="year">Year</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={agentLimit} onValueChange={setAgentLimit}>
                    <SelectTrigger className="w-full sm:w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="3">Top 3</SelectItem>
                      <SelectItem value="5">Top 5</SelectItem>
                      <SelectItem value="all">All</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {displayedAgentPerformance.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Agent</TableHead>
                      <TableHead className="text-right">Total Allocations</TableHead>
                      <TableHead className="text-right">Released</TableHead>
                      <TableHead className="text-right">Active</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {displayedAgentPerformance.map((agent) => (
                      <TableRow key={agent.name}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="size-8">
                              <AvatarImage src={userAvatarByName.get(agent.name) || ''} alt={agent.name} />
                              <AvatarFallback className="bg-primary/10 text-xs text-primary">
                                {agent.name.split(' ').map((name) => name[0]).join('')}
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
                            {agent.active}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="flex h-[260px] items-center justify-center rounded-xl border border-dashed text-sm text-muted-foreground">
                  No agent performance data available.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
