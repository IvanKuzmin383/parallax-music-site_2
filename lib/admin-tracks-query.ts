import { getDb } from "@/lib/db"
import { rowToTrack, type TrackRow } from "@/lib/tracks"
import {
  ADMIN_TRACKS_DEFAULT_LIMIT,
  ADMIN_TRACKS_MAX_LIMIT,
  type AdminTrackMeta,
  type AdminTracksListQuery,
  type AdminTracksListResult,
  type AdminTracksSortDirection,
  type AdminTracksSortField,
} from "@/lib/admin-tracks-query-shared"

export {
  ADMIN_TRACKS_CLIENT_CAP,
  ADMIN_TRACKS_DEFAULT_LIMIT,
  ADMIN_TRACKS_MAX_LIMIT,
  type AdminTrackMeta,
  type AdminTracksListQuery,
  type AdminTracksListResult,
  type AdminTracksSortDirection,
  type AdminTracksSortField,
} from "@/lib/admin-tracks-query-shared"

function clampLimit(limit: number | undefined): number {
  const n = limit ?? ADMIN_TRACKS_DEFAULT_LIMIT
  if (!Number.isFinite(n) || n < 1) return ADMIN_TRACKS_DEFAULT_LIMIT
  return Math.min(Math.floor(n), ADMIN_TRACKS_MAX_LIMIT)
}

function buildWhereClause(query: AdminTracksListQuery): { sql: string; params: unknown[] } {
  const parts: string[] = []
  const params: unknown[] = []

  if (query.userId?.trim()) {
    parts.push("LOWER(user_id) = LOWER(?)")
    params.push(query.userId.trim())
  }

  if (query.status && query.status !== "all") {
    parts.push("status = ?")
    params.push(query.status)
  }

  if (query.releaseDateFrom || query.releaseDateTo) {
    parts.push("release_date IS NOT NULL AND TRIM(release_date) != ''")
    if (query.releaseDateFrom) {
      parts.push("date(release_date) >= date(?)")
      params.push(query.releaseDateFrom)
    }
    if (query.releaseDateTo) {
      parts.push("date(release_date) <= date(?)")
      params.push(query.releaseDateTo)
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
    return `ORDER BY datetime(created_at) ${dir}, id ${dir}`
  }
  return `ORDER BY datetime(COALESCE(NULLIF(TRIM(release_date), ''), created_at)) ${dir}, id ${dir}`
}

export function countTracksInDatabase(): number {
  const db = getDb()
  const row = db.prepare("SELECT COUNT(*) AS c FROM tracks").get() as { c: number }
  return row.c
}

export function countTracksMatching(query: AdminTracksListQuery): number {
  const db = getDb()
  const { sql, params } = buildWhereClause(query)
  const row = db
    .prepare(`SELECT COUNT(*) AS c FROM tracks ${sql}`)
    .get(...params) as { c: number }
  return row.c
}

export function listTracksForAdmin(query: AdminTracksListQuery): AdminTracksListResult {
  const db = getDb()
  const limit = clampLimit(query.limit)
  const offset = Math.max(0, Math.floor(query.offset ?? 0))
  const sortField = query.sortField ?? "releaseDate"
  const sortDirection = query.sortDirection ?? "asc"
  const { sql, params } = buildWhereClause(query)
  const order = buildOrderClause(sortField, sortDirection)

  const total = countTracksMatching(query)
  const totalInDatabase = countTracksInDatabase()

  const rows = db
    .prepare(`SELECT * FROM tracks ${sql} ${order} LIMIT ? OFFSET ?`)
    .all(...params, limit, offset) as TrackRow[]

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

export function listTrackMetaForAdmin(): AdminTrackMeta[] {
  const db = getDb()
  const rows = db
    .prepare(
      `SELECT id, track_name, artist_name, album_id, user_id FROM tracks ORDER BY datetime(created_at) DESC`
    )
    .all() as {
    id: string
    track_name: string
    artist_name: string
    album_id: string | null
    user_id: string
  }[]

  return rows.map((row) => ({
    id: row.id,
    trackName: row.track_name,
    artistName: row.artist_name,
    albumId: row.album_id ?? undefined,
    userId: row.user_id,
  }))
}
