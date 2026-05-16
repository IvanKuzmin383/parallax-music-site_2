import { stat } from "node:fs/promises"
import path from "node:path"
import { NextRequest, NextResponse } from "next/server"
import {
  buildCoverDerivativeCachePath,
  readCoverDerivativeCache,
  writeCoverDerivativeCacheAtomically,
} from "@/lib/cover-derivative-cache"
import {
  cabinetCoverSharpSemaphore,
  ensureCabinetCoverSharpConfigured,
} from "@/lib/cover-sharp-config"
import { getCabinetToken, getCabinetSession } from "@/lib/cabinet-auth"
import { getTrackById } from "@/lib/tracks"
import sharp from "sharp"

ensureCabinetCoverSharpConfigured()

const DEFAULT_WIDTH = 384
const DEFAULT_QUALITY = 72
const MAX_WIDTH = 2048

function parsePositiveInt(value: string | null, fallback: number, max: number): number {
  const n = Number.parseInt(value ?? "", 10)
  if (!Number.isFinite(n) || n <= 0) return fallback
  return Math.min(n, max)
}

function parseFormat(value: string | null): "webp" | "jpeg" {
  const v = `${value ?? ""}`.toLowerCase()
  if (v === "jpeg" || v === "jpg") return "jpeg"
  return "webp"
}

async function renderCoverDerivative(
  coverPath: string,
  width: number,
  quality: number,
  format: "webp" | "jpeg"
): Promise<Buffer> {
  if (format === "webp") {
    return sharp(coverPath, { sequentialRead: true })
      .rotate()
      .resize({ width, fit: "inside", withoutEnlargement: true })
      .webp({ quality })
      .toBuffer()
  }
  return sharp(coverPath, { sequentialRead: true })
    .rotate()
    .resize({ width, fit: "inside", withoutEnlargement: true })
    .jpeg({ quality, mozjpeg: true })
    .toBuffer()
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ trackId: string }> }
) {
  const token = getCabinetToken(request)
  const session = getCabinetSession(token)
  if (!session) {
    return NextResponse.json({ error: "Необходима авторизация" }, { status: 401 })
  }

  const { trackId } = await params
  const track = await getTrackById(trackId)
  if (!track) {
    return NextResponse.json({ error: "Трек не найден" }, { status: 404 })
  }

  if (track.userId.toLowerCase() !== session.email.toLowerCase()) {
    return NextResponse.json({ error: "Нет доступа к этому треку" }, { status: 403 })
  }

  if (!track.coverPath.trim()) {
    return NextResponse.json({ error: "Обложка ещё не загружена" }, { status: 404 })
  }

  try {
    const width = parsePositiveInt(request.nextUrl.searchParams.get("w"), DEFAULT_WIDTH, MAX_WIDTH)
    const quality = parsePositiveInt(request.nextUrl.searchParams.get("q"), DEFAULT_QUALITY, 100)
    const format = parseFormat(request.nextUrl.searchParams.get("f"))
    const etag = `"${track.id}:${new Date(track.updatedAt).getTime()}:w${width}:q${quality}:f${format}"`
    const ifNoneMatch = request.headers.get("if-none-match")
    if (ifNoneMatch === etag) {
      return new NextResponse(null, {
        status: 304,
        headers: {
          ETag: etag,
          "Cache-Control": "private, max-age=86400, stale-while-revalidate=604800",
          Vary: "Cookie",
        },
      })
    }

    const srcStat = await stat(track.coverPath)
    const coversDir = path.dirname(track.coverPath)
    const cachePath = buildCoverDerivativeCachePath({
      coversDir,
      trackId,
      width,
      quality,
      format,
      sourceMtimeMs: srcStat.mtimeMs,
    })

    let resizedBuffer = await readCoverDerivativeCache(cachePath)
    if (!resizedBuffer) {
      resizedBuffer = await cabinetCoverSharpSemaphore.runExclusive(() =>
        renderCoverDerivative(track.coverPath, width, quality, format)
      )
      await writeCoverDerivativeCacheAtomically(cachePath, resizedBuffer)
    }

    const contentType = format === "webp" ? "image/webp" : "image/jpeg"

    return new NextResponse(new Uint8Array(resizedBuffer), {
      headers: {
        "Content-Type": contentType,
        "Content-Length": String(resizedBuffer.byteLength),
        ETag: etag,
        "Last-Modified": new Date(track.updatedAt).toUTCString(),
        "Cache-Control": "private, max-age=86400, stale-while-revalidate=604800",
        Vary: "Cookie",
      },
    })
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return NextResponse.json({ error: "Файл обложки не найден" }, { status: 404 })
    }
    console.error("Error serving cover:", error)
    return NextResponse.json(
      { error: "Не удалось загрузить обложку" },
      { status: 500 }
    )
  }
}
