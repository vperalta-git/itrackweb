'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Bell, ChevronDown, LogOut, Moon, Sun, Trash2, User } from 'lucide-react'

import { cn } from '@/lib/utils'
import { ConfirmActionDialog } from '@/components/confirm-action-dialog'
import { useTheme } from '@/components/theme-provider'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { SidebarTrigger } from '@/components/ui/sidebar'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { getAuditActor, logAuditEvent } from '@/lib/audit-log'
import { buildRolePath, getRoleFromPathname, stripRoleFromPathname, type Role } from '@/lib/rbac'

// Route title mappings
const routeTitles: Record<string, string> = {
  dashboard: 'Dashboard',
  inventory: 'Vehicle Stocks',
  preparation: 'Vehicle Preparation',
  allocation: 'Allocation',
  units: 'Unit Allocation',
  drivers: 'Driver Allocation',
  tracking: 'Live Tracking',
  'test-drive': 'Test Drive',
  users: 'User Management',
  reports: 'Reports',
  vehicles: 'Vehicle/Allocation Reports',
  history: 'Release History',
  audit: 'Audit Trail',
  profile: 'My Profile',
  add: 'Add New',
  new: 'New Request',
}

// Mock notifications
const initialNotifications = [
  {
    id: 1,
    title: 'New vehicle added',
    message: 'Isuzu mu-X LS-E 4x2 AT has been added to inventory',
    time: '5 min ago',
    read: false,
  },
  {
    id: 2,
    title: 'Preparation complete',
    message: 'Vehicle #IP-2024-001 is ready for delivery',
    time: '1 hour ago',
    read: false,
  },
  {
    id: 3,
    title: 'Driver assigned',
    message: 'Driver Roberto Cruz assigned to delivery route',
    time: '2 hours ago',
    read: true,
  },
]

const mockUsersByRole: Record<Role, { name: string; email: string; role: string; avatar: string }> = {
  admin: {
    name: 'Maria Santos',
    email: 'admin@isuzupasig.com',
    role: 'Administrator',
    avatar: '',
  },
  supervisor: {
    name: 'Ramon Flores',
    email: 'supervisor@isuzupasig.com',
    role: 'Supervisor',
    avatar: '',
  },
  manager: {
    name: 'Carlos Garcia',
    email: 'manager@isuzupasig.com',
    role: 'Manager',
    avatar: '',
  },
  'sales-agent': {
    name: 'Juan Dela Cruz',
    email: 'agent@isuzupasig.com',
    role: 'Sales Agent',
    avatar: '',
  },
}

function generateBreadcrumbs(pathname: string) {
  const segments = stripRoleFromPathname(pathname).split('/').filter(Boolean)
  const breadcrumbs: Array<{ title: string; href: string; isLast: boolean }> = []
  const role = getRoleFromPathname(pathname)

  let currentPath = ''
  segments.forEach((segment, index) => {
    currentPath += `/${segment}`
    const title = routeTitles[segment] || segment.charAt(0).toUpperCase() + segment.slice(1)
    breadcrumbs.push({
      title,
      href: buildRolePath(role, currentPath),
      isLast: index === segments.length - 1,
    })
  })

  return breadcrumbs
}

export function AppNavbar() {
  const router = useRouter()
  const pathname = usePathname()
  const breadcrumbs = generateBreadcrumbs(pathname)
  const role = getRoleFromPathname(pathname)
  const mockUser = mockUsersByRole[role]
  const [notifications, setNotifications] = React.useState(initialNotifications)
  const [isNotificationsOpen, setIsNotificationsOpen] = React.useState(false)
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = React.useState(false)
  const [notificationToDelete, setNotificationToDelete] = React.useState<
    (typeof initialNotifications)[number] | null
  >(null)
  const { resolvedTheme, setTheme } = useTheme()
  const unreadCount = notifications.filter((n) => !n.read).length

  const deleteNotification = (id: number) => {
    setNotifications((current) => current.filter((notification) => notification.id !== id))
  }

  const clearAllNotifications = () => {
    setNotifications([])
  }

  const handleConfirmDeleteNotification = () => {
    if (!notificationToDelete) return

    deleteNotification(notificationToDelete.id)
    logAuditEvent({
      user: getAuditActor(role),
      action: 'DELETE',
      module: 'Notifications',
      description: `Deleted notification "${notificationToDelete.title}".`,
    })
    setNotificationToDelete(null)
  }

  const handleSignOut = () => {
    logAuditEvent({
      user: getAuditActor(role),
      action: 'LOGOUT',
      module: 'Authentication',
      description: `${getAuditActor(role)} signed out.`,
    })
    window.localStorage.removeItem('theme')
    router.push('/login')
    router.refresh()
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center gap-4 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 lg:px-6">
      {/* Sidebar Toggle & Breadcrumb */}
      <div className="flex items-center gap-2">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="h-6" />
        <Breadcrumb className="hidden md:flex">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link
                  href={buildRolePath(role, 'dashboard')}
                  className="text-muted-foreground hover:text-foreground"
                >
                  Home
                </Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            {breadcrumbs.map((crumb, index) => (
              <React.Fragment key={crumb.href}>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  {crumb.isLast ? (
                    <BreadcrumbPage className="font-medium">
                      {crumb.title}
                    </BreadcrumbPage>
                  ) : (
                    <BreadcrumbLink asChild>
                      <Link href={crumb.href} className="text-muted-foreground hover:text-foreground">
                        {crumb.title}
                      </Link>
                    </BreadcrumbLink>
                  )}
                </BreadcrumbItem>
              </React.Fragment>
            ))}
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Right Side Actions */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 rounded-full border border-border/70 px-2.5 py-1.5">
          <Sun className="size-4 text-muted-foreground" />
          <Switch
            checked={resolvedTheme === 'dark'}
            onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')}
            aria-label="Toggle dark mode"
          />
          <Moon className="size-4 text-muted-foreground" />
        </div>

        {/* Notifications */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="size-5" />
              {unreadCount > 0 && (
                <Badge className="absolute -top-1 -right-1 size-5 p-0 flex items-center justify-center text-[10px]">
                  {unreadCount}
                </Badge>
              )}
              <span className="sr-only">Notifications</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <DropdownMenuLabel className="flex items-center justify-between">
              <span>Notifications</span>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {unreadCount} new
                  </Badge>
                )}
                {notifications.length > 0 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={(event) => {
                      event.preventDefault()
                      event.stopPropagation()
                      clearAllNotifications()
                    }}
                  >
                    Clear all
                  </Button>
                )}
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <div className="max-h-80 overflow-y-auto">
              {notifications.length > 0 ? (
                notifications.map((notification) => (
                  <DropdownMenuItem
                    key={notification.id}
                    className={cn(
                      'flex cursor-pointer flex-col items-start gap-1 p-3',
                      !notification.read && 'bg-primary/5'
                    )}
                  >
                    <div className="flex w-full items-start justify-between gap-2">
                      <span className="font-medium text-sm">{notification.title}</span>
                      <div className="flex items-center gap-2">
                        {!notification.read && (
                          <span className="mt-1 size-2 shrink-0 rounded-full bg-primary" />
                        )}
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-7"
                          onClick={(event) => {
                            event.preventDefault()
                            event.stopPropagation()
                            setNotificationToDelete(notification)
                          }}
                        >
                          <Trash2 className="size-3.5" />
                          <span className="sr-only">Delete notification</span>
                        </Button>
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground line-clamp-2">
                      {notification.message}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {notification.time}
                    </span>
                  </DropdownMenuItem>
                ))
              ) : (
                <div className="p-6 text-center text-sm text-muted-foreground">
                  No notifications
                </div>
              )}
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="justify-center text-primary cursor-pointer"
              onSelect={(event) => {
                event.preventDefault()
                setIsNotificationsOpen(true)
              }}
            >
              View all notifications
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-10 gap-3 rounded-full px-2 sm:px-3">
              <Avatar className="size-8 border border-border">
                <AvatarImage src={mockUser.avatar} alt={mockUser.name} />
                <AvatarFallback className="bg-primary/10 text-xs font-medium text-primary">
                  {mockUser.name
                    .split(' ')
                    .map((name) => name[0])
                    .join('')}
                </AvatarFallback>
              </Avatar>
              <div className="hidden min-w-0 text-left sm:block">
                <p className="truncate text-sm font-medium">{mockUser.name}</p>
                <p className="text-xs text-muted-foreground">{mockUser.role}</p>
              </div>
              <ChevronDown className="hidden size-4 text-muted-foreground sm:block" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <div className="px-2 py-1.5">
              <p className="text-sm font-medium">{mockUser.name}</p>
              <p className="text-xs text-muted-foreground">{mockUser.email}</p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href={buildRolePath(role, 'profile')} className="cursor-pointer">
                <User className="mr-2 size-4" />
                My Profile
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="cursor-pointer text-destructive focus:text-destructive"
              onClick={() => setIsLogoutConfirmOpen(true)}
            >
              <LogOut className="mr-2 size-4" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Dialog open={isNotificationsOpen} onOpenChange={setIsNotificationsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <div className="flex items-center justify-between gap-4">
              <div>
                <DialogTitle>Notifications</DialogTitle>
                <DialogDescription>
                  Latest inventory, preparation, and allocation updates.
                </DialogDescription>
              </div>
              {notifications.length > 0 && (
                <Button type="button" variant="outline" size="sm" onClick={clearAllNotifications}>
                  Clear all
                </Button>
              )}
            </div>
          </DialogHeader>
          <div className="space-y-3">
            {notifications.length > 0 ? (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className="rounded-xl border border-border/70 p-4 transition-colors hover:bg-muted/40"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{notification.title}</p>
                        {!notification.read && (
                          <span className="size-2 rounded-full bg-primary" />
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{notification.message}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="whitespace-nowrap text-xs text-muted-foreground">
                        {notification.time}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-8"
                        onClick={() => setNotificationToDelete(notification)}
                      >
                        <Trash2 className="size-4" />
                        <span className="sr-only">Delete notification</span>
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-xl border border-dashed border-border/70 p-8 text-center text-sm text-muted-foreground">
                No notifications to show.
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmActionDialog
        open={Boolean(notificationToDelete)}
        onOpenChange={(open) => {
          if (!open) setNotificationToDelete(null)
        }}
        title="Delete Notification"
        description={
          notificationToDelete
            ? `Delete the notification "${notificationToDelete.title}"? This action cannot be undone.`
            : ''
        }
        confirmLabel="Delete"
        onConfirm={handleConfirmDeleteNotification}
      />

      <ConfirmActionDialog
        open={isLogoutConfirmOpen}
        onOpenChange={setIsLogoutConfirmOpen}
        title="Sign Out"
        description="Are you sure you want to sign out of your account?"
        confirmLabel="Sign Out"
        onConfirm={handleSignOut}
      />
    </header>
  )
}
