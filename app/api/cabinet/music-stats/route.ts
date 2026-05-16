import { NextRequest, NextResponse } from "next/server"
import { getCabinetToken, getCabinetSession } from "@/lib/cabinet-auth"
import { getCabinetUserByEmail } from "@/lib/cabinet-users"
import { getMusicStatsForCabinetUser, MUSIC_PLATFORM_LABELS, type MusicPlatformKey } from "@/lib/music-stats"

function getPlatformKeyFromRequest(request: NextRequest): MusicPlatformKey | null {
  const url = new URL(request.url)
  const platform = url.searchParams.get("platform")
  if (!platform) return null

  const candidate = platform.trim() as MusicPlatformKey
  if (candidate in MUSIC_PLATFORM_LABELS) return candidate
  return null
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

  const url = new URL(request.url)
  const albumIdRaw = url.searchParams.get("albumId")?.trim()
  const albumId = albumIdRaw && albumIdRaw.length > 0 ? albumIdRaw : undefined
  const trackIds = url.searchParams
    .getAll("trackId")
    .map((s) => s.trim())
    .filter((s) => s.length > 0)

  const platformKey = getPlatformKeyFromRequest(request)
  if (!platformKey) {
    return NextResponse.json({ error: "Укажите параметр platform" }, { status: 400 })
  }

  const stats = getMusicStatsForCabinetUser(platformKey, user.email, {
    albumId,
    trackIds: trackIds.length > 0 ? trackIds : undefined,
  })
  return NextResponse.json(stats)
}
