import type { UploadAddonBundleItem } from "./orders"
import type ruMessages from "@/messages/ru.json"

type CabinetPromotion = (typeof ruMessages)["cabinet"]["promotion"]

export function promotionTitleForUploadAddonType(
  type: UploadAddonBundleItem["type"],
  p: CabinetPromotion
): string {
  switch (type) {
    case "track_cover":
      return p.trackCover.title
    case "vertical_video":
      return p.verticalVideo.title
    case "ai_mastering":
      return p.aiMastering.title
    case "yandex_videoshot":
      return p.yandexVideoshot.title
    case "yandex_videoshot_creation":
      return p.yandexVideoshotCreation.title
    case "yandex_videoavatar":
      return p.yandexVideoavatar.title
    case "spotify_videoshot":
      return p.spotifyVideoshot.title
    default:
      return type
  }
}

export function formatUploadAddonBundleLine(item: UploadAddonBundleItem, p: CabinetPromotion): string {
  const base = promotionTitleForUploadAddonType(item.type, p)
  if (item.quantity > 1) return `${base} ×${item.quantity}`
  return base
}
