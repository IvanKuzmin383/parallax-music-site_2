import crypto from "crypto"
import { execute, queryOne } from "@/lib/database"

export const EMAIL_VERIFICATION_TTL_MS = 20 * 60 * 1000
export const EMAIL_VERIFICATION_CODE_LENGTH = 6
export const EMAIL_VERIFICATION_MAX_ATTEMPTS = 5
/** Минимум между повторными отправками на один email. */
export const EMAIL_VERIFICATION_RESEND_COOLDOWN_MS = 60 * 1000
/** Сколько писем на один email за час. */
export const EMAIL_VERIFICATION_MAX_SENDS_PER_HOUR = 5

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

function hashCode(email: string, code: string): string {
  const pepper =
    process.env.CABINET_SESSION_SECRET?.trim() ||
    process.env.ADMIN_SESSION_SECRET?.trim() ||
    "parallax-email-verify-dev"
  return crypto.createHash("sha256").update(`${normalizeEmail(email)}:${code}:${pepper}`).digest("hex")
}

function generateCode(): string {
  const max = 10 ** EMAIL_VERIFICATION_CODE_LENGTH
  const n = crypto.randomInt(0, max)
  return String(n).padStart(EMAIL_VERIFICATION_CODE_LENGTH, "0")
}

type CodeRow = {
  id: string
  email: string
  code_hash: string
  attempts: number
  expires_at: string
  created_at: string
}

export async function deleteExpiredEmailVerificationCodes(): Promise<void> {
  await execute(`DELETE FROM email_verification_codes WHERE expires_at <= NOW()`)
}

export async function getLatestEmailVerificationMeta(
  email: string
): Promise<{ createdAt: string; expiresAt: string } | null> {
  const row = await queryOne<{ created_at: string; expires_at: string }>(
    `SELECT created_at, expires_at FROM email_verification_codes
     WHERE email = ? ORDER BY created_at DESC LIMIT 1`,
    [normalizeEmail(email)]
  )
  if (!row) return null
  return { createdAt: row.created_at, expiresAt: row.expires_at }
}

export async function countEmailVerificationSendsLastHour(email: string): Promise<number> {
  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString()
  const row = await queryOne<{ n: string | number }>(
    `SELECT COUNT(*)::int AS n FROM email_verification_codes
     WHERE email = ? AND created_at > ?`,
    [normalizeEmail(email), since]
  )
  return Number(row?.n ?? 0) || 0
}

export type CreateEmailVerificationResult =
  | { ok: true; code: string; expiresAt: string; ttlMinutes: number }
  | { ok: false; error: "cooldown" | "rate_limited"; retryAfterSec?: number }

/** Создаёт новый код (старые для email удаляет). Возвращает plaintext code для письма. */
export async function createEmailVerificationCode(
  email: string
): Promise<CreateEmailVerificationResult> {
  const normalized = normalizeEmail(email)
  await deleteExpiredEmailVerificationCodes()

  const latest = await getLatestEmailVerificationMeta(normalized)
  if (latest) {
    const ageMs = Date.now() - new Date(latest.createdAt).getTime()
    if (Number.isFinite(ageMs) && ageMs < EMAIL_VERIFICATION_RESEND_COOLDOWN_MS) {
      const retryAfterSec = Math.ceil(
        (EMAIL_VERIFICATION_RESEND_COOLDOWN_MS - ageMs) / 1000
      )
      return { ok: false, error: "cooldown", retryAfterSec }
    }
  }

  const sends = await countEmailVerificationSendsLastHour(normalized)
  if (sends >= EMAIL_VERIFICATION_MAX_SENDS_PER_HOUR) {
    return { ok: false, error: "rate_limited", retryAfterSec: 3600 }
  }

  await execute(`DELETE FROM email_verification_codes WHERE email = ?`, [normalized])

  const code = generateCode()
  const id = crypto.randomUUID()
  const expiresAt = new Date(Date.now() + EMAIL_VERIFICATION_TTL_MS).toISOString()
  await execute(
    `INSERT INTO email_verification_codes (id, email, code_hash, attempts, expires_at, created_at)
     VALUES (?, ?, ?, 0, ?, NOW())`,
    [id, normalized, hashCode(normalized, code), expiresAt]
  )

  return {
    ok: true,
    code,
    expiresAt,
    ttlMinutes: Math.round(EMAIL_VERIFICATION_TTL_MS / 60000),
  }
}

export type ConsumeEmailVerificationResult =
  | { ok: true }
  | { ok: false; error: "invalid" | "expired" | "too_many_attempts" }

/** Проверяет код и при успехе удаляет запись. */
export async function consumeEmailVerificationCode(
  email: string,
  code: string
): Promise<ConsumeEmailVerificationResult> {
  const normalized = normalizeEmail(email)
  const trimmed = code.replace(/\s+/g, "").trim()
  if (!/^\d{6}$/.test(trimmed)) {
    return { ok: false, error: "invalid" }
  }

  const row = await queryOne<CodeRow>(
    `SELECT id, email, code_hash, attempts, expires_at, created_at
     FROM email_verification_codes WHERE email = ? ORDER BY created_at DESC LIMIT 1`,
    [normalized]
  )
  if (!row) return { ok: false, error: "invalid" }

  if (new Date(row.expires_at).getTime() <= Date.now()) {
    await execute(`DELETE FROM email_verification_codes WHERE id = ?`, [row.id])
    return { ok: false, error: "expired" }
  }

  if (row.attempts >= EMAIL_VERIFICATION_MAX_ATTEMPTS) {
    await execute(`DELETE FROM email_verification_codes WHERE id = ?`, [row.id])
    return { ok: false, error: "too_many_attempts" }
  }

  const expected = hashCode(normalized, trimmed)
  if (expected !== row.code_hash) {
    const nextAttempts = row.attempts + 1
    if (nextAttempts >= EMAIL_VERIFICATION_MAX_ATTEMPTS) {
      await execute(`DELETE FROM email_verification_codes WHERE id = ?`, [row.id])
      return { ok: false, error: "too_many_attempts" }
    }
    await execute(`UPDATE email_verification_codes SET attempts = ? WHERE id = ?`, [
      nextAttempts,
      row.id,
    ])
    return { ok: false, error: "invalid" }
  }

  await execute(`DELETE FROM email_verification_codes WHERE email = ?`, [normalized])
  return { ok: true }
}
