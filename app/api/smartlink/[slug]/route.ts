import { NextRequest, NextResponse } from "next/server"
import { getPublicSmartlink, SMARTLINK_SLUG_REGEX, smartlinkOgImagePath } from "@/lib/smartlink"

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params

  if (!SMARTLINK_SLUG_REGEX.test(slug)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const pub = await getPublicSmartlink(slug)
  if (!pub) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://parallaxmusic.ru"
  const coverUrl = `${baseUrl}${smartlinkOgImagePath(slug)}`

  return NextResponse.json({
    trackName: pub.title,
    artistName: pub.artistName,
    links: pub.platformLinks ?? {},
    coverUrl,
    theme: pub.theme ?? null,
    source: pub.source,
  })
}
