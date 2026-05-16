import { NextRequest, NextResponse } from "next/server"
import { getAdminToken, verifySession } from "@/lib/auth"
import { getAllTracks } from "@/lib/tracks"
import { getAllAlbums } from "@/lib/albums"
import { listUploadDrafts } from "@/lib/upload-drafts"

export async function GET(request: NextRequest) {
  const token = getAdminToken(request)
  if (!verifySession(token)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const tracks = await getAllTracks()
    const albums = await getAllAlbums()
    const sorted = [...tracks].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
    const allDrafts = await listUploadDrafts({ limit: 500 })
    const adminDraftStatuses = new Set([
      "collecting",
      "awaiting_payment",
      "paid",
      "expired",
      "cancelled",
    ])
    const uploadDrafts = allDrafts.filter((d) => adminDraftStatuses.has(d.status))
    return NextResponse.json({ tracks: sorted, albums, uploadDrafts })
  } catch (error) {
    console.error("Error fetching admin tracks:", error)
    return NextResponse.json(
      { error: "Не удалось загрузить треки" },
      { status: 500 }
    )
  }
}
