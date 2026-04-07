import 'server-only'

import { cookies } from 'next/headers'

import {
  ROUTE_ROLE_COOKIE_NAME,
  SESSION_COOKIE_NAME,
} from '@/lib/auth-constants'
import { isValidRole, type Role } from '@/lib/rbac'

export async function getServerRouteRole(): Promise<Role | null> {
  const cookieStore = await cookies()
  const role = cookieStore.get(ROUTE_ROLE_COOKIE_NAME)?.value

  return role && isValidRole(role) ? role : null
}

export async function hasServerSession() {
  const cookieStore = await cookies()
  return Boolean(cookieStore.get(SESSION_COOKIE_NAME)?.value)
}
