import { execute, query } from "./database"

export async function addPendingFixCredits(params: {
  email: string
  tracksCount: number
  orderId: string
}): Promise<void> {
  const email = params.email.trim().toLowerCase()
  const now = new Date().toISOString()
  await execute(
    `
    INSERT INTO pending_fix_credits (email, tracks_count, order_id, created_at)
    VALUES (?, ?, ?, ?)
  `,
    [email, params.tracksCount, params.orderId, now]
  )
}

export async function getPendingFixCreditsByEmail(
  email: string
): Promise<{ tracksCount: number; orderId: string }[]> {
  const rows = await query<{ tracks_count: number; order_id: string }>(
    `SELECT tracks_count, order_id FROM pending_fix_credits WHERE email = ? ORDER BY created_at ASC`,
    [email.trim().toLowerCase()]
  )
  return rows.map((r) => ({ tracksCount: r.tracks_count, orderId: r.order_id }))
}

export async function deletePendingFixCreditsByEmail(email: string): Promise<void> {
  await execute(`DELETE FROM pending_fix_credits WHERE email = ?`, [email.trim().toLowerCase()])
}

export async function sumPendingFixCredits(email: string): Promise<number> {
  const rows = await getPendingFixCreditsByEmail(email)
  return rows.reduce((sum, row) => sum + row.tracksCount, 0)
}
