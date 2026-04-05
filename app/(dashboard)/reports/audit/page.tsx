'use client'

import * as React from 'react'
import { usePathname, useRouter } from 'next/navigation'
import {
  FileText,
  FileDown,
  Filter,
  Search,
  User,
  Clock,
  ArrowRight,
} from 'lucide-react'

import { DataTable } from '@/components/data-table'
import { PageHeader } from '@/components/page-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
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
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { exportPdfReport } from '@/lib/export-pdf'
import { getStoredAuditLogs, type AuditLogEntry } from '@/lib/audit-log'
import { buildRolePath, getRoleFromPathname } from '@/lib/rbac'
import { getScopedRoleData, matchesScopedAgent } from '@/lib/role-scope'
import type { ColumnDef } from '@tanstack/react-table'

// Mock audit data - Isuzu Pasig
const auditLogs: AuditLogEntry[] = [
  {
    id: '1',
    user: 'Juan Dela Cruz',
    action: 'CREATE',
    module: 'Inventory',
    description: 'Added new vehicle IP-2024-015 (Isuzu mu-X LS-E 4x2 AT)',
    timestamp: '2024-02-15 14:32:15',
  },
  {
    id: '2',
    user: 'Maria Santos',
    action: 'UPDATE',
    module: 'Allocation',
    description: 'Updated driver allocation #DA-2024-089 status to Completed',
    timestamp: '2024-02-15 14:28:42',
  },
  {
    id: '3',
    user: 'Admin',
    action: 'DELETE',
    module: 'Users',
    description: 'Removed user account: test.user@isuzupasig.com',
    timestamp: '2024-02-15 13:45:08',
  },
  {
    id: '4',
    user: 'Pedro Reyes',
    action: 'CREATE',
    module: 'Preparation',
    description: 'Created preparation request PR-2024-156',
    timestamp: '2024-02-15 13:22:33',
  },
  {
    id: '5',
    user: 'Ana Garcia',
    action: 'UPDATE',
    module: 'Inventory',
    description: 'Updated vehicle IP-2024-008 status to Reserved',
    timestamp: '2024-02-15 12:55:19',
  },
  {
    id: '6',
    user: 'Juan Dela Cruz',
    action: 'LOGIN',
    module: 'Authentication',
    description: 'User logged in successfully',
    timestamp: '2024-02-15 12:30:00',
  },
  {
    id: '7',
    user: 'Carlos Garcia',
    action: 'EXPORT',
    module: 'Reports',
    description: 'Exported Vehicle Inventory Report (PDF)',
    timestamp: '2024-02-15 11:48:25',
  },
  {
    id: '8',
    user: 'Maria Santos',
    action: 'CREATE',
    module: 'Test Drive',
    description: 'Scheduled test drive TD-2024-078 for customer',
    timestamp: '2024-02-15 11:15:42',
  },
  {
    id: '9',
    user: 'Admin',
    action: 'UPDATE',
    module: 'Settings',
    description: 'Updated system notification preferences',
    timestamp: '2024-02-15 10:30:18',
  },
  {
    id: '10',
    user: 'Anna Lim',
    action: 'UPDATE',
    module: 'Allocation',
    description: 'Assigned vehicle IP-2024-012 to Agent Juan Cruz',
    timestamp: '2024-02-15 10:05:55',
  },
]

const getActionBadgeVariant = (action: string) => {
  switch (action) {
    case 'CREATE':
      return 'default'
    case 'UPDATE':
      return 'secondary'
    case 'DELETE':
      return 'destructive'
    case 'LOGIN':
      return 'outline'
    case 'EXPORT':
      return 'secondary'
    case 'LOGOUT':
      return 'outline'
    default:
      return 'secondary'
  }
}

const getActionColor = (action: string) => {
  switch (action) {
    case 'CREATE':
      return 'bg-green-100 text-green-700'
    case 'UPDATE':
      return 'bg-blue-100 text-blue-700'
    case 'DELETE':
      return 'bg-red-100 text-red-700'
    case 'LOGIN':
      return 'bg-purple-100 text-purple-700'
    case 'EXPORT':
      return 'bg-orange-100 text-orange-700'
    case 'LOGOUT':
      return 'bg-slate-100 text-slate-700'
    default:
      return ''
  }
}

export default function AuditTrailPage() {
  const router = useRouter()
  const pathname = usePathname()
  const role = getRoleFromPathname(pathname)
  const scope = getScopedRoleData(role)
  const [dynamicLogs, setDynamicLogs] = React.useState<AuditLogEntry[]>([])
  const [searchQuery, setSearchQuery] = React.useState('')
  const [actionFilter, setActionFilter] = React.useState('all')
  const [moduleFilter, setModuleFilter] = React.useState('all')

  React.useEffect(() => {
    if (role === 'sales-agent' || role === 'manager') {
      router.replace(buildRolePath(role, 'reports/history'))
    }
  }, [role, router])

  React.useEffect(() => {
    const syncLogs = () => {
      setDynamicLogs(getStoredAuditLogs())
    }

    syncLogs()
    window.addEventListener('audit-log-updated', syncLogs)

    return () => {
      window.removeEventListener('audit-log-updated', syncLogs)
    }
  }, [])

  const filteredLogs = React.useMemo(() => {
    const mergedLogs = [...dynamicLogs, ...auditLogs]

    return mergedLogs.filter((log) => {
      const matchesScope = matchesScopedAgent(role, log.user)
      const matchesSearch =
        log.user.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.description.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesAction = actionFilter === 'all' || log.action === actionFilter
      const matchesModule = moduleFilter === 'all' || log.module === moduleFilter
      return matchesScope && matchesSearch && matchesAction && matchesModule
    })
  }, [role, searchQuery, actionFilter, moduleFilter, dynamicLogs])

  const columns: ColumnDef<(typeof auditLogs)[number]>[] = [
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
            <AvatarFallback className="bg-primary/10 text-primary text-[10px]">
              {row.original.user.split(' ').map((n) => n[0]).join('')}
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

  const handleExportPdf = () => {
    exportPdfReport({
      title: 'Audit Trail Report',
      subtitle:
        role === 'admin' || role === 'supervisor'
          ? 'All system activity logs'
          : role === 'manager'
          ? `Activity logs for agents under ${scope.managerName}`
          : `Activity logs for ${scope.agentName}`,
      filename: 'audit-trail-report',
      columns: [
        { header: 'Timestamp', value: (row) => row.timestamp },
        { header: 'User', value: (row) => row.user },
        { header: 'Action', value: (row) => row.action },
        { header: 'Module', value: (row) => row.module },
        { header: 'Description', value: (row) => row.description },
      ],
      rows: filteredLogs,
    })
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit Trail"
        description={
          role === 'admin' || role === 'supervisor'
            ? 'Track all system activities and changes'
            : role === 'manager'
            ? `Track activities made by agents under ${scope.managerName}`
            : `Track your own system activities as ${scope.agentName}`
        }
      />

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Search by user or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
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
                <SelectItem value="DELETE">Delete</SelectItem>
                <SelectItem value="LOGIN">Login</SelectItem>
                <SelectItem value="LOGOUT">Logout</SelectItem>
                <SelectItem value="EXPORT">Export</SelectItem>
              </SelectContent>
            </Select>
            <Select value={moduleFilter} onValueChange={setModuleFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Module" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Modules</SelectItem>
                <SelectItem value="Inventory">Inventory</SelectItem>
                <SelectItem value="Allocation">Allocation</SelectItem>
                <SelectItem value="Preparation">Preparation</SelectItem>
                <SelectItem value="Test Drive">Test Drive</SelectItem>
                <SelectItem value="Users">Users</SelectItem>
                <SelectItem value="Reports">Reports</SelectItem>
                <SelectItem value="Authentication">Authentication</SelectItem>
                <SelectItem value="Notifications">Notifications</SelectItem>
                <SelectItem value="Settings">Settings</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Audit Logs Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="size-5 text-primary" />
            Activity Logs
          </CardTitle>
          <CardDescription>
            Showing {filteredLogs.length} of {dynamicLogs.length + auditLogs.length} entries
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
              subtitle: 'System activity log',
              filename: 'audit-trail-report',
            }}
          />
        </CardContent>
      </Card>
    </div>
  )
}
