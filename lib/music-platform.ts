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
}

