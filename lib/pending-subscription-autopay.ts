import { execute, queryOne } from "./database"
import type { PlanId } from "./plan-pricing"

export async function upsertPendingSubscriptionAutopay(params: {
  email: string
  tbankRebillId?: string | null
  yookassaPaymentMethodId?: string | null
  planId: PlanId
  period: "month" | "year"
  periodsCount: number
}): Promise<void> {
  const rebill = params.tbankRebillId?.trim() || null
  const yookassa = params.yookassaPaymentMethodId?.trim() || null
  if (!rebill && !yookassa) return

  const email = params.email.trim().toLowerCase()
  const now = new Date().toISOString()
  await execute(
    `
    INSERT INTO pending_subscription_autopay (email, tbank_rebill_id, yookassa_payment_method_id, plan_id, period, periods_count, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(email) DO UPDATE SET
      tbank_rebill_id = EXCLUDED.tbank_rebill_id,
      yookassa_payment_method_id = EXCLUDED.yookassa_payment_method_id,
      plan_id = EXCLUDED.plan_id,
      period = EXCLUDED.period,
      periods_count = EXCLUDED.periods_count,
      created_at = EXCLUDED.created_at
  `,
    [email, rebill, yookassa, params.planId, params.period, params.periodsCount, now]
  )
}

export async function getPendingSubscriptionAutopay(email: string): Promise<{
  tbankRebillId?: string
  yookassaPaymentMethodId?: string
  planId: PlanId
  period: "month" | "year"
  periodsCount: number
} | null> {
  const row = await queryOne<{
    tbank_rebill_id: string | null
    yookassa_payment_method_id: string | null
    plan_id: string
    period: string
    periods_count: number
  }>(
    `SELECT tbank_rebill_id, yookassa_payment_method_id, plan_id, period, periods_count FROM pending_subscription_autopay WHERE email = ?`,
    [email.trim().toLowerCase()]
  )
  if (!row) return null
  if (row.period !== "month" && row.period !== "year") return null
  const tbankRebillId = row.tbank_rebill_id?.trim() || undefined
  const yookassaPaymentMethodId = row.yookassa_payment_method_id?.trim() || undefined
  if (!tbankRebillId && !yookassaPaymentMethodId) return null
  return {
    tbankRebillId,
    yookassaPaymentMethodId,
    planId: row.plan_id as PlanId,
    period: row.period,
    periodsCount: row.periods_count,
  }
}

export async function deletePendingSubscriptionAutopay(email: string): Promise<void> {
  await execute(`DELETE FROM pending_subscription_autopay WHERE email = ?`, [email.trim().toLowerCase()])
}
