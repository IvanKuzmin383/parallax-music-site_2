import { promises as fs } from "fs"
import path from "path"
import { NextRequest, NextResponse } from "next/server"
import { getCabinetToken, getCabinetSession } from "@/lib/cabinet-auth"
import { getReleaseById } from "@/lib/releases"
import { getTrackById } from "@/lib/tracks"

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; trackId: string }> }
) {
  const token = getCabinetToken(_request)
  const session = getCabinetSession(token)
  if (!session) return NextResponse.json({ error: "Необходима авторизация" }, { status: 401 })

  const { id: releaseId, trackId } = await params
  const release = await getReleaseById(releaseId)
  if (!release || release.userId.toLowerCase() !== session.email.toLowerCase()) {
    return NextResponse.json({ error: "Релиз не найден" }, { status: 404 })
  }

  const track = await getTrackById(trackId)
  if (!track || track.releaseId !== releaseId) {
    return NextResponse.json({ error: "Трек не найден" }, { status: 404 })
  }

  try {
    const data = await fs.readFile(track.audioPath)
    return new NextResponse(data, {
      headers: {
        "Content-Type": "audio/wav",
        "Content-Disposition": `inline; filename="${path.basename(track.audioPath)}"`,
      },
    })
  } catch {
    return NextResponse.json({ error: "Файл не найден" }, { status: 404 })
  }
}
