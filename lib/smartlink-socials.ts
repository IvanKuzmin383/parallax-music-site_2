export const SMARTLINK_SOCIALS = [
  { key: "telegram", label: "Telegram" },
  { key: "tiktok", label: "TikTok" },
  { key: "instagram", label: "Instagram" },
  { key: "youtube", label: "YouTube" },
  { key: "x", label: "X" },
  { key: "vk", label: "VK" },
  { key: "odnoklassniki", label: "Одноклассники" },
  { key: "max", label: "MAX" },
] as const

export type SmartlinkSocialKey = (typeof SMARTLINK_SOCIALS)[number]["key"]

export const SMARTLINK_SOCIAL_KEYS = SMARTLINK_SOCIALS.map((s) => s.key) as SmartlinkSocialKey[]

/** ?v= - сброс кэша после замены на официальные глифы */
export const SOCIAL_ICON_SRC: Record<SmartlinkSocialKey, string> = {
  telegram: "/socials/telegram.svg?v=2",
  tiktok: "/socials/tiktok.svg?v=2",
  instagram: "/socials/instagram.svg?v=2",
  youtube: "/socials/youtube.svg?v=2",
  x: "/socials/x.svg?v=2",
  vk: "/socials/vk.svg?v=2",
  odnoklassniki: "/socials/odnoklassniki.svg?v=1",
  max: "/socials/max.svg?v=1",
}

export const SMARTLINK_SOCIAL_POSITIONS = ["above", "below"] as const
export type SmartlinkSocialPosition = (typeof SMARTLINK_SOCIAL_POSITIONS)[number]

export const SMARTLINK_SOCIAL_ICON_STYLES = ["glass", "flat", "bare"] as const
export type SmartlinkSocialIconStyle = (typeof SMARTLINK_SOCIAL_ICON_STYLES)[number]

export type SmartlinkSocialItem = {
  network: SmartlinkSocialKey
  url: string
}

export type SmartlinkSocials = {
  enabled: boolean
  position: SmartlinkSocialPosition
  iconStyle: SmartlinkSocialIconStyle
  items: SmartlinkSocialItem[]
}

export const DEFAULT_SMARTLINK_SOCIALS: SmartlinkSocials = {
  enabled: false,
  position: "below",
  iconStyle: "glass",
  items: [],
}

export function isSmartlinkSocialKey(value: unknown): value is SmartlinkSocialKey {
  return typeof value === "string" && (SMARTLINK_SOCIAL_KEYS as readonly string[]).includes(value)
}

export function parseSmartlinkSocials(raw: unknown): SmartlinkSocials {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_SMARTLINK_SOCIALS, items: [] }
  const obj = raw as Record<string, unknown>
  const itemsRaw = Array.isArray(obj.items) ? obj.items : []
  const items: SmartlinkSocialItem[] = []
  const seen = new Set<SmartlinkSocialKey>()
  for (const item of itemsRaw) {
    if (!item || typeof item !== "object") continue
    const row = item as Record<string, unknown>
    if (!isSmartlinkSocialKey(row.network)) continue
    if (seen.has(row.network)) continue
    const url = typeof row.url === "string" ? row.url.trim() : ""
    if (!url) continue
    seen.add(row.network)
    items.push({ network: row.network, url })
  }
  const position =
    obj.position === "above" || obj.position === "below"
      ? obj.position
      : DEFAULT_SMARTLINK_SOCIALS.position
  const iconStyle =
    obj.iconStyle === "glass" || obj.iconStyle === "flat" || obj.iconStyle === "bare"
      ? obj.iconStyle
      : DEFAULT_SMARTLINK_SOCIALS.iconStyle
  return {
    enabled: obj.enabled === true,
    position,
    iconStyle,
    items,
  }
}
