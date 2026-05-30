import {
  ADMIN_TRACKS_CLIENT_CAP,
  ADMIN_TRACKS_DEFAULT_LIMIT,
  type AdminTracksListQuery,
} from "@/lib/admin-tracks-query"
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
}

export function buildAdminTracksSearchParams(
  query: AdminTracksListQuery & { limit?: number; offset?: number }
): string {
  const params = new URLSearchParams()
  if (query.userId) params.set("userId", query.userId)
  if (query.status && query.status !== "all") params.set("status", query.status)
  if (query.releaseDateFrom) params.set("releaseDateFrom", query.releaseDateFrom)
  if (query.releaseDateTo) params.set("releaseDateTo", query.releaseDateTo)
  if (query.sortField) params.set("sortField", query.sortField)
  if (query.sortDirection) params.set("sortDirection", query.sortDirection)
  params.set("limit", String(query.limit ?? ADMIN_TRACKS_DEFAULT_LIMIT))
  params.set("offset", String(query.offset ?? 0))
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
