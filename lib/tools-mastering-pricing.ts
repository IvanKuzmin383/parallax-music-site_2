/** Цена одного дополнительного скачивания онлайн-мастеринга в Tools, RUB. */
export const TOOLS_MASTERING_DOWNLOAD_PRICE_RUB = 100

/** Сколько скачиваний даёт одна оплата. */
export const TOOLS_MASTERING_CREDITS_PER_PURCHASE = 1

/** Сколько дней сохранённый мастер доступен для повторного скачивания. */
export const TOOLS_MASTERING_FILE_TTL_DAYS = 14

/** ID «заказа» в ЛК для строки из tools_mastering_files. */
export const MASTERING_FILE_ORDER_PREFIX = "tmf-"

export function masteringFileOrderId(fileId: string): string {
  return `${MASTERING_FILE_ORDER_PREFIX}${fileId}`
}

export function parseMasteringFileOrderId(orderId: string): string | null {
  if (!orderId.startsWith(MASTERING_FILE_ORDER_PREFIX)) return null
  const id = orderId.slice(MASTERING_FILE_ORDER_PREFIX.length).trim()
  return id || null
}

export type ToolsMasteringEntitlement = {
  freeUsed: boolean
  freeAvailable: boolean
  credits: number
  canDownload: boolean
  priceRub: number
}
