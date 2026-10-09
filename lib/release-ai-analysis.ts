import {
  getReleaseById,
  updateRelease,
  type Release,
} from "@/lib/releases"
import { updateTrack, type Track } from "@/lib/tracks"
import { resolveReleaseIdForTrack } from "@/lib/admin-release-moderation"

/** Нормализует текст AI-анализа: пустая строка → null. */
export function normalizeAiAnalysisText(value: string | null | undefined): string | null {
  const trimmed = typeof value === "string" ? value.trim() : ""
  return trimmed.length > 0 ? trimmed : null
}

/** Текст AI-анализа для трека: из релиза, если есть, иначе с самого трека. */
export async function resolveAiAnalysisTextForTrack(track: Track): Promise<string | null> {
  const releaseId = await resolveReleaseIdForTrack(track)
  if (releaseId) {
    const release = await getReleaseById(releaseId)
    const fromRelease = normalizeAiAnalysisText(release?.aiAnalysisText)
    if (fromRelease) return fromRelease
  }
  return normalizeAiAnalysisText(track.aiAnalysisText)
}

/**
 * Сохраняет AI-анализ.
 * При наличии релиза - в releases (один текст на альбом/сингл), иначе на трек.
 * Уведомляет артиста при первом заполнении (пусто → непусто).
 */
export async function saveAiAnalysisForTrack(params: {
  track: Track
  text: string | null | undefined
}): Promise<{ aiAnalysisText: string | null; release: Release | null }> {
  const next = normalizeAiAnalysisText(params.text)
  const releaseId = await resolveReleaseIdForTrack(params.track)

  let prev: string | null = null
  let release: Release | null = null

  if (releaseId) {
    release = await getReleaseById(releaseId)
    prev = normalizeAiAnalysisText(release?.aiAnalysisText)
    release = (await updateRelease(releaseId, { aiAnalysisText: next })) ?? release
  } else {
    prev = normalizeAiAnalysisText(params.track.aiAnalysisText)
    await updateTrack(params.track.id, { aiAnalysisText: next })
  }

  const becameFilled = !prev && Boolean(next)
  if (becameFilled) {
    const { tryNotifyReleaseAiAnalysis } = await import("@/lib/cabinet-notifications")
    const hrefId = releaseId ?? params.track.id
    await tryNotifyReleaseAiAnalysis({
      userKey: params.track.userId,
      releaseId: hrefId,
      releaseTitle: release?.title?.trim() || params.track.trackName,
    })
  }

  return { aiAnalysisText: next, release }
}

/** Берёт первый непустой AI-анализ из списка треков (legacy-альбом). */
export function pickAiAnalysisFromTracks(tracks: Track[]): string | null {
  for (const t of tracks) {
    const text = normalizeAiAnalysisText(t.aiAnalysisText)
    if (text) return text
  }
  return null
}
