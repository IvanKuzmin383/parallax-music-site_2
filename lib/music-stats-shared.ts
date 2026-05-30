/**
 * Типы и чистая логика без доступа к БД - безопасно импортировать из клиентских компонентов (`"use client"`).
 * Модуль `@/lib/music-stats` тянет `better-sqlite3` через `db` и не должен попадать в браузерный бандл.
 */
import type { MusicPlatformKey } from "./music-platform"

export type { MusicPlatformKey } from "./music-platform"
export { MUSIC_PLATFORM_LABELS } from "./music-platform"

export interface MusicPoint {
  date?: string
  count?: number
  /** Например из YouTube Music JSON */
  country?: string
}

export interface MusicTrack {
  trackId?: string
  title?: string
  author?: string
  points?: MusicPoint[]
}

export interface MusicStatsFile {
  source?: string
  exportedAt?: string
  platform?: string
  totalRows?: number
  totalTracks?: number
  tracks?: MusicTrack[]
}

export interface DailyStat {
  date: string // ISO date (YYYY-MM-DD)
  totalPlays: number
  tracksWithPlays: number
}

export interface TopTrack {
  title: string
  author: string
  plays: number
}

/** Прослушивания по странам с привязкой к дате (для графика с учётом периода). */
export interface CountryPlaysByDate {
  date: string
  country: string
  plays: number
}

/** Лимит треков в блоке «сравнение» на /cabinet/music-stats (один batch-запрос). */
export const CABINET_MUSIC_STATS_COMPARE_MAX_TRACKS = 5

export interface MusicStatsResponse {
  source: string | null
  platformKey: MusicPlatformKey
  platformLabel: string
  exportedAt: string | null
  totalRows: number
  totalTracksInFile: number
  totalPlays: number
  daysCount: number
  dailyStats: DailyStat[]
  topTracks: TopTrack[]
  countryStatsByDate: CountryPlaysByDate[]
}

function normalizePlatformString(v: string): string {
  return v
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[^a-z0-9а-яё\s]/gi, "")
}

export function detectPlatformKeyFromFileName(fileName: string): MusicPlatformKey | null {
  const n = fileName.toLowerCase()
  if (n.includes("yandex")) return "yandex_music"
  if (n.includes("itunes")) return "itunes"
  if (n.includes("youtube")) return "youtube_music"
  if (n.includes("vk") || n.includes("ok") || n.includes("boom")) return "vk_ok_boom"
  if (n.includes("spotify")) return "spotify"
  if (n.includes("shazam")) return "shazam"
  if (n.includes("pandora")) return "pandora"
  if (n.includes("amazon")) return "amazon"
  if (n.includes("apple")) return "apple_music"
  return null
}

export function detectPlatformKeyFromPlatformString(platform: string | undefined | null): MusicPlatformKey | null {
  if (!platform) return null
  const n = normalizePlatformString(String(platform))

  if (n.includes("yandex")) return "yandex_music"
  if (n.includes("itunes")) return "itunes"
  if (n.includes("youtube")) return "youtube_music"
  if (n.includes("vk") || n.includes("ok") || n.includes("boom")) return "vk_ok_boom"
  if (n.includes("spotify")) return "spotify"
  if (n.includes("shazam")) return "shazam"
  if (n.includes("pandora")) return "pandora"
  if (n.includes("amazon")) return "amazon"
  if (n.includes("apple")) return "apple_music"

  return null
}

export function parseRuOrIsoDateToIso(dateValue: string): string | null {
  const v = dateValue.trim()

  // dd.MM.yyyy
  const ruMatch = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(v)
  if (ruMatch) {
    const [, dd, mm, yyyy] = ruMatch
    return `${yyyy}-${mm}-${dd}`
  }

  // yyyy-MM-dd
  const isoMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v)
  if (isoMatch) {
    const [, yyyy, mm, dd] = isoMatch
    return `${yyyy}-${mm}-${dd}`
  }

  return null
}

export function computeStatsFromMusicData(data: MusicStatsFile): {
  dailyStats: DailyStat[]
  topTracksAgg: Array<{ trackKey: string; title: string; author: string; plays: number }>
  totalPlays: number
  daysCount: number
  totalTracksInFile: number
  totalRows: number
} {
  const byDate = new Map<string, { totalPlays: number; tracksWithPlays: number }>()
  const byTrack = new Map<string, { trackKey: string; title: string; author: string; plays: number }>()

  for (const track of data.tracks ?? []) {
    const title = track.title?.trim() || "Без названия"
    const author = track.author?.trim() || "Неизвестный исполнитель"
    const trackKey = (track.trackId?.trim() || "").length > 0 ? track.trackId!.trim() : `${author}__${title}`

    let trackTotal = 0

    for (const point of track.points ?? []) {
      if (!point?.date) continue
      const dateIso = parseRuOrIsoDateToIso(String(point.date))
      if (!dateIso) continue

      const countNum = typeof point.count === "number" ? point.count : Number(point.count)
      if (!Number.isFinite(countNum) || countNum <= 0) continue

      const prev = byDate.get(dateIso) ?? { totalPlays: 0, tracksWithPlays: 0 }
      prev.totalPlays += countNum
      prev.tracksWithPlays += 1
      byDate.set(dateIso, prev)

      trackTotal += countNum
    }

    if (trackTotal > 0) {
      const prevTrack = byTrack.get(trackKey)
      if (prevTrack) {
        prevTrack.plays += trackTotal
      } else {
        byTrack.set(trackKey, { trackKey, title, author, plays: trackTotal })
      }
    }
  }

  const dailyStats = [...byDate.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, value]) => ({
      date,
      totalPlays: value.totalPlays,
      tracksWithPlays: value.tracksWithPlays,
    }))

  const topTracksAgg = [...byTrack.values()].sort((a, b) => b.plays - a.plays).slice(0, 10)
  const totalPlays = dailyStats.reduce((sum, day) => sum + day.totalPlays, 0)
  const daysCount = dailyStats.length
  const totalTracksInFile = data.totalTracks ?? data.tracks?.length ?? 0
  const totalRows = data.totalRows ?? 0

  return { dailyStats, topTracksAgg, totalPlays, daysCount, totalTracksInFile, totalRows }
}

/** Размер страницы топа треков в админке (кнопка «Ещё»). */
export const ADMIN_TOP_TRACKS_PAGE_SIZE = 10
export const ADMIN_TOP_TRACKS_MAX_PAGE = 50
