import { createReadStream } from "node:fs"
import { Readable } from "node:stream"
import { NextResponse } from "next/server"

export type FileRangeResponseOptions = {
  contentType: string
  fileSize: number
  absPath: string
  rangeHeader: string | null
  /** e.g. `inline; filename*=UTF-8''...` or omit */
  contentDisposition?: string
  cacheControl?: string
}

function parseBytesRange(
  rangeHeader: string,
  fileSize: number
): { start: number; end: number } | null {
  const match = /^bytes=(\d*)-(\d*)$/i.exec(rangeHeader.trim())
  if (!match) return null

  const startRaw = match[1]
  const endRaw = match[2]
  if (!startRaw && !endRaw) return null

  let start: number
  let end: number

  if (!startRaw) {
    // suffix: bytes=-N
    const suffix = Number(endRaw)
    if (!Number.isFinite(suffix) || suffix <= 0) return null
    start = Math.max(0, fileSize - suffix)
    end = fileSize - 1
  } else {
    start = Number(startRaw)
    end = endRaw ? Number(endRaw) : fileSize - 1
    if (!Number.isFinite(start) || !Number.isFinite(end)) return null
    if (start < 0 || end < start) return null
    end = Math.min(end, fileSize - 1)
  }

  if (start >= fileSize) return null
  return { start, end }
}

/** Serve a local file with optional HTTP Range (for HTML5 audio seek). */
export function createFileRangeResponse(opts: FileRangeResponseOptions): NextResponse {
  const {
    contentType,
    fileSize,
    absPath,
    rangeHeader,
    contentDisposition,
    cacheControl = "private, no-store",
  } = opts

  const baseHeaders: Record<string, string> = {
    "Content-Type": contentType,
    "Accept-Ranges": "bytes",
    "Cache-Control": cacheControl,
  }
  if (contentDisposition) {
    baseHeaders["Content-Disposition"] = contentDisposition
  }

  if (rangeHeader) {
    const range = parseBytesRange(rangeHeader, fileSize)
    if (!range) {
      return new NextResponse(null, {
        status: 416,
        headers: {
          ...baseHeaders,
          "Content-Range": `bytes */${fileSize}`,
        },
      })
    }

    const { start, end } = range
    const chunkSize = end - start + 1
    const stream = createReadStream(absPath, { start, end })
    const body = Readable.toWeb(stream) as ReadableStream

    return new NextResponse(body, {
      status: 206,
      headers: {
        ...baseHeaders,
        "Content-Length": String(chunkSize),
        "Content-Range": `bytes ${start}-${end}/${fileSize}`,
      },
    })
  }

  const stream = createReadStream(absPath)
  const body = Readable.toWeb(stream) as ReadableStream
  return new NextResponse(body, {
    status: 200,
    headers: {
      ...baseHeaders,
      "Content-Length": String(fileSize),
    },
  })
}
