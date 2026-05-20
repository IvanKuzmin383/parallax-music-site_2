import { NextRequest, NextResponse } from "next/server"
import { getReleasedSmartlinkTrack, SMARTLINK_SLUG_REGEX, smartlinkOgImagePath } from "@/lib/smartlink"

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params

  if (!SMARTLINK_SLUG_REGEX.test(slug)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const track = await getReleasedSmartlinkTrack(slug)
  if (!track) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://parallaxmusic.ru"
  const coverUrl = `${baseUrl}${smartlinkOgImagePath(slug)}`

  return NextResponse.json({
    trackName: track.trackName,
    artistName: track.artistName,
    links: track.platformLinks ?? {},
    coverUrl,
  })
}
