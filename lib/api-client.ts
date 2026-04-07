import { loadSession } from '@/lib/session'

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

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api').replace(
  /\/+$/,
  ''
)

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

const buildUrl = (
  path: string,
  query?: Record<string, string | number | boolean | null | undefined>
) => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
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
  const parsed = rawText ? (JSON.parse(rawText) as ApiEnvelope<T> | { message?: string }) : null

  if (!response.ok) {
    throw new ApiError(
      parsed && 'message' in parsed && parsed.message
        ? parsed.message
        : `Request failed with status ${response.status}.`,
      response.status,
      parsed
    )
  }

  return (parsed as ApiEnvelope<T>).data
}
