import { NextRequest, NextResponse } from "next/server"
import { access, readFile } from "node:fs/promises"
import { getAdminToken, verifySession } from "@/lib/auth"
import {
  importMusicStatsRawTextToDb,
  getMusicStatsByPlatformKey,
  MUSIC_PLATFORM_LABELS,
  type MusicPlatformKey,
  type MusicStatsResponse,
} from "@/lib/music-stats"
import {
  MultipartRequestError,
  parseMultipartRequestStream,
} from "@/lib/node-streaming-multipart"

const DEFAULT_STATS_FILE_PATHS: string[] = [
  "/data/tracks_full_2026-03-19.json",
  "/data/tracks.json",
  "C:\\Users\\Admin\\Downloads\\tracks_full_2026-03-19.json",
]

interface DailyStat {
  date: string
  totalPlays: number
  tracksWithPlays: number
}

interface TopTrack {
  title: string
  author: string
  plays: number
}

interface StatsResponse {
  source: string | null
  platform: string
  exportedAt: string | null
  totalRows: number
  totalTracksInFile: number
  totalPlays: number
  daysCount: number
  dailyStats: DailyStat[]
  topTracks: TopTrack[]
}

async function resolveStatsFilePath(): Promise<string> {
  if (process.env.YANDEX_MUSIC_STATS_FILE) {
    return process.env.YANDEX_MUSIC_STATS_FILE
  }

  for (const candidate of DEFAULT_STATS_FILE_PATHS) {
    try {
      await access(candidate)
      return candidate
    } catch {
      // continue
    }
  }

  return DEFAULT_STATS_FILE_PATHS[0]
}

function mapToResponse(stats: MusicStatsResponse): StatsResponse {
  return {
    source: stats.source,
    platform: stats.platformLabel,
    exportedAt: stats.exportedAt,
    totalRows: stats.totalRows,
    totalTracksInFile: stats.totalTracksInFile,
    totalPlays: stats.totalPlays,
    daysCount: stats.daysCount,
    dailyStats: stats.dailyStats,
    topTracks: stats.topTracks,
  }
}

export async function GET(request: NextRequest) {
  const token = getAdminToken(request)
  if (!verifySession(token)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const platformKey: MusicPlatformKey = "yandex_music"

  let stats = getMusicStatsByPlatformKey(platformKey)

  // If DB empty, try importing from disk once (replacement-by-dates will still apply).
  if (stats.daysCount === 0 && stats.topTracks.length === 0) {
    const statsFilePath = await resolveStatsFilePath()
    try {
      const rawText = await readFile(statsFilePath, "utf8")
      stats = await importMusicStatsRawTextToDb({
        rawText,
        fileName: statsFilePath.split(/[/\\]/).pop() ?? "yandex-stats.json",
        platformKey,
      })
    } catch {
      // Leave empty stats (admin UI will still allow uploading).
    }
  }

  if (stats.daysCount === 0 && stats.topTracks.length === 0) {
    const empty: StatsResponse = {
      source: null,
      platform: MUSIC_PLATFORM_LABELS[platformKey],
      exportedAt: null,
      totalRows: 0,
      totalTracksInFile: 0,
      totalPlays: 0,
      daysCount: 0,
      dailyStats: [],
      topTracks: [],
    }
    return NextResponse.json(empty)
  }

  return NextResponse.json(mapToResponse(stats))
}

export async function POST(request: NextRequest) {
  const token = getAdminToken(request)
  if (!verifySession(token)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const multipart = await parseMultipartRequestStream(request, {
      maxFiles: 1,
      maxFields: 4,
      maxFileSizeBytes: 50 * 1024 * 1024,
      maxFieldSizeBytes: 8 * 1024,
    })
    try {
      const file = multipart.getFile("file")

      if (!file) {
        return NextResponse.json({ error: "Файл JSON не предоставлен" }, { status: 400 })
      }

      const ext = (file.originalFilename.split(".").pop() ?? "").toLowerCase()
      if (ext !== "json") {
        return NextResponse.json({ error: "Можно загружать только .json" }, { status: 400 })
      }

      if (file.size > 50 * 1024 * 1024) {
        return NextResponse.json({ error: "Файл слишком большой (макс. 50 MB)" }, { status: 400 })
      }

      const rawText = await readFile(file.tempFilePath, "utf8")
      const platformKey: MusicPlatformKey = "yandex_music"

      const imported = await importMusicStatsRawTextToDb({
        rawText,
        fileName: file.originalFilename,
        platformKey,
      })

      return NextResponse.json(mapToResponse(imported))
    } finally {
      await multipart.cleanup()
    }
  } catch (error) {
    if (error instanceof MultipartRequestError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error("Error importing Yandex Music stats:", error)
    const message = error instanceof Error ? error.message : "Неизвестная ошибка"
    return NextResponse.json({ error: `Не удалось импортировать файл: ${message}` }, { status: 500 })
  }
}
