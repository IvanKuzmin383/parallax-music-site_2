import crypto from "crypto"
import { execute, queryOne } from "./database"

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

  await execute(
    "INSERT INTO password_reset_tokens (token, user_id, email, expires_at) VALUES (?, ?, ?, ?)",
    [token, userId, email, expiresAt]
  )

  return token
}

export async function consumePasswordResetToken(
  token: string
): Promise<{ userId: string; email: string } | null> {
  const row = await queryOne<{ user_id: string; email: string }>(
    "SELECT user_id, email FROM password_reset_tokens WHERE token = ? AND expires_at > NOW()",
    [token]
  )

  if (!row) return null

  await execute("DELETE FROM password_reset_tokens WHERE token = ?", [token])
  return { userId: row.user_id, email: row.email }
}

export async function deleteExpiredTokens(): Promise<void> {
  await execute("DELETE FROM password_reset_tokens WHERE expires_at <= NOW()")
}
