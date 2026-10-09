import { NextRequest, NextResponse } from "next/server"
import { getAdminToken, verifySession } from "@/lib/auth"
import { listAllVideoClips, updateVideoClip, type VideoClipStatus } from "@/lib/video-clips"

function requireAdmin(request: NextRequest) {
  return verifySession(getAdminToken(request))
}

export async function GET(request: NextRequest) {
  if (!requireAdmin(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const url = new URL(request.url)
  const result = await listAllVideoClips({
    userId: url.searchParams.get("userId"),
    status: url.searchParams.get("status"),
    limit: Number(url.searchParams.get("limit") || 50),
    offset: Number(url.searchParams.get("offset") || 0),
  })
  return NextResponse.json(result)
}

export async function PATCH(request: NextRequest) {
  if (!requireAdmin(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const body = (await request.json()) as {
    id?: string
    status?: VideoClipStatus
    title?: string
    artist?: string
    platforms?: string[]
    releaseDate?: string | null
  }
  if (!body.id?.trim()) {
    return NextResponse.json({ error: "Укажите id" }, { status: 400 })
  }
  const clip = await updateVideoClip(body.id.trim(), {
    status: body.status,
    title: body.title,
    artist: body.artist,
    platforms: body.platforms,
    releaseDate: body.releaseDate,
  })
  if (!clip) {
    return NextResponse.json({ error: "Не найдено" }, { status: 404 })
  }
  return NextResponse.json({ clip })
}
