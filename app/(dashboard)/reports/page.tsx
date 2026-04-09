import { redirect } from 'next/navigation'

import { buildRolePath } from '@/lib/rbac'
import { getServerRouteRole, hasServerSession } from '@/lib/server-session'

export default async function ReportsPage() {
  const [role, sessionExists] = await Promise.all([
    getServerRouteRole(),
    hasServerSession(),
  ])

  if (!sessionExists || !role) {
    redirect('/login')
  }

  redirect(buildRolePath(role, 'reports/history'))
}
