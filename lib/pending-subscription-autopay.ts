import { getDb } from "./db"
import type { PlanId } from "./plan-pricing"

export function upsertPendingSubscriptionAutopay(params: {
  email: string
  yookassaPaymentMethodId: string
  planId: PlanId
  period: "month" | "year"
  periodsCount: number
}): void {
  const db = getDb()
  const email = params.email.trim().toLowerCase()
  const now = new Date().toISOString()
  db.prepare(
    `
    INSERT INTO pending_subscription_autopay (email, yookassa_payment_method_id, plan_id, period, periods_count, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(email) DO UPDATE SET
      yookassa_payment_method_id = excluded.yookassa_payment_method_id,
      plan_id = excluded.plan_id,
      period = excluded.period,
      periods_count = excluded.periods_count,
      created_at = excluded.created_at
  `
  ).run(email, params.yookassaPaymentMethodId, params.planId, params.period, params.periodsCount, now)
}

export function getPendingSubscriptionAutopay(email: string): {
  yookassaPaymentMethodId: string
  planId: PlanId
  period: "month" | "year"
  periodsCount: number
} | null {
  const db = getDb()
  const row = db
    .prepare(
      `SELECT yookassa_payment_method_id, plan_id, period, periods_count FROM pending_subscription_autopay WHERE email = ? COLLATE NOCASE`
    )
    .get(email.trim().toLowerCase()) as
    | {
        yookassa_payment_method_id: string
        plan_id: string
        period: string
        periods_count: number
      }
    | undefined
  if (!row) return null
  if (row.period !== "month" && row.period !== "year") return null
  return {
    yookassaPaymentMethodId: row.yookassa_payment_method_id,
    planId: row.plan_id as PlanId,
    period: row.period,
    periodsCount: row.periods_count,
  }
}

export function deletePendingSubscriptionAutopay(email: string): void {
  const db = getDb()
  db.prepare(`DELETE FROM pending_subscription_autopay WHERE email = ? COLLATE NOCASE`).run(email.trim().toLowerCase())
}
