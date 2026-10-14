import type { OrderView, OrderCategory } from "../types"
import { resolveOrderDisplayStatus } from "../order-status-map"
import type { FulfillmentStatus, UploadAddonDetailLine } from "@/lib/service-fulfillments"
import type { UploadAddonBundleItem } from "@/lib/orders"
import type { OrderServiceDetails } from "@/lib/order-service-details"
import {
  formatUploadAddonBundleLine,
  promotionTitleForUploadAddonType,
} from "@/lib/upload-addon-bundle-display"
import ruMessages from "@/messages/ru.json"

const ORDER_TYPE_LABELS: Record<string, string> = {
  vertical_video: "Вертикальные видео",
  track_cover: "Обложка для трека",
  ai_mastering: "AI Мастеринг",
  ai_cover: "AI Обложки",
  yandex_videoshot: "Видеошот (Яндекс)",
  yandex_videoshot_creation: "Публикация видеошота",
  yandex_videoavatar: "Видео-аватар",
  spotify_videoshot: "Видеошот (Spotify)",
  business_music: "Музыка для бизнеса",
  music_video: "Загрузка видеоклипа",
  lyrics_sync: "Синхронизация текста",
  upload_addon_bundle: "Доп. услуги при загрузке",
}

const ORDER_TYPE_CATEGORY: Record<string, OrderCategory> = {
  vertical_video: "design",
  track_cover: "design",
  ai_mastering: "design",
  ai_cover: "design",
  yandex_videoshot: "design",
  yandex_videoshot_creation: "design",
  yandex_videoavatar: "design",
  spotify_videoshot: "design",
  music_video: "design",
  lyrics_sync: "design",
  business_music: "promotion",
  upload_addon_bundle: "music",
}

const promotion = ruMessages.cabinet.promotion

export interface ApiServiceFulfillmentItem {
  orderId: string
  orderType: string
  paymentStatus: string
  fulfillmentStatus: FulfillmentStatus
  totalAmount: string
  createdAt: string
  uploadAddonBundleItems?: UploadAddonBundleItem[]
  uploadAddonAiCoverRequested?: boolean
  uploadAddonDetails?: UploadAddonDetailLine[]
  draftTrackName?: string | null
  draftArtistName?: string | null
  serviceDetails?: OrderServiceDetails | null
}

function formatAddonDetailLine(line: UploadAddonDetailLine): string {
  if (line.type === "ai_cover") {
    return promotion.aiCover.title
  }
  const title = promotionTitleForUploadAddonType(line.type, promotion)
  const qty =
    line.type === "vertical_video" && line.videosCount && line.videosCount > 1
      ? ` ×${line.videosCount}`
      : line.type === "ai_mastering" && line.tracksCount && line.tracksCount > 1
        ? ` ×${line.tracksCount}`
        : line.type === "lyrics_sync" && line.tracksCount && line.tracksCount > 1
          ? ` ×${line.tracksCount}`
          : ""
  const trackHint =
    line.trackTitle?.trim() ||
    (line.trackTitles?.length ? line.trackTitles.filter(Boolean).join(", ") : "")
  if (trackHint) return `${title}${qty} - ${trackHint}`
  return `${title}${qty}`
}

function buildAddonLines(item: ApiServiceFulfillmentItem): string[] {
  if (item.orderType !== "upload_addon_bundle") return []
  const details = item.uploadAddonDetails ?? []
  if (details.length > 0) {
    return details.map(formatAddonDetailLine)
  }
  const lines = (item.uploadAddonBundleItems ?? []).map((line) =>
    formatUploadAddonBundleLine(line, promotion)
  )
  if (item.uploadAddonAiCoverRequested && !lines.some((l) => l.includes(promotion.aiCover.title))) {
    lines.push(promotion.aiCover.title)
  }
  return lines
}

function resolveTrackMeta(item: ApiServiceFulfillmentItem): {
  trackName?: string
  artistName?: string
} {
  const fromDraftTrack = item.draftTrackName?.trim() || undefined
  const fromDraftArtist = item.draftArtistName?.trim() || undefined
  if (fromDraftTrack || fromDraftArtist) {
    return { trackName: fromDraftTrack, artistName: fromDraftArtist }
  }
  const details = item.serviceDetails
  if (!details) return {}
  const trackName = details.trackTitle?.trim() || undefined
  const artistName = details.artistName?.trim() || undefined
  return trackName || artistName ? { trackName, artistName } : {}
}

export function mapServiceFulfillmentToOrderView(item: ApiServiceFulfillmentItem): OrderView {
  const addonLines = buildAddonLines(item)
  const { trackName, artistName } = resolveTrackMeta(item)
  const descriptionParts: string[] = []
  if (trackName) {
    descriptionParts.push(artistName ? `${trackName} - ${artistName}` : trackName)
  } else if (artistName) {
    descriptionParts.push(artistName)
  }
  if (addonLines.length > 0) {
    descriptionParts.push(addonLines.join(", "))
  }

  return {
    id: item.orderId,
    serviceName: ORDER_TYPE_LABELS[item.orderType] ?? item.orderType,
    category: ORDER_TYPE_CATEGORY[item.orderType] ?? "other",
    createdAt: item.createdAt,
    amount: Number.parseFloat(item.totalAmount) || 0,
    status: resolveOrderDisplayStatus(item.paymentStatus, item.fulfillmentStatus),
    description: descriptionParts.length > 0 ? descriptionParts.join(". ") : undefined,
    trackName,
    artistName,
    addonLines: addonLines.length > 0 ? addonLines : undefined,
    isMock: false,
  }
}

export function getServiceTitle(orderType: string): string {
  return ORDER_TYPE_LABELS[orderType] ?? orderType
}
