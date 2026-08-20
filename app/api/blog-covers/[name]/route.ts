import { NextRequest, NextResponse } from "next/server"
import { createReadStream } from "node:fs"
import { stat } from "fs/promises"
import { Readable } from "node:stream"
import path from "path"
import {
  getBlogCoversDir,
  resolveBlogCoverAbsolutePath,
} from "@/lib/blog-covers"

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  const { name } = await params
  const coversDir = await getBlogCoversDir()
  const absPath = resolveBlogCoverAbsolutePath(name, coversDir)
  if (!absPath) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  try {
    const info = await stat(absPath)
    if (!info.isFile()) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }
    const stream = createReadStream(absPath)
    const body = Readable.toWeb(stream) as ReadableStream
    const ext = path.extname(absPath).toLowerCase()
    const contentType =
      ext === ".png" ? "image/png" : ext === ".jpg" || ext === ".jpeg" ? "image/jpeg" : "application/octet-stream"

    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Length": String(info.size),
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    })
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }
    console.error("[blog-covers] serve error:", error)
    return NextResponse.json({ error: "Failed to read cover" }, { status: 500 })
  }
}
