import {
  getReleaseByAlbumId,
  getReleaseById,
  updateRelease,
  type Release,
  type ReleaseStatus,
} from "@/lib/releases"
import {
  getTracksByReleaseId,
  updateTrack,
  type Track,
  type TrackStatus,
} from "@/lib/tracks"

/** Статусы модерации, общие для релиза и треков. */
const SHARED_MODERATION_STATUSES = new Set<string>([
  "upload_pending",
  "on_moderation",
  "sent_to_platforms",
  "approved_by_platforms",
  "released",
  "rejected",
  "postponed",
])

export function isSharedModerationStatus(status: string): boolean {
  return SHARED_MODERATION_STATUSES.has(status)
}

export async function resolveReleaseIdForTrack(track: Track): Promise<string | null> {
  if (track.releaseId) return track.releaseId
  if (track.albumId) {
    const release = await getReleaseByAlbumId(track.albumId)
    return release?.id ?? null
  }
  return null
}

/**
 * Источник истины — статус релиза. Зеркалит на все треки релиза.
 */
export async function applyReleaseModerationStatus(params: {
  releaseId: string
  status?: TrackStatus
  moderationNote?: string | null
}): Promise<{ release: Release | null; tracks: Track[] }> {
  const { releaseId, status, moderationNote } = params
  const release = await getReleaseById(releaseId)
  if (!release) return { release: null, tracks: [] }

  let updatedRelease: Release | null = release
  if (status !== undefined && isSharedModerationStatus(status)) {
    updatedRelease = await updateRelease(releaseId, { status: status as ReleaseStatus })
  }

  const tracks = await getTracksByReleaseId(releaseId)
  const updatedTracks: Track[] = []
  for (const track of tracks) {
    const patch: Partial<Pick<Track, "status" | "moderationNote">> = {}
    if (status !== undefined && isSharedModerationStatus(status)) {
      patch.status = status as TrackStatus
    }
    if (moderationNote !== undefined) {
      patch.moderationNote =
        moderationNote && moderationNote.trim().length > 0 ? moderationNote.trim() : null
    }
    if (Object.keys(patch).length === 0) {
      updatedTracks.push(track)
      continue
    }
    const next = await updateTrack(track.id, patch)
    updatedTracks.push(next ?? track)
  }

  return { release: updatedRelease, tracks: updatedTracks }
}
