import { createReadStream } from "node:fs"
import { stat } from "node:fs/promises"
import { Readable } from "node:stream"
import { NextRequest, NextResponse } from "next/server"
import {
  ensureSmartlinkPreviewMp3,
  SMARTLINK_PREVIEW_AUDIO_CACHE_CONTROL,
} from "@/lib/smartlink-preview-audio"
import { getReleasedSmartlinkTrack } from "@/lib/smartlink"
import { DEFAULT_SMARTLINK_THEME, parseSmartlinkTheme } from "@/lib/smartlink-theme"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function parseByteRange(
  rangeHeader: string | null,
  size: number,
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
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params
  const track = await getReleasedSmartlinkTrack(slug)
  if (!track?.audioPath?.trim()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const theme = parseSmartlinkTheme(track.smartlinkTheme ?? DEFAULT_SMARTLINK_THEME)
  if (!theme.previewAudioEnabled) {
    return NextResponse.json({ error: "Preview disabled" }, { status: 404 })
  }

  try {
    const filePath = await ensureSmartlinkPreviewMp3({
      trackId: track.id,
      sourceWavPath: track.audioPath,
      startSec: theme.previewAudioStartSec,
    })
    const { size } = await stat(filePath)
    const range = parseByteRange(request.headers.get("range"), size)
    const common: Record<string, string> = {
      "Content-Type": "audio/mpeg",
      "Accept-Ranges": "bytes",
      "Cache-Control": SMARTLINK_PREVIEW_AUDIO_CACHE_CONTROL,
      "X-Content-Type-Options": "nosniff",
    }

    if (range) {
      const { start, end } = range
      const chunkSize = end - start + 1
      const stream = createReadStream(filePath, { start, end })
      return new NextResponse(Readable.toWeb(stream) as ReadableStream, {
        status: 206,
        headers: {
          ...common,
          "Content-Length": String(chunkSize),
          "Content-Range": `bytes ${start}-${end}/${size}`,
        },
      })
    }

    const stream = createReadStream(filePath)
    return new NextResponse(Readable.toWeb(stream) as ReadableStream, {
      status: 200,
      headers: {
        ...common,
        "Content-Length": String(size),
      },
    })
  } catch (err) {
    console.error("[smartlink/audio]", slug, err)
    return NextResponse.json({ error: "Preview unavailable" }, { status: 503 })
  }
}
