import { getDb } from "./db"

export function addPendingFixCredits(params: {
  email: string
  tracksCount: number
  orderId: string
}): void {
  const db = getDb()
  const email = params.email.trim().toLowerCase()
  const now = new Date().toISOString()
  db.prepare(
    `
    INSERT INTO pending_fix_credits (email, tracks_count, order_id, created_at)
    VALUES (?, ?, ?, ?)
  `
  ).run(email, params.tracksCount, params.orderId, now)
}

export function getPendingFixCreditsByEmail(email: string): { tracksCount: number; orderId: string }[] {
  const db = getDb()
  const rows = db
    .prepare(
      `SELECT tracks_count, order_id FROM pending_fix_credits WHERE email = ? COLLATE NOCASE ORDER BY created_at ASC`
    )
    .all(email.trim().toLowerCase()) as { tracks_count: number; order_id: string }[]
  return rows.map((r) => ({ tracksCount: r.tracks_count, orderId: r.order_id }))
}

export function deletePendingFixCreditsByEmail(email: string): void {
  const db = getDb()
  db.prepare(`DELETE FROM pending_fix_credits WHERE email = ? COLLATE NOCASE`).run(email.trim().toLowerCase())
}

export function sumPendingFixCredits(email: string): number {
  return getPendingFixCreditsByEmail(email).reduce((sum, row) => sum + row.tracksCount, 0)
}
