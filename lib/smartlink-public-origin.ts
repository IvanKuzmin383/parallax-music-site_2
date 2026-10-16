import { SMARTLINK_SLUG_REGEX } from "@/lib/smartlink"

const DEFAULT_SITE_ORIGIN = "https://parallaxmusic.ru"

/** Сегменты, которые на short-домене нельзя принимать за slug смартлинка. */
export const SMARTLINK_HOST_RESERVED_SEGMENTS = new Set([
  "admin",
  "admin26081993",
  "ai",
  "api",
  "blog",
  "cabinet",
  "cases",
  "cookies",
  "login",
  "maintenance",
  "offer",
  "pay",
  "privacy",
  "prllx",
  "promotion",
  "register",
  "review",
  "s",
  "smartlinks",
  "stihi",
  "terms",
  "www",
])

function stripTrailingSlash(url: string): string {
  return url.replace(/\/$/, "")
}

/** Основной сайт (кабинет, маркетинг). Не путать со short-доменом смартлинков. */
export function getSiteOrigin(): string {
  return stripTrailingSlash(process.env.NEXT_PUBLIC_SITE_URL || DEFAULT_SITE_ORIGIN)
}

const DEFAULT_SMARTLINK_ORIGIN = "https://prllx.link"

/**
 * Выделенный origin для публичных смартлинков
 * (NEXT_PUBLIC_SMARTLINK_PUBLIC_ORIGIN / SMARTLINK_PUBLIC_ORIGIN).
 * В production по умолчанию https://prllx.link; локально без env - null (остаётся /s/...).
 */
export function getConfiguredSmartlinkOrigin(): string | null {
  const raw =
    process.env.NEXT_PUBLIC_SMARTLINK_PUBLIC_ORIGIN?.trim() ||
    process.env.SMARTLINK_PUBLIC_ORIGIN?.trim() ||
    ""
  if (!raw) {
    if (process.env.NODE_ENV === "production") return DEFAULT_SMARTLINK_ORIGIN
    return null
  }
  try {
    const u = new URL(raw.includes("://") ? raw : `https://${raw}`)
    return stripTrailingSlash(u.origin)
  } catch {
    return null
  }
}

/** Есть ли отдельный short-домен, отличный от основного сайта. */
export function usesDedicatedSmartlinkHost(): boolean {
  const dedicated = getConfiguredSmartlinkOrigin()
  if (!dedicated) return false
  return dedicated !== getSiteOrigin()
}

/**
 * Origin для абсолютных публичных URL смартлинка.
 * Если short-домен не задан - основной сайт.
 */
export function getSmartlinkPublicOrigin(): string {
  return getConfiguredSmartlinkOrigin() || getSiteOrigin()
}

/** Хосты short-домена (apex + www), в нижнем регистре. */
export function getSmartlinkPublicHosts(): Set<string> {
  const origin = getConfiguredSmartlinkOrigin()
  if (!origin) return new Set()
  try {
    const host = new URL(origin).hostname.toLowerCase()
    const apex = host.startsWith("www.") ? host.slice(4) : host
    return new Set([apex, `www.${apex}`])
  } catch {
    return new Set()
  }
}

export function isSmartlinkPublicHost(host: string | null | undefined): boolean {
  if (!host) return false
  const hostname = host.split(":")[0]?.toLowerCase() ?? ""
  return getSmartlinkPublicHosts().has(hostname)
}

/** Канонический путь на short-домене: /slug; иначе /s/slug. */
export function smartlinkPublicPath(slug: string): string {
  const clean = slug.trim()
  if (usesDedicatedSmartlinkHost()) return `/${clean}`
  return `/s/${clean}`
}

/** Абсолютный публичный URL смартлинка. */
export function smartlinkPublicUrl(slug: string): string {
  const clean = slug.trim()
  const origin = getSmartlinkPublicOrigin()
  if (usesDedicatedSmartlinkHost()) return `${origin}/${clean}`
  return `${origin}/s/${clean}`
}

/** Первый сегмент пути подходит как slug смартлинка на short-хосте. */
export function isSmartlinkHostSlugSegment(segment: string): boolean {
  if (!segment || SMARTLINK_HOST_RESERVED_SEGMENTS.has(segment.toLowerCase())) return false
  return SMARTLINK_SLUG_REGEX.test(segment)
}
