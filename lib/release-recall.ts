import { getReleaseById, updateRelease, type Release } from "@/lib/releases"
import { getTracksByReleaseId, updateTrack, type Track } from "@/lib/tracks"

export const RELEASE_RECALL_BLOCKED_MESSAGE = "Релиз уже в работе у модератора"
export const RELEASE_RECALL_BAD_STATUS_MESSAGE =
  "Вернуть на редактирование можно только релиз на модерации"

export function releaseHasCatalogNumber(
  tracks: Pick<Track, "catalogNumber">[]
): boolean {
  return tracks.some((t) => Boolean(t.catalogNumber?.trim()))
}

export function canUserRecallReleaseToDraft(
  release: Pick<Release, "status">,
  tracks: Pick<Track, "catalogNumber">[]
): boolean {
  return release.status === "on_moderation" && !releaseHasCatalogNumber(tracks)
}

export type RecallReleaseResult =
  | { ok: true; release: Release; tracks: Track[] }
  | { ok: false; error: string; status: number }

/**
 * Пользователь забирает релиз с модерации обратно в черновик,
 * пока админ не проставил артикул (ещё не «взял в работу»).
 */
export async function recallReleaseToDraft(
  releaseId: string,
  userEmail: string
): Promise<RecallReleaseResult> {
  const release = await getReleaseById(releaseId)
  if (!release || release.userId.toLowerCase() !== userEmail.toLowerCase()) {
    return { ok: false, error: "Релиз не найден", status: 404 }
  }

  if (release.status !== "on_moderation") {
    return { ok: false, error: RELEASE_RECALL_BAD_STATUS_MESSAGE, status: 400 }
  }

  const tracks = await getTracksByReleaseId(releaseId)
  if (releaseHasCatalogNumber(tracks)) {
    return { ok: false, error: RELEASE_RECALL_BLOCKED_MESSAGE, status: 403 }
  }

  const { tryCreateReleaseEntityVersion } = await import("@/lib/release-entity-versions")
  await tryCreateReleaseEntityVersion({
    releaseId,
    reason: "user_recall_to_draft",
    actor: userEmail,
    note: "Пользователь вернул релиз на редактирование с модерации",
  })

  const updatedTracks: Track[] = []
  for (const track of tracks) {
    const next = await updateTrack(track.id, {
      status: "draft",
      // Слот уже списан при отправке на модерацию — не списывать повторно.
      fixPackCreditsCharged: true,
    })
    updatedTracks.push(next ?? { ...track, status: "draft", fixPackCreditsCharged: true })
  }

  const updatedRelease = await updateRelease(releaseId, { status: "draft" })
  if (!updatedRelease) {
    return { ok: false, error: "Не удалось обновить релиз", status: 500 }
  }

  return { ok: true, release: updatedRelease, tracks: updatedTracks }
}
