/** Цена одного дополнительного скачивания сниппета (Tools), RUB. */
export const TOOLS_STORY_VIDEO_DOWNLOAD_PRICE_RUB = 100

/** Сколько скачиваний даёт одна оплата. */
export const TOOLS_STORY_VIDEO_CREDITS_PER_PURCHASE = 1

export type ToolsStoryVideoEntitlement = {
  freeUsed: boolean
  freeAvailable: boolean
  credits: number
  canDownload: boolean
  priceRub: number
}
