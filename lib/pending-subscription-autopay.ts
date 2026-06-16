import { execute, queryOne } from "./database"
import type { PlanId } from "./plan-pricing"

export async function upsertPendingSubscriptionAutopay(params: {
  email: string
  tbankRebillId?: string | null
  planId: PlanId
  period: "month" | "year"
  periodsCount: number
}): Promise<void> {
  const rebill = params.tbankRebillId?.trim() || null
  if (!rebill) return

  const email = params.email.trim().toLowerCase()
  const now = new Date().toISOString()
  await execute(
    `
    INSERT INTO pending_subscription_autopay (email, tbank_rebill_id, yookassa_payment_method_id, plan_id, period, periods_count, created_at)
    VALUES (?, ?, NULL, ?, ?, ?, ?)
    ON CONFLICT(email) DO UPDATE SET
      tbank_rebill_id = EXCLUDED.tbank_rebill_id,
      yookassa_payment_method_id = NULL,
      plan_id = EXCLUDED.plan_id,
      period = EXCLUDED.period,
      periods_count = EXCLUDED.periods_count,
      created_at = EXCLUDED.created_at
  `,
    [email, rebill, params.planId, params.period, params.periodsCount, now]
  )
}

export async function getPendingSubscriptionAutopay(email: string): Promise<{
  tbankRebillId: string
  planId: PlanId
  period: "month" | "year"
  periodsCount: number
} | null> {
  const row = await queryOne<{
    tbank_rebill_id: string | null
    plan_id: string
    period: string
    periods_count: number
  }>(
    `SELECT tbank_rebill_id, plan_id, period, periods_count FROM pending_subscription_autopay WHERE email = ?`,
    [email.trim().toLowerCase()]
  )
  if (!row) return null
  if (row.period !== "month" && row.period !== "year") return null
  const tbankRebillId = row.tbank_rebill_id?.trim()
  if (!tbankRebillId) return null
  return {
    tbankRebillId,
    planId: row.plan_id as PlanId,
    period: row.period,
    periodsCount: row.periods_count,
  }
}

export async function deletePendingSubscriptionAutopay(email: string): Promise<void> {
  await execute(`DELETE FROM pending_subscription_autopay WHERE email = ?`, [email.trim().toLowerCase()])
}
