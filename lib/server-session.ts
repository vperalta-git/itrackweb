import 'server-only'

import { cookies } from 'next/headers'

import { SERVER_SESSION_COOKIE_NAME } from '@/lib/auth-constants'
import { type Role } from '@/lib/rbac'
import { verifySignedSessionValue } from '@/lib/server-auth-session'

export async function getServerSession() {
  const cookieStore = await cookies()
  const sessionValue = cookieStore.get(SERVER_SESSION_COOKIE_NAME)?.value

  return verifySignedSessionValue(sessionValue)
}

export async function getServerRouteRole(): Promise<Role | null> {
  const session = await getServerSession()
  return session?.routeRole ?? null
}

export async function hasServerSession() {
  return Boolean(await getServerSession())
}
