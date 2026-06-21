import type { OrderView, OrderCategory } from "../types"
import { resolveOrderDisplayStatus } from "../order-status-map"
import type { FulfillmentStatus } from "@/lib/service-fulfillments"

const ORDER_TYPE_LABELS: Record<string, string> = {
  vertical_video: "Вертикальные видео",
  track_cover: "Обложка для трека",
  ai_mastering: "AI Мастеринг",
  ai_cover: "AI Обложки",
  yandex_videoshot: "Видеошот (Яндекс)",
  yandex_videoshot_creation: "Публикация видеошота",
  yandex_videoavatar: "Видео-аватар",
  spotify_videoshot: "Видеошот (Spotify)",
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
  upload_addon_bundle: "music",
}

export interface ApiServiceFulfillmentItem {
  orderId: string
  orderType: string
  paymentStatus: string
  fulfillmentStatus: FulfillmentStatus
  totalAmount: string
  createdAt: string
}

export function mapServiceFulfillmentToOrderView(item: ApiServiceFulfillmentItem): OrderView {
  return {
    id: item.orderId,
    serviceName: ORDER_TYPE_LABELS[item.orderType] ?? item.orderType,
    category: ORDER_TYPE_CATEGORY[item.orderType] ?? "other",
    createdAt: item.createdAt,
    amount: Number.parseFloat(item.totalAmount) || 0,
    status: resolveOrderDisplayStatus(item.paymentStatus, item.fulfillmentStatus),
    isMock: false,
  }
}

export function getServiceTitle(orderType: string): string {
  return ORDER_TYPE_LABELS[orderType] ?? orderType
}
