import type { ReleaseView } from "../types"
import type { Track } from "@/lib/tracks"
import type { Release } from "@/lib/releases"
import type { Album } from "@/lib/albums"

const TRACK_STATUS_LABELS: Record<string, string> = {
  draft: "Черновик",
  upload_pending: "Требуется доработка",
  on_moderation: "На модерации",
  sent_to_platforms: "Отправлен на площадки",
  approved_by_platforms: "Одобрен площадками",
  released: "Выпущен",
  rejected: "Отклонён",
  postponed: "Отложен",
}

const RELEASE_STATUS_LABELS: Record<string, string> = {
  draft: "Черновик",
  awaiting_payment: "Ожидает оплаты",
  upload_pending: "Требуется доработка",
  on_moderation: "На модерации",
  sent_to_platforms: "Отправлен на площадки",
  approved_by_platforms: "Одобрен площадками",
  released: "Выпущен",
  rejected: "Отклонён",
  postponed: "Отложен",
}

/** Чем меньше индекс — тем «важнее» показать этот статус на групповой карточке. */
const TRACK_STATUS_PRIORITY: Record<string, number> = {
  rejected: 0,
  postponed: 1,
  on_moderation: 2,
  upload_pending: 3,
  sent_to_platforms: 4,
  approved_by_platforms: 5,
  released: 6,
  draft: 7,
}

function platformsFromTrack(track: Track): string[] {
  const platforms: string[] = []
  if (!track.platformLinks) return platforms
  const links = track.platformLinks
  if (links.yandex) platforms.push("Яндекс Музыка")
  if (links.spotify) platforms.push("Spotify")
  if (links.vk) platforms.push("VK Музыка")
  if (links.appleMusic) platforms.push("Apple Music")
  if (links.youtubeMusic) platforms.push("YouTube Music")
  if (links.sberzvuk) platforms.push("СберЗвук")
  if (links.kion) platforms.push("КИОН")
  return platforms
}

function sortTracks(tracks: Track[]): Track[] {
  return [...tracks].sort((a, b) => (a.trackOrder ?? 0) - (b.trackOrder ?? 0))
}

export function trackSummaries(tracks: Track[]): Array<{ id: string; name: string }> {
  return sortTracks(tracks).map((t) => ({
    id: t.id,
    name: t.trackName.trim() || "Без названия",
  }))
}

function pickGroupStatus(tracks: Track[]): string {
  let best: Track | null = null
  let bestPri = Number.POSITIVE_INFINITY
  for (const t of tracks) {
    const pri = TRACK_STATUS_PRIORITY[t.status] ?? 50
    if (pri < bestPri) {
      bestPri = pri
      best = t
    }
  }
  if (!best) return "На модерации"
  return TRACK_STATUS_LABELS[best.status] ?? best.status
}

function mergePlatforms(tracks: Track[]): string[] {
  const set = new Set<string>()
  for (const t of tracks) {
    for (const p of platformsFromTrack(t)) set.add(p)
  }
  return [...set]
}

/** Одна карточка = один трек (сингл без сущности релиза). */
export function mapTrackToRelease(track: Track, trackCount = 1): ReleaseView {
  const format: "single" | "album" = track.albumId ? "album" : "single"

  if (track.status === "draft") {
    return {
      id: track.releaseId ?? track.id,
      coverUrl: track.coverPath
        ? track.releaseId
          ? `/api/cabinet/releases/${track.releaseId}/cover`
          : `/api/cabinet/uploads/cover/${track.id}`
        : undefined,
      title: track.trackName,
      artist: track.artistName,
      status: "Черновик",
      releaseDate: track.releaseDate,
      kind: "draft" as const,
      format,
      trackCount,
      tracks: [{ id: track.id, name: track.trackName.trim() || "Без названия" }],
    }
  }

  return {
    id: track.id,
    coverUrl: track.coverPath ? `/api/cabinet/uploads/cover/${track.id}` : undefined,
    title: track.trackName,
    artist: track.artistName,
    status: TRACK_STATUS_LABELS[track.status] ?? track.status,
    releaseDate: track.releaseDate,
    platforms: platformsFromTrack(track),
    kind: track.albumId ? "album" : "track",
    format: "single",
    trackCount: 1,
    tracks: [{ id: track.id, name: track.trackName.trim() || "Без названия" }],
  }
}

export function mapReleaseEntityToView(
  release: Release,
  tracks: Track[] = [],
): ReleaseView {
  const summaries = trackSummaries(tracks)
  const isDraftLike =
    release.status === "draft" ||
    release.status === "awaiting_payment" ||
    release.status === "upload_pending" ||
    release.status === "rejected"
  return {
    id: release.id,
    coverUrl: release.coverPath ? `/api/cabinet/releases/${release.id}/cover` : undefined,
    title: release.title || (release.kind === "album" ? "Альбом (черновик)" : "Релиз (черновик)"),
    artist: release.artistName || "—",
    status: RELEASE_STATUS_LABELS[release.status] ?? release.status,
    releaseDate: release.releaseDate,
    kind: isDraftLike ? "draft" : release.kind === "album" ? "album" : "track",
    format: release.kind === "album" ? "album" : "single",
    trackCount: summaries.length,
    tracks: summaries,
    wizardStep: release.wizardStep,
    releaseStatus: release.status,
    platforms: mergePlatforms(tracks),
  }
}

/** Группа треков одного альбома (без строки в `releases`). */
export function mapAlbumTracksToRelease(
  albumId: string,
  tracks: Track[],
  album?: Album | null,
): ReleaseView {
  const ordered = sortTracks(tracks)
  const first = ordered[0]
  const summaries = trackSummaries(ordered)
  return {
    id: albumId,
    coverUrl: first?.coverPath ? `/api/cabinet/uploads/cover/${first.id}` : undefined,
    title: album?.title?.trim() || first?.trackName?.trim() || "Альбом",
    artist: album?.artistName?.trim() || first?.artistName || "—",
    status: pickGroupStatus(ordered),
    releaseDate: album?.releaseDate ?? first?.releaseDate,
    platforms: mergePlatforms(ordered),
    kind: "album",
    format: "album",
    trackCount: summaries.length,
    tracks: summaries,
  }
}

/** «Сингл · 1 трек» / «Альбом · 12 треков» */
export function formatReleaseKindMeta(release: Pick<ReleaseView, "format" | "trackCount" | "kind">): string | null {
  const format =
    release.format ??
    (release.kind === "album" ? "album" : release.kind === "track" ? "single" : null)
  if (!format) {
    if (release.kind === "draft") {
      const count = Math.max(0, release.trackCount ?? 0)
      if (count > 1) return `Альбом · ${pluralizeTracks(count)}`
      return count === 1 ? `Сингл · ${pluralizeTracks(1)}` : "Черновик"
    }
    return null
  }
  const count = Math.max(format === "single" ? 1 : 0, release.trackCount ?? (format === "single" ? 1 : 0))
  if (format === "single") return `Сингл · ${pluralizeTracks(Math.max(1, count))}`
  return `Альбом · ${pluralizeTracks(count)}`
}

export function releaseStatusHint(release: ReleaseView): string {
  const raw = release.releaseStatus
  const label = release.status
  if (raw === "upload_pending" || label.includes("доработ")) {
    return "Необходимо внести изменения в материалы релиза"
  }
  if (raw === "awaiting_payment" || label.includes("оплат")) {
    return "Оплатите услуги, чтобы отправить релиз на модерацию"
  }
  if (raw === "draft" || label === "Черновик" || release.kind === "draft") {
    return "Продолжите заполнение и отправку релиза"
  }
  if (raw === "on_moderation" || label.includes("модерац")) {
    return "Релиз на проверке у модераторов"
  }
  if (
    raw === "sent_to_platforms" ||
    raw === "approved_by_platforms" ||
    label.includes("площадк")
  ) {
    return "Релиз передан на площадки"
  }
  if (raw === "released" || label === "Выпущен") {
    return "Релиз доступен на всех площадках"
  }
  if (raw === "rejected" || label.includes("Отклон")) {
    return "Релиз отклонён модерацией"
  }
  if (raw === "postponed" || label === "Отложен") {
    return "Релиз временно отложен"
  }
  return "Статус релиза обновляется автоматически"
}

function pluralizeTracks(n: number): string {
  const abs = Math.abs(n) % 100
  const last = abs % 10
  if (abs > 10 && abs < 20) return `${n} треков`
  if (last === 1) return `${n} трек`
  if (last >= 2 && last <= 4) return `${n} трека`
  return `${n} треков`
}

export function isReleaseInProgress(release: ReleaseView): boolean {
  return (
    release.kind === "draft" ||
    release.releaseStatus === "upload_pending" ||
    release.releaseStatus === "rejected" ||
    release.status.includes("модерац") ||
    release.status.includes("доработ") ||
    release.status.includes("Ожидает") ||
    release.status.includes("Черновик")
  )
}

export function releaseContinueHref(release: ReleaseView): string {
  if (
    release.releaseStatus === "upload_pending" ||
    release.releaseStatus === "rejected"
  ) {
    return `/cabinet/upload/${release.id}?step=${release.wizardStep ?? 1}`
  }
  if (release.kind !== "draft") return "/cabinet/music/releases"
  const step = release.wizardStep ?? 1
  if (release.releaseStatus === "awaiting_payment") {
    return `/cabinet/upload/${release.id}?step=6`
  }
  return `/cabinet/upload/${release.id}?step=${step}`
}

/** Подпись CTA для черновика / доработки. */
export function releaseContinueLabel(release: ReleaseView): string {
  if (
    release.releaseStatus === "upload_pending" ||
    release.status.includes("доработ")
  ) {
    return "Исправить"
  }
  if (
    release.releaseStatus === "awaiting_payment" ||
    release.status.includes("Ожидает оплаты")
  ) {
    return "Оплатить"
  }
  return "Продолжить"
}
