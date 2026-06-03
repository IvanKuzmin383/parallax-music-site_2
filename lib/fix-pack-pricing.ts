/** Цена за трек при покупке 1–5 шт. в одном заказе (публичный тариф Fix), RUB */
export const FIX_PACK_PRICE_TIER_1_RUB = 500

/** Цена за трек при покупке 6–10 шт., RUB */
export const FIX_PACK_PRICE_TIER_2_RUB = 400

/** Цена за трек при покупке 11+ шт., RUB */
export const FIX_PACK_PRICE_TIER_3_RUB = 350

/** Максимум треков в одном публичном заказе Fix-пакета */
export const MAX_FIX_PACK_ORDER = 50

export const FIX_PACK_TRACKS_MIN = 1

export function getFixPackUnitPriceRub(tracksCount: number): number {
  if (!Number.isInteger(tracksCount) || tracksCount < 1) {
    throw new Error("tracksCount must be a positive integer")
  }
  if (tracksCount <= 5) return FIX_PACK_PRICE_TIER_1_RUB
  if (tracksCount <= 10) return FIX_PACK_PRICE_TIER_2_RUB
  return FIX_PACK_PRICE_TIER_3_RUB
}

export function calculateFixPackTotalRub(tracksCount: number): number {
  return tracksCount * getFixPackUnitPriceRub(tracksCount)
}

export function formatFixPackTotalAmount(tracksCount: number): string {
  return calculateFixPackTotalRub(tracksCount).toFixed(2)
}

export function isValidFixPackTracksCount(tracksCount: unknown): tracksCount is number {
  return (
    typeof tracksCount === "number" &&
    Number.isInteger(tracksCount) &&
    tracksCount >= FIX_PACK_TRACKS_MIN &&
    tracksCount <= MAX_FIX_PACK_ORDER
  )
}
