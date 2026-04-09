'use client'

import * as React from 'react'
import { usePathname, useRouter } from 'next/navigation'
import {
  FileText,
  Filter,
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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { apiRequest } from '@/lib/api-client'
import {
  AUDIT_LOG_UPDATED_EVENT,
  STORAGE_KEY as AUDIT_LOG_STORAGE_KEY,
  getStoredAuditLogs,
  type AuditLogEntry,
} from '@/lib/audit-log'
import { formatDateTimeLabel, parseDateValue } from '@/lib/backend-helpers'
import { buildRolePath, getRoleFromPathname } from '@/lib/rbac'
import { deriveActivityRecords, fetchReportSnapshot, type DerivedActivityRecord } from '@/lib/report-data'
import { loadUsers, syncUsersFromBackend, type SystemUser } from '@/lib/user-data'
import { mapBackendRoleToRouteRole } from '@/lib/session'

type AuthEventType = 'login' | 'logout'

type AuthEventApiRecord = {
  id: string
  userId?: string | { id?: string; _id?: string } | null
  name?: string | null
  email?: string | null
  role?: string | null
  eventType: AuthEventType
  createdAt: string
}

type AuditTableRecord = {
  id: string
  user: string
  action: AuditLogEntry['action'] | DerivedActivityRecord['action']
  module: string
  description: string
  timestamp: string
  timestampIso: string
}

const getActionColor = (action: AuditTableRecord['action']) => {
  switch (action) {
    case 'CREATE':
      return 'bg-green-100 text-green-700'
    case 'UPDATE':
      return 'bg-blue-100 text-blue-700'
    case 'DELETE':
      return 'bg-red-100 text-red-700'
    case 'LOGIN':
      return 'bg-emerald-100 text-emerald-700'
    case 'LOGOUT':
      return 'bg-amber-100 text-amber-700'
    case 'EXPORT':
      return 'bg-violet-100 text-violet-700'
    default:
      return ''
  }
}

const toAuditTableRecord = (log: AuditLogEntry): AuditTableRecord => ({
  ...log,
  timestampIso: parseDateValue(log.timestamp)?.toISOString() ?? new Date(0).toISOString(),
  timestamp: formatDateTimeLabel(log.timestamp, log.timestamp),
})

const formatAuthRoleLabel = (role?: string | null) => {
  if (!role) return 'User'

  const mappedRole = mapBackendRoleToRouteRole(role)

  switch (mappedRole) {
    case 'admin':
      return 'Administrator'
    case 'supervisor':
      return 'Supervisor'
    case 'manager':
      return 'Manager'
    case 'sales-agent':
      return 'Sales Agent'
    default:
      return role.replace(/_/g, ' ')
  }
}

const toAuthAuditTableRecord = (record: AuthEventApiRecord): AuditTableRecord => {
  const userLabel = record.name?.trim() || record.email?.trim() || 'Unknown user'
  const action = record.eventType === 'login' ? 'LOGIN' : 'LOGOUT'

  return {
    id: `auth-event-${record.id}`,
    user: userLabel,
    action,
    module: 'Authentication',
    description: `${record.email ?? userLabel} ${record.eventType === 'login' ? 'signed in' : 'signed out'} as ${formatAuthRoleLabel(record.role)}.`,
    timestampIso: parseDateValue(record.createdAt)?.toISOString() ?? new Date(0).toISOString(),
    timestamp: formatDateTimeLabel(record.createdAt, record.createdAt),
  }
}

const isSyntheticInventoryCreateLog = (log: AuditTableRecord) =>
  log.user === 'System' &&
  log.action === 'CREATE' &&
  log.module === 'Inventory' &&
  log.description.startsWith('Added vehicle ')

const mergeAuditLogs = (
  localLogs: AuditTableRecord[],
  backendLogs: AuditTableRecord[]
) => {
  const filteredLocalLogs = localLogs.filter(
    (log) => !(log.module === 'Authentication' && (log.action === 'LOGIN' || log.action === 'LOGOUT'))
  )
  const localInventoryCreateDescriptions = new Set(
    filteredLocalLogs
      .filter(
        (log) =>
          log.action === 'CREATE' &&
          log.module === 'Inventory' &&
          log.description.startsWith('Added vehicle ')
      )
      .map((log) => log.description)
  )

  return [...filteredLocalLogs, ...backendLogs]
    .filter(
      (log) =>
        !(
          isSyntheticInventoryCreateLog(log) &&
          localInventoryCreateDescriptions.has(log.description)
        )
    )
    .sort(
      (left, right) =>
        new Date(right.timestampIso).getTime() - new Date(left.timestampIso).getTime()
    )
}

export default function AuditTrailPage() {
  const router = useRouter()
  const pathname = usePathname()
  const role = getRoleFromPathname(pathname)
  const [logs, setLogs] = React.useState<AuditTableRecord[]>([])
  const [users, setUsers] = React.useState<SystemUser[]>(() => loadUsers())
  const [isLoading, setIsLoading] = React.useState(true)
  const [actionFilter, setActionFilter] = React.useState('all')
  const [moduleFilter, setModuleFilter] = React.useState('all')
  const [searchTerm, setSearchTerm] = React.useState('')

  React.useEffect(() => {
    if (role === 'sales-agent' || role === 'manager') {
      router.replace(buildRolePath(role, 'reports/history'))
    }
  }, [role, router])

  React.useEffect(() => {
    void syncUsersFromBackend().then(setUsers).catch(() => null)
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

  React.useEffect(() => {
    let isMounted = true
    let backendLogsCache: AuditTableRecord[] = []

    const mergeLogs = (localLogs: AuditTableRecord[]) => {
      if (!isMounted) return

      setLogs(mergeAuditLogs(localLogs, backendLogsCache))
    }

    const refreshLocalLogs = () => {
      mergeLogs(getStoredAuditLogs().map(toAuditTableRecord))
    }

    const loadAuditData = async () => {
      setIsLoading(true)
      refreshLocalLogs()

      try {
        const [snapshot, authEvents] = await Promise.all([
          fetchReportSnapshot(),
          apiRequest<AuthEventApiRecord[]>('/auth/events').catch(() => []),
        ])
        if (!isMounted) return

        backendLogsCache = [
          ...authEvents.map(toAuthAuditTableRecord),
          ...deriveActivityRecords(snapshot),
        ]
        refreshLocalLogs()
      } catch {
        if (!isMounted) return
        backendLogsCache = []
        refreshLocalLogs()
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    void loadAuditData()

    const handleFocus = () => {
      refreshLocalLogs()
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refreshLocalLogs()
      }
    }

    const handleStorage = (event: StorageEvent) => {
      if (event.key === AUDIT_LOG_STORAGE_KEY) {
        refreshLocalLogs()
      }
    }

    window.addEventListener('focus', handleFocus)
    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('storage', handleStorage)

    return () => {
      isMounted = false
      window.removeEventListener('focus', handleFocus)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('storage', handleStorage)
    }
  }, [])

  const moduleOptions = React.useMemo(
    () => ['all', ...Array.from(new Set(logs.map((log) => log.module))).sort()],
    [logs]
  )

  const filteredLogs = React.useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase()

    return logs.filter((log) => {
      const matchesAction = actionFilter === 'all' || log.action === actionFilter
      const matchesModule = moduleFilter === 'all' || log.module === moduleFilter
      const matchesSearch =
        normalizedSearch.length === 0 ||
        [log.user, log.action, log.module, log.description, log.timestamp]
          .join(' ')
          .toLowerCase()
          .includes(normalizedSearch)

      return matchesAction && matchesModule && matchesSearch
    })
  }, [actionFilter, logs, moduleFilter, searchTerm])

  React.useEffect(() => {
    const handleAuditLogUpdated = () => {
      setLogs((currentLogs) => {
        const backendLogs = currentLogs.filter(
          (log) => !String(log.id).startsWith('AUD-')
        )
        const localLogs = getStoredAuditLogs().map(toAuditTableRecord)

        return mergeAuditLogs(localLogs, backendLogs)
      })
    }

    window.addEventListener(AUDIT_LOG_UPDATED_EVENT, handleAuditLogUpdated)

    return () => {
      window.removeEventListener(AUDIT_LOG_UPDATED_EVENT, handleAuditLogUpdated)
    }
  }, [])

  const columns: ColumnDef<AuditTableRecord>[] = [
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
            <AvatarImage src={userAvatarByName.get(row.original.user) || ''} alt={row.original.user} />
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
          <div className="mb-4">
            <Input
              placeholder="Search activity logs"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="w-full sm:max-w-sm"
            />
          </div>
          <DataTable
            columns={columns}
            data={filteredLogs}
            toolbarRight={
              <>
                <div className="flex items-center gap-2 pr-1">
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
              </>
            }
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
