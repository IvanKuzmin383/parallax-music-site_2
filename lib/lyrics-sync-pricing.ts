/**
 * Синхронизация текста песни.
 * Фиксированный тариф в текущем согласовании не задан - оформление идёт как заявка без списания.
 * Когда появится подтверждённая цена, задайте число в LYRICS_SYNC_PRICE_RUB.
 */
export const LYRICS_SYNC_PRICE_RUB: number | null = null

function formatLyricsSyncPriceLabel(priceRub: number | null): string {
  if (priceRub == null) return "по запросу"
  return `${priceRub.toLocaleString("ru-RU")} ₽`
}

export const LYRICS_SYNC_PRICE_LABEL = formatLyricsSyncPriceLabel(LYRICS_SYNC_PRICE_RUB)

export const LYRICS_SYNC_HAS_FIXED_PRICE = LYRICS_SYNC_PRICE_RUB != null
