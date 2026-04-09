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
import ReportsVehiclesPage from '@/app/(dashboard)/reports/vehicles/page'
import SettingsPage from '@/app/(dashboard)/settings/page'
import TestDrivePage from '@/app/(dashboard)/test-drive/page'
import UnitSetupPage from '@/app/(dashboard)/unit-setup/page'
import UsersPage from '@/app/(dashboard)/users/page'
import {
  buildRolePath,
  getAuthorizedDashboardPath,
  isValidRole,
} from '@/lib/rbac'
import { getServerSession } from '@/lib/server-session'

const routeMap: Record<string, ComponentType> = {
  dashboard: DashboardPage,
  'vehicle-stocks/stock-list': InventoryPage,
  preparation: PreparationPage,
  'unit-allocation': AllocationUnitsPage,
  'driver-allocation/allocation': AllocationDriversPage,
  'driver-allocation/live-tracking': AllocationDriversTrackingPage,
  users: UsersPage,
  'vehicle-stocks/unit-setup': UnitSetupPage,
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
  const session = await getServerSession()
  const currentUserRole = session?.routeRole ?? null

  if (!currentUserRole) {
    redirect('/login')
  }

  if (!isValidRole(role)) {
    redirect(buildRolePath(currentUserRole, 'dashboard'))
  }

  if (!slug || slug.length === 0) {
    redirect(buildRolePath(currentUserRole, 'dashboard'))
  }

  const key = slug.join('/')
  const authorizedPath = getAuthorizedDashboardPath(currentUserRole, key)

  if (role !== currentUserRole) {
    redirect(buildRolePath(currentUserRole, authorizedPath))
  }

  if (authorizedPath !== key) {
    redirect(buildRolePath(currentUserRole, authorizedPath))
  }

  const PageComponent = routeMap[authorizedPath]

  if (!PageComponent) {
    notFound()
  }

  return <PageComponent />
}
