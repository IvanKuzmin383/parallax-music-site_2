import { NextRequest, NextResponse } from "next/server"
import { getCabinetToken, getCabinetSession } from "@/lib/cabinet-auth"
import { getCabinetUserByEmail } from "@/lib/cabinet-users"
import {
  CABINET_MUSIC_STATS_COMPARE_MAX_TRACKS,
  getMusicStatsBatchForCabinetUser,
  parseMusicPlatformKeysList,
} from "@/lib/cabinet-music-stats-batch"
import { MUSIC_PLATFORM_LABELS, type MusicPlatformKey } from "@/lib/music-platform"

const ALL_PLATFORM_KEYS = Object.keys(MUSIC_PLATFORM_LABELS) as MusicPlatformKey[]

function parseIdList(searchParams: URLSearchParams, key: string): string[] {
  return searchParams
    .getAll(key)
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
}

export async function GET(request: NextRequest) {
  const token = getCabinetToken(request)
  const session = getCabinetSession(token)
  if (!session) {
    return NextResponse.json({ error: "Необходима авторизация" }, { status: 401 })
  }

  const user = await getCabinetUserByEmail(session.email)
  if (!user) {
    return NextResponse.json({ error: "Пользователь не найден" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const platformsParam = searchParams.get("platforms")
  let platformKeys = parseMusicPlatformKeysList(platformsParam)
  if (platformKeys.length === 0) {
    platformKeys = ALL_PLATFORM_KEYS
  }

  const chartTrackIds = parseIdList(searchParams, "trackId")
  const compareTrackIdsRaw = parseIdList(searchParams, "compareTrackId")
  const compareTrackIds = compareTrackIdsRaw.slice(0, CABINET_MUSIC_STATS_COMPARE_MAX_TRACKS)

  if (compareTrackIdsRaw.length > CABINET_MUSIC_STATS_COMPARE_MAX_TRACKS) {
    return NextResponse.json(
      {
        error: `Не более ${CABINET_MUSIC_STATS_COMPARE_MAX_TRACKS} треков для сравнения`,
      },
      { status: 400 },
    )
  }

  try {
    const started = Date.now()
    const result = getMusicStatsBatchForCabinetUser(user.email, {
      platformKeys,
      chartTrackIds: chartTrackIds.length > 0 ? chartTrackIds : null,
      compareTrackIds,
    })
    const durationMs = Date.now() - started

    return NextResponse.json({
      ...result,
      meta: {
        platformCount: platformKeys.length,
        compareTrackCount: compareTrackIds.length,
        durationMs,
        compareMaxTracks: CABINET_MUSIC_STATS_COMPARE_MAX_TRACKS,
      },
    })
  } catch (error) {
    console.error("[cabinet/music-stats/batch] error", error)
    return NextResponse.json({ error: "Не удалось загрузить статистику" }, { status: 500 })
  }
}
