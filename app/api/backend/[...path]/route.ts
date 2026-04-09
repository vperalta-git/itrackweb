import { NextRequest, NextResponse } from 'next/server'

import { normalizeApiBaseUrl } from '@/lib/api-base-url'

export const dynamic = 'force-dynamic'

const HOP_BY_HOP_HEADERS = new Set([
  'connection',
  'content-length',
  'host',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
])

function buildBackendUrl(
  pathSegments: string[],
  searchParams: URLSearchParams
) {
  const backendBaseUrl = normalizeApiBaseUrl(process.env.NEXT_PUBLIC_API_URL)
  const backendUrl = new URL(`${backendBaseUrl}/${pathSegments.join('/')}`)

  for (const [key, value] of searchParams.entries()) {
    backendUrl.searchParams.append(key, value)
  }

  return backendUrl
}

function buildForwardHeaders(request: NextRequest) {
  const headers = new Headers()

  for (const [key, value] of request.headers.entries()) {
    if (HOP_BY_HOP_HEADERS.has(key.toLowerCase())) continue
    headers.set(key, value)
  }

  return headers
}

async function handleRequest(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  const { path } = await context.params
  const backendUrl = buildBackendUrl(path, request.nextUrl.searchParams)
  const headers = buildForwardHeaders(request)
  const method = request.method.toUpperCase()
  const shouldIncludeBody = method !== 'GET' && method !== 'HEAD'

  const upstreamResponse = await fetch(backendUrl, {
    method,
    headers,
    body: shouldIncludeBody ? await request.text() : undefined,
    cache: 'no-store',
    redirect: 'manual',
  })

  const responseHeaders = new Headers()

  for (const [key, value] of upstreamResponse.headers.entries()) {
    if (HOP_BY_HOP_HEADERS.has(key.toLowerCase())) continue
    responseHeaders.set(key, value)
  }

  return new NextResponse(upstreamResponse.body, {
    status: upstreamResponse.status,
    statusText: upstreamResponse.statusText,
    headers: responseHeaders,
  })
}

export { handleRequest as GET }
export { handleRequest as POST }
export { handleRequest as PATCH }
export { handleRequest as PUT }
export { handleRequest as DELETE }
export { handleRequest as OPTIONS }
