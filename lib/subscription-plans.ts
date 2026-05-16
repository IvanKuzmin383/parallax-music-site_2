import type { CabinetUser } from "@/lib/cabinet-users"

/** Допустимые названия тарифов подписки */
export const SUBSCRIPTION_PLANS = ["Start", "Medium", "Pro", "Label", "Fix"] as const
export type SubscriptionPlan = (typeof SUBSCRIPTION_PLANS)[number]

/**
 * Эффективный лимит треков: для Fix = subscriptionTrackLimit + purchasedTracksBalance,
 * для остальных планов — как getTrackLimit (Start/Medium/Pro).
 */
export function getEffectiveTrackLimit(user: Pick<CabinetUser, "subscriptionName" | "subscriptionTrackLimit" | "purchasedTracksBalance">): number | null {
  const plan = user.subscriptionName
  if (!plan) return 0
  if (plan === "Fix") {
    const base = user.subscriptionTrackLimit ?? 0
    const purchased = user.purchasedTracksBalance ?? 0
    return base + purchased
  }
  return getTrackLimit(plan, user.subscriptionTrackLimit)
}

/** Максимальное количество треков по тарифу. null = без ограничений */
export function getTrackLimit(
  plan: string | null | undefined,
  customTrackLimit?: number | null
): number | null {
  if (!plan) return 0
  switch (plan) {
    case "Start":
      return 3
    case "Medium":
      return 6
    case "Pro":
      return null
    case "Label":
      return null
    case "Fix":
      // Для Fix плана используется кастомный лимит, указанный администратором
      return customTrackLimit ?? 0
    default:
      return 0
  }
}

export function isSubscriptionPlan(value: string): value is SubscriptionPlan {
  return SUBSCRIPTION_PLANS.includes(value as SubscriptionPlan)
}

/**
 * Для загрузки релизов: Start/Medium/Pro активны, пока дата окончания ≥ сегодня.
 * Fix не ограничивается сроком подписки в этой проверке.
 */
export function isSubscriptionActiveForUpload(
  user: Pick<CabinetUser, "subscriptionName" | "subscriptionExpiresAt">
): boolean {
  if (!user.subscriptionName) return false
  if (user.subscriptionName === "Fix") return true
  if (!user.subscriptionExpiresAt) return false
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return new Date(user.subscriptionExpiresAt) >= today
}
