import crypto from "crypto"
import { getDb } from "./db"

export interface PasswordResetTokenRecord {
  token: string
  userId: string
  email: string
  expiresAt: string
}

const TOKEN_TTL_MS = 60 * 60 * 1000 // 1 час

export async function createPasswordResetToken(userId: string, email: string): Promise<string> {
  const token = crypto.randomBytes(32).toString("hex")
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MS).toISOString()

  const db = getDb()
  db.prepare(
    "INSERT INTO password_reset_tokens (token, user_id, email, expires_at) VALUES (?, ?, ?, ?)"
  ).run(token, userId, email, expiresAt)

  return token
}

export async function consumePasswordResetToken(
  token: string
): Promise<{ userId: string; email: string } | null> {
  const db = getDb()
  const row = db
    .prepare("SELECT user_id, email FROM password_reset_tokens WHERE token = ? AND expires_at > datetime('now')")
    .get(token) as { user_id: string; email: string } | undefined

  if (!row) return null

  db.prepare("DELETE FROM password_reset_tokens WHERE token = ?").run(token)
  return { userId: row.user_id, email: row.email }
}

export async function deleteExpiredTokens(): Promise<void> {
  const db = getDb()
  db.prepare("DELETE FROM password_reset_tokens WHERE expires_at <= datetime('now')").run()
}
