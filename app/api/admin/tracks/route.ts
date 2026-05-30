import { NextRequest, NextResponse } from "next/server"
import { getAdminToken, verifySession } from "@/lib/auth"
import {
  ADMIN_TRACKS_DEFAULT_LIMIT,
  ADMIN_TRACKS_MAX_LIMIT,
  listTrackMetaForAdmin,
  listTracksForAdmin,
  type AdminTracksListQuery,
  type AdminTracksSortDirection,
  type AdminTracksSortField,
} from "@/lib/admin-tracks-query"
import { getAllAlbums } from "@/lib/albums"
import { listUploadDrafts } from "@/lib/upload-drafts"
import type { TrackStatus } from "@/lib/tracks"

const ADMIN_DRAFT_STATUSES = new Set([
  "collecting",
  "awaiting_payment",
  "paid",
  "expired",
  "cancelled",
])

const TRACK_STATUSES = new Set<string>([
  "upload_pending",
  "on_moderation",
  "sent_to_platforms",
  "approved_by_platforms",
  "released",
  "rejected",
  "postponed",
])

function parseStatus(value: string | null): TrackStatus | "all" | undefined {
  if (!value || value === "all") return "all"
  return TRACK_STATUSES.has(value) ? (value as TrackStatus) : undefined
}

function parseSortField(value: string | null): AdminTracksSortField | undefined {
  if (value === "createdAt" || value === "releaseDate") return value
  return undefined
}

function parseSortDirection(value: string | null): AdminTracksSortDirection | undefined {
  if (value === "asc" || value === "desc") return value
  return undefined
}

function parseLimit(value: string | null): number | undefined {
  if (!value) return undefined
  const n = Number(value)
  if (!Number.isFinite(n) || n < 1) return undefined
  return Math.min(Math.floor(n), ADMIN_TRACKS_MAX_LIMIT)
}

function parseOffset(value: string | null): number | undefined {
  if (!value) return undefined
  const n = Number(value)
  if (!Number.isFinite(n) || n < 0) return undefined
  return Math.floor(n)
}

function buildListQuery(searchParams: URLSearchParams): AdminTracksListQuery {
  const status = parseStatus(searchParams.get("status"))
  return {
    userId: searchParams.get("userId")?.trim() || undefined,
    status: status ?? "all",
    releaseDateFrom: searchParams.get("releaseDateFrom")?.trim() || undefined,
    releaseDateTo: searchParams.get("releaseDateTo")?.trim() || undefined,
    sortField: parseSortField(searchParams.get("sortField")),
    sortDirection: parseSortDirection(searchParams.get("sortDirection")),
    limit: parseLimit(searchParams.get("limit")),
    offset: parseOffset(searchParams.get("offset")),
  }
}

export async function GET(request: NextRequest) {
  const token = getAdminToken(request)
  if (!verifySession(token)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)

  try {
    if (searchParams.get("meta") === "1") {
      return NextResponse.json({ tracks: listTrackMetaForAdmin() })
    }

    const listQuery = buildListQuery(searchParams)
    const tracksPage = listTracksForAdmin({
      ...listQuery,
      limit: listQuery.limit ?? ADMIN_TRACKS_DEFAULT_LIMIT,
    })

    const albums = await getAllAlbums()
    const draftUserId = listQuery.userId
    const allDrafts = await listUploadDrafts({
      userId: draftUserId,
      limit: draftUserId ? 200 : 500,
    })
    const uploadDrafts = allDrafts.filter((d) => ADMIN_DRAFT_STATUSES.has(d.status))

    return NextResponse.json({
      tracks: tracksPage.tracks,
      total: tracksPage.total,
      totalInDatabase: tracksPage.totalInDatabase,
      limit: tracksPage.limit,
      offset: tracksPage.offset,
      hasMore: tracksPage.hasMore,
      albums,
      uploadDrafts,
    })
  } catch (error) {
    console.error("Error fetching admin tracks:", error)
    return NextResponse.json(
      { error: "Не удалось загрузить треки" },
      { status: 500 }
    )
  }
}
