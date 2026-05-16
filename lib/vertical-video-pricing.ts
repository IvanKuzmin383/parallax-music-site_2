export const VERTICAL_VIDEO_PRICE_TIER_1_RUB = 199
export const VERTICAL_VIDEO_PRICE_TIER_2_RUB = 149
export const VERTICAL_VIDEO_PRICE_TIER_3_RUB = 99

export const VERTICAL_VIDEO_MIN_COUNT = 1
export const VERTICAL_VIDEO_MAX_COUNT = 500

export function getVerticalVideoUnitPrice(videosCount: number): number {
  if (videosCount <= 10) return VERTICAL_VIDEO_PRICE_TIER_1_RUB
  if (videosCount <= 50) return VERTICAL_VIDEO_PRICE_TIER_2_RUB
  return VERTICAL_VIDEO_PRICE_TIER_3_RUB
}
