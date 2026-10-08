const DEFAULT_BACKEND_ORIGIN = 'https://i-track-backend-b72a.onrender.com'

export function normalizeApiBaseUrl(rawBaseUrl?: string | null) {
  const trimmed = rawBaseUrl?.trim()
  const baseUrl = trimmed && trimmed.length > 0 ? trimmed : DEFAULT_BACKEND_ORIGIN
  const normalized = baseUrl.replace(/\/+$/, '')

  return normalized.endsWith('/api') ? normalized : `${normalized}/api`
}

export const API_BASE_URL = normalizeApiBaseUrl(process.env.NEXT_PUBLIC_API_URL)

// All server-side authentication and API forwarding must use the same backend.
export function getBackendApiBaseUrl() {
  return normalizeApiBaseUrl(process.env.BACKEND_URL?.trim() || process.env.NEXT_PUBLIC_API_URL)
}
