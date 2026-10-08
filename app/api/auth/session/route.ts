import { NextResponse } from 'next/server'

import { SERVER_SESSION_COOKIE_NAME } from '@/lib/auth-constants'
import {
  createSignedSessionValue,
  getServerSessionCookieOptions,
} from '@/lib/server-auth-session'
import { backendAuthRequest, BackendAuthError } from '@/lib/backend-auth'
import { cookies } from 'next/headers'
import { verifySignedSessionValue } from '@/lib/server-auth-session'
import { isValidRole } from '@/lib/rbac'

type SessionRequestBody = {
  token?: string
  mustChangePassword?: boolean
  userId?: string
  routeRole?: string
  remember?: boolean
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as SessionRequestBody | null
  const userId = typeof body?.userId === 'string' ? body.userId.trim() : ''
  const routeRole = body?.routeRole ?? ''
  const remember = body?.remember === true

  if (!userId || !isValidRole(routeRole) || typeof body?.token !== 'string' || !body.token.trim()) {
    return NextResponse.json(
      { message: 'A valid user id and dashboard role are required.' },
      { status: 400 }
    )
  }

  let user
  try {
    user = await backendAuthRequest('/auth/me', { headers: { Authorization: `Bearer ${body?.token ?? ''}` } })
  } catch (error) {
    return NextResponse.json({ message: error instanceof BackendAuthError ? error.message : 'Unable to verify the session.' },
      { status: error instanceof BackendAuthError ? error.status : 503 })
  }
  const actualRole = user?.role === 'sales_agent' ? 'sales-agent' : user?.role
  if (user?.id !== userId || actualRole !== routeRole) {
    return NextResponse.json({ message: 'Invalid session.' }, { status: 403 })
  }

  const { value } = await createSignedSessionValue({
    userId,
    backendToken: body?.token,
    mustChangePassword: user.mustChangePassword === true,
    routeRole,
    remember,
  })
  const response = NextResponse.json({ success: true })

  response.cookies.set(
    SERVER_SESSION_COOKIE_NAME,
    value,
    getServerSessionCookieOptions(remember)
  )

  return response
}

export async function DELETE() {
  const cookieStore = await cookies()
  const session = await verifySignedSessionValue(cookieStore.get(SERVER_SESSION_COOKIE_NAME)?.value)
  if (session?.backendToken) {
    try {
      await backendAuthRequest('/auth/logout', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.backendToken}` },
        body: JSON.stringify({ userId: session.userId }),
      })
    } catch (error) {
      // Already invalid sessions can be cleared; service failures must not masquerade as revocation.
      if (!(error instanceof BackendAuthError && error.status === 401)) {
        return NextResponse.json({ message: 'Sign out could not be completed. Please try again.' }, { status: 503 })
      }
    }
  }
  const response = NextResponse.json({ success: true })

  response.cookies.set(SERVER_SESSION_COOKIE_NAME, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  })

  return response
}
