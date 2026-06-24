import type { ReleaseView } from "../types"
import type { Track } from "@/lib/tracks"
import type { Release } from "@/lib/releases"

const TRACK_STATUS_LABELS: Record<string, string> = {
  draft: "Черновик",
  upload_pending: "Ожидает загрузки",
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
  on_moderation: "На модерации",
  sent_to_platforms: "Отправлен на площадки",
  approved_by_platforms: "Одобрен площадками",
  released: "Выпущен",
  rejected: "Отклонён",
  postponed: "Отложен",
}

export function mapTrackToRelease(track: Track): ReleaseView {
  const platforms: string[] = []
  if (track.platformLinks) {
    const links = track.platformLinks
    if (links.yandex) platforms.push("Яндекс Музыка")
    if (links.spotify) platforms.push("Spotify")
    if (links.vk) platforms.push("VK Музыка")
    if (links.appleMusic) platforms.push("Apple Music")
    if (links.youtubeMusic) platforms.push("YouTube Music")
    if (links.sberzvuk) platforms.push("СберЗвук")
    if (links.kion) platforms.push("КИОН")
  }

  if (track.status === "draft") {
    return {
      id: track.releaseId ?? track.id,
      coverUrl: track.coverPath ? `/api/cabinet/releases/${track.releaseId}/cover` : undefined,
      title: track.trackName,
      artist: track.artistName,
      status: "Черновик",
      releaseDate: track.releaseDate,
      kind: "draft" as const,
    }
  }

  return {
    id: track.id,
    coverUrl: track.coverPath ? `/api/cabinet/uploads/cover/${track.id}` : undefined,
    title: track.trackName,
    artist: track.artistName,
    status: TRACK_STATUS_LABELS[track.status] ?? track.status,
    releaseDate: track.releaseDate,
    platforms,
    kind: track.albumId ? "album" : "track",
  }
}

export function mapReleaseEntityToView(release: Release): ReleaseView {
  return {
    id: release.id,
    coverUrl: release.coverPath ? `/api/cabinet/releases/${release.id}/cover` : undefined,
    title: release.title || (release.kind === "album" ? "Альбом (черновик)" : "Релиз (черновик)"),
    artist: release.artistName || "—",
    status: RELEASE_STATUS_LABELS[release.status] ?? release.status,
    releaseDate: release.releaseDate,
    kind: release.status === "draft" || release.status === "awaiting_payment" ? "draft" : release.kind === "album" ? "album" : "track",
    wizardStep: release.wizardStep,
    releaseStatus: release.status,
  }
}

export function isReleaseInProgress(release: ReleaseView): boolean {
  return (
    release.kind === "draft" ||
    release.status.includes("модерац") ||
    release.status.includes("Ожидает") ||
    release.status.includes("Черновик")
  )
}

export function releaseContinueHref(release: ReleaseView): string {
  if (release.kind !== "draft") return "/cabinet/music/releases"
  const step = release.wizardStep ?? 1
  if (release.releaseStatus === "awaiting_payment") {
    return `/cabinet/upload/${release.id}?step=5`
  }
  return `/cabinet/upload/${release.id}?step=${step}`
}
