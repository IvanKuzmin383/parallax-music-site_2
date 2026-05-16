import { NextRequest, NextResponse } from "next/server"
import { getAdminToken, verifySession } from "@/lib/auth"
import { getTrackById } from "@/lib/tracks"
import { getPaidBundleAddonItemsForTrack } from "@/lib/track-ordered-upload-addons"

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = getAdminToken(_request)
  if (!verifySession(token)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params
  const track = await getTrackById(id)
  if (!track) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const bundleItems = getPaidBundleAddonItemsForTrack(track)
  return NextResponse.json({ bundleItems })
}
