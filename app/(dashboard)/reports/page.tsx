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

// Mock data for charts
const monthlySalesData = [
  { month: 'Jan', sales: 45, target: 50 },
  { month: 'Feb', sales: 52, target: 50 },
  { month: 'Mar', sales: 48, target: 55 },
  { month: 'Apr', sales: 61, target: 55 },
  { month: 'May', sales: 55, target: 60 },
  { month: 'Jun', sales: 67, target: 60 },
]

// Isuzu model distribution
const inventoryByModel = [
  { model: 'mu-X', count: 45, percentage: 27 },
  { model: 'D-Max', count: 38, percentage: 23 },
  { model: 'Traviz', count: 28, percentage: 17 },
  { model: 'NLR/NMR', count: 22, percentage: 13 },
  { model: 'NPR/NQR', count: 18, percentage: 11 },
  { model: 'FRR/FVR', count: 15, percentage: 9 },
]

const statusDistribution = [
  { name: 'Available', value: 156, color: 'var(--chart-1)' },
  { name: 'In Stockyard', value: 34, color: 'var(--chart-4)' },
  { name: 'In Transit', value: 18, color: 'var(--chart-2)' },
  { name: 'Pending', value: 12, color: 'var(--chart-5)' },
  { name: 'In Dispatch', value: 20, color: 'var(--chart-3)' },
  { name: 'Released', value: 8, color: 'var(--muted)' },
]

const recentReports = [
  {
    id: '1',
    name: 'Monthly Sales Report - January 2024',
    type: 'Sales',
    generatedBy: 'Maria Santos',
    date: '2024-02-01',
  },
  {
    id: '2',
    name: 'Inventory Status Report',
    type: 'Inventory',
    generatedBy: 'Carlos Garcia',
    date: '2024-02-03',
  },
  {
    id: '3',
    name: 'Test Drive Analytics - Q1',
    type: 'Test Drive',
    generatedBy: 'Anna Lim',
    date: '2024-02-05',
  },
  {
    id: '4',
    name: 'Driver Performance Report',
    type: 'Operations',
    generatedBy: 'Maria Santos',
    date: '2024-02-05',
  },
]

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
            <div className="text-2xl font-bold">67</div>
            <p className="text-xs text-success flex items-center gap-1 mt-1">
              <TrendingUp className="size-3" />
              +8 from last month
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
            <div className="text-2xl font-bold">248</div>
            <p className="text-xs text-muted-foreground mt-1">
              156 available in Isuzu Pasig
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
            <div className="text-2xl font-bold">18</div>
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
            <div className="text-2xl font-bold">2.4 days</div>
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
                  <p className="text-2xl font-bold">11.2</p>
                  <p className="text-xs text-success">+2.3 from last month</p>
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
                  <p className="text-2xl font-bold">2.4 days</p>
                  <p className="text-xs text-success">-0.5 days improved</p>
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
                  <p className="text-2xl font-bold">75%</p>
                  <p className="text-xs text-success">+5% from last month</p>
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
