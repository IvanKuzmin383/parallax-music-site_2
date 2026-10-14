export const SMARTLINK_PLATFORMS = [
  { key: "spotify", label: "Spotify" },
  { key: "appleMusic", label: "Apple Music" },
  { key: "deezer", label: "Deezer" },
  { key: "yandex", label: "Яндекс.Музыка" },
  { key: "youtubeMusic", label: "YouTube Music" },
  { key: "vk", label: "VK Музыка" },
  { key: "sberzvuk", label: "Звук" },
  { key: "kion", label: "МТС КИОН" },
  { key: "amazonMusic", label: "Amazon Music" },
  { key: "odnoklassniki", label: "Одноклассники" },
  { key: "tidal", label: "TIDAL" },
  { key: "soundcloud", label: "SoundCloud" },
  { key: "wink", label: "Wink Музыка" },
  { key: "other", label: "Другое" },
] as const

export type PlatformLinkKey = (typeof SMARTLINK_PLATFORMS)[number]["key"]

export type PlatformLinks = Partial<Record<PlatformLinkKey, string>>

export const PLATFORM_LINK_KEYS = SMARTLINK_PLATFORMS.map((p) => p.key) as PlatformLinkKey[]

/** Официальные / фирменные иконки площадок в public/platforms. */
export const PLATFORM_ICON_SRC: Record<PlatformLinkKey, string> = {
  spotify: "/platforms/spotify.svg",
  appleMusic: "/platforms/apple-music.svg",
  deezer: "/platforms/deezer.png",
  yandex: "/platforms/yandex.svg",
  youtubeMusic: "/platforms/youtube-music.svg",
  vk: "/platforms/vk.svg?v=2",
  sberzvuk: "/platforms/sberzvuk.svg",
  kion: "/platforms/kion.svg",
  amazonMusic: "/platforms/amazon-music.svg?v=2",
  odnoklassniki: "/platforms/odnoklassniki.svg?v=2",
  tidal: "/platforms/tidal.svg?v=2",
  soundcloud: "/platforms/soundcloud.svg?v=2",
  wink: "/platforms/wink.svg?v=2",
  other: "/platforms/other.svg?v=2",
}

export function isPlatformLinkKey(value: unknown): value is PlatformLinkKey {
  return typeof value === "string" && (PLATFORM_LINK_KEYS as readonly string[]).includes(value)
}

export function platformLabel(key: PlatformLinkKey, otherLabel?: string | null): string {
  if (key === "other" && otherLabel?.trim()) return otherLabel.trim()
  return SMARTLINK_PLATFORMS.find((p) => p.key === key)?.label ?? key
}

/** PATCH merge: обновляет только ключи из incoming; пустое значение - удалить ключ. */
export function mergePartialPlatformLinks(
  existing: PlatformLinks | undefined,
  incoming: Partial<PlatformLinks>,
): PlatformLinks {
  const next: PlatformLinks = { ...(existing ?? {}) }
  for (const key of PLATFORM_LINK_KEYS) {
    if (!Object.prototype.hasOwnProperty.call(incoming, key)) continue
    const value = incoming[key]
    if (typeof value === "string" && value.trim()) {
      next[key] = value.trim()
    } else {
      delete next[key]
    }
  }
  return next
}

/** Полная замена набора ссылок (пустые ключи отбрасываются). */
export function normalizePlatformLinks(incoming: Partial<PlatformLinks> | undefined): PlatformLinks {
  const next: PlatformLinks = {}
  if (!incoming) return next
  for (const key of PLATFORM_LINK_KEYS) {
    const value = incoming[key]
    if (typeof value === "string" && value.trim()) {
      next[key] = value.trim()
    }
  }
  return next
}
