/** Пиксели ретаргетинга на публичной странице смартлинка. Только ID, без произвольного JS. */

export type SmartlinkPixels = {
  metaPixelId?: string
  gaMeasurementId?: string
  googleAdsId?: string
  gtmId?: string
  tiktokPixelId?: string
}

const META_RE = /^\d{5,20}$/
const GA_RE = /^G-[A-Z0-9]{6,20}$/i
const GTM_RE = /^GTM-[A-Z0-9]{4,12}$/i
const ADS_RE = /^AW-\d{6,16}$/i
const TIKTOK_RE = /^[A-Z0-9]{10,30}$/i

function cleanId(value: unknown, re: RegExp, max: number): string | undefined {
  if (typeof value !== "string") return undefined
  const t = value.trim()
  if (!t || t.length > max) return undefined
  return re.test(t) ? t : undefined
}

export function parseSmartlinkPixels(raw: unknown): SmartlinkPixels | undefined {
  if (!raw || typeof raw !== "object") return undefined
  const obj = raw as Record<string, unknown>
  const pixels: SmartlinkPixels = {}
  const meta = cleanId(obj.metaPixelId, META_RE, 20)
  const ga = cleanId(obj.gaMeasurementId, GA_RE, 24)
  const ads = cleanId(obj.googleAdsId, ADS_RE, 24)
  const gtm = cleanId(obj.gtmId, GTM_RE, 20)
  const tt = cleanId(obj.tiktokPixelId, TIKTOK_RE, 30)
  if (meta) pixels.metaPixelId = meta
  if (ga) pixels.gaMeasurementId = ga
  if (ads) pixels.googleAdsId = ads
  if (gtm) pixels.gtmId = gtm
  if (tt) pixels.tiktokPixelId = tt
  return Object.keys(pixels).length > 0 ? pixels : undefined
}

export function hasSmartlinkPixels(pixels: SmartlinkPixels | null | undefined): boolean {
  if (!pixels) return false
  return Boolean(
    pixels.metaPixelId ||
      pixels.gaMeasurementId ||
      pixels.googleAdsId ||
      pixels.gtmId ||
      pixels.tiktokPixelId,
  )
}

/** Нормализация полей формы: пустая строка = сброс, невалидное - не пишем. */
export function normalizePixelField(
  kind: keyof SmartlinkPixels,
  value: string,
): string | undefined {
  const map: Record<keyof SmartlinkPixels, RegExp> = {
    metaPixelId: META_RE,
    gaMeasurementId: GA_RE,
    googleAdsId: ADS_RE,
    gtmId: GTM_RE,
    tiktokPixelId: TIKTOK_RE,
  }
  const t = value.trim()
  if (!t) return undefined
  return map[kind].test(t) ? t : undefined
}
