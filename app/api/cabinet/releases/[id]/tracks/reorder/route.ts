import { NextRequest, NextResponse } from "next/server"
import { getCabinetToken, getCabinetSession } from "@/lib/cabinet-auth"
import { getReleaseById } from "@/lib/releases"
import { reorderReleaseTracks } from "@/lib/tracks"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = getCabinetToken(request)
  const session = getCabinetSession(token)
  if (!session) return NextResponse.json({ error: "Необходима авторизация" }, { status: 401 })

  const { id: releaseId } = await params
  const release = await getReleaseById(releaseId)
  if (!release || release.userId.toLowerCase() !== session.email.toLowerCase()) {
    return NextResponse.json({ error: "Релиз не найден" }, { status: 404 })
  }

  if (release.kind !== "album") {
    return NextResponse.json({ error: "Порядок треков доступен только для альбомов" }, { status: 400 })
  }

  const body = (await request.json()) as { trackIds?: string[] }
  if (!Array.isArray(body.trackIds) || body.trackIds.length === 0) {
    return NextResponse.json({ error: "trackIds обязателен" }, { status: 400 })
  }

  const tracks = await reorderReleaseTracks(releaseId, body.trackIds)
  return NextResponse.json({ tracks })
}
