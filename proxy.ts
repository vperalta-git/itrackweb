import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { SERVER_SESSION_COOKIE_NAME } from '@/lib/auth-constants'
import {
  buildRolePath,
  getAuthorizedDashboardPath,
  isLegacyDashboardPath,
  isValidRole,
} from '@/lib/rbac'
import { verifySignedSessionValue } from '@/lib/server-auth-session'

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const serverSession = await verifySignedSessionValue(
    request.cookies.get(SERVER_SESSION_COOKIE_NAME)?.value
  )

  if (pathname === '/login' && serverSession) {
    return NextResponse.redirect(new URL(buildRolePath(serverSession.routeRole, 'dashboard'), request.url))
  }

  if (isLegacyDashboardPath(pathname)) {
    if (!serverSession) {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = buildRolePath(serverSession.routeRole, pathname)
    return NextResponse.redirect(redirectUrl)
  }

  const [roleSegment, ...restSegments] = pathname.split('/').filter(Boolean)
  const isRoleRoute = isValidRole(roleSegment)

  if (isRoleRoute && !serverSession) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (isRoleRoute && serverSession) {
    const requestedPath = restSegments.join('/')
    const authorizedPath = getAuthorizedDashboardPath(serverSession.routeRole, requestedPath)

    if (roleSegment !== serverSession.routeRole) {
      const redirectUrl = request.nextUrl.clone()
      redirectUrl.pathname = buildRolePath(serverSession.routeRole, authorizedPath)
      return NextResponse.redirect(redirectUrl)
    }

    if (requestedPath && authorizedPath !== requestedPath) {
      const redirectUrl = request.nextUrl.clone()
      redirectUrl.pathname = buildRolePath(serverSession.routeRole, authorizedPath)
      return NextResponse.redirect(redirectUrl)
    }
  }

  if (pathname === '/' && serverSession) {
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = buildRolePath(serverSession.routeRole, 'dashboard')
    return NextResponse.redirect(redirectUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/',
    '/admin/:path*',
    '/supervisor/:path*',
    '/manager/:path*',
    '/sales-agent/:path*',
    '/dashboard/:path*',
    '/inventory/:path*',
    '/vehicle-stocks/:path*',
    '/preparation/:path*',
    '/allocation/:path*',
    '/unit-allocation/:path*',
    '/driver-allocation/:path*',
    '/users/:path*',
    '/reports/:path*',
    '/settings/:path*',
    '/profile/:path*',
    '/test-drive/:path*',
    '/login',
  ],
}
