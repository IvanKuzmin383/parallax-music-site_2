import crypto from "crypto"
import { getDb } from "./db"

const TTL_MS = 24 * 60 * 60 * 1000

export function createAutopayDisableToken(userId: string, email: string): string {
  const db = getDb()
  const token = crypto.randomBytes(32).toString("hex")
  const expiresAt = new Date(Date.now() + TTL_MS).toISOString()
  db.prepare(
    `INSERT INTO autopay_disable_tokens (token, user_id, email, expires_at) VALUES (?, ?, ?, ?)`
  ).run(token, userId, email.trim().toLowerCase(), expiresAt)
  return token
}

export function consumeAutopayDisableToken(token: string): { userId: string; email: string } | null {
  const db = getDb()
  const row = db
    .prepare(`SELECT user_id, email, expires_at FROM autopay_disable_tokens WHERE token = ?`)
    .get(token) as { user_id: string; email: string; expires_at: string } | undefined
  if (!row) return null
  if (new Date(row.expires_at).getTime() < Date.now()) {
    db.prepare(`DELETE FROM autopay_disable_tokens WHERE token = ?`).run(token)
    return null
  }
  db.prepare(`DELETE FROM autopay_disable_tokens WHERE token = ?`).run(token)
  return { userId: row.user_id, email: row.email }
}
