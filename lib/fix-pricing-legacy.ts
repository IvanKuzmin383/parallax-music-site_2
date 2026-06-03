import type { CabinetUser } from "@/lib/cabinet-users"
import { NEW_USER_TRACK_PRICE_START_UTC_MS } from "@/lib/track-pricing"

/**
 * Legacy Fix: докупка по фиксированной цене 300/400 ₽ (см. track-pricing.ts),
 * без ступенчатого fix-pack прайса.
 */
export function isLegacyFixPricing(user: { createdAt?: string }): boolean {
  if (!user.createdAt) return true
  const createdAtMs = Date.parse(user.createdAt)
  if (Number.isNaN(createdAtMs)) return true
  return createdAtMs < NEW_USER_TRACK_PRICE_START_UTC_MS
}

/** Списание кредитов с purchased_tracks_balance при загрузке (новый публичный Fix). */
export function shouldDeductFixPackCreditsOnUpload(
  user: Pick<CabinetUser, "subscriptionName" | "createdAt">
): boolean {
  return user.subscriptionName === "Fix" && !isLegacyFixPricing(user)
}
