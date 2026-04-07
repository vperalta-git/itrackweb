'use client'

import * as React from 'react'
import {
  FileDown,
  FileText,
  Calendar,
  Filter,
  BarChart3,
  PieChart,
  TrendingUp,
  Package,
  Car,
  Users,
  Clock,
} from 'lucide-react'
import {
  Bar,
  BarChart,
  Line,
  LineChart,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  PieChart as RechartsPie,
  Pie,
  Cell,
  Legend,
  Tooltip,
} from 'recharts'

import { PageHeader } from '@/components/page-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import {
  deriveReportsDashboardData,
  fetchReportSnapshot,
  type ReportsDashboardData,
} from '@/lib/report-data'

const salesChartConfig: ChartConfig = {
  sales: {
    label: 'Actual Sales',
    color: 'var(--chart-1)',
  },
  target: {
    label: 'Target',
    color: 'var(--chart-5)',
  },
}

const brandChartConfig: ChartConfig = {
  count: {
    label: 'Vehicles',
    color: 'var(--chart-1)',
  },
}

export default function ReportsPage() {
  const [dateRange, setDateRange] = React.useState('this-month')
  const [reportType, setReportType] = React.useState('all')
  const [dashboardData, setDashboardData] = React.useState<ReportsDashboardData | null>(null)

  React.useEffect(() => {
    let isMounted = true

    const loadReportsData = async () => {
      try {
        const snapshot = await fetchReportSnapshot()
        if (!isMounted) return

        setDashboardData(deriveReportsDashboardData(snapshot))
      } catch {
        if (!isMounted) return
        setDashboardData(null)
      }
    }

    void loadReportsData()

    return () => {
      isMounted = false
    }
  }, [])

  const monthlySalesData = dashboardData?.monthlySalesData ?? []
  const inventoryByModel = dashboardData?.inventoryByModel ?? []
  const statusDistribution = dashboardData?.statusDistribution ?? []
  const recentReports = dashboardData?.recentReports ?? []

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports & Analytics"
        description="View insights and generate reports"
      >
        <Button variant="outline" size="sm">
          <Calendar className="mr-2 size-4" />
          Schedule Report
        </Button>
        <Button size="sm">
          <FileDown className="mr-2 size-4" />
          Export All
        </Button>
      </PageHeader>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <Filter className="size-4 text-muted-foreground" />
          <span className="text-sm font-medium">Filters:</span>
        </div>
        <Select value={dateRange} onValueChange={setDateRange}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Date Range" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="today">Today</SelectItem>
            <SelectItem value="this-week">This Week</SelectItem>
            <SelectItem value="this-month">This Month</SelectItem>
            <SelectItem value="this-quarter">This Quarter</SelectItem>
            <SelectItem value="this-year">This Year</SelectItem>
          </SelectContent>
        </Select>
        <Select value={reportType} onValueChange={setReportType}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Report Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Reports</SelectItem>
            <SelectItem value="sales">Sales</SelectItem>
            <SelectItem value="inventory">Inventory</SelectItem>
            <SelectItem value="test-drive">Test Drive</SelectItem>
            <SelectItem value="operations">Operations</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Car className="size-4" />
              Units Sold
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardData?.unitsSold ?? 0}</div>
            <p className="text-xs text-success flex items-center gap-1 mt-1">
              <TrendingUp className="size-3" />
              {`${dashboardData?.unitsSoldDelta ?? 0}`.startsWith('-') ? '' : '+'}
              {(dashboardData?.unitsSoldDelta ?? 0).toFixed(0)} from last month
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Package className="size-4" />
              Current Inventory
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardData?.currentInventory ?? 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {dashboardData?.currentInventoryAvailable ?? 0} available in Isuzu Pasig
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Users className="size-4" />
              Active Agents
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardData?.activeAgents ?? 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Across vehicle allocations</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Clock className="size-4" />
              Avg. Prep Time
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(dashboardData?.averagePreparationTimeDays ?? 0).toFixed(1)} days
            </div>
            <p className="text-xs text-muted-foreground mt-1">Preparation turnaround</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Tabs */}
      <Tabs defaultValue="sales" className="space-y-6">
        <TabsList>
          <TabsTrigger value="sales" className="gap-2">
            <BarChart3 className="size-4" />
            Sales
          </TabsTrigger>
          <TabsTrigger value="inventory" className="gap-2">
            <PieChart className="size-4" />
            Inventory
          </TabsTrigger>
          <TabsTrigger value="performance" className="gap-2">
            <TrendingUp className="size-4" />
            Performance
          </TabsTrigger>
        </TabsList>

        <TabsContent value="sales" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Sales vs Target */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="size-5 text-primary" />
                  Sales vs Target
                </CardTitle>
                <CardDescription>
                  Monthly comparison of actual sales against targets
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer config={salesChartConfig} className="h-[300px] w-full">
                  <BarChart data={monthlySalesData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="month" tick={{ fill: 'var(--muted-foreground)' }} />
                    <YAxis tick={{ fill: 'var(--muted-foreground)' }} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="sales" fill="var(--chart-1)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="target" fill="var(--chart-5)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>

            {/* Sales Trend */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="size-5 text-primary" />
                  Sales Trend
                </CardTitle>
                <CardDescription>
                  Sales performance over the past 6 months
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer config={salesChartConfig} className="h-[300px] w-full">
                  <LineChart data={monthlySalesData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="month" tick={{ fill: 'var(--muted-foreground)' }} />
                    <YAxis tick={{ fill: 'var(--muted-foreground)' }} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Line
                      type="monotone"
                      dataKey="sales"
                      stroke="var(--chart-1)"
                      strokeWidth={2}
                      dot={{ fill: 'var(--chart-1)', r: 4 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="target"
                      stroke="var(--chart-5)"
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      dot={false}
                    />
                  </LineChart>
                </ChartContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="inventory" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Inventory by Model */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="size-5 text-primary" />
                  Inventory by Model
                </CardTitle>
                <CardDescription>
                  Distribution of Isuzu units by model line
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer config={brandChartConfig} className="h-[300px] w-full">
                  <BarChart data={inventoryByModel} layout="vertical" margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} className="stroke-muted" />
                    <XAxis type="number" tick={{ fill: 'var(--muted-foreground)' }} />
                    <YAxis dataKey="model" type="category" tick={{ fill: 'var(--muted-foreground)' }} width={80} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="count" fill="var(--chart-1)" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>

            {/* Status Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="size-5 text-primary" />
                  Status Distribution
                </CardTitle>
                <CardDescription>
                  Current vehicle status breakdown
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPie>
                      <Pie
                        data={statusDistribution}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={2}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        labelLine={false}
                      >
                        {statusDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </RechartsPie>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="performance" className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Card className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-success/10">
                  <TrendingUp className="size-6 text-success" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Avg. Sales Per Agent</p>
                  <p className="text-2xl font-bold">
                    {(dashboardData?.averageSalesPerAgent ?? 0).toFixed(1)}
                  </p>
                  <p className="text-xs text-success">
                    {`${dashboardData?.averageSalesPerAgentDelta ?? 0}`.startsWith('-') ? '' : '+'}
                    {(dashboardData?.averageSalesPerAgentDelta ?? 0).toFixed(1)} from last month
                  </p>
                </div>
              </div>
            </Card>
            <Card className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-primary/10">
                  <Clock className="size-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Avg. Prep Time</p>
                  <p className="text-2xl font-bold">
                    {(dashboardData?.averagePreparationTimeDays ?? 0).toFixed(1)} days
                  </p>
                  <p className="text-xs text-success">
                    {(dashboardData?.averagePreparationTimeDelta ?? 0).toFixed(1)} days vs last month
                  </p>
                </div>
              </div>
            </Card>
            <Card className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-warning/10">
                  <Car className="size-6 text-warning" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Test Drive Conversion</p>
                  <p className="text-2xl font-bold">
                    {(dashboardData?.testDriveConversionRate ?? 0).toFixed(0)}%
                  </p>
                  <p className="text-xs text-success">
                    {`${dashboardData?.testDriveConversionDelta ?? 0}`.startsWith('-') ? '' : '+'}
                    {(dashboardData?.testDriveConversionDelta ?? 0).toFixed(0)}% from last month
                  </p>
                </div>
              </div>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Recent Reports */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="size-5 text-primary" />
            Recent Reports
          </CardTitle>
          <CardDescription>
            Previously generated reports
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recentReports.map((report) => (
              <div
                key={report.id}
                className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <FileText className="size-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">{report.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {report.type} • Generated by {report.generatedBy} on {report.date}
                    </p>
                  </div>
                </div>
                <Button variant="outline" size="sm">
                  <FileDown className="mr-2 size-4" />
                  Download
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
