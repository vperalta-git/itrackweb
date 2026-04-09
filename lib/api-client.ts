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
      response = await fetch(buildDirectUrl(path, options.query), requestInit)
    }
  } else {
    response = await fetch(buildDirectUrl(path, options.query), requestInit)
  }

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
