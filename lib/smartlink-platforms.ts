export const SMARTLINK_PLATFORMS = [
  { key: "spotify", label: "Spotify" },
  { key: "appleMusic", label: "Apple Music" },
  { key: "yandex", label: "Яндекс.Музыка" },
  { key: "youtubeMusic", label: "YouTube Music" },
  { key: "vk", label: "VK Музыка" },
  { key: "sberzvuk", label: "СберЗвук" },
  { key: "kion", label: "КИОН" },
] as const

export type PlatformLinkKey = (typeof SMARTLINK_PLATFORMS)[number]["key"]

export interface PlatformLinks {
  spotify?: string
  appleMusic?: string
  yandex?: string
  youtubeMusic?: string
  vk?: string
  sberzvuk?: string
  kion?: string
}
