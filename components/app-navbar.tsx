'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Bell, ChevronDown, LogOut, Moon, Sun, Trash2, User } from 'lucide-react'
import { toast } from 'sonner'

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
import {
  clearNotifications,
  deleteNotificationRecord,
  fetchNotifications,
  markAllNotificationsRead,
  type AppNotification,
} from '@/lib/notifications-data'
import {
  getBrowserNotificationPermission,
  loadWebNotificationPreferences,
  subscribeWebNotificationPreferences,
  subscribeWebNotificationRefresh,
} from '@/lib/notification-preferences'
import { buildRolePath, getRoleFromPathname, stripRoleFromPathname } from '@/lib/rbac'
import { clearSession, getRoleLabel, getSessionUser } from '@/lib/session'

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

const NOTIFICATION_POLL_INTERVAL_MS = 15000

const playNotificationChime = async () => {
  if (typeof window === 'undefined' || typeof window.AudioContext === 'undefined') {
    return
  }

  const audioContext = new window.AudioContext()

  try {
    const oscillator = audioContext.createOscillator()
    const gainNode = audioContext.createGain()

    oscillator.type = 'sine'
    oscillator.frequency.setValueAtTime(880, audioContext.currentTime)
    oscillator.frequency.exponentialRampToValueAtTime(660, audioContext.currentTime + 0.18)

    gainNode.gain.setValueAtTime(0.0001, audioContext.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.045, audioContext.currentTime + 0.02)
    gainNode.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 0.22)

    oscillator.connect(gainNode)
    gainNode.connect(audioContext.destination)
    oscillator.start()
    oscillator.stop(audioContext.currentTime + 0.24)

    await new Promise((resolve) => window.setTimeout(resolve, 260))
  } catch {
    return
  } finally {
    void audioContext.close().catch(() => undefined)
  }
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
  const [currentUser, setCurrentUser] = React.useState(() => getSessionUser())
  const [notifications, setNotifications] = React.useState<AppNotification[]>([])
  const [isNotificationsOpen, setIsNotificationsOpen] = React.useState(false)
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = React.useState(false)
  const [notificationToDelete, setNotificationToDelete] =
    React.useState<AppNotification | null>(null)
  const [notificationPreferences, setNotificationPreferences] = React.useState(
    loadWebNotificationPreferences
  )
  const { resolvedTheme, setTheme } = useTheme()
  const hasLoadedNotificationsRef = React.useRef(false)
  const knownNotificationIdsRef = React.useRef<Set<string>>(new Set())
  const unreadCount = notifications.filter((n) => !n.read).length

  React.useEffect(() => {
    setCurrentUser(getSessionUser())
  }, [pathname])

  React.useEffect(() => {
    return subscribeWebNotificationPreferences(setNotificationPreferences)
  }, [])

  React.useEffect(() => {
    knownNotificationIdsRef.current = new Set()
    hasLoadedNotificationsRef.current = false
  }, [currentUser?.id])

  const replaceNotifications = React.useCallback(
    (
      nextNotifications: AppNotification[],
      options?: {
        announce?: boolean
      }
    ) => {
      const announce = options?.announce ?? false
      const newNotifications = announce
        ? nextNotifications.filter((notification) => !knownNotificationIdsRef.current.has(notification.id))
        : []

      if (
        announce &&
        hasLoadedNotificationsRef.current &&
        notificationPreferences.liveUpdates &&
        newNotifications.length
      ) {
        const newestNotificationsFirst = [...newNotifications].sort(
          (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
        )

        newestNotificationsFirst.forEach((notification) => {
          toast.info(notification.title, {
            description: notification.message,
            duration: 6000,
          })

          if (
            notificationPreferences.browserAlerts &&
            typeof document !== 'undefined' &&
            document.hidden &&
            getBrowserNotificationPermission() === 'granted'
          ) {
            const browserNotification = new Notification(notification.title, {
              body: notification.message,
              tag: notification.id,
            })

            browserNotification.onclick = () => {
              window.focus()
              browserNotification.close()
              setIsNotificationsOpen(true)
            }
          }
        })

        if (notificationPreferences.soundAlerts) {
          void playNotificationChime()
        }
      }

      knownNotificationIdsRef.current = new Set(
        nextNotifications.map((notification) => notification.id)
      )
      hasLoadedNotificationsRef.current = true
      setNotifications(nextNotifications)
    },
    [
      notificationPreferences.browserAlerts,
      notificationPreferences.liveUpdates,
      notificationPreferences.soundAlerts,
    ]
  )

  React.useEffect(() => {
    let isMounted = true

    const loadNotifications = async () => {
      if (!currentUser?.id) {
        if (isMounted) {
          replaceNotifications([])
        }
        return
      }

      try {
        const nextNotifications = await fetchNotifications(currentUser.id)
        if (isMounted) {
          replaceNotifications(nextNotifications, { announce: true })
        }
      } catch {
        return
      }
    }

    const handleRefreshRequest = () => {
      void loadNotifications()
    }

    const handleWindowFocus = () => {
      void loadNotifications()
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void loadNotifications()
      }
    }

    void loadNotifications()
    const intervalId = window.setInterval(() => {
      void loadNotifications()
    }, NOTIFICATION_POLL_INTERVAL_MS)
    const unsubscribeRefresh = subscribeWebNotificationRefresh(handleRefreshRequest)
    window.addEventListener('focus', handleWindowFocus)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      isMounted = false
      window.clearInterval(intervalId)
      unsubscribeRefresh()
      window.removeEventListener('focus', handleWindowFocus)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [currentUser?.id, replaceNotifications])

  const handleConfirmDeleteNotification = async () => {
    if (!notificationToDelete) return
    if (!currentUser?.id) return

    try {
      await deleteNotificationRecord(notificationToDelete.id, currentUser.id)
      const nextNotifications = notifications.filter(
        (notification) => notification.id !== notificationToDelete.id
      )
      replaceNotifications(nextNotifications)
      logAuditEvent({
        user: getAuditActor(role),
        action: 'DELETE',
        module: 'Notifications',
        description: `Deleted notification "${notificationToDelete.title}".`,
      })
      setNotificationToDelete(null)
      toast.success('Notification deleted.')
    } catch {
      toast.error('Unable to delete that notification right now.')
    }
  }

  const handleClearAllNotifications = async () => {
    if (!currentUser?.id) return

    try {
      await clearNotifications(currentUser.id)
      replaceNotifications([])
      toast.success('Notifications cleared.')
    } catch {
      toast.error('Unable to clear notifications right now.')
    }
  }

  const handleOpenNotifications = async () => {
    setIsNotificationsOpen(true)

    if (!currentUser?.id || unreadCount === 0) return

    try {
      const nextNotifications = await markAllNotificationsRead(currentUser.id)
      replaceNotifications(nextNotifications)
    } catch {
      return
    }
  }

  const handleSignOut = () => {
    logAuditEvent({
      user: getAuditActor(role),
      action: 'LOGOUT',
      module: 'Authentication',
      description: `${getAuditActor(role)} signed out.`,
    })
    clearSession()
    router.push('/login')
    router.refresh()
  }

  const userName =
    currentUser && `${currentUser.firstName} ${currentUser.lastName}`.trim()
      ? `${currentUser.firstName} ${currentUser.lastName}`.trim()
      : getAuditActor(role)
  const userEmail = currentUser?.email ?? ''
  const userRoleLabel = currentUser ? getRoleLabel(currentUser.role) : getAuditActor(role)
  const userAvatar = currentUser?.avatarUrl ?? ''

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
                      void handleClearAllNotifications()
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
                void handleOpenNotifications()
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
                <AvatarImage src={userAvatar} alt={userName} />
                <AvatarFallback className="bg-primary/10 text-xs font-medium text-primary">
                  {userName
                    .split(' ')
                    .map((name) => name[0])
                    .join('')}
                </AvatarFallback>
              </Avatar>
              <div className="hidden min-w-0 text-left sm:block">
                <p className="truncate text-sm font-medium">{userName}</p>
                <p className="text-xs text-muted-foreground">{userRoleLabel}</p>
              </div>
              <ChevronDown className="hidden size-4 text-muted-foreground sm:block" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <div className="px-2 py-1.5">
              <p className="text-sm font-medium">{userName}</p>
              <p className="text-xs text-muted-foreground">{userEmail}</p>
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
              <div className="flex items-center gap-2">
                {notifications.length > 0 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => void handleClearAllNotifications()}
                  >
                    Clear all
                  </Button>
                )}
              </div>
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
