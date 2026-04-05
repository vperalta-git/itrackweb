import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { buildRolePath, getCurrentUserRole, isLegacyDashboardPath } from '@/lib/rbac'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (isLegacyDashboardPath(pathname)) {
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = buildRolePath(getCurrentUserRole(), pathname)
    return NextResponse.redirect(redirectUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
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
