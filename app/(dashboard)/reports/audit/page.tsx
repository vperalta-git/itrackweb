'use client'

import * as React from 'react'
import { usePathname, useRouter } from 'next/navigation'
import {
  FileText,
  Filter,
  Search,
  Clock,
} from 'lucide-react'
import type { ColumnDef } from '@tanstack/react-table'

import { DataTable } from '@/components/data-table'
import { PageHeader } from '@/components/page-header'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { buildRolePath, getRoleFromPathname } from '@/lib/rbac'
import { deriveActivityRecords, fetchReportSnapshot, type DerivedActivityRecord } from '@/lib/report-data'

const getActionColor = (action: DerivedActivityRecord['action']) => {
  switch (action) {
    case 'CREATE':
      return 'bg-green-100 text-green-700'
    case 'UPDATE':
      return 'bg-blue-100 text-blue-700'
    default:
      return ''
  }
}

export default function AuditTrailPage() {
  const router = useRouter()
  const pathname = usePathname()
  const role = getRoleFromPathname(pathname)
  const [logs, setLogs] = React.useState<DerivedActivityRecord[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [searchQuery, setSearchQuery] = React.useState('')
  const [actionFilter, setActionFilter] = React.useState('all')
  const [moduleFilter, setModuleFilter] = React.useState('all')

  React.useEffect(() => {
    if (role === 'sales-agent' || role === 'manager') {
      router.replace(buildRolePath(role, 'reports/history'))
    }
  }, [role, router])

  React.useEffect(() => {
    let isMounted = true

    const loadAuditData = async () => {
      setIsLoading(true)

      try {
        const snapshot = await fetchReportSnapshot()
        if (!isMounted) return

        setLogs(deriveActivityRecords(snapshot))
      } catch {
        if (!isMounted) return
        setLogs([])
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    void loadAuditData()

    return () => {
      isMounted = false
    }
  }, [])

  const moduleOptions = React.useMemo(
    () => ['all', ...Array.from(new Set(logs.map((log) => log.module))).sort()],
    [logs]
  )

  const filteredLogs = React.useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase()

    return logs.filter((log) => {
      const matchesSearch =
        normalizedQuery.length === 0 ||
        [log.user, log.description, log.module, log.timestamp]
          .join(' ')
          .toLowerCase()
          .includes(normalizedQuery)
      const matchesAction = actionFilter === 'all' || log.action === actionFilter
      const matchesModule = moduleFilter === 'all' || log.module === moduleFilter

      return matchesSearch && matchesAction && matchesModule
    })
  }, [actionFilter, logs, moduleFilter, searchQuery])

  const columns: ColumnDef<DerivedActivityRecord>[] = [
    {
      accessorKey: 'timestamp',
      header: 'Timestamp',
      cell: ({ row }) => (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Clock className="size-3" />
          <span>{row.original.timestamp}</span>
        </div>
      ),
    },
    {
      accessorKey: 'user',
      header: 'User',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Avatar className="size-6">
            <AvatarFallback className="bg-primary/10 text-[10px] text-primary">
              {row.original.user
                .split(' ')
                .map((name) => name[0])
                .join('')}
            </AvatarFallback>
          </Avatar>
          <span className="text-sm font-medium">{row.original.user}</span>
        </div>
      ),
    },
    {
      accessorKey: 'action',
      header: 'Action',
      cell: ({ row }) => (
        <Badge className={getActionColor(row.original.action)} variant="secondary">
          {row.original.action}
        </Badge>
      ),
    },
    {
      accessorKey: 'module',
      header: 'Module',
      cell: ({ row }) => <Badge variant="outline">{row.original.module}</Badge>,
    },
    {
      accessorKey: 'description',
      header: 'Description',
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit Trail"
        description="Track backend-derived activity across users, vehicles, allocations, preparations, bookings, and releases"
      />

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative min-w-[200px] flex-1">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by user or description..."
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="size-4 text-muted-foreground" />
            </div>
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Action" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                <SelectItem value="CREATE">Create</SelectItem>
                <SelectItem value="UPDATE">Update</SelectItem>
              </SelectContent>
            </Select>
            <Select value={moduleFilter} onValueChange={setModuleFilter}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder="Module" />
              </SelectTrigger>
              <SelectContent>
                {moduleOptions.map((module) => (
                  <SelectItem key={module} value={module}>
                    {module === 'all' ? 'All Modules' : module}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="size-5 text-primary" />
            Activity Logs
          </CardTitle>
          <CardDescription>
            {isLoading
              ? 'Loading backend activity...'
              : `Showing ${filteredLogs.length} of ${logs.length} entries`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={filteredLogs}
            searchKey="description"
            searchPlaceholder="Search by activity..."
            exportConfig={{
              title: 'Audit Trail Report',
              subtitle: 'Backend-derived system activity log',
              filename: 'audit-trail-report',
            }}
          />
        </CardContent>
      </Card>
    </div>
  )
}
