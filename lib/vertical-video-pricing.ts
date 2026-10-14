export const VERTICAL_VIDEO_PRICE_TIER_1_RUB = 249
export const VERTICAL_VIDEO_PRICE_TIER_2_RUB = 199
export const VERTICAL_VIDEO_PRICE_TIER_3_RUB = 149

export const VERTICAL_VIDEO_MIN_COUNT = 1
export const VERTICAL_VIDEO_MAX_COUNT = 500

export type VerticalVideoTier = {
  min: number
  max: number
  unitPrice: number
  preset: number
}

export const VERTICAL_VIDEO_TIERS: readonly VerticalVideoTier[] = [
  { min: 1, max: 10, unitPrice: VERTICAL_VIDEO_PRICE_TIER_1_RUB, preset: 10 },
  { min: 11, max: 50, unitPrice: VERTICAL_VIDEO_PRICE_TIER_2_RUB, preset: 50 },
  { min: 51, max: 500, unitPrice: VERTICAL_VIDEO_PRICE_TIER_3_RUB, preset: 100 },
] as const

export function getVerticalVideoUnitPrice(videosCount: number): number {
  if (videosCount <= 10) return VERTICAL_VIDEO_PRICE_TIER_1_RUB
  if (videosCount <= 50) return VERTICAL_VIDEO_PRICE_TIER_2_RUB
  return VERTICAL_VIDEO_PRICE_TIER_3_RUB
}

export function getVerticalVideoTierForCount(videosCount: number): VerticalVideoTier {
  if (videosCount <= 10) return VERTICAL_VIDEO_TIERS[0]
  if (videosCount <= 50) return VERTICAL_VIDEO_TIERS[1]
  return VERTICAL_VIDEO_TIERS[2]
}

export function formatVerticalVideoRub(amount: number): string {
  return `${amount.toLocaleString("ru-RU")} ₽`
}
