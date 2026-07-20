export type MusicPlatformKey =
  | "yandex_music"
  | "itunes"
  | "youtube_music"
  | "vk_ok_boom"
  | "spotify"
  | "shazam"
  | "apple_music"
  | "pandora"
  | "amazon"
  | "tdc"
  | "zvuk"
  | "kion_music"
  | "odnoklassniki"

export const MUSIC_PLATFORM_LABELS: Record<MusicPlatformKey, string> = {
  yandex_music: "Yandex Music",
  itunes: "iTunes Store",
  youtube_music: "YouTube Music",
  vk_ok_boom: "VK / OK / BOOM",
  spotify: "Spotify",
  shazam: "Shazam",
  apple_music: "Apple Music",
  pandora: "Pandora",
  amazon: "amazon",
  tdc: "TDC (24-7)",
  zvuk: "Звук",
  kion_music: "KION Музыка",
  odnoklassniki: "Одноклассники",
}
