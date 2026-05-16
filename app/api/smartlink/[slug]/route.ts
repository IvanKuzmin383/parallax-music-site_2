import { NextRequest, NextResponse } from "next/server"
import { getTrackBySmartlinkSlug } from "@/lib/tracks"

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

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://parallaxmusic.ru"
  const coverUrl = `${baseUrl}/api/smartlink/${slug}/cover`

  return NextResponse.json({
    trackName: track.trackName,
    artistName: track.artistName,
    links: track.platformLinks ?? {},
    coverUrl,
  })
}
