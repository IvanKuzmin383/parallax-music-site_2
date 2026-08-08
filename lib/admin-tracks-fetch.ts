import {
  ADMIN_TRACKS_CLIENT_CAP,
  ADMIN_TRACKS_DEFAULT_LIMIT,
  ADMIN_TRACKS_MAX_LIMIT,
  type AdminArtistIndexItem,
  type AdminTracksListQuery,
  type AdminTracksStats,
} from "@/lib/admin-tracks-query-shared"
import type { Album } from "@/lib/albums"
import type { Track } from "@/lib/tracks"
import type { UploadDraft } from "@/lib/upload-drafts"

export type AdminTracksApiResponse = {
  tracks: Track[]
  total: number
  totalInDatabase: number
  limit: number
  offset: number
  hasMore: boolean
  albums: Album[]
  uploadDrafts: UploadDraft[]
  stats: AdminTracksStats
}

export function buildAdminTracksSearchParams(
  query: AdminTracksListQuery & { limit?: number; offset?: number; artists?: boolean }
): string {
  const params = new URLSearchParams()
  if (query.userId) params.set("userId", query.userId)
  if (query.status && query.status !== "all") params.set("status", query.status)
  if (query.releaseDateFrom) params.set("releaseDateFrom", query.releaseDateFrom)
  if (query.releaseDateTo) params.set("releaseDateTo", query.releaseDateTo)
  if (query.upcomingOnly) params.set("upcomingOnly", "1")
  if (query.releasesTodayOnly) params.set("releasesTodayOnly", "1")
  if (query.artistName !== undefined) params.set("artistName", query.artistName)
  if (query.sortField) params.set("sortField", query.sortField)
  if (query.sortDirection) params.set("sortDirection", query.sortDirection)
  if (query.artists) {
    params.set("artists", "1")
  } else {
    params.set("limit", String(query.limit ?? ADMIN_TRACKS_DEFAULT_LIMIT))
    params.set("offset", String(query.offset ?? 0))
  }
  return params.toString()
}

export async function fetchAdminTracksPage(
  query: AdminTracksListQuery & { limit?: number; offset?: number },
  init?: RequestInit
): Promise<AdminTracksApiResponse> {
  const qs = buildAdminTracksSearchParams(query)
  const response = await fetch(`/api/admin/tracks?${qs}`, {
    credentials: "include",
    ...init,
  })

  if (!response.ok) {
    const err = new Error("admin_tracks_fetch_failed") as Error & { status?: number }
    err.status = response.status
    throw err
  }

  return (await response.json()) as AdminTracksApiResponse
}

/** Подгружает все страницы по текущим фильтрам (с потолком). */
export async function fetchAdminTracksAllMatching(
  query: Omit<AdminTracksListQuery, "limit" | "offset">,
  init?: RequestInit
): Promise<AdminTracksApiResponse & { truncated: boolean }> {
  const merged: Track[] = []
  let offset = 0
  let last: AdminTracksApiResponse | null = null

  while (merged.length < ADMIN_TRACKS_CLIENT_CAP) {
    const page = await fetchAdminTracksPage(
      {
        ...query,
        limit: ADMIN_TRACKS_DEFAULT_LIMIT,
        offset,
      },
      init
    )
    last = page
    merged.push(...page.tracks)
    if (!page.hasMore) break
    offset += page.tracks.length
  }

  if (!last) {
    throw new Error("admin_tracks_empty_response")
  }

  const truncated = merged.length < last.total
  return {
    ...last,
    tracks: merged,
    offset: 0,
    hasMore: truncated,
    truncated,
  }
}

/** Индекс артистов по фильтрам (лёгкий, без тел треков). */
export async function fetchAdminArtistsIndex(
  query: Omit<
    AdminTracksListQuery,
    "artistName" | "limit" | "offset" | "sortField" | "sortDirection"
  >,
  init?: RequestInit
): Promise<AdminArtistIndexItem[]> {
  const qs = buildAdminTracksSearchParams({ ...query, artists: true })
  const response = await fetch(`/api/admin/tracks?${qs}`, {
    credentials: "include",
    ...init,
  })
  if (!response.ok) {
    const err = new Error("admin_artists_fetch_failed") as Error & { status?: number }
    err.status = response.status
    throw err
  }
  const data = (await response.json()) as { artists?: AdminArtistIndexItem[] }
  return data.artists ?? []
}

/** Все треки одного артиста по фильтрам (без общего client cap). */
export async function fetchAdminTracksForArtist(
  query: Omit<AdminTracksListQuery, "limit" | "offset"> & { artistName: string },
  init?: RequestInit
): Promise<Track[]> {
  const merged: Track[] = []
  let offset = 0
  for (;;) {
    const page = await fetchAdminTracksPage(
      {
        ...query,
        limit: ADMIN_TRACKS_MAX_LIMIT,
        offset,
      },
      init
    )
    merged.push(...page.tracks)
    if (!page.hasMore) break
    offset += page.tracks.length
    if (offset > 5000) break
  }
  return merged
}
