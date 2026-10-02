import { NextRequest, NextResponse } from "next/server"
import { getAdminToken, verifySession } from "@/lib/auth"
import { getTrackById } from "@/lib/tracks"
import { resolveReleaseIdForTrack } from "@/lib/admin-release-moderation"
import {
  listReleaseEntityVersions,
  RELEASE_ENTITY_VERSION_REASON_LABELS,
} from "@/lib/release-entity-versions"

function pathBasename(p: string): string {
  const parts = p.replace(/\\/g, "/").split("/")
  return parts[parts.length - 1] || p
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = getAdminToken(request)
  if (!verifySession(token)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params
  const track = await getTrackById(id)
  if (!track) {
    return NextResponse.json({ error: "Трек не найден" }, { status: 404 })
  }

  const releaseId = await resolveReleaseIdForTrack(track)
  if (!releaseId) {
    return NextResponse.json({ releaseId: null, versions: [] })
  }

  const versions = await listReleaseEntityVersions(releaseId)
  return NextResponse.json({
    releaseId,
    versions: versions.map((v) => ({
      id: v.id,
      releaseId: v.releaseId,
      versionNo: v.versionNo,
      reason: v.reason,
      reasonLabel: RELEASE_ENTITY_VERSION_REASON_LABELS[v.reason] ?? v.reason,
      actor: v.actor,
      note: v.note,
      createdAt: v.createdAt,
      preview: {
        title: v.snapshot.release?.title ?? "",
        artistName: v.snapshot.release?.artistName ?? "",
        status: v.snapshot.release?.status ?? "",
        releaseDate: v.snapshot.release?.releaseDate ?? null,
        trackCount: v.snapshot.tracks?.length ?? 0,
        tracks: (v.snapshot.tracks ?? []).map((t) => ({
          id: t.id,
          trackName: t.trackName,
          trackVersion: t.trackVersion,
          status: t.status,
          isrc: t.isrc ?? null,
          upc: t.upc ?? null,
          audioPath: t.audioPath ? pathBasename(t.audioPath) : "",
          coverPath: t.coverPath ? pathBasename(t.coverPath) : "",
        })),
        coverPath: v.snapshot.release?.coverPath
          ? pathBasename(v.snapshot.release.coverPath)
          : "",
        upc: v.snapshot.release?.upc ?? null,
      },
    })),
  })
}
