import { NextRequest, NextResponse } from 'next/server'

import { normalizeApiBaseUrl } from '@/lib/api-base-url'

export const dynamic = 'force-dynamic'

const RETRYABLE_STATUSES = new Set([502, 503, 504])
const RETRY_DELAYS_MS = [0, 3000, 6000]

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

const FORWARDED_REQUEST_HEADERS = [
  'accept',
  'authorization',
  'content-type',
]

function buildBackendUrl(
  pathSegments: string[],
  searchParams: URLSearchParams
) {
  const backendBaseUrl = normalizeApiBaseUrl(
    process.env.BACKEND_URL ?? process.env.NEXT_PUBLIC_API_URL
  )
  const backendUrl = new URL(`${backendBaseUrl}/${pathSegments.join('/')}`)

  for (const [key, value] of searchParams.entries()) {
    backendUrl.searchParams.append(key, value)
  }

  return backendUrl
}

function buildForwardHeaders(request: NextRequest) {
  const headers = new Headers()

  for (const key of FORWARDED_REQUEST_HEADERS) {
    const value = request.headers.get(key)

    if (!value) continue
    headers.set(key, value)
  }

  return headers
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function fetchBackendWithRetries(
  backendUrl: URL,
  init: RequestInit
) {
  let lastError: Error | null = null

  for (let attempt = 0; attempt < RETRY_DELAYS_MS.length; attempt += 1) {
    if (RETRY_DELAYS_MS[attempt] > 0) {
      await sleep(RETRY_DELAYS_MS[attempt])
    }

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 15000)

    try {
      const response = await fetch(backendUrl, {
        ...init,
        signal: controller.signal,
      })

      clearTimeout(timeout)

      if (!RETRYABLE_STATUSES.has(response.status) || attempt === RETRY_DELAYS_MS.length - 1) {
        return response
      }

      await response.body?.cancel()
    } catch (error) {
      clearTimeout(timeout)
      lastError = error instanceof Error ? error : new Error('Unable to reach the backend service.')

      if (attempt === RETRY_DELAYS_MS.length - 1) {
        throw lastError
      }
    }
  }

  throw lastError ?? new Error('Unable to reach the backend service.')
}

async function handleRequest(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path } = await context.params
    const backendUrl = buildBackendUrl(path, request.nextUrl.searchParams)
    const headers = buildForwardHeaders(request)
    const method = request.method.toUpperCase()
    const shouldIncludeBody = method !== 'GET' && method !== 'HEAD'

    const upstreamResponse = await fetchBackendWithRetries(backendUrl, {
      method,
      headers,
      body: shouldIncludeBody ? await request.text() : undefined,
      cache: 'no-store',
      redirect: 'manual',
    })

    const contentType = upstreamResponse.headers.get('content-type') ?? ''

    if (!upstreamResponse.ok && contentType.includes('text/html')) {
      return NextResponse.json(
        {
          success: false,
          message:
            'The backend service is waking up or temporarily unavailable. Please try again in a few seconds.',
        },
        { status: upstreamResponse.status }
      )
    }

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
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error ? error.message : 'Unable to reach the backend service.',
      },
      { status: 502 }
    )
  }
}

export { handleRequest as GET }
export { handleRequest as POST }
export { handleRequest as PATCH }
export { handleRequest as PUT }
export { handleRequest as DELETE }
export { handleRequest as OPTIONS }
