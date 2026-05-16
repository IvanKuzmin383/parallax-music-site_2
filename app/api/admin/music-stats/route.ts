import { NextRequest, NextResponse } from "next/server"
import { getAdminToken, verifySession } from "@/lib/auth"
import {
  importMusicStatsRawTextToDb,
  getMusicStatsByPlatformKeyWithArtist,
  MUSIC_PLATFORM_LABELS,
  type MusicPlatformKey,
  type MusicStatsResponse,
} from "@/lib/music-stats"
import { access, readFile } from "node:fs/promises"
import {
  MultipartRequestError,
  parseMultipartRequestStream,
} from "@/lib/node-streaming-multipart"

function getPlatformKeyFromRequest(request: NextRequest): MusicPlatformKey | null {
  const url = new URL(request.url)
  const platform = url.searchParams.get("platform")
  if (!platform) return null

  const candidate = platform.trim() as MusicPlatformKey
  if (candidate in MUSIC_PLATFORM_LABELS) return candidate
  return null
}

const DEFAULT_PLATFORM_STATS_FILE_PATHS: Record<MusicPlatformKey, string[]> = {
  yandex_music: [
    "/data/tracks_full_2026-03-19.json",
    "/data/tracks.json",
    "C:\\Users\\Admin\\Downloads\\tracks_full_2026-03-19.json",
  ],
  itunes: [
    "/data/tracks_full_iTunes_Store_2026-03-20.json",
    "C:\\Users\\Admin\\Downloads\\tracks_full_iTunes_Store_2026-03-20.json",
  ],
  youtube_music: [
    "/data/tracks_full_YouTube_Music_2026-03-20.json",
    "C:\\Users\\Admin\\Downloads\\tracks_full_YouTube_Music_2026-03-20.json",
  ],
  vk_ok_boom: [
    "/data/tracks_full_VK_OK_BOOM_2026-03-20.json",
    "C:\\Users\\Admin\\Downloads\\tracks_full_VK_OK_BOOM_2026-03-20.json",
  ],
  spotify: [
    "/data/tracks_full_Spotify_2026-03-20.json",
    "C:\\Users\\Admin\\Downloads\\tracks_full_Spotify_2026-03-20.json",
  ],
  shazam: [
    "/data/tracks_full_Shazam_2026-03-20.json",
    "C:\\Users\\Admin\\Downloads\\tracks_full_Shazam_2026-03-20.json",
  ],
  apple_music: [
    "/data/tracks_full_Apple_Music_2026-03-20.json",
    "C:\\Users\\Admin\\Downloads\\tracks_full_Apple_Music_2026-03-20.json",
  ],
  pandora: [],
  amazon: [],
}

async function importLatestFromDiskIfPossible(platformKey: MusicPlatformKey): Promise<MusicStatsResponse | null> {
  const candidates = DEFAULT_PLATFORM_STATS_FILE_PATHS[platformKey] ?? []

  for (const candidate of candidates) {
    try {
      await access(candidate)
      const rawText = await readFile(candidate, "utf8")
      const imported = await importMusicStatsRawTextToDb({
        rawText,
        fileName: candidate.split(/[/\\]/).pop() ?? candidate,
        platformKey,
      })
      return imported
    } catch {
      // continue
    }
  }

  return null
}

export async function GET(request: NextRequest) {
  const token = getAdminToken(request)
  if (!verifySession(token)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const url = new URL(request.url)
  const artist = url.searchParams.get("artist")?.trim()
  const artistTerm = artist && artist.length > 0 ? artist : undefined
  const albumIdRaw = url.searchParams.get("albumId")?.trim()
  const trackIdRaw = url.searchParams.get("trackId")?.trim()
  const albumId = albumIdRaw && albumIdRaw.length > 0 ? albumIdRaw : undefined
  const trackId = trackIdRaw && trackIdRaw.length > 0 ? trackIdRaw : undefined

  const platformKey = getPlatformKeyFromRequest(request)
  if (!platformKey) {
    return NextResponse.json({ error: "platform param is required" }, { status: 400 })
  }

  let stats = getMusicStatsByPlatformKeyWithArtist(platformKey, artistTerm, { albumId, trackId })

  // Авто-импорт с диска имеет смысл только для "без фильтров", иначе мы не сможем отличить:
  // "в базе нет данных" от "данные есть, но нет матчей по артисту".
  if (!artistTerm && !albumId && !trackId && stats.daysCount === 0 && stats.topTracks.length === 0) {
    const importedFromDisk = await importLatestFromDiskIfPossible(platformKey)
    if (importedFromDisk) stats = importedFromDisk
  }

  // Если после попытки импорта всё равно пусто, возвращаем пустую структуру.
  if (stats.daysCount === 0 && stats.topTracks.length === 0) {
    const platformLabel = MUSIC_PLATFORM_LABELS[platformKey]
    const empty: MusicStatsResponse = {
      source: null,
      platformKey,
      platformLabel,
      exportedAt: null,
      totalRows: 0,
      totalTracksInFile: 0,
      totalPlays: 0,
      daysCount: 0,
      dailyStats: [],
      topTracks: [],
      countryStatsByDate: [],
    }
    return NextResponse.json(empty)
  }

  return NextResponse.json(stats)
}

export async function POST(request: NextRequest) {
  const token = getAdminToken(request)
  if (!verifySession(token)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const platformKey = getPlatformKeyFromRequest(request)
  if (!platformKey) {
    return NextResponse.json({ error: "platform param is required" }, { status: 400 })
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
      const imported = await importMusicStatsRawTextToDb({
        rawText,
        fileName: file.originalFilename,
        platformKey,
      })

      return NextResponse.json(imported)
    } finally {
      await multipart.cleanup()
    }
  } catch (error) {
    if (error instanceof MultipartRequestError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error("Error importing music stats:", error)
    const message = error instanceof Error ? error.message : "Неизвестная ошибка"
    return NextResponse.json({ error: `Не удалось импортировать файл: ${message}` }, { status: 500 })
  }
}

