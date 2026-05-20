import { NextRequest, NextResponse } from "next/server"
import {
  renderSmartlinkOgCoverBuffer,
  SMARTLINK_COVER_CACHE_CONTROL,
} from "@/lib/smartlink-cover"
import { SMARTLINK_SLUG_REGEX } from "@/lib/smartlink"

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params

  if (!SMARTLINK_SLUG_REGEX.test(slug)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const buffer = await renderSmartlinkOgCoverBuffer(slug)
  if (!buffer) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "image/jpeg",
      "Content-Length": String(buffer.byteLength),
      "Cache-Control": SMARTLINK_COVER_CACHE_CONTROL,
    },
  })
}
