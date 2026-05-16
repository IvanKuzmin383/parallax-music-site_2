import crypto from 'crypto'
import type { NextRequest } from 'next/server'

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? ''

const SESSION_TTL_MS = 24 * 60 * 60 * 1000 // 24 hours
const sessions = new Map<string, { createdAt: number }>()
const MAX_SESSIONS = 10_000

const loginRateLimitMap = new Map<string, number[]>()
const LOGIN_RATE_LIMIT_WINDOW_MS = 60_000 // 1 minute
const LOGIN_RATE_LIMIT_MAX_ATTEMPTS = 5
const MAX_RATE_LIMIT_KEYS = 20_000
let lastCleanupAt = 0

export const ADMIN_SESSION_COOKIE = 'admin_session'

/**
 * Timing-safe password comparison. Uses constant-time comparison to prevent
 * timing attacks. Pads inputs to same length before comparing.
 */
export function verifyAdminPassword(password: string): boolean {
  if (!ADMIN_PASSWORD || !password) return false
  const a = Buffer.from(password, 'utf8')
  const b = Buffer.from(ADMIN_PASSWORD, 'utf8')
  if (a.length !== b.length) {
    // Still do a dummy comparison to avoid leaking length
    const len = Math.max(a.length, b.length)
    const pa = Buffer.alloc(len)
    const pb = Buffer.alloc(len)
    a.copy(pa)
    b.copy(pb)
    return crypto.timingSafeEqual(pa, pb)
  }
  return crypto.timingSafeEqual(a, b)
}

export function createSession(): string {
  cleanupAuthMaps()
  const token = crypto.randomBytes(32).toString('hex')
  sessions.set(token, { createdAt: Date.now() })
  if (sessions.size > MAX_SESSIONS) {
    cleanupSessions(Date.now(), true)
  }
  return token
}

export function verifySession(token: string | null): boolean {
  cleanupAuthMaps()
  if (!token) return false
  const session = sessions.get(token)
  if (!session) return false
  if (Date.now() - session.createdAt > SESSION_TTL_MS) {
    sessions.delete(token)
    return false
  }
  return true
}

export function destroySession(token: string | null): void {
  if (token) sessions.delete(token)
}

export function getAdminToken(request: NextRequest): string | null {
  return request.cookies.get(ADMIN_SESSION_COOKIE)?.value ?? null
}

const MUSIC_STATS_IMPORT_TOKEN = process.env.MUSIC_STATS_IMPORT_TOKEN ?? ''

/**
 * Bearer token for cross-origin import (e.g. browser console on another site).
 * Set MUSIC_STATS_IMPORT_TOKEN in env; omit to disable token-only access.
 */
export function verifyMusicStatsImportToken(request: NextRequest): boolean {
  const auth = request.headers.get('authorization')
  if (!auth?.startsWith('Bearer ')) return false
  if (!MUSIC_STATS_IMPORT_TOKEN) return false
  const presented = auth.slice(7).trim()
  const a = Buffer.from(presented, 'utf8')
  const b = Buffer.from(MUSIC_STATS_IMPORT_TOKEN, 'utf8')
  if (a.length !== b.length) {
    const len = Math.max(a.length, b.length)
    const pa = Buffer.alloc(len)
    const pb = Buffer.alloc(len)
    a.copy(pa)
    b.copy(pb)
    return crypto.timingSafeEqual(pa, pb)
  }
  return crypto.timingSafeEqual(a, b)
}

/**
 * Returns true if the IP is within rate limit (allowed to attempt login).
 * Caller should return 429 when this returns false.
 */
export function checkLoginRateLimit(ip: string): boolean {
  cleanupAuthMaps()
  const now = Date.now()
  const cutoff = now - LOGIN_RATE_LIMIT_WINDOW_MS
  let attempts = loginRateLimitMap.get(ip) ?? []
  attempts = attempts.filter((t) => t > cutoff)
  if (attempts.length >= LOGIN_RATE_LIMIT_MAX_ATTEMPTS) return false
  attempts.push(now)
  loginRateLimitMap.set(ip, attempts)
  if (loginRateLimitMap.size > MAX_RATE_LIMIT_KEYS) {
    cleanupRateLimits(now, true)
  }
  return true
}

function cleanupSessions(now: number, aggressive = false): void {
  for (const [token, session] of sessions) {
    if (now - session.createdAt > SESSION_TTL_MS) sessions.delete(token)
  }
  if (aggressive && sessions.size > MAX_SESSIONS) {
    const ordered = [...sessions.entries()].sort((a, b) => a[1].createdAt - b[1].createdAt)
    const toDelete = sessions.size - MAX_SESSIONS
    for (let i = 0; i < toDelete; i++) sessions.delete(ordered[i][0])
  }
}

function cleanupRateLimits(now: number, aggressive = false): void {
  const cutoff = now - LOGIN_RATE_LIMIT_WINDOW_MS
  for (const [ip, attempts] of loginRateLimitMap) {
    const filtered = attempts.filter((t) => t > cutoff)
    if (filtered.length === 0) loginRateLimitMap.delete(ip)
    else if (filtered.length !== attempts.length) loginRateLimitMap.set(ip, filtered)
  }
  if (aggressive && loginRateLimitMap.size > MAX_RATE_LIMIT_KEYS) {
    const keys = [...loginRateLimitMap.keys()]
    const toDelete = loginRateLimitMap.size - MAX_RATE_LIMIT_KEYS
    for (let i = 0; i < toDelete; i++) loginRateLimitMap.delete(keys[i])
  }
}

function cleanupAuthMaps(): void {
  const now = Date.now()
  if (now - lastCleanupAt < 60_000) return
  lastCleanupAt = now
  cleanupSessions(now)
  cleanupRateLimits(now)
}
