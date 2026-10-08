import { SERVER_SESSION_COOKIE_NAME } from '@/lib/auth-constants'
import { isValidRole, type Role } from '@/lib/rbac'

const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30
const SESSION_TTL_SECONDS = 60 * 60 * 12
const encoder = new TextEncoder()
const decoder = new TextDecoder()

type SignedSessionPayload = {
  backendToken?: string
  userId: string
  mustChangePassword?: boolean
  routeRole: Role
  issuedAt: number
  expiresAt: number
}

type CreateSignedSessionInput = {
  backendToken?: string
  userId: string
  mustChangePassword?: boolean
  routeRole: Role
  remember: boolean
}

const getSessionSecret = () => {
  const secret = process.env.AUTH_SESSION_SECRET?.trim() || process.env.NEXTAUTH_SECRET?.trim()
  if (secret) return secret
  if (process.env.NODE_ENV === 'production') throw new Error('AUTH_SESSION_SECRET must be configured in production.')
  return 'itrack-local-development-only'
}

const toHex = (bytes: Uint8Array) =>
  Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')

const fromHex = (value: string) => {
  if (!/^[0-9a-f]+$/i.test(value) || value.length % 2 !== 0) {
    return null
  }

  const bytes = new Uint8Array(value.length / 2)

  for (let index = 0; index < value.length; index += 2) {
    const parsed = Number.parseInt(value.slice(index, index + 2), 16)

    if (Number.isNaN(parsed)) {
      return null
    }

    bytes[index / 2] = parsed
  }

  return bytes
}

const safeParseJson = <T,>(value: string) => {
  try {
    return JSON.parse(value) as T
  } catch {
    return null
  }
}

async function importSigningKey() {
  return crypto.subtle.importKey(
    'raw',
    encoder.encode(getSessionSecret()),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  )
}

async function signValue(value: string) {
  const key = await importSigningKey()
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(value))
  return toHex(new Uint8Array(signature))
}

const isValidPayload = (value: SignedSessionPayload | null): value is SignedSessionPayload =>
  Boolean(
    value &&
      typeof value.userId === 'string' &&
      value.userId.trim() !== '' &&
      typeof value.routeRole === 'string' &&
      isValidRole(value.routeRole) &&
      typeof value.issuedAt === 'number' &&
      Number.isFinite(value.issuedAt) &&
      typeof value.expiresAt === 'number' &&
      Number.isFinite(value.expiresAt) &&
      Date.now() < value.expiresAt
  )

export function getServerSessionCookieName() {
  return SERVER_SESSION_COOKIE_NAME
}

export function getServerSessionCookieOptions(remember: boolean) {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    ...(remember ? { maxAge: COOKIE_MAX_AGE_SECONDS } : {}),
  }
}

export async function createSignedSessionValue(input: CreateSignedSessionInput) {
  const issuedAt = Date.now()
  const expiresAt =
    issuedAt + (input.remember ? COOKIE_MAX_AGE_SECONDS : SESSION_TTL_SECONDS) * 1000
  const payload: SignedSessionPayload = {
    backendToken: input.backendToken,
    userId: input.userId.trim(),
    mustChangePassword: input.mustChangePassword === true,
    routeRole: input.routeRole,
    issuedAt,
    expiresAt,
  }
  const payloadHex = toHex(encoder.encode(JSON.stringify(payload)))
  const signature = await signValue(payloadHex)

  return {
    value: `${payloadHex}.${signature}`,
    payload,
  }
}

export async function verifySignedSessionValue(
  value: string | null | undefined
): Promise<SignedSessionPayload | null> {
  if (!value) {
    return null
  }

  const parts = value.split('.')
  if (parts.length !== 2) return null
  const [payloadHex, signature] = parts
  const signatureBytes = fromHex(signature)
  if (!payloadHex || !signatureBytes || signatureBytes.length !== 32) return null
  try {
    const key = await importSigningKey()
    if (!(await crypto.subtle.verify('HMAC', key, signatureBytes, encoder.encode(payloadHex)))) return null
  } catch { return null }

  const payloadBytes = fromHex(payloadHex)

  if (!payloadBytes) {
    return null
  }

  const payload = safeParseJson<SignedSessionPayload>(decoder.decode(payloadBytes))

  return isValidPayload(payload) ? payload : null
}
