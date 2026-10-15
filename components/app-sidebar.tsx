'use client'

import * as React from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Package,
  ClipboardCheck,
  Users,
  Car,
  MapPin,
  FileText,
  ChevronDown,
  Truck,
} from 'lucide-react'

import { cn } from '@/lib/utils'
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
  useSidebar,
} from '@/components/ui/sidebar'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { buildRolePath, getRoleFromPathname, type Role } from '@/lib/rbac'
import itrackLogo from '@/media/itrackred.png'

type NavConfigItem = {
  title: string
  url: string
  icon: typeof LayoutDashboard
  subItems?: { title: string; url: string }[]
}

// Navigation items based on I-TRACK modules
const mainNavItems: NavConfigItem[] = [
  {
    title: 'Dashboard',
    url: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    title: 'Vehicle Stocks',
    url: '/inventory',
    icon: Package,
    subItems: [
      { title: 'Stock List', url: '/inventory' },
      { title: 'Unit Setup', url: '/unit-setup' },
    ],
  },
  {
    title: 'Vehicle Preparation',
    url: '/preparation',
    icon: ClipboardCheck,
  },
  {
    title: 'Agent Allocation',
    url: '/allocation/units',
    icon: Car,
  },
  {
    title: 'Driver Allocation',
    url: '/allocation/drivers',
    icon: MapPin,
    subItems: [
      { title: 'Allocations', url: '/allocation/drivers' },
      { title: 'Live Tracking', url: '/allocation/drivers/tracking' },
    ],
  },
  {
    title: 'Test Drive',
    url: '/test-drive',
    icon: Truck,
  },
]

const adminNavItems: NavConfigItem[] = [
  {
    title: 'User Management',
    url: '/users',
    icon: Users,
  },
  {
    title: 'Reports',
    url: '/reports',
    icon: FileText,
    subItems: [
      { title: 'Release History', url: '/reports/history' },
      { title: 'Audit Trail', url: '/reports/audit' },
    ],
  },
]

const roleMainNavItems: Record<Role, typeof mainNavItems> = {
  admin: mainNavItems,
  supervisor: mainNavItems,
  manager: mainNavItems
    .filter((item) => item.url !== '/allocation/units')
    .map((item) =>
      item.url === '/inventory'
        ? {
            ...item,
            subItems: [{ title: 'Stock List', url: '/inventory' }],
          }
        : item.url === '/allocation/drivers'
        ? {
            ...item,
            url: '/allocation/drivers/tracking',
            subItems: [{ title: 'Live Tracking', url: '/allocation/drivers/tracking' }],
          }
        : item
    ),
  'sales-agent': mainNavItems
    .filter((item) => item.url !== '/allocation/units')
    .map((item) =>
      item.url === '/inventory'
        ? {
            ...item,
            subItems: [{ title: 'Stock List', url: '/inventory' }],
          }
        : item.url === '/allocation/drivers'
        ? {
            ...item,
            url: '/allocation/drivers/tracking',
            subItems: [{ title: 'Live Tracking', url: '/allocation/drivers/tracking' }],
          }
        : item
    ),
}

const roleReportsNavItems: Record<Role, NavConfigItem[]> = {
  admin: adminNavItems.filter((item) => item.title === 'Reports'),
  supervisor: adminNavItems.filter((item) => item.title === 'Reports'),
  manager: [
    {
      title: 'Reports',
      url: '/reports',
      icon: FileText,
      subItems: [
        { title: 'Release History', url: '/reports/history' },
      ],
    },
  ],
  'sales-agent': [
    {
      title: 'Reports',
      url: '/reports',
      icon: FileText,
      subItems: [
        { title: 'Release History', url: '/reports/history' },
      ],
    },
  ],
}

function NavItem({
  item,
  isActive,
}: {
  item: NavConfigItem
  isActive: boolean
}) {
  const pathname = usePathname()
  const { state } = useSidebar()
  const isCollapsed = state === 'collapsed'

  if (item.subItems) {
    const isSubActive = item.subItems.some((sub) => pathname === sub.url)

    return (
      <Collapsible defaultOpen={isActive || isSubActive} className="group/collapsible">
        <SidebarMenuItem>
          <CollapsibleTrigger asChild>
            <SidebarMenuButton
              tooltip={item.title}
              isActive={isActive || isSubActive}
              className={cn(
                'transition-colors',
                (isActive || isSubActive) && 'bg-primary/10 text-primary font-medium'
              )}
            >
              <item.icon className="size-4" />
              <span>{item.title}</span>
              <ChevronDown className="ml-auto size-4 transition-transform group-data-[state=open]/collapsible:rotate-180" />
            </SidebarMenuButton>
          </CollapsibleTrigger>
          {!isCollapsed && (
            <CollapsibleContent>
              <SidebarMenuSub>
                {item.subItems.map((subItem) => (
                  <SidebarMenuSubItem key={subItem.url}>
                    <SidebarMenuSubButton
                      asChild
                      isActive={pathname === subItem.url}
                      className={cn(
                        pathname === subItem.url && 'bg-primary/10 text-primary font-medium'
                      )}
                    >
                      <Link href={subItem.url}>{subItem.title}</Link>
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                ))}
              </SidebarMenuSub>
            </CollapsibleContent>
          )}
        </SidebarMenuItem>
      </Collapsible>
    )
  }

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        asChild
        tooltip={item.title}
        isActive={isActive}
        className={cn(
          'transition-colors',
          isActive && 'bg-primary/10 text-primary font-medium'
        )}
      >
        <Link href={item.url}>
          <item.icon className="size-4" />
          <span>{item.title}</span>
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  )
}

export function AppSidebar() {
  const pathname = usePathname()
  const { state } = useSidebar()
  const isCollapsed = state === 'collapsed'
  const role = getRoleFromPathname(pathname)
  const withRole = (path: string) => buildRolePath(role, path)
  const mainItems = roleMainNavItems[role].map((item) => ({
    ...item,
    url: withRole(item.url),
    subItems: item.subItems?.map((subItem) => ({
      ...subItem,
      url: withRole(subItem.url),
    })),
  }))
  const reportItems = roleReportsNavItems[role].map((item) => ({
    ...item,
    url: withRole(item.url),
    subItems: item.subItems?.map((subItem) => ({
      ...subItem,
      url: withRole(subItem.url),
    })),
  }))
  const adminItems =
    role === 'admin' || role === 'supervisor'
      ? adminNavItems
          .filter((item) => item.title !== 'Reports')
          .map((item) => ({
            ...item,
            url: withRole(item.url),
            subItems: item.subItems?.map((subItem) => ({
              ...subItem,
              url: withRole(subItem.url),
            })),
          }))
      : []

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      {/* Logo Header */}
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-3 px-2 py-3">
          <Image
            src={itrackLogo}
            alt="I-TRACK logo"
            className="h-8 w-auto object-contain"
            priority
          />
          {!isCollapsed && (
            <div className="flex flex-col">
              <span className="text-lg font-bold text-foreground tracking-tight">
                I-TRACK
              </span>
              <span className="text-[10px] text-muted-foreground -mt-0.5">
                Isuzu Pasig
              </span>
            </div>
          )}
        </div>
      </SidebarHeader>

      {/* Main Navigation */}
      <SidebarContent className="px-2">
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Main Menu
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainItems.map((item) => (
                <NavItem
                  key={item.url}
                  item={item}
                  isActive={pathname === item.url || pathname.startsWith(item.url + '/')}
                />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            {role === 'admin' || role === 'supervisor' ? 'Administration' : 'Reports'}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {reportItems.map((item) => (
                <NavItem
                  key={item.url}
                  item={item}
                  isActive={pathname === item.url || pathname.startsWith(item.url + '/')}
                />
              ))}
              {adminItems.map((item) => (
                <NavItem
                  key={item.url}
                  item={item}
                  isActive={pathname === item.url || pathname.startsWith(item.url + '/')}
                />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarRail />
    </Sidebar>
  )
}
