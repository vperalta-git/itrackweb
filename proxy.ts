import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { ROUTE_ROLE_COOKIE_NAME, SESSION_COOKIE_NAME } from '@/lib/auth-constants'
import { buildRolePath, getCurrentUserRole, isLegacyDashboardPath } from '@/lib/rbac'

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const hasSession = Boolean(request.cookies.get(SESSION_COOKIE_NAME)?.value)
  const routeRoleCookie = request.cookies.get(ROUTE_ROLE_COOKIE_NAME)?.value

  if (isLegacyDashboardPath(pathname)) {
    if (!hasSession) {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = buildRolePath(
      routeRoleCookie && routeRoleCookie !== ''
        ? (routeRoleCookie as Parameters<typeof buildRolePath>[0])
        : getCurrentUserRole(),
      pathname
    )
    return NextResponse.redirect(redirectUrl)
  }

  const [roleSegment, ...restSegments] = pathname.split('/').filter(Boolean)
  const isRoleRoute = ['admin', 'supervisor', 'manager', 'sales-agent'].includes(roleSegment)

  if (isRoleRoute && !hasSession) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (
    isRoleRoute &&
    routeRoleCookie &&
    routeRoleCookie !== roleSegment &&
    ['admin', 'supervisor', 'manager', 'sales-agent'].includes(routeRoleCookie)
  ) {
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = `/${routeRoleCookie}${restSegments.length ? `/${restSegments.join('/')}` : ''}`
    return NextResponse.redirect(redirectUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/supervisor/:path*',
    '/manager/:path*',
    '/sales-agent/:path*',
    '/dashboard/:path*',
    '/inventory/:path*',
    '/preparation/:path*',
    '/allocation/:path*',
    '/users/:path*',
    '/reports/:path*',
    '/settings/:path*',
    '/profile/:path*',
    '/test-drive/:path*',
  ],
}
