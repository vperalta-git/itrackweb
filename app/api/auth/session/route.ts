import { NextResponse } from 'next/server'

import { SERVER_SESSION_COOKIE_NAME } from '@/lib/auth-constants'
import {
  createSignedSessionValue,
  getServerSessionCookieOptions,
} from '@/lib/server-auth-session'
import { normalizeApiBaseUrl } from '@/lib/api-base-url'
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
  const userId = body?.userId?.trim() ?? ''
  const routeRole = body?.routeRole ?? ''
  const remember = body?.remember === true

  if (!userId || !isValidRole(routeRole)) {
    return NextResponse.json(
      { message: 'A valid user id and dashboard role are required.' },
      { status: 400 }
    )
  }

  const upstream = await fetch(`${normalizeApiBaseUrl(process.env.BACKEND_URL)}/auth/me`, {
    headers: { Authorization: `Bearer ${body?.token ?? ''}` }, cache: 'no-store',
  }).catch(() => null)
  if (!upstream?.ok) return NextResponse.json({ message: 'Please sign in again.' }, { status: 401 })
  const { data: user } = await upstream.json()
  const actualRole = user?.role === 'sales_agent' ? 'sales-agent' : user?.role
  if (user?.id !== userId || actualRole !== routeRole) {
    return NextResponse.json({ message: 'Invalid session.' }, { status: 403 })
  }

  const { value } = await createSignedSessionValue({
    userId,
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
