import { redirect } from 'next/navigation'

import { buildRolePath } from '@/lib/rbac'
import { getServerSession } from '@/lib/server-session'

export default async function HomePage() {
  const session = await getServerSession()

  if (session?.routeRole) {
    redirect(buildRolePath(session.routeRole, 'dashboard'))
  }

  redirect('/login')
}
