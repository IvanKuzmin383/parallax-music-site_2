import type { SubscriptionPlan } from "./subscription-plans"

export const PLAN_IDS = ["start", "medium", "pro", "label"] as const
export type PlanId = (typeof PLAN_IDS)[number]

export const PLAN_PRICES: Record<PlanId, { priceMonth: number; priceYearMonthly: number }> = {
  start: { priceMonth: 390, priceYearMonthly: 290 },
  medium: { priceMonth: 549, priceYearMonthly: 390 },
  pro: { priceMonth: 849, priceYearMonthly: 590 },
  label: { priceMonth: 2999, priceYearMonthly: 1999 },
}

export function planIdToSubscriptionName(planId: PlanId): SubscriptionPlan {
  const map: Record<PlanId, SubscriptionPlan> = {
    start: "Start",
    medium: "Medium",
    pro: "Pro",
    label: "Label",
  }
  return map[planId]
}

/** Для ссылки оплаты /pay/[planId]; для Fix и неизвестных имён - null */
export function subscriptionNameToPlanId(name: string | undefined | null): PlanId | null {
  if (!name) return null
  const map: Partial<Record<SubscriptionPlan, PlanId>> = {
    Start: "start",
    Medium: "medium",
    Pro: "pro",
    Label: "label",
  }
  return map[name as SubscriptionPlan] ?? null
}

export function isPlanId(value: string): value is PlanId {
  return PLAN_IDS.includes(value as PlanId)
}

export function getMaxPeriods(period: "month" | "year"): number {
  return period === "month" ? 12 : 3
}

export function normalizePeriodsCount(period: "month" | "year", periodsCount: number): number {
  const maxPeriods = getMaxPeriods(period)
  if (!Number.isFinite(periodsCount)) return 1
  const integerPeriods = Math.trunc(periodsCount)
  if (integerPeriods < 1) return 1
  if (integerPeriods > maxPeriods) return maxPeriods
  return integerPeriods
}

export function calculateTotalAmount(
  planId: PlanId,
  period: "month" | "year",
  periodsCount: number
): number {
  const prices = PLAN_PRICES[planId]
  if (!prices) return 0
  const safePeriodsCount = normalizePeriodsCount(period, periodsCount)
  if (period === "month") {
    return prices.priceMonth * safePeriodsCount
  }
  return prices.priceYearMonthly * 12 * safePeriodsCount
}

