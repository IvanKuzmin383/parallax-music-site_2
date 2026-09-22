import { NextRequest, NextResponse } from "next/server"
import { getAdminToken, verifySession } from "@/lib/auth"
import { rebuildAllCabinetMusicTrackMaps } from "@/lib/music-stats"

export async function POST(request: NextRequest) {
  const token = getAdminToken(request)
  if (!verifySession(token)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const result = await rebuildAllCabinetMusicTrackMaps()
    return NextResponse.json({ ok: true, ...result })
  } catch (error) {
    console.error("[admin/music-stats/track-map/rebuild] POST", error)
    return NextResponse.json({ error: "Не удалось пересобрать map" }, { status: 500 })
  }
}
