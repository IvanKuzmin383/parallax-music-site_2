import { NextRequest, NextResponse } from "next/server"
import { getTrackBySmartlinkSlug } from "@/lib/tracks"
import { readFile } from "fs/promises"
import path from "path"

const SLUG_REGEX = /^[a-zA-Z0-9_-]{6,20}$/

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params

  if (!SLUG_REGEX.test(slug)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const track = await getTrackBySmartlinkSlug(slug)
  if (!track || track.status !== "released") {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  try {
    const fileBuffer = await readFile(track.coverPath)
    const ext = path.extname(track.coverPath).toLowerCase()
    const contentType =
      ext === ".png" ? "image/png" : ext === ".jpg" || ext === ".jpeg" ? "image/jpeg" : "image/jpeg"

    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": contentType,
      },
    })
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }
    console.error("Error serving smartlink cover:", error)
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }
}
