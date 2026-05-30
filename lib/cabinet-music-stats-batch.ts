import type { MusicPlatformKey } from "@/lib/music-platform"
import { MUSIC_PLATFORM_LABELS } from "@/lib/music-platform"
import {
  CABINET_MUSIC_STATS_COMPARE_MAX_TRACKS,
  type MusicStatsResponse,
} from "@/lib/music-stats-shared"
import { getMusicStatsForCabinetUser } from "@/lib/music-stats"

export { CABINET_MUSIC_STATS_COMPARE_MAX_TRACKS }

const PLATFORM_SET = new Set<string>(Object.keys(MUSIC_PLATFORM_LABELS))

export function parseMusicPlatformKeysList(raw: string | null): MusicPlatformKey[] {
  if (!raw?.trim()) return []
  const keys: MusicPlatformKey[] = []
  for (const part of raw.split(",")) {
    const k = part.trim() as MusicPlatformKey
    if (PLATFORM_SET.has(k) && !keys.includes(k)) keys.push(k)
  }
  return keys
}

export type CabinetMusicStatsBatchResult = {
  chart: MusicStatsResponse[]
  compare: Array<{ trackId: string; platforms: MusicStatsResponse[] }>
}

/**
 * Один вызов API вместо N×M HTTP-запросов с клиента.
 * Запросы к БД выполняются последовательно в одном воркере Node.
 */
export function getMusicStatsBatchForCabinetUser(
  cabinetUserEmail: string,
  options: {
    platformKeys: MusicPlatformKey[]
    chartTrackIds?: string[] | null
    compareTrackIds?: string[]
  },
): CabinetMusicStatsBatchResult {
  const platformKeys = options.platformKeys.filter((k) => PLATFORM_SET.has(k))
  const chartFilter =
    options.chartTrackIds && options.chartTrackIds.length > 0 ? options.chartTrackIds : null
  const compareIds = (options.compareTrackIds ?? [])
    .map((id) => id.trim())
    .filter(Boolean)
    .slice(0, CABINET_MUSIC_STATS_COMPARE_MAX_TRACKS)

  const chart: MusicStatsResponse[] = []
  for (const platformKey of platformKeys) {
    chart.push(
      getMusicStatsForCabinetUser(platformKey, cabinetUserEmail, { trackIds: chartFilter }),
    )
  }

  const compare: CabinetMusicStatsBatchResult["compare"] = []
  for (const trackId of compareIds) {
    const platforms: MusicStatsResponse[] = []
    for (const platformKey of platformKeys) {
      platforms.push(
        getMusicStatsForCabinetUser(platformKey, cabinetUserEmail, { trackIds: [trackId] }),
      )
    }
    compare.push({ trackId, platforms })
  }

  return { chart, compare }
}
