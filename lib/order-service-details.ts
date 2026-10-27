/** Детали заказа услуги (трек, пожелания) - JSON в orders.service_details_json */
export type OrderServiceDetails = {
  trackTitle?: string
  /** Имя артиста (AI обложка и т.п.) */
  artistName?: string
  /**
   * AI-обложка: нанести имя артиста и название релиза на обложку.
   * При false поля artistName/trackTitle не используются как текст для обложки.
   */
  includeTextOnCover?: boolean
  comment?: string
  /**
   * Полный текст песни (синхронизация текста и т.п.).
   * Переносы строк и повторы припева сохраняются как есть.
   */
  lyricsText?: string
  /** Ссылка на исходник (файлообменник) - видеоклип и т.п. */
  fileUrl?: string
  /** Дата публикации (YYYY-MM-DD) */
  releaseDate?: string
  /** Таймкод превью в секундах */
  previewTimecodeSec?: number
  /** Имена треков / исходные имена файлов (AI mastering и т.п.) */
  trackTitles?: string[]
  originalFilenames?: string[]
  videosCount?: number
  contactType?: string
  contactValue?: string
  /** Направление видеоряда (создание видеошота). */
  videoDirection?: string
  /** Ссылка на исходники / референсы (создание видеошота). */
  referencesUrl?: string
  /** Код ISRC трека (видеошот и т.п.). */
  isrc?: string
  /** Код UPC релиза (видеошот и т.п.). */
  upc?: string
  /** Применённый купон геймификации */
  couponCode?: string
  couponId?: string
  couponTitle?: string
  /** Фактическая скидка в ₽ */
  couponDiscountRub?: number
  /** ID релиза / трека / альбома из каталога кабинета (business music и т.п.). */
  releaseId?: string
  /** Источник каталога: release | track | album */
  catalogSource?: string
  /**
   * Подписка: extra_slot = создать новый artist-slot, не продлевать существующий.
   * Иначе обычное продление / первый слот.
   */
  subscriptionPurchaseIntent?: "extra_slot"
}

export function stringifyServiceDetails(
  details: OrderServiceDetails | null | undefined
): string | null {
  if (!details) return null
  const out: OrderServiceDetails = {}
  const trackTitle = details.trackTitle?.trim()
  const artistName = details.artistName?.trim()
  const comment = details.comment?.trim()
  const lyricsText = details.lyricsText?.replace(/\r\n/g, "\n").trim()
  const fileUrl = details.fileUrl?.trim()
  const releaseDate = details.releaseDate?.trim()
  if (typeof details.includeTextOnCover === "boolean") {
    out.includeTextOnCover = details.includeTextOnCover
  }
  if (trackTitle) out.trackTitle = trackTitle
  if (artistName) out.artistName = artistName
  if (comment) out.comment = comment
  if (lyricsText) out.lyricsText = lyricsText
  if (fileUrl) out.fileUrl = fileUrl
  if (releaseDate) out.releaseDate = releaseDate
  if (
    typeof details.previewTimecodeSec === "number" &&
    Number.isFinite(details.previewTimecodeSec)
  ) {
    out.previewTimecodeSec = Math.trunc(details.previewTimecodeSec)
  }
  if (details.trackTitles?.length) {
    out.trackTitles = details.trackTitles.map((t) => t.trim()).filter(Boolean)
  }
  if (details.originalFilenames?.length) {
    out.originalFilenames = details.originalFilenames.map((t) => t.trim()).filter(Boolean)
  }
  if (typeof details.videosCount === "number" && Number.isFinite(details.videosCount)) {
    out.videosCount = details.videosCount
  }
  const contactType = details.contactType?.trim()
  const contactValue = details.contactValue?.trim()
  if (contactType) out.contactType = contactType
  if (contactValue) out.contactValue = contactValue
  const videoDirection = details.videoDirection?.trim()
  const referencesUrl = details.referencesUrl?.trim()
  if (videoDirection) out.videoDirection = videoDirection
  if (referencesUrl) out.referencesUrl = referencesUrl
  const isrc = details.isrc?.trim()
  const upc = details.upc?.trim()
  if (isrc) out.isrc = isrc
  if (upc) out.upc = upc
  const couponCode = details.couponCode?.trim()
  const couponId = details.couponId?.trim()
  const couponTitle = details.couponTitle?.trim()
  if (couponCode) out.couponCode = couponCode
  if (couponId) out.couponId = couponId
  if (couponTitle) out.couponTitle = couponTitle
  if (
    typeof details.couponDiscountRub === "number" &&
    Number.isFinite(details.couponDiscountRub) &&
    details.couponDiscountRub > 0
  ) {
    out.couponDiscountRub = details.couponDiscountRub
  }
  const releaseId = details.releaseId?.trim()
  const catalogSource = details.catalogSource?.trim()
  if (releaseId) out.releaseId = releaseId
  if (catalogSource) out.catalogSource = catalogSource
  if (details.subscriptionPurchaseIntent === "extra_slot") {
    out.subscriptionPurchaseIntent = "extra_slot"
  }
  return Object.keys(out).length > 0 ? JSON.stringify(out) : null
}

export function parseServiceDetails(raw: string | null | undefined): OrderServiceDetails | null {
  if (!raw?.trim()) return null
  try {
    const parsed = JSON.parse(raw) as OrderServiceDetails
    if (!parsed || typeof parsed !== "object") return null
    return parsed
  } catch {
    return null
  }
}
