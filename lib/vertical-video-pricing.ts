/** Fixed unit price for vertical videos (independent of quantity). */
export const VERTICAL_VIDEO_UNIT_PRICE_RUB = 399

/** @deprecated Use VERTICAL_VIDEO_UNIT_PRICE_RUB — kept for any leftover imports. */
export const VERTICAL_VIDEO_PRICE_TIER_1_RUB = VERTICAL_VIDEO_UNIT_PRICE_RUB
/** @deprecated Use VERTICAL_VIDEO_UNIT_PRICE_RUB */
export const VERTICAL_VIDEO_PRICE_TIER_2_RUB = VERTICAL_VIDEO_UNIT_PRICE_RUB
/** @deprecated Use VERTICAL_VIDEO_UNIT_PRICE_RUB */
export const VERTICAL_VIDEO_PRICE_TIER_3_RUB = VERTICAL_VIDEO_UNIT_PRICE_RUB

export const VERTICAL_VIDEO_MIN_COUNT = 1
export const VERTICAL_VIDEO_MAX_COUNT = 500

export function getVerticalVideoUnitPrice(_videosCount?: number): number {
  return VERTICAL_VIDEO_UNIT_PRICE_RUB
}
