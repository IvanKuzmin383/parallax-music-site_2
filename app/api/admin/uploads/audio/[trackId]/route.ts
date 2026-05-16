import { NextRequest, NextResponse } from "next/server"
import { getAdminToken, verifySession } from "@/lib/auth"
import { getTrackById } from "@/lib/tracks"
import { createReadStream } from "node:fs"
import { stat } from "node:fs/promises"
import { Readable } from "node:stream"
import path from "path"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ trackId: string }> }
) {
  const token = getAdminToken(request)
  if (!verifySession(token)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { trackId } = await params
  const track = await getTrackById(trackId)
  if (!track) {
    return NextResponse.json({ error: "Трек не найден" }, { status: 404 })
  }

  try {
    const info = await stat(track.audioPath)
    const stream = createReadStream(track.audioPath)
    const body = Readable.toWeb(stream) as ReadableStream
    const ext = path.extname(track.audioPath).toLowerCase()
    const contentType =
      ext === ".mp3"
        ? "audio/mpeg"
        : ext === ".wav"
          ? "audio/wav"
          : ext === ".m4a"
            ? "audio/mp4"
            : ext === ".ogg"
              ? "audio/ogg"
              : "audio/mpeg"

    return new NextResponse(body, {
      headers: {
        "Content-Type": contentType,
        "Content-Length": String(info.size),
      },
    })
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return NextResponse.json({ error: "Файл трека не найден" }, { status: 404 })
    }
    console.error("Error serving admin audio:", error)
    return NextResponse.json(
      { error: "Не удалось загрузить трек" },
      { status: 500 }
    )
  }
}
