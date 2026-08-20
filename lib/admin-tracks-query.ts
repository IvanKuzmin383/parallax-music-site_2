import { query, queryOne } from "@/lib/database"
import { rowToTrack, type TrackRow } from "@/lib/tracks"
import {
  ADMIN_TRACKS_DEFAULT_LIMIT,
  ADMIN_TRACKS_MAX_LIMIT,
  type AdminArtistIndexItem,
  type AdminTrackMeta,
  type AdminTracksListQuery,
  type AdminTracksListResult,
  type AdminTracksSortDirection,
  type AdminTracksSortField,
  type AdminTracksStats,
} from "@/lib/admin-tracks-query-shared"
import type { TrackStatus } from "@/lib/tracks"

export {
  ADMIN_TRACKS_CLIENT_CAP,
  ADMIN_TRACKS_DEFAULT_LIMIT,
  ADMIN_TRACKS_MAX_LIMIT,
  type AdminArtistIndexItem,
  type AdminTrackMeta,
  type AdminTracksListQuery,
  type AdminTracksListResult,
  type AdminTracksSortDirection,
  type AdminTracksSortField,
  type AdminTracksStats,
} from "@/lib/admin-tracks-query-shared"

const ALL_TRACK_STATUSES: TrackStatus[] = [
  "draft",
  "upload_pending",
  "on_moderation",
  "sent_to_platforms",
  "approved_by_platforms",
  "released",
  "rejected",
  "postponed",
]

const ADMIN_UPLOAD_DRAFT_STATUSES = [
  "collecting",
  "awaiting_payment",
  "paid",
  "expired",
  "cancelled",
] as const

/** Каноническое имя артиста для группировки (как в админке). */
export const ADMIN_ARTIST_EMPTY_LABEL = "Без имени артиста"

function todayIsoDate(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Moscow",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date())
}

function clampLimit(limit: number | undefined): number {
  const n = limit ?? ADMIN_TRACKS_DEFAULT_LIMIT
  if (!Number.isFinite(n) || n < 1) return ADMIN_TRACKS_DEFAULT_LIMIT
  return Math.min(Math.floor(n), ADMIN_TRACKS_MAX_LIMIT)
}

function normalizeArtistName(name: string | null | undefined): string {
  const trimmed = typeof name === "string" ? name.trim() : ""
  return trimmed || ADMIN_ARTIST_EMPTY_LABEL
}

function buildWhereClause(listQuery: AdminTracksListQuery): { sql: string; params: unknown[] } {
  const parts: string[] = []
  const params: unknown[] = []

  if (listQuery.userId?.trim()) {
    parts.push("LOWER(user_id) = LOWER(?)")
    params.push(listQuery.userId.trim())
  }

  if (listQuery.status && listQuery.status !== "all") {
    parts.push("status = ?")
    params.push(listQuery.status)
  }

  if (listQuery.releasesTodayOnly) {
    parts.push("release_date IS NOT NULL AND TRIM(release_date) != ''")
    parts.push("release_date::date = ?::date")
    params.push(todayIsoDate())
  } else if (listQuery.upcomingOnly) {
    parts.push("release_date IS NOT NULL AND TRIM(release_date) != ''")
    parts.push("release_date::date >= ?::date")
    params.push(todayIsoDate())
    parts.push("status NOT IN ('rejected', 'postponed')")
  } else if (listQuery.releaseDateFrom || listQuery.releaseDateTo) {
    parts.push("release_date IS NOT NULL AND TRIM(release_date) != ''")
    if (listQuery.releaseDateFrom) {
      parts.push("release_date::date >= ?::date")
      params.push(listQuery.releaseDateFrom)
    }
    if (listQuery.releaseDateTo) {
      parts.push("release_date::date <= ?::date")
      params.push(listQuery.releaseDateTo)
    }
  }

  if (listQuery.artistName !== undefined) {
    const name = normalizeArtistName(listQuery.artistName)
    if (name === ADMIN_ARTIST_EMPTY_LABEL) {
      parts.push("(artist_name IS NULL OR TRIM(artist_name) = '')")
    } else {
      parts.push("TRIM(artist_name) = ?")
      params.push(name)
    }
  }

  const sql = parts.length ? `WHERE ${parts.join(" AND ")}` : ""
  return { sql, params }
}

function buildOrderClause(
  sortField: AdminTracksSortField,
  sortDirection: AdminTracksSortDirection
): string {
  const dir = sortDirection === "desc" ? "DESC" : "ASC"
  if (sortField === "createdAt") {
    return `ORDER BY created_at::timestamptz ${dir}, id ${dir}`
  }
  return `ORDER BY COALESCE(NULLIF(TRIM(release_date), '')::timestamptz, created_at) ${dir}, id ${dir}`
}

export async function countTracksInDatabase(): Promise<number> {
  const row = await queryOne<{ c: string | number }>("SELECT COUNT(*) AS c FROM tracks")
  return Number(row?.c ?? 0)
}

export async function countTracksMatching(listQuery: AdminTracksListQuery): Promise<number> {
  const { sql, params } = buildWhereClause(listQuery)
  const row = await queryOne<{ c: string | number }>(
    `SELECT COUNT(*) AS c FROM tracks ${sql}`,
    params
  )
  return Number(row?.c ?? 0)
}

export async function listTracksForAdmin(
  listQuery: AdminTracksListQuery
): Promise<AdminTracksListResult> {
  const limit = clampLimit(listQuery.limit)
  const offset = Math.max(0, Math.floor(listQuery.offset ?? 0))
  const sortField = listQuery.sortField ?? "releaseDate"
  const sortDirection = listQuery.sortDirection ?? "asc"
  const { sql, params } = buildWhereClause(listQuery)
  const order = buildOrderClause(sortField, sortDirection)

  const total = await countTracksMatching(listQuery)
  const totalInDatabase = await countTracksInDatabase()

  const rows = await query<TrackRow>(
    `SELECT * FROM tracks ${sql} ${order} LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  )

  const tracks = rows.map(rowToTrack)

  return {
    tracks,
    total,
    totalInDatabase,
    limit,
    offset,
    hasMore: offset + tracks.length < total,
  }
}

/** Лёгкий индекс артистов по текущим фильтрам (без тел треков). */
export async function listArtistsForAdmin(
  listQuery: Omit<
    AdminTracksListQuery,
    "artistName" | "limit" | "offset" | "sortField" | "sortDirection"
  >
): Promise<AdminArtistIndexItem[]> {
  const { sql, params } = buildWhereClause(listQuery)
  const rows = await query<{ artist_key: string; c: string | number }>(
    `SELECT
       CASE
         WHEN artist_name IS NULL OR TRIM(artist_name) = '' THEN ?
         ELSE TRIM(artist_name)
       END AS artist_key,
       COUNT(*) AS c
     FROM tracks
     ${sql}
     GROUP BY 1
     ORDER BY 1 ASC`,
    [ADMIN_ARTIST_EMPTY_LABEL, ...params]
  )

  return rows.map((row) => ({
    name: row.artist_key,
    count: Number(row.c) || 0,
  }))
}

export async function getAdminTracksStats(userId?: string): Promise<AdminTracksStats> {
  const uid = userId?.trim()
  const userClause = uid ? "WHERE LOWER(user_id) = LOWER(?)" : ""
  const userParams: unknown[] = uid ? [uid] : []

  const byStatusRows = await query<{ status: string; c: string | number }>(
    `SELECT status, COUNT(*) AS c FROM tracks ${userClause} GROUP BY status`,
    userParams
  )

  const byStatus = Object.fromEntries(
    ALL_TRACK_STATUSES.map((s) => [s, 0])
  ) as Record<TrackStatus, number>

  let total = 0
  for (const row of byStatusRows) {
    const count = Number(row.c) || 0
    total += count
    if (ALL_TRACK_STATUSES.includes(row.status as TrackStatus)) {
      byStatus[row.status as TrackStatus] = count
    }
  }

  const today = todayIsoDate()
  const releasesTodayParams: unknown[] = uid ? [uid, today] : [today]
  const releasesTodayWhere = uid
    ? "LOWER(user_id) = LOWER(?) AND release_date IS NOT NULL AND TRIM(release_date) != '' AND release_date::date = ?::date"
    : "release_date IS NOT NULL AND TRIM(release_date) != '' AND release_date::date = ?::date"

  const releasesTodayRow = await queryOne<{ c: string | number }>(
    `SELECT COUNT(*) AS c FROM tracks WHERE ${releasesTodayWhere}`,
    releasesTodayParams
  )

  const upcomingParams: unknown[] = uid ? [uid, today] : [today]
  const upcomingWhere = uid
    ? "LOWER(user_id) = LOWER(?) AND release_date IS NOT NULL AND TRIM(release_date) != '' AND release_date::date >= ?::date AND status NOT IN ('rejected', 'postponed')"
    : "release_date IS NOT NULL AND TRIM(release_date) != '' AND release_date::date >= ?::date AND status NOT IN ('rejected', 'postponed')"

  const upcomingRow = await queryOne<{ c: string | number }>(
    `SELECT COUNT(*) AS c FROM tracks WHERE ${upcomingWhere}`,
    upcomingParams
  )

  const draftPlaceholders = ADMIN_UPLOAD_DRAFT_STATUSES.map(() => "?").join(", ")
  const draftParams: unknown[] = [...ADMIN_UPLOAD_DRAFT_STATUSES]
  let draftWhere = `status IN (${draftPlaceholders})`
  if (uid) {
    draftWhere += " AND LOWER(user_id) = LOWER(?)"
    draftParams.push(uid)
  }
  const draftRow = await queryOne<{ c: string | number }>(
    `SELECT COUNT(*) AS c FROM upload_drafts WHERE ${draftWhere}`,
    draftParams
  )

  return {
    total,
    byStatus,
    upcomingCount: Number(upcomingRow?.c ?? 0) || 0,
    releasesTodayCount: Number(releasesTodayRow?.c ?? 0) || 0,
    uploadDraftsCount: Number(draftRow?.c ?? 0) || 0,
  }
}

export async function listTrackMetaForAdmin(): Promise<AdminTrackMeta[]> {
  const rows = await query<{
    id: string
    track_name: string
    artist_name: string
    album_id: string | null
    user_id: string
  }>(
    `SELECT id, track_name, artist_name, album_id, user_id FROM tracks ORDER BY created_at::timestamptz DESC`
  )

  return rows.map((row) => ({
    id: row.id,
    trackName: row.track_name,
    artistName: row.artist_name,
    albumId: row.album_id ?? undefined,
    userId: row.user_id,
  }))
}
