import { NextResponse } from 'next/server'
import { SERVER_SESSION_COOKIE_NAME } from '@/lib/auth-constants'
import { backendAuthRequest, BackendAuthError } from '@/lib/backend-auth'
import { createSignedSessionValue, getServerSessionCookieOptions } from '@/lib/server-auth-session'
import { mapBackendRoleToRouteRole } from '@/lib/session'

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  if (typeof body?.email !== 'string' || typeof body?.password !== 'string' || !body.email.trim() || !body.password) {
    return NextResponse.json({ message: 'Email and password are required.' }, { status: 400 })
  }
  try {
    // Credentials are verified by the backend. Never mint a session from client-supplied identity.
    const data = await backendAuthRequest('/auth/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: body.email.trim().toLowerCase(), password: body.password }),
    })
    const userId = data?.user?.id ?? data?.user?._id
    const routeRole = mapBackendRoleToRouteRole(data?.user?.role)
    if (!routeRole) return NextResponse.json({ message: 'This account does not have access to the web dashboard. Use the mobile app.' }, { status: 403 })
    if (typeof userId !== 'string' || !userId || typeof data.token !== 'string' || !data.token) {
      return NextResponse.json({ message: 'The authentication service returned an invalid response.' }, { status: 502 })
    }
    const remember = body.remember === true
    const { value } = await createSignedSessionValue({
      userId, routeRole, remember, backendToken: data.token,
      mustChangePassword: data.user.mustChangePassword === true,
    })
    const response = NextResponse.json({ success: true, data })
    response.headers.set('Cache-Control', 'no-store')
    response.cookies.set(SERVER_SESSION_COOKIE_NAME, value, getServerSessionCookieOptions(remember))
    return response
  } catch (error) {
    if (error instanceof BackendAuthError) return NextResponse.json({ message: error.message }, { status: error.status })
    console.error('[auth] Web session initialization failed', { code: 'SESSION_INITIALIZATION_FAILED' })
    return NextResponse.json({ message: 'The web session could not be initialized. Please contact the administrator.' }, { status: 503 })
  }
}
