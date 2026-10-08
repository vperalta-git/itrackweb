import { getBackendApiBaseUrl } from '@/lib/api-base-url'

export class BackendAuthError extends Error {
  constructor(message: string, public status: number) { super(message) }
}

export async function backendAuthRequest(path: string, init: RequestInit = {}) {
  let response: Response
  try {
    response = await fetch(`${getBackendApiBaseUrl()}${path}`, {
      ...init, cache: 'no-store', signal: AbortSignal.timeout(45000),
    })
  } catch {
    throw new BackendAuthError('The authentication service is unavailable. Please try again.', 503)
  }
  const payload = await response.json().catch(() => null)
  if (!response.ok) {
    if (response.status === 401 || response.status === 403 || response.status === 400) {
      throw new BackendAuthError(payload?.message || 'Unable to authenticate.', response.status)
    }
    console.error('[auth] Backend authentication endpoint failed', { path, status: response.status })
    throw new BackendAuthError(
      response.status === 404 ? 'The authentication service needs an update. Please contact the administrator.' : 'The authentication service is unavailable. Please try again.',
      502
    )
  }
  if (!payload?.success || !('data' in payload)) throw new BackendAuthError('The authentication service returned an invalid response.', 502)
  return payload.data
}
