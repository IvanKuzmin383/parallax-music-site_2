import { getDb } from "@/lib/db"
import type { Track, TrackStatus } from "@/lib/tracks"
import { rowToTrack, type TrackRow } from "@/lib/tracks"

export const ADMIN_TRACKS_DEFAULT_LIMIT = 100
export const ADMIN_TRACKS_MAX_LIMIT = 500
/** Сколько треков максимум подгружать в админку за один заход (защита от OOM). */
export const ADMIN_TRACKS_CLIENT_CAP = 2000

export type AdminTracksSortField = "createdAt" | "releaseDate"
export type AdminTracksSortDirection = "asc" | "desc"

export type AdminTracksListQuery = {
  userId?: string
  status?: TrackStatus | "all"
  releaseDateFrom?: string
  releaseDateTo?: string
  sortField?: AdminTracksSortField
  sortDirection?: AdminTracksSortDirection
  limit?: number
  offset?: number
}

export type AdminTracksListResult = {
  tracks: Track[]
  total: number
  totalInDatabase: number
  limit: number
  offset: number
  hasMore: boolean
}

export type AdminTrackMeta = Pick<
  Track,
  "id" | "trackName" | "artistName" | "albumId" | "userId"
>

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
