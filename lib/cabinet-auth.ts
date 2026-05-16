import crypto from "crypto"
import type { NextRequest } from "next/server"
import bcrypt from "bcryptjs"
import { getCabinetUserByEmail } from "./cabinet-users"

const CABINET_SESSION_TTL_MS = 24 * 60 * 60 * 1000 // 24 часа
export const CABINET_SESSION_COOKIE = "cabinet_session"
const MAX_SESSIONS = 20_000

type CabinetSession = {
  email: string
  createdAt: number
}

const sessions = new Map<string, CabinetSession>()

// rate limit: N попыток логина в минуту на IP
const LOGIN_RATE_LIMIT_WINDOW_MS = 60_000
const LOGIN_RATE_LIMIT_MAX_ATTEMPTS = 5
const loginRateLimitMap = new Map<string, number[]>()
const MAX_RATE_LIMIT_KEYS = 20_000
let lastCleanupAt = 0

export async function verifyCabinetUser(email: string, password: string): Promise<boolean> {
  if (!email || !password) return false
  const user = await getCabinetUserByEmail(email)
  if (!user) return false
  try {
    return await bcrypt.compare(password, user.passwordHash)
  } catch {
    return false
  }
}

export async function getCabinetUserAuthStatus(
  email: string,
  password: string
): Promise<"ok" | "invalid_credentials" | "blocked"> {
  if (!email || !password) return "invalid_credentials"
  const user = await getCabinetUserByEmail(email, { includeDisabled: true })
  if (!user) return "invalid_credentials"
  if (user.isDisabled) return "blocked"
  try {
    return (await bcrypt.compare(password, user.passwordHash)) ? "ok" : "invalid_credentials"
  } catch {
    return "invalid_credentials"
  }
}

export function createCabinetSession(email: string): string {
  cleanupAuthMaps()
  const token = crypto.randomBytes(32).toString("hex")
  sessions.set(token, { email, createdAt: Date.now() })
  if (sessions.size > MAX_SESSIONS) {
    cleanupSessions(Date.now(), true)
  }
  return token
}

export function getCabinetSession(token: string | null): { email: string } | null {
  cleanupAuthMaps()
  if (!token) return null
  const session = sessions.get(token)
  if (!session) return null
  if (Date.now() - session.createdAt > CABINET_SESSION_TTL_MS) {
    sessions.delete(token)
    return null
  }
  return { email: session.email }
}

export function destroyCabinetSession(token: string | null): void {
  if (!token) return
  sessions.delete(token)
}

export function getCabinetToken(request: NextRequest): string | null {
  return request.cookies.get(CABINET_SESSION_COOKIE)?.value ?? null
}

function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for")
  if (forwarded) return forwarded.split(",")[0]?.trim() ?? "unknown"
  return "unknown"
}

export function checkCabinetLoginRateLimit(request: NextRequest): boolean {
  cleanupAuthMaps()
  const ip = getClientIp(request)
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
    if (now - session.createdAt > CABINET_SESSION_TTL_MS) sessions.delete(token)
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

