import type { UploadDraftPayload } from "./upload-drafts"
import { calculateUploadAddonBundleAmount, type UploadAddonBundleItem } from "./orders"

/** Платные услуги из payload черновика (без AI-обложки — она считается на клиенте). */
export function addonBundleItemsFromUploadDraftPayload(payload: UploadDraftPayload): UploadAddonBundleItem[] {
  const items: UploadAddonBundleItem[] = []
  if (payload.addons?.trackCover?.enabled) items.push({ type: "track_cover", quantity: 1 })
  if (payload.addons?.verticalVideo?.enabled) {
    items.push({ type: "vertical_video", quantity: Number(payload.addons.verticalVideo.videosCount ?? 0) })
  }
  if (payload.addons?.aiMastering?.enabled) {
    items.push({ type: "ai_mastering", quantity: Number(payload.addons.aiMastering.tracksCount ?? 0) })
  }
  if (payload.addons?.yandexVideoshot?.enabled) items.push({ type: "yandex_videoshot", quantity: 1 })
  if (payload.addons?.yandexVideoshotCreation?.enabled) {
    items.push({ type: "yandex_videoshot_creation", quantity: 1 })
  }
  if (payload.addons?.yandexVideoavatar?.enabled) items.push({ type: "yandex_videoavatar", quantity: 1 })
  if (payload.addons?.spotifyVideoshot?.enabled) items.push({ type: "spotify_videoshot", quantity: 1 })
  return items
}

export function uploadDraftAddonBundleTotalRub(payload: UploadDraftPayload): number {
  return calculateUploadAddonBundleAmount(addonBundleItemsFromUploadDraftPayload(payload)).totalRub
}
