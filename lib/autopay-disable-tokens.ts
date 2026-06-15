import crypto from "crypto"
import { execute, queryOne } from "./database"

const TTL_MS = 24 * 60 * 60 * 1000

export async function createAutopayDisableToken(userId: string, email: string): Promise<string> {
  const token = crypto.randomBytes(32).toString("hex")
  const expiresAt = new Date(Date.now() + TTL_MS).toISOString()
  await execute(
    `INSERT INTO autopay_disable_tokens (token, user_id, email, expires_at) VALUES (?, ?, ?, ?)`,
    [token, userId, email.trim().toLowerCase(), expiresAt]
  )
  return token
}

export async function consumeAutopayDisableToken(
  token: string
): Promise<{ userId: string; email: string } | null> {
  const row = await queryOne<{ user_id: string; email: string; expires_at: string }>(
    `SELECT user_id, email, expires_at FROM autopay_disable_tokens WHERE token = ?`,
    [token]
  )
  if (!row) return null
  if (new Date(row.expires_at).getTime() < Date.now()) {
    await execute(`DELETE FROM autopay_disable_tokens WHERE token = ?`, [token])
    return null
  }
  await execute(`DELETE FROM autopay_disable_tokens WHERE token = ?`, [token])
  return { userId: row.user_id, email: row.email }
}
