export type VideoClipStatus =
  | "draft"
  | "awaiting_payment"
  | "on_moderation"
  | "on_platforms"
  | "rejected"

export const VIDEO_CLIP_STATUS_LABELS: Record<VideoClipStatus, string> = {
  draft: "Черновик",
  awaiting_payment: "Ожидает оплаты",
  on_moderation: "На модерации",
  on_platforms: "На площадках",
  rejected: "Отклонён",
}

export type VideoClipPlatformLinks = {
  appleMusic: string | null
  yandex: string | null
  vk: string | null
}

export type VideoClipView = {
  id: string
  title: string
  artist: string
  status: VideoClipStatus
  trackId: string | null
  orderId: string | null
  fileUrl: string | null
  coverUrl: string | null
  comment: string | null
  previewTimecodeSec: number | null
  platforms: string[]
  platformLinks: VideoClipPlatformLinks
  releaseDate: string | null
  createdAt: string
  updatedAt: string
}
