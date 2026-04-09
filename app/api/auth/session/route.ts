import { NextResponse } from 'next/server'

import { SERVER_SESSION_COOKIE_NAME } from '@/lib/auth-constants'
import {
  createSignedSessionValue,
  getServerSessionCookieOptions,
} from '@/lib/server-auth-session'
import { isValidRole } from '@/lib/rbac'

type SessionRequestBody = {
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

  const { value } = await createSignedSessionValue({
    userId,
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
