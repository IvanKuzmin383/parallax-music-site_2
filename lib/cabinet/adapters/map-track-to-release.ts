import type { ReleaseView } from "../types"
import type { Track } from "@/lib/tracks"
import type { UploadDraft } from "@/lib/upload-drafts"

const TRACK_STATUS_LABELS: Record<string, string> = {
  upload_pending: "Ожидает загрузки",
  on_moderation: "На модерации",
  sent_to_platforms: "Отправлен на площадки",
  approved_by_platforms: "Одобрен площадками",
  released: "Выпущен",
  rejected: "Отклонён",
  postponed: "Отложен",
}

const DRAFT_STATUS_LABELS: Record<string, string> = {
  collecting: "Черновик",
  awaiting_payment: "Ожидает оплаты",
  paid: "Оплачен",
  finalized: "Отправлен",
  expired: "Истёк",
  cancelled: "Отменён",
}

export function mapTrackToRelease(track: Track): ReleaseView {
  const platforms: string[] = []
  if (track.platformLinks) {
    if (track.platformLinks.yandex) platforms.push("Яндекс Музыка")
    if (track.platformLinks.spotify) platforms.push("Spotify")
    if (track.platformLinks.vk) platforms.push("VK Музыка")
    if (track.platformLinks.apple) platforms.push("Apple Music")
  }
  return {
    id: track.id,
    coverUrl: track.coverPath ? `/api/cabinet/uploads/cover/${track.id}` : undefined,
    title: track.trackName,
    artist: track.artistName,
    status: TRACK_STATUS_LABELS[track.status] ?? track.status,
    releaseDate: track.releaseDate,
    platforms,
    kind: "track",
  }
}

export function mapDraftToRelease(draft: UploadDraft): ReleaseView {
  const payload = draft.payload
  const title =
    draft.kind === "album"
      ? payload.albumTitle ?? "Альбом (черновик)"
      : payload.trackName ?? "Трек (черновик)"
  return {
    id: draft.id,
    title,
    artist: payload.artistName ?? "—",
    status: DRAFT_STATUS_LABELS[draft.status] ?? draft.status,
    kind: "draft",
  }
}

export function isReleaseInProgress(release: ReleaseView): boolean {
  return (
    release.kind === "draft" ||
    release.status.includes("модерац") ||
    release.status.includes("Ожидает") ||
    release.status.includes("Отправлен")
  )
}
