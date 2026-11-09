/**
 * Синхронизация текста песни - фиксированная цена за один трек.
 * Синхронизировать с копирайтом на странице услуги.
 * Площадки: только VK Музыка и Apple Music.
 */
export const LYRICS_SYNC_PRICE_RUB = 1500

export const LYRICS_SYNC_PRICE_LABEL = `${LYRICS_SYNC_PRICE_RUB.toLocaleString("ru-RU")} ₽`

export const LYRICS_SYNC_HAS_FIXED_PRICE = true

/** Короткая пометка для UI рядом с названием услуги. */
export const LYRICS_SYNC_PLATFORMS_SHORT = "только VK Музыка и Apple Music"

/** Подпись для каталогов и карточек. */
export const LYRICS_SYNC_SERVICE_TITLE = "Синхронизация текста"
