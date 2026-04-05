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

const modelDistribution = [
  { model: 'mu-X', count: 45, percentage: 27.2 },
  { model: 'D-Max', count: 38, percentage: 23.0 },
  { model: 'Traviz', count: 28, percentage: 16.9 },
  { model: 'NLR/NMR', count: 22, percentage: 13.3 },
  { model: 'NPR/NQR', count: 18, percentage: 10.9 },
  { model: 'FRR/FVR', count: 15, percentage: 9.1 },
]

const topSellingUnits = [
  { unit: 'Isuzu mu-X LS-E 4x2 AT', sold: 24 },
  { unit: 'Isuzu D-Max LS 4x4 MT', sold: 21 },
  { unit: 'Isuzu mu-X LS-A 4x4 AT', sold: 18 },
  { unit: 'Isuzu Traviz L', sold: 16 },
  { unit: 'Isuzu D-Max LT 4x2 AT', sold: 14 },
]

const agentPerformance = [
  { name: 'Maria Santos', allocations: 45, completed: 42, pending: 3 },
  { name: 'Juan Cruz', allocations: 38, completed: 35, pending: 3 },
  { name: 'Ana Reyes', allocations: 32, completed: 30, pending: 2 },
  { name: 'Pedro Garcia', allocations: 28, completed: 26, pending: 2 },
  { name: 'Lisa Tan', allocations: 25, completed: 23, pending: 2 },
]

export default function VehicleReportsPage() {
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
        <Select defaultValue="2024">
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="2024">2024</SelectItem>
            <SelectItem value="2023">2023</SelectItem>
            <SelectItem value="2022">2022</SelectItem>
          </SelectContent>
        </Select>
        <Select defaultValue="all">
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Models</SelectItem>
            <SelectItem value="mu-x">mu-X</SelectItem>
            <SelectItem value="d-max">D-Max</SelectItem>
            <SelectItem value="traviz">Traviz</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Inventory</p>
                <p className="text-2xl font-bold">248</p>
              </div>
              <div className="flex items-center text-sm text-green-600">
                <TrendingUp className="mr-1 size-4" />
                +12%
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Vehicles Sold</p>
                <p className="text-2xl font-bold">262</p>
              </div>
              <div className="flex items-center text-sm text-green-600">
                <TrendingUp className="mr-1 size-4" />
                +8%
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg. Days in Stock</p>
                <p className="text-2xl font-bold">32</p>
              </div>
              <div className="flex items-center text-sm text-red-600">
                <TrendingDown className="mr-1 size-4" />
                -5%
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Allocations</p>
                <p className="text-2xl font-bold">214</p>
              </div>
              <div className="flex items-center text-sm text-green-600">
                <TrendingUp className="mr-1 size-4" />
                +6%
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
                          <AvatarFallback className="bg-primary/10 text-primary text-xs">
                            {agent.name.split(' ').map((n) => n[0]).join('')}
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
