import { getDb } from "./db"
import type { Track } from "./tracks"
import type { UploadDraftPayload } from "./upload-drafts"
import type { UploadAddonBundleItem } from "./orders"
import { addonBundleItemsFromUploadDraftPayload } from "./cabinet-upload-draft-addons"

function norm(s: string): string {
  return s.trim().toLowerCase()
}

function mergeBundleItems(items: UploadAddonBundleItem[]): UploadAddonBundleItem[] {
  const byType = new Map<UploadAddonBundleItem["type"], number>()
  for (const it of items) {
    byType.set(it.type, Math.max(byType.get(it.type) ?? 0, it.quantity))
  }
  return [...byType.entries()].map(([type, quantity]) => ({ type, quantity }))
}

/**
 * Какие позиции оплаченного пакета допов из черновика относятся к конкретному треку
 * (альбом: обложка/вертикалка на релиз; мастеринг — по индексу в альбоме).
 */
export function uploadAddonBundleItemsApplyingToTrack(
  track: Pick<Track, "id" | "trackName" | "artistName" | "albumId">,
  payload: UploadDraftPayload,
  draftKind: "single" | "album",
  draftAlbumId: string | null | undefined
): UploadAddonBundleItem[] {
  if (draftKind === "album") {
    if (!track.albumId || !draftAlbumId || track.albumId !== draftAlbumId) return []
    const items: UploadAddonBundleItem[] = []
    const a = payload.addons
    if (a?.trackCover?.enabled) items.push({ type: "track_cover", quantity: 1 })
    if (a?.verticalVideo?.enabled) {
      items.push({ type: "vertical_video", quantity: Number(a.verticalVideo.videosCount ?? 0) })
    }
    if (a?.aiMastering?.enabled) {
      const n = Math.max(0, Number(a.aiMastering.tracksCount ?? 0))
      const albumTracks = Array.isArray(payload.albumTracks) ? payload.albumTracks : []
      const idx = albumTracks.findIndex((t) => norm(`${t.trackName ?? ""}`) === norm(track.trackName))
      if (idx >= 0 && idx < n) items.push({ type: "ai_mastering", quantity: 1 })
    }
    if (a?.yandexVideoshot?.enabled) items.push({ type: "yandex_videoshot", quantity: 1 })
    if (a?.yandexVideoshotCreation?.enabled) items.push({ type: "yandex_videoshot_creation", quantity: 1 })
    if (a?.yandexVideoavatar?.enabled) items.push({ type: "yandex_videoavatar", quantity: 1 })
    if (a?.spotifyVideoshot?.enabled) items.push({ type: "spotify_videoshot", quantity: 1 })
    return items
  }

  if (norm(`${payload.sourceTrackId ?? ""}`) === norm(track.id)) {
    return addonBundleItemsFromUploadDraftPayload(payload)
  }
  if (norm(track.trackName) !== norm(`${payload.trackName ?? ""}`)) return []
  if (norm(track.artistName) !== norm(`${payload.artistName ?? ""}`)) return []
  return addonBundleItemsFromUploadDraftPayload(payload)
}

/**
 * Позиции из оплаченных заказов `upload_addon_bundle`, относящиеся к этому треку
 * (по `album_id` черновика или совпадению single-черновика с названием/артистом).
 */
export function getPaidBundleAddonItemsForTrack(track: Track): UploadAddonBundleItem[] {
  const db = getDb()
  const user = track.userId.trim()
  const rows = db
    .prepare(
      `SELECT ud.kind, ud.album_id, ud.payload_json
       FROM orders o
       INNER JOIN upload_drafts ud ON ud.id = o.draft_id
       WHERE o.order_type = 'upload_addon_bundle' AND o.status = 'paid'
         AND LOWER(TRIM(COALESCE(o.user_id, ''))) = LOWER(TRIM(?))
       ORDER BY datetime(COALESCE(o.paid_at, o.created_at)) DESC`
    )
    .all(user) as { kind: string; album_id: string | null; payload_json: string }[]

  const collected: UploadAddonBundleItem[] = []

  for (const row of rows) {
    let payload: UploadDraftPayload
    try {
      payload = JSON.parse(row.payload_json) as UploadDraftPayload
    } catch {
      continue
    }
    const kind = row.kind === "album" ? "album" : "single"

    if (track.albumId) {
      if (row.album_id === track.albumId && kind === "album") {
        collected.push(
          ...uploadAddonBundleItemsApplyingToTrack(track, payload, "album", row.album_id)
        )
        break
      }
      continue
    }

    if (kind === "single" && !row.album_id) {
      const items = uploadAddonBundleItemsApplyingToTrack(track, payload, "single", null)
      if (items.length > 0) {
        collected.push(...items)
        break
      }
    }
  }

  return mergeBundleItems(collected)
}
