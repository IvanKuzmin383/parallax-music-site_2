/** Цена одного дополнительного скачивания онлайн-мастеринга в Tools, RUB. */
export const TOOLS_MASTERING_DOWNLOAD_PRICE_RUB = 100

/** Сколько скачиваний даёт одна оплата. */
export const TOOLS_MASTERING_CREDITS_PER_PURCHASE = 1

export type ToolsMasteringEntitlement = {
  freeUsed: boolean
  freeAvailable: boolean
  credits: number
  canDownload: boolean
  priceRub: number
}
