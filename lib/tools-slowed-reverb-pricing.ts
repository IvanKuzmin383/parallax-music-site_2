/** Цена одного дополнительного скачивания Slowed / Reverb / Nightcore, RUB. */
export const TOOLS_SLOWED_REVERB_DOWNLOAD_PRICE_RUB = 100

/** Сколько скачиваний даёт одна оплата. */
export const TOOLS_SLOWED_REVERB_CREDITS_PER_PURCHASE = 1

export type ToolsSlowedReverbEntitlement = {
  freeUsed: boolean
  freeAvailable: boolean
  credits: number
  canDownload: boolean
  priceRub: number
}
