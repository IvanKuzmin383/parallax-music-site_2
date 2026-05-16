import { NextRequest, NextResponse } from "next/server"
import { getAdminToken, verifySession } from "@/lib/auth"
import {
  ADMIN_TOP_TRACKS_PAGE_SIZE,
  getAdminMusicStatsTopTracksPage,
  MUSIC_PLATFORM_LABELS,
  type MusicPlatformKey,
} from "@/lib/music-stats"

export async function GET(request: NextRequest) {
  const token = getAdminToken(request)
  if (!verifySession(token)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const url = new URL(request.url)
  const platformsRaw = url.searchParams.get("platforms")?.trim()
  if (!platformsRaw) {
    return NextResponse.json({ error: "platforms param is required" }, { status: 400 })
  }

  const platformKeys = platformsRaw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean) as MusicPlatformKey[]

  const invalid = platformKeys.filter((k) => !(k in MUSIC_PLATFORM_LABELS))
  if (invalid.length) {
    return NextResponse.json({ error: "Invalid platform key" }, { status: 400 })
  }
  if (platformKeys.length === 0) {
    return NextResponse.json({ error: "platforms param is required" }, { status: 400 })
  }

  const offsetRaw = url.searchParams.get("offset")
  const limitRaw = url.searchParams.get("limit")
  const offset = offsetRaw != null && Number.isFinite(Number(offsetRaw)) ? Math.max(0, Math.floor(Number(offsetRaw))) : 0
  const limit =
    limitRaw != null && Number.isFinite(Number(limitRaw)) ? Math.floor(Number(limitRaw)) : ADMIN_TOP_TRACKS_PAGE_SIZE

  const artist = url.searchParams.get("artist")?.trim() || undefined
  const albumId = url.searchParams.get("albumId")?.trim() || undefined
  const trackId = url.searchParams.get("trackId")?.trim() || undefined

  const page = getAdminMusicStatsTopTracksPage({
    platformKeys,
    artist,
    filters: { albumId, trackId },
    offset,
    limit,
  })

  return NextResponse.json(page)
}
