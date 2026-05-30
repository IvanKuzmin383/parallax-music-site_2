import type { Track, TrackStatus } from "@/lib/tracks"

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
