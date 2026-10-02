import { NextRequest, NextResponse } from "next/server"
import { getAdminToken, verifySession } from "@/lib/auth"
import { getReleaseById } from "@/lib/releases"
import {
  getReleaseEntityVersionById,
  listReleaseEntityVersions,
  RELEASE_ENTITY_VERSION_REASON_LABELS,
} from "@/lib/release-entity-versions"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = getAdminToken(request)
  if (!verifySession(token)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id: releaseId } = await params
  const release = await getReleaseById(releaseId)
  if (!release) {
    return NextResponse.json({ error: "Релиз не найден" }, { status: 404 })
  }

  const versionId = request.nextUrl.searchParams.get("versionId")
  if (versionId) {
    const version = await getReleaseEntityVersionById(versionId)
    if (!version || version.releaseId !== releaseId) {
      return NextResponse.json({ error: "Версия не найдена" }, { status: 404 })
    }
    return NextResponse.json({
      version: {
        ...version,
        reasonLabel:
          RELEASE_ENTITY_VERSION_REASON_LABELS[version.reason] ?? version.reason,
      },
    })
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
      // Краткий превью без полного snapshot (экономия трафика).
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

function pathBasename(p: string): string {
  const parts = p.replace(/\\/g, "/").split("/")
  return parts[parts.length - 1] || p
}
