import type { ComponentType } from 'react'
import { notFound, redirect } from 'next/navigation'

import AllocationDriversPage from '@/app/(dashboard)/allocation/drivers/page'
import AllocationDriversTrackingPage from '@/app/(dashboard)/allocation/drivers/tracking/page'
import AllocationUnitsPage from '@/app/(dashboard)/allocation/units/page'
import DashboardPage from '@/app/(dashboard)/dashboard/page'
import InventoryPage from '@/app/(dashboard)/inventory/page'
import PreparationPage from '@/app/(dashboard)/preparation/page'
import ProfilePage from '@/app/(dashboard)/profile/page'
import ReportsAuditPage from '@/app/(dashboard)/reports/audit/page'
import ReportsHistoryPage from '@/app/(dashboard)/reports/history/page'
import ReportsPage from '@/app/(dashboard)/reports/page'
import ReportsVehiclesPage from '@/app/(dashboard)/reports/vehicles/page'
import SettingsPage from '@/app/(dashboard)/settings/page'
import TestDrivePage from '@/app/(dashboard)/test-drive/page'
import UnitSetupPage from '@/app/(dashboard)/unit-setup/page'
import UsersPage from '@/app/(dashboard)/users/page'
import { buildRolePath, isValidRole } from '@/lib/rbac'
import { getServerRouteRole, hasServerSession } from '@/lib/server-session'

const routeMap: Record<string, ComponentType> = {
  dashboard: DashboardPage,
  inventory: InventoryPage,
  preparation: PreparationPage,
  'allocation/units': AllocationUnitsPage,
  'allocation/drivers': AllocationDriversPage,
  'allocation/drivers/tracking': AllocationDriversTrackingPage,
  users: UsersPage,
  'unit-setup': UnitSetupPage,
  reports: ReportsPage,
  'reports/vehicles': ReportsVehiclesPage,
  'reports/history': ReportsHistoryPage,
  'reports/audit': ReportsAuditPage,
  settings: SettingsPage,
  profile: ProfilePage,
  'test-drive': TestDrivePage,
}

export default async function RolePage({
  params,
}: {
  params: Promise<{ role: string; slug?: string[] }>
}) {
  const { role, slug } = await params
  const [currentUserRole, sessionExists] = await Promise.all([
    getServerRouteRole(),
    hasServerSession(),
  ])

  if (!sessionExists || !currentUserRole) {
    redirect('/login')
  }

  if (!isValidRole(role)) {
    redirect(buildRolePath(currentUserRole, 'dashboard'))
  }

  if (!slug || slug.length === 0) {
    redirect(buildRolePath(role, 'dashboard'))
  }

  const key = slug.join('/')

  if (key === 'allocation') {
    redirect(buildRolePath(role, 'allocation/units'))
  }

  if (key === 'reports/allocations') {
    redirect(buildRolePath(role, 'reports/vehicles'))
  }

  if (key === 'inventory/add') {
    redirect(buildRolePath(role, 'inventory'))
  }

  if (key === 'preparation/new') {
    redirect(buildRolePath(role, 'preparation'))
  }

  const PageComponent = routeMap[key]

  if (!PageComponent) {
    notFound()
  }

  return <PageComponent />
}
