import { redirect } from 'next/navigation'

import { AppNavbar } from '@/components/app-navbar'
import { AppSidebar } from '@/components/app-sidebar'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import { buildRolePath, isValidRole } from '@/lib/rbac'
import { getServerSession } from '@/lib/server-session'

export default async function RoleLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ role: string }>
}) {
  const { role } = await params
  const session = await getServerSession()
  const currentUserRole = session?.routeRole ?? null

  if (!currentUserRole) {
    redirect('/login')
  }

  if (!isValidRole(role)) {
    redirect(buildRolePath(currentUserRole, 'dashboard'))
  }

  if (role !== currentUserRole) {
    redirect(buildRolePath(currentUserRole, 'dashboard'))
  }

  return (
    <SidebarProvider defaultOpen={true}>
      <AppSidebar />
      <SidebarInset className="flex flex-col">
        <AppNavbar />
        <main className="flex-1 overflow-auto p-4 lg:p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  )
}
