import { NextRequest, NextResponse } from "next/server"
import { getPublicSmartlink, SMARTLINK_SLUG_REGEX, smartlinkOgImagePath } from "@/lib/smartlink"
import { getSmartlinkPublicOrigin, smartlinkPublicUrl } from "@/lib/smartlink-public-origin"

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

  const coverUrl = `${getSmartlinkPublicOrigin()}${smartlinkOgImagePath(slug)}`

  return NextResponse.json({
    trackName: pub.title,
    artistName: pub.artistName,
    links: pub.platformLinks ?? {},
    coverUrl,
    publicUrl: smartlinkPublicUrl(slug),
    theme: pub.theme ?? null,
    source: pub.source,
  })
}
