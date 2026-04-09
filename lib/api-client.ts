import { loadSession } from '@/lib/session'
import { API_BASE_URL } from '@/lib/api-base-url'

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

const parseApiResponse = <T,>(rawText: string) => {
  if (!rawText) return null

  try {
    return JSON.parse(rawText) as ApiEnvelope<T> | { message?: string }
  } catch {
    return { message: rawText }
  }
}

const buildUrl = (
  path: string,
  query?: Record<string, string | number | boolean | null | undefined>
) => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`

  if (typeof window !== 'undefined') {
    const proxyUrl = new URL(`${FRONTEND_API_PROXY_BASE}${normalizedPath}`, window.location.origin)

    for (const [key, value] of Object.entries(query ?? {})) {
      if (value === undefined || value === null || value === '') continue
      proxyUrl.searchParams.set(key, String(value))
    }

    return proxyUrl.toString()
  }

  const url = new URL(`${API_BASE_URL}${normalizedPath}`)

  for (const [key, value] of Object.entries(query ?? {})) {
    if (value === undefined || value === null || value === '') continue
    url.searchParams.set(key, String(value))
  }

  return url.toString()
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}) {
  const session = loadSession()
  const headers = new Headers(options.headers)

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

  const response = await fetch(buildUrl(path, options.query), {
    method: options.method ?? 'GET',
    headers,
    body:
      options.body === undefined
        ? undefined
        : options.body instanceof FormData
        ? options.body
        : JSON.stringify(options.body),
    cache: 'no-store',
  })

  const rawText = await response.text()
  const parsed = parseApiResponse<T>(rawText)

  if (!response.ok) {
    throw new ApiError(
      parsed && 'message' in parsed && parsed.message
        ? parsed.message
        : `Request failed with status ${response.status}.`,
      response.status,
      parsed
    )
  }

  if (!parsed || !('data' in parsed)) {
    throw new Error('The server returned an unexpected response.')
  }

  return parsed.data
}
