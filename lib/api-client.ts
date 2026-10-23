import { loadSession } from '@/lib/session'
import { API_BASE_URL } from '@/lib/api-base-url'
import { requestActionReason } from '@/lib/action-reason'

type ApiEnvelope<T> = {
  success: boolean
  message: string
  data: T
  timestamp: string
}

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'
  body?: unknown
  headers?: HeadersInit
  query?: Record<string, string | number | boolean | null | undefined>
}

const FRONTEND_API_PROXY_BASE = '/api/backend'

export class ApiError extends Error {
  status: number
  details: unknown

  constructor(message: string, status: number, details: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.details = details
  }
}

const parseApiResponse = (rawText: string): unknown => {
  if (!rawText) return null

  try {
    return JSON.parse(rawText) as unknown
  } catch {
    return { message: rawText }
  }
}

const hasApiData = <T,>(value: unknown): value is ApiEnvelope<T> =>
  typeof value === 'object' && value !== null && 'data' in value &&
  (!('success' in value) || value.success !== false)

const responseMessage = (value: unknown) =>
  typeof value === 'object' && value !== null && 'message' in value &&
  typeof value.message === 'string' ? value.message : null

const appendQuery = (
  url: URL,
  query?: Record<string, string | number | boolean | null | undefined>
) => {
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value === undefined || value === null || value === '') continue
    url.searchParams.set(key, String(value))
  }

  return url
}

const buildProxyUrl = (
  path: string,
  query?: Record<string, string | number | boolean | null | undefined>
) => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`

  const proxyUrl = new URL(`${FRONTEND_API_PROXY_BASE}${normalizedPath}`, window.location.origin)

  return appendQuery(proxyUrl, query).toString()
}

const buildDirectUrl = (
  path: string,
  query?: Record<string, string | number | boolean | null | undefined>
) => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  const url = new URL(`${API_BASE_URL}${normalizedPath}`)

  return appendQuery(url, query).toString()
}

export async function apiRequest<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
  const session = loadSession()
  const headers = new Headers(options.headers)
  const payload = options.body as { status?: string; isActive?: boolean } | undefined
  const operational = /^\/(users|vehicles|driver-allocations|unit-agent-allocations|preparations|test-drive-bookings)(\/|$)/.test(path)
  if (typeof window !== 'undefined' && operational &&
      (options.method === 'DELETE' || payload?.status === 'cancelled' || payload?.isActive === false) && !headers.has('X-Action-Reason')) {
    const reason = await requestActionReason('Confirm this deletion, cancellation, or deactivation. Your identity, time, affected record, and reason will be saved in the audit trail.')
    if (!reason) throw new Error('Action cancelled.')
    headers.set('X-Action-Reason', encodeURIComponent(reason))
  }

  if (!headers.has('Accept')) {
    headers.set('Accept', 'application/json')
  }

  if (session?.token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${session.token}`)
  }

  const hasJsonBody =
    options.body !== undefined &&
    options.body !== null &&
    !(options.body instanceof FormData)

  if (hasJsonBody && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  const requestInit: RequestInit = {
    method: options.method ?? 'GET',
    headers,
    body:
      options.body === undefined
        ? undefined
        : options.body instanceof FormData
        ? options.body
        : JSON.stringify(options.body),
    cache: 'no-store',
  }

  let response: Response

  if (typeof window !== 'undefined') {
    try {
      response = await fetch(buildProxyUrl(path, options.query), requestInit)
    } catch (error) {
      if (!(error instanceof TypeError)) {
        throw error
      }

      console.warn('Proxy request failed, retrying against backend directly.', error)
      if (requestInit.method !== 'GET') throw error
      response = await fetch(buildDirectUrl(path, options.query), requestInit)
    }
  } else {
    response = await fetch(buildDirectUrl(path, options.query), requestInit)
  }

  const rawText = await response.text()
  const parsed = parseApiResponse(rawText)

  if (!response.ok) {
    throw new ApiError(
      responseMessage(parsed) ?? `Request failed with status ${response.status}.`,
      response.status,
      parsed
    )
  }

  if (!hasApiData<T>(parsed)) {
    throw new Error(responseMessage(parsed) ?? 'The server returned an unexpected response.')
  }

  return parsed.data
}
