import { NextRequest, NextResponse } from "next/server"
import { getReleasedSmartlinkRelease, SMARTLINK_SLUG_REGEX, smartlinkOgImagePath } from "@/lib/smartlink"

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params

  if (!SMARTLINK_SLUG_REGEX.test(slug)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const release = await getReleasedSmartlinkRelease(slug)
  if (!release) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://parallaxmusic.ru"
  const coverUrl = `${baseUrl}${smartlinkOgImagePath(slug)}`

  return NextResponse.json({
    kind: release.kind,
    title: release.title,
    trackName: release.title,
    artistName: release.artistName,
    links: release.platformLinks ?? {},
    coverUrl,
  })
}
