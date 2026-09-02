export const SMARTLINK_PLATFORMS = [
  { key: "spotify", label: "Spotify" },
  { key: "appleMusic", label: "Apple Music" },
  { key: "deezer", label: "Deezer" },
  { key: "yandex", label: "Яндекс.Музыка" },
  { key: "youtubeMusic", label: "YouTube Music" },
  { key: "vk", label: "VK Музыка" },
  { key: "sberzvuk", label: "СберЗвук" },
  { key: "kion", label: "МТС Музыка" },
] as const

export type PlatformLinkKey = (typeof SMARTLINK_PLATFORMS)[number]["key"]

export interface PlatformLinks {
  spotify?: string
  appleMusic?: string
  deezer?: string
  yandex?: string
  youtubeMusic?: string
  vk?: string
  sberzvuk?: string
  kion?: string
}

export const PLATFORM_LINK_KEYS = SMARTLINK_PLATFORMS.map((p) => p.key) as PlatformLinkKey[]

/** PATCH merge: обновляет только ключи из incoming; пустое значение — удалить ключ. */
export function mergePartialPlatformLinks(
  existing: PlatformLinks | undefined,
  incoming: Partial<PlatformLinks>
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
