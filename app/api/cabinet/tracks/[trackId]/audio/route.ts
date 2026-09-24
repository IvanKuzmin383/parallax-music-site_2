import { createReadStream } from "node:fs"
import { stat } from "node:fs/promises"
import path from "node:path"
import { Readable } from "node:stream"
import { NextRequest, NextResponse } from "next/server"
import { getCabinetToken, getCabinetSession } from "@/lib/cabinet-auth"
import { getTrackById } from "@/lib/tracks"

function parseByteRange(
  rangeHeader: string | null,
  size: number
): { start: number; end: number } | null {
  if (!rangeHeader || !rangeHeader.startsWith("bytes=") || size <= 0) return null
  const [rawStart, rawEnd] = rangeHeader.replace(/bytes=/, "").split("-", 2)
  let start = rawStart ? Number(rawStart) : NaN
  let end = rawEnd ? Number(rawEnd) : NaN
  if (!Number.isFinite(start)) {
    if (!Number.isFinite(end)) return null
    start = Math.max(0, size - end)
    end = size - 1
  } else if (!Number.isFinite(end)) {
    end = size - 1
  }
  if (start < 0 || end < start || start >= size) return null
  end = Math.min(end, size - 1)
  return { start, end }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ trackId: string }> }
) {
  const token = getCabinetToken(request)
  const session = getCabinetSession(token)
  if (!session) return NextResponse.json({ error: "Необходима авторизация" }, { status: 401 })

  const { trackId } = await params
  const track = await getTrackById(trackId)
  if (!track || track.userId.toLowerCase() !== session.email.toLowerCase()) {
    return NextResponse.json({ error: "Трек не найден" }, { status: 404 })
  }

  try {
    const info = await stat(track.audioPath)
    const size = info.size
    const range = parseByteRange(request.headers.get("range"), size)
    const commonHeaders: Record<string, string> = {
      "Content-Type": "audio/wav",
      "Accept-Ranges": "bytes",
      "Cache-Control": "private, no-store",
      "Content-Disposition": `inline; filename="${path.basename(track.audioPath)}"`,
    }

    if (range) {
      const { start, end } = range
      const chunkSize = end - start + 1
      const stream = createReadStream(track.audioPath, { start, end })
      const body = Readable.toWeb(stream) as ReadableStream
      return new NextResponse(body, {
        status: 206,
        headers: {
          ...commonHeaders,
          "Content-Length": String(chunkSize),
          "Content-Range": `bytes ${start}-${end}/${size}`,
        },
      })
    }

    const stream = createReadStream(track.audioPath)
    const body = Readable.toWeb(stream) as ReadableStream
    return new NextResponse(body, {
      status: 200,
      headers: {
        ...commonHeaders,
        "Content-Length": String(size),
      },
    })
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      return NextResponse.json({ error: "Файл не найден" }, { status: 404 })
    }
    console.error("[tracks/audio GET]", err)
    return NextResponse.json({ error: "Не удалось отдать аудио" }, { status: 500 })
  }
}
