import {
  PLAN_IDS,
  PLAN_PRICES,
  planIdToSubscriptionName,
  type PlanId,
} from "@/lib/plan-pricing"
import { getTrackLimit } from "@/lib/subscription-plans"

/** Клиентский каталог тарифов для хаба / paywall (без DB). */
export type CabinetPlanCard = {
  id: PlanId
  title: string
  subtitle: string
  limitLabel: string
  priceMonth: number
  priceYearMonthly: number
  popular?: boolean
}

const SUBTITLES: Record<PlanId, string> = {
  start: "Для начинающих",
  medium: "Для развивающихся артистов",
  pro: "Для профессионалов",
  label: "Для лейблов и команд",
}

function limitLabel(planId: PlanId): string {
  const name = planIdToSubscriptionName(planId)
  const limit = getTrackLimit(name)
  if (planId === "label") {
    return "Безлимит треков, несколько артистов, свой лейбл"
  }
  if (limit == null) return "Безлимит действующих треков, один артист"
  return `До ${limit} действующих треков, один артист`
}

export function listCabinetPlanCards(): CabinetPlanCard[] {
  return PLAN_IDS.map((id) => ({
    id,
    title: planIdToSubscriptionName(id),
    subtitle: SUBTITLES[id],
    limitLabel: limitLabel(id),
    priceMonth: PLAN_PRICES[id].priceMonth,
    priceYearMonthly: PLAN_PRICES[id].priceYearMonthly,
    popular: id === "pro",
  }))
}

export function payUrlForPlan(planId: PlanId, opts?: { period?: "month" | "year" }): string {
  const period = opts?.period === "month" ? "month" : "year"
  const q = new URLSearchParams({
    period,
    from: "cabinet",
    return: "/cabinet/subscription",
  })
  return `/pay/${planId}?${q.toString()}`
}

export type { PlanId }
