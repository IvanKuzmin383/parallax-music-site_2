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
import { archiveModerationNote } from "@/lib/moderation-note-history"

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
 * Источник истины - статус релиза. Зеркалит на все треки релиза.
 */
export async function applyReleaseModerationStatus(params: {
  releaseId: string
  status?: TrackStatus
  moderationNote?: string | null
  /** Кто меняет статус (для истории версий). */
  actor?: string | null
}): Promise<{ release: Release | null; tracks: Track[] }> {
  const { releaseId, status, moderationNote, actor } = params
  const release = await getReleaseById(releaseId)
  if (!release) return { release: null, tracks: [] }

  const prevStatus = release.status
  let updatedRelease: Release | null = release
  let changed = false
  let noteChanged = false
  if (status !== undefined && isSharedModerationStatus(status)) {
    if (release.status !== status) changed = true
    updatedRelease = await updateRelease(releaseId, { status: status as ReleaseStatus })
  }

  const tracks = await getTracksByReleaseId(releaseId)
  const updatedTracks: Track[] = []
  const nextNote =
    moderationNote === undefined
      ? undefined
      : moderationNote && moderationNote.trim().length > 0
        ? moderationNote.trim()
        : null

  for (const track of tracks) {
    const patch: Partial<Pick<Track, "status" | "moderationNote" | "moderationNotesHistory">> = {}
    if (status !== undefined && isSharedModerationStatus(status)) {
      patch.status = status as TrackStatus
    }
    if (nextNote !== undefined) {
      const prev = track.moderationNote?.trim()
      if (prev && prev !== (nextNote ?? "")) {
        patch.moderationNotesHistory = archiveModerationNote(
          track.moderationNotesHistory,
          prev,
          track.status
        )
      }
      if ((prev || "") !== (nextNote ?? "")) {
        changed = true
        noteChanged = true
      }
      patch.moderationNote = nextNote
    }
    if (Object.keys(patch).length === 0) {
      updatedTracks.push(track)
      continue
    }
    const next = await updateTrack(track.id, patch)
    updatedTracks.push(next ?? track)
  }

  if (changed) {
    const { tryCreateReleaseEntityVersion } = await import("@/lib/release-entity-versions")
    const noteParts: string[] = []
    if (status !== undefined) noteParts.push(`status→${status}`)
    if (nextNote !== undefined) noteParts.push(nextNote ? `note: ${nextNote}` : "note: cleared")
    await tryCreateReleaseEntityVersion({
      releaseId,
      reason: "admin_status_change",
      actor: actor ?? "admin",
      note: noteParts.join("; ") || null,
    })

    const { tryNotifyReleaseModeration } = await import("@/lib/cabinet-notifications")
    await tryNotifyReleaseModeration({
      releaseUserKey: release.userId,
      releaseId,
      releaseTitle: updatedRelease?.title ?? release.title,
      prevStatus,
      nextStatus: status,
      nextNote,
      noteChanged,
    })
  }

  return { release: updatedRelease, tracks: updatedTracks }
}
