'use client'

import * as React from 'react'
import { ColumnDef } from '@tanstack/react-table'
import { usePathname } from 'next/navigation'
import {
  Plus,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  Shield,
  ArrowUpDown,
  Filter,
  Users,
  UserCheck,
} from 'lucide-react'

import { PageHeader } from '@/components/page-header'
import { StatusBadge } from '@/components/status-badge'
import { DataTable } from '@/components/data-table'
import { ConfirmActionDialog } from '@/components/confirm-action-dialog'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { getAuditActor, logAuditEvent } from '@/lib/audit-log'
import { getRoleFromPathname } from '@/lib/rbac'
import {
  createUserRecord,
  loadUsers,
  SystemUser,
  syncUsersFromBackend,
  updateUserRecord,
} from '@/lib/user-data'
import {
  isValidMobilePhoneNumber,
  MOBILE_PHONE_VALIDATION_MESSAGE,
  normalizeMobilePhoneNumber,
} from '@/lib/phone'
import { toast } from 'sonner'

// Types
type User = SystemUser

// Role badge colors
const roleColors: Record<string, string> = {
  admin: 'bg-destructive/10 text-destructive border-destructive/20',
  manager: 'bg-primary/10 text-primary border-primary/20',
  'sales-agent': 'bg-success/10 text-success border-success/20',
  dispatch: 'bg-info/10 text-info border-info/20',
  driver: 'bg-warning/10 text-warning border-warning/20',
  supervisor: 'bg-secondary text-secondary-foreground border-border',
}

const roleLabels: Record<string, string> = {
  admin: 'Administrator',
  manager: 'Manager',
  'sales-agent': 'Sales Agent',
  dispatch: 'Dispatch',
  driver: 'Driver',
  supervisor: 'Supervisor',
}

const getFullName = (user: Pick<User, 'firstName' | 'lastName'>) =>
  `${user.firstName} ${user.lastName}`.trim()

const getInitials = (user: Pick<User, 'firstName' | 'lastName'>) =>
  `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase()

const isValidEmailAddress = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)

export default function UsersPage() {
  const pathname = usePathname()
  const role = getRoleFromPathname(pathname)
  const [users, setUsers] = React.useState<User[]>(loadUsers())
  const [selectedUser, setSelectedUser] = React.useState<User | null>(null)
  const [isAddUserOpen, setIsAddUserOpen] = React.useState(false)
  const [isViewDetailsOpen, setIsViewDetailsOpen] = React.useState(false)
  const [isEditUserOpen, setIsEditUserOpen] = React.useState(false)
  const [isChangeRoleOpen, setIsChangeRoleOpen] = React.useState(false)
  const [userToDeactivate, setUserToDeactivate] = React.useState<User | null>(null)
  const [userToActivate, setUserToActivate] = React.useState<User | null>(null)
  const [roleFilter, setRoleFilter] = React.useState<string>('all')
  const [statusFilter, setStatusFilter] = React.useState<'all' | User['status']>('active')
  const [addForm, setAddForm] = React.useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    role: 'sales-agent' as User['role'],
    managerId: '',
  })
  const [editForm, setEditForm] = React.useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    role: 'sales-agent' as User['role'],
    status: 'active' as User['status'],
  })
  const [pendingRole, setPendingRole] = React.useState<User['role']>('sales-agent')

  React.useEffect(() => {
    let isMounted = true

    const loadBackendUsers = async () => {
      try {
        const nextUsers = await syncUsersFromBackend()
        if (isMounted) {
          setUsers(nextUsers)
        }
      } catch {
        return
      }
    }

    void loadBackendUsers()

    return () => {
      isMounted = false
    }
  }, [])

  const managerUsers = React.useMemo(
    () => users.filter((user) => user.role === 'manager' && user.status === 'active'),
    [users]
  )
  const isValidAddPhoneNumber =
    addForm.phone.trim().length === 0 || isValidMobilePhoneNumber(addForm.phone)

  const openViewDetails = (user: User) => {
    setSelectedUser(user)
    setIsViewDetailsOpen(true)
  }

  const openEditUser = (user: User) => {
    setSelectedUser(user)
    setEditForm({
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone,
      role: user.role,
      status: user.status,
    })
    setIsEditUserOpen(true)
  }

  const openChangeRole = (user: User) => {
    setSelectedUser(user)
    setPendingRole(user.role)
    setIsChangeRoleOpen(true)
  }

  const updateSelectedUser = (updatedUser: User) => {
    setUsers((currentUsers) =>
      currentUsers.map((user) => (user.id === updatedUser.id ? updatedUser : user))
    )
    setSelectedUser(updatedUser)
  }

  const handleEditUserSave = async () => {
    if (!selectedUser) return
    const firstName = editForm.firstName.trim()
    const lastName = editForm.lastName.trim()
    const email = editForm.email.trim().toLowerCase()
    const phone = editForm.phone.trim()

    if (!firstName || !lastName || !email || !phone) return

    if (!isValidEmailAddress(email)) {
      toast.error('Enter a valid email address.')
      return
    }

    const duplicateEmail = users.some(
      (user) => user.id !== selectedUser.id && user.email.toLowerCase() === email
    )

    if (duplicateEmail) {
      toast.error('Email address already exists.')
      return
    }

    if (!isValidMobilePhoneNumber(phone)) {
      toast.error(MOBILE_PHONE_VALIDATION_MESSAGE)
      return
    }

    const updatedUser = await updateUserRecord(selectedUser.id, {
      firstName,
      lastName,
      email,
      phone,
      role: editForm.role,
      status: editForm.status,
      bio: selectedUser.bio,
    })

    updateSelectedUser(updatedUser)
    setIsEditUserOpen(false)
    logAuditEvent({
      user: getAuditActor(role),
      action: 'UPDATE',
      module: 'Users',
      description: `Updated user profile ${email}.`,
    })
    toast.success('User details updated.')
  }

  const handleCreateUser = async () => {
    const firstName = addForm.firstName.trim()
    const lastName = addForm.lastName.trim()

    const email = addForm.email.trim().toLowerCase()
    const phone = addForm.phone.trim()
    const managerId = addForm.role === 'sales-agent' ? addForm.managerId : ''

    if (!firstName || !lastName || !email || !phone) return

    if (!isValidEmailAddress(email)) {
      toast.error('Enter a valid email address.')
      return
    }

    const duplicateEmail = users.some((user) => user.email.toLowerCase() === email)

    if (duplicateEmail) {
      toast.error('Email address already exists.')
      return
    }

    if (!isValidMobilePhoneNumber(phone)) {
      toast.error(MOBILE_PHONE_VALIDATION_MESSAGE)
      return
    }

    if (addForm.role === 'sales-agent' && !managerId) {
      toast.error('Select an assigned manager for the sales agent.')
      return
    }

    const nextUser = await createUserRecord({
      firstName,
      lastName,
      email,
      phone,
      role: addForm.role,
      managerId: managerId || null,
      sendCredentialsEmail: true,
    })

    setUsers((currentUsers) => [nextUser, ...currentUsers.filter((user) => user.id !== nextUser.id)])
    setAddForm({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      role: 'sales-agent',
      managerId: '',
    })
    setIsAddUserOpen(false)
    logAuditEvent({
      user: getAuditActor(role),
      action: 'CREATE',
      module: 'Users',
      description: `Created user account ${nextUser.email}.`,
    })
    toast.success('User account created.')
  }

  const handleChangeRoleSave = async () => {
    if (!selectedUser) return

    const updatedUser = await updateUserRecord(selectedUser.id, {
      firstName: selectedUser.firstName,
      lastName: selectedUser.lastName,
      email: selectedUser.email,
      phone: selectedUser.phone,
      role: pendingRole,
      status: selectedUser.status,
      bio: selectedUser.bio,
      skipPhoneValidation: true,
    })

    updateSelectedUser(updatedUser)
    setIsChangeRoleOpen(false)
    logAuditEvent({
      user: getAuditActor(role),
      action: 'UPDATE',
      module: 'Users',
      description: `Changed role for ${selectedUser.email} to ${roleLabels[pendingRole]}.`,
    })
    toast.success('User role updated.')
  }

  const handleDeactivateUser = async () => {
    if (!userToDeactivate) return

    const updatedUser = await updateUserRecord(userToDeactivate.id, {
      firstName: userToDeactivate.firstName,
      lastName: userToDeactivate.lastName,
      email: userToDeactivate.email,
      phone: userToDeactivate.phone,
      role: userToDeactivate.role,
      status: 'inactive',
      bio: userToDeactivate.bio,
      skipPhoneValidation: true,
    })

    updateSelectedUser(updatedUser)
    setUserToDeactivate(null)
    logAuditEvent({
      user: getAuditActor(role),
      action: 'DELETE',
      module: 'Users',
      description: `Deactivated user account ${updatedUser.email}.`,
    })
    toast.success('User account deactivated.')
  }

  const handleActivateUser = async () => {
    if (!userToActivate) return

    const updatedUser = await updateUserRecord(userToActivate.id, {
      firstName: userToActivate.firstName,
      lastName: userToActivate.lastName,
      email: userToActivate.email,
      phone: userToActivate.phone,
      role: userToActivate.role,
      status: 'active',
      bio: userToActivate.bio,
      skipPhoneValidation: true,
    })

    updateSelectedUser(updatedUser)
    setUserToActivate(null)
    logAuditEvent({
      user: getAuditActor(role),
      action: 'UPDATE',
      module: 'Users',
      description: `Activated user account ${updatedUser.email}.`,
    })
    toast.success('User account activated.')
  }

  // Column definitions
  const columns: ColumnDef<User>[] = [
    {
      id: 'name',
      header: 'User',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Avatar className="size-8">
            <AvatarImage src={row.original.avatarUrl ?? ''} alt={getFullName(row.original)} />
            <AvatarFallback className="text-xs bg-primary/10 text-primary">
              {getInitials(row.original)}
            </AvatarFallback>
          </Avatar>
          <div>
            <span className="font-medium">{getFullName(row.original)}</span>
            <p className="text-xs text-muted-foreground">{row.original.email}</p>
          </div>
        </div>
      ),
      accessorFn: (row) => getFullName(row),
    },
    {
      accessorKey: 'role',
      header: 'Role',
      cell: ({ row }) => {
        const role = row.getValue('role') as string
        return (
          <Badge variant="outline" className={roleColors[role]}>
            {roleLabels[role]}
          </Badge>
        )
      },
      filterFn: (row, id, value) => {
        if (value === 'all') return true
        return row.getValue(id) === value
      },
    },
    {
      accessorKey: 'lastLogin',
      header: 'Last Login',
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">{row.getValue('lastLogin')}</span>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => <StatusBadge status={row.getValue('status')} />,
    },
    {
      id: 'actions',
      enableHiding: false,
      cell: ({ row }) => {
        const user = row.original

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="size-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => {
                  openViewDetails(user)
                }}
              >
                <Eye className="mr-2 size-4" />
                View Details
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => openEditUser(user)}>
                <Edit className="mr-2 size-4" />
                Edit User
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => openChangeRole(user)}>
                <Shield className="mr-2 size-4" />
                Change Role
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {user.status === 'active' ? (
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={() => setUserToDeactivate(user)}
                >
                  <Trash2 className="mr-2 size-4" />
                  Deactivate
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem onClick={() => setUserToActivate(user)}>
                  <UserCheck className="mr-2 size-4" />
                  Activate
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    },
  ]

  // Filter data
  const filteredUsers = React.useMemo(() => {
    return users.filter((user) => {
      const matchesRole = roleFilter === 'all' || user.role === roleFilter
      const matchesStatus = statusFilter === 'all' || user.status === statusFilter
      return matchesRole && matchesStatus
    })
  }, [roleFilter, statusFilter, users])

  const activeUsers = filteredUsers.filter((u) => u.status === 'active').length
  const deactivatedAccounts = filteredUsers.filter((u) => u.status === 'inactive').length

  return (
    <div className="space-y-6">
      <PageHeader
        title="User Management"
        description="Manage system users and their permissions"
      >
        <Dialog open={isAddUserOpen} onOpenChange={setIsAddUserOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="mr-2 size-4" />
              Add User
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Add New User</DialogTitle>
              <DialogDescription>
                Create a new user account with assigned role and permissions.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>First Name</Label>
                  <Input
                    placeholder="Enter first name"
                    value={addForm.firstName}
                    onChange={(event) =>
                      setAddForm((current) => ({ ...current, firstName: event.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Last Name</Label>
                  <Input
                    placeholder="Enter last name"
                    value={addForm.lastName}
                    onChange={(event) =>
                      setAddForm((current) => ({ ...current, lastName: event.target.value }))
                    }
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Email Address</Label>
                <Input
                  type="email"
                  placeholder="user@isuzupasig.com"
                  value={addForm.email}
                  onChange={(event) =>
                    setAddForm((current) => ({ ...current, email: event.target.value }))
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Enter a complete email like `name@example.com`.
                </p>
              </div>
              <div className="space-y-2">
                <Label>Phone Number</Label>
                <Input
                  placeholder="+63 9XX XXX XXXX"
                  value={addForm.phone}
                  onChange={(event) =>
                    setAddForm((current) => ({
                      ...current,
                      phone: normalizeMobilePhoneNumber(
                        event.target.value.replace(/[^\d+]/g, '').slice(0, 13)
                      ),
                    }))
                  }
                />
                <p className="text-xs text-muted-foreground">{MOBILE_PHONE_VALIDATION_MESSAGE}</p>
                {addForm.phone.trim().length > 0 && !isValidAddPhoneNumber ? (
                  <p className="text-xs text-destructive">{MOBILE_PHONE_VALIDATION_MESSAGE}</p>
                ) : null}
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <Select
                  value={addForm.role}
                  onValueChange={(value: User['role']) =>
                    setAddForm((current) => ({
                      ...current,
                      role: value,
                      managerId: value === 'sales-agent' ? current.managerId : '',
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Administrator</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="sales-agent">Sales Agent</SelectItem>
                    <SelectItem value="dispatch">Dispatch</SelectItem>
                    <SelectItem value="driver">Driver</SelectItem>
                    <SelectItem value="supervisor">Supervisor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {addForm.role === 'sales-agent' && (
                <div className="space-y-2">
                  <Label>Assigned Manager</Label>
                  <Select
                    value={addForm.managerId}
                    onValueChange={(value) =>
                      setAddForm((current) => ({ ...current, managerId: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select assigned manager" />
                    </SelectTrigger>
                    <SelectContent>
                      {managerUsers.map((manager) => (
                        <SelectItem key={manager.id} value={manager.id}>
                          {getFullName(manager)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    This field only applies to sales agents.
                  </p>
                </div>
              )}
              <div className="rounded-lg border bg-muted/40 p-3 text-sm text-muted-foreground">
                Login credentials are generated on the server and emailed automatically after account creation.
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddUserOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleCreateUser}
                disabled={
                  !addForm.firstName.trim() ||
                  !addForm.lastName.trim() ||
                  !addForm.email.trim() ||
                  !addForm.phone.trim() ||
                  !isValidAddPhoneNumber ||
                  (addForm.role === 'sales-agent' && !addForm.managerId)
                }
              >
                Create User
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </PageHeader>

      <DataTable
        columns={columns}
        data={filteredUsers}
        searchKey="name"
        searchPlaceholder="Search by name..."
        filterComponent={
          <div className="flex items-center gap-2">
            <Filter className="size-4 text-muted-foreground" />
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="All Roles" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="admin">Administrator</SelectItem>
                <SelectItem value="manager">Manager</SelectItem>
                <SelectItem value="sales-agent">Sales Agent</SelectItem>
                <SelectItem value="dispatch">Dispatch</SelectItem>
                <SelectItem value="driver">Driver</SelectItem>
                <SelectItem value="supervisor">Supervisor</SelectItem>
              </SelectContent>
            </Select>
          </div>
        }
        toolbarRight={
          <div className="inline-flex rounded-2xl border bg-muted/30 p-1">
            <button
              type="button"
              onClick={() => setStatusFilter('all')}
              className={`flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
                statusFilter === 'all'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Users className="size-4" />
              <span>Total</span>
              <Badge variant="secondary" className="rounded-full">
                {roleFilter === 'all'
                  ? users.length
                  : users.filter((user) => user.role === roleFilter).length}
              </Badge>
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('active')}
              className={`flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
                statusFilter === 'active'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <UserCheck className="size-4" />
              <span>Active</span>
              <Badge variant="secondary" className="rounded-full">
                {roleFilter === 'all'
                  ? users.filter((user) => user.status === 'active').length
                  : users.filter((user) => user.role === roleFilter && user.status === 'active').length}
              </Badge>
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('inactive')}
              className={`flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
                statusFilter === 'inactive'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Shield className="size-4" />
              <span>Deactivated</span>
              <Badge variant="secondary" className="rounded-full">
                {roleFilter === 'all'
                  ? users.filter((user) => user.status === 'inactive').length
                  : users.filter((user) => user.role === roleFilter && user.status === 'inactive').length}
              </Badge>
            </button>
          </div>
        }
      />

      <Dialog open={isViewDetailsOpen} onOpenChange={setIsViewDetailsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>User Details</DialogTitle>
            <DialogDescription>
              Complete information about this user.
            </DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                  <Avatar className="size-16">
                    <AvatarImage src={selectedUser.avatarUrl ?? ''} alt={getFullName(selectedUser)} />
                    <AvatarFallback className="text-xl bg-primary/10 text-primary">
                    {getInitials(selectedUser)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-xl font-bold">{getFullName(selectedUser)}</h3>
                  <p className="text-muted-foreground">{selectedUser.email}</p>
                  <Badge variant="outline" className={`mt-1 ${roleColors[selectedUser.role]}`}>
                    {roleLabels[selectedUser.role]}
                  </Badge>
                </div>
              </div>

              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-muted/50">
                  <h4 className="text-sm font-medium mb-3">Contact Information</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Email</span>
                      <span className="font-medium">{selectedUser.email}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Phone</span>
                      <span className="font-medium">{selectedUser.phone}</span>
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-lg bg-muted/50">
                  <h4 className="text-sm font-medium mb-3">Account Details</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Status</span>
                      <StatusBadge status={selectedUser.status} />
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Last Login</span>
                      <span className="font-medium">{selectedUser.lastLogin}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Created</span>
                      <span className="font-medium">{selectedUser.createdAt}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-2 pt-4 border-t">
                <Button
                  className="flex-1"
                  onClick={() => {
                    setIsViewDetailsOpen(false)
                    openEditUser(selectedUser)
                  }}
                >
                  <Edit className="mr-2 size-4" />
                  Edit User
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsViewDetailsOpen(false)
                    openChangeRole(selectedUser)
                  }}
                >
                  <Shield className="mr-2 size-4" />
                  Change Role
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isEditUserOpen} onOpenChange={setIsEditUserOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Update the selected user&apos;s profile information.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>First Name</Label>
                <Input
                  value={editForm.firstName}
                  onChange={(event) =>
                    setEditForm((current) => ({ ...current, firstName: event.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Last Name</Label>
                <Input
                  value={editForm.lastName}
                  onChange={(event) =>
                    setEditForm((current) => ({ ...current, lastName: event.target.value }))
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Email Address</Label>
              <Input
                type="email"
                value={editForm.email}
                onChange={(event) =>
                  setEditForm((current) => ({ ...current, email: event.target.value }))
                }
              />
              <p className="text-xs text-muted-foreground">
                Enter a complete email like `name@example.com`.
              </p>
            </div>
            <div className="space-y-2">
              <Label>Phone Number</Label>
              <Input
                value={editForm.phone}
                onChange={(event) =>
                  setEditForm((current) => ({ ...current, phone: event.target.value }))
                }
              />
              <p className="text-xs text-muted-foreground">{MOBILE_PHONE_VALIDATION_MESSAGE}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Role</Label>
                <Select
                  value={editForm.role}
                  onValueChange={(value: User['role']) =>
                    setEditForm((current) => ({ ...current, role: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Administrator</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="sales-agent">Sales Agent</SelectItem>
                    <SelectItem value="dispatch">Dispatch</SelectItem>
                    <SelectItem value="driver">Driver</SelectItem>
                    <SelectItem value="supervisor">Supervisor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={editForm.status}
                  onValueChange={(value: User['status']) =>
                    setEditForm((current) => ({ ...current, status: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditUserOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleEditUserSave}
              disabled={
                !editForm.firstName.trim() ||
                !editForm.lastName.trim() ||
                !editForm.email.trim() ||
                !editForm.phone.trim()
              }
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isChangeRoleOpen} onOpenChange={setIsChangeRoleOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Change Role</DialogTitle>
            <DialogDescription>
              Update the selected user&apos;s role assignment.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {selectedUser && (
              <div className="rounded-lg border bg-muted/40 p-4">
                <p className="font-medium">{getFullName(selectedUser)}</p>
                <p className="text-sm text-muted-foreground">{selectedUser.email}</p>
              </div>
            )}
            <div className="space-y-2">
              <Label>Role</Label>
              <Select
                value={pendingRole}
                onValueChange={(value: User['role']) => setPendingRole(value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Administrator</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="sales-agent">Sales Agent</SelectItem>
                  <SelectItem value="dispatch">Dispatch</SelectItem>
                  <SelectItem value="driver">Driver</SelectItem>
                  <SelectItem value="supervisor">Supervisor</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsChangeRoleOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleChangeRoleSave}>Update Role</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmActionDialog
        open={Boolean(userToDeactivate)}
        onOpenChange={(open) => {
          if (!open) setUserToDeactivate(null)
        }}
        title="Deactivate Account"
        description={
          userToDeactivate
            ? `Deactivate ${getFullName(userToDeactivate)}? This account will be moved to deactivated users.`
            : ''
        }
        confirmLabel="Deactivate"
        onConfirm={handleDeactivateUser}
      />

      <ConfirmActionDialog
        open={Boolean(userToActivate)}
        onOpenChange={(open) => {
          if (!open) setUserToActivate(null)
        }}
        title="Activate Account"
        description={
          userToActivate
            ? `Activate ${getFullName(userToActivate)}? This account will be restored to active users.`
            : ''
        }
        confirmLabel="Activate"
        onConfirm={handleActivateUser}
      />
    </div>
  )
}
