/** Детали заказа услуги (трек, пожелания) — JSON в orders.service_details_json */
export type OrderServiceDetails = {
  trackTitle?: string
  comment?: string
  /** Имена треков / исходные имена файлов (AI mastering и т.п.) */
  trackTitles?: string[]
  originalFilenames?: string[]
  videosCount?: number
  contactType?: string
  contactValue?: string
}

export function stringifyServiceDetails(
  details: OrderServiceDetails | null | undefined
): string | null {
  if (!details) return null
  const out: OrderServiceDetails = {}
  const trackTitle = details.trackTitle?.trim()
  const comment = details.comment?.trim()
  if (trackTitle) out.trackTitle = trackTitle
  if (comment) out.comment = comment
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
