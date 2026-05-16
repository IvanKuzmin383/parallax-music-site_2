import crypto from "crypto"
import { getDb } from "./db"
import { formatMoscowDateString } from "./moscow-time"
import { TRACK_COVER_PRICE_RUB } from "./track-cover-pricing"
import { getVerticalVideoUnitPrice } from "./vertical-video-pricing"
import { AI_MASTERING_PRICE_RUB, MAX_AI_MASTERING_TRACKS } from "./ai-mastering-pricing"
import { YANDEX_VIDEOSHOT_PRICE_RUB } from "./yandex-videoshot-pricing"
import { YANDEX_VIDEOSHOT_CREATION_PRICE_RUB } from "./yandex-videoshot-creation-pricing"
import { YANDEX_VIDEOAVATAR_PRICE_RUB } from "./yandex-videoavatar-pricing"
import { SPOTIFY_VIDEOSHOT_PRICE_RUB } from "./spotify-videoshot-pricing"

export type OrderType =
  | "subscription"
  | "tracks_topup"
  | "ai_mastering"
  | "vertical_video"
  | "track_cover"
  | "ai_cover"
  | "yandex_videoshot"
  | "yandex_videoshot_creation"
  | "yandex_videoavatar"
  | "spotify_videoshot"
  | "upload_addon_bundle"

export type OrderStatus = "pending" | "paid" | "failed"

export interface OrderBase {
  id: string
  status: OrderStatus
  paymentId?: string
  draftId?: string
  createdAt: string
  paidAt?: string
}

export interface OrderSubscription extends OrderBase {
  orderType: "subscription"
  userEmail: string
  telegram?: string
  planId: string
  period: string
  periodsCount: number
  totalAmount: string
  userId?: string
  /** Автопродление (рекуррент), не первичная оплата */
  isRecurringRenewal?: boolean
}

export interface OrderTracksTopup extends OrderBase {
  orderType: "tracks_topup"
  userId: string
  tracksCount: number
  totalAmount: string
}

/** Контакты для связи хранятся в user_email / telegram колонках БД */
export interface OrderAiMastering extends OrderBase {
  orderType: "ai_mastering"
  userId: string
  tracksCount: number
  totalAmount: string
  contactEmail?: string
  contactTelegram?: string
}

/** Контакты и детали заказа вертикальных видео */
export interface OrderVerticalVideo extends OrderBase {
  orderType: "vertical_video"
  userId: string
  tracksCount: number
  totalAmount: string
  contactEmail?: string
  contactTelegram?: string
}

/** Обложка для трека: фиксированная цена, контакты как у вертикальных видео */
export interface OrderTrackCover extends OrderBase {
  orderType: "track_cover"
  userId: string
  tracksCount: number
  totalAmount: string
  contactEmail?: string
  contactTelegram?: string
}

export interface OrderPromotionService extends OrderBase {
  orderType: "ai_cover" | "yandex_videoshot" | "yandex_videoshot_creation" | "yandex_videoavatar" | "spotify_videoshot"
  userId: string
  tracksCount: number
  totalAmount: string
  contactEmail?: string
  contactTelegram?: string
}

export interface UploadAddonBundleItem {
  type:
    | "track_cover"
    | "vertical_video"
    | "ai_mastering"
    | "yandex_videoshot"
    | "yandex_videoshot_creation"
    | "yandex_videoavatar"
    | "spotify_videoshot"
  quantity: number
}

export interface OrderUploadAddonBundle extends OrderBase {
  orderType: "upload_addon_bundle"
  userId: string
  totalAmount: string
  draftId: string
  tracksCount: number
  uploadAddonBundlePayloadJson?: string
}

export type Order =
  | OrderSubscription
  | OrderTracksTopup
  | OrderAiMastering
  | OrderVerticalVideo
  | OrderTrackCover
  | OrderPromotionService
  | OrderUploadAddonBundle

export type CreateOrderInput =
  | Omit<OrderSubscription, "id" | "status" | "createdAt">
  | Omit<OrderTracksTopup, "id" | "status" | "createdAt">
  | Omit<OrderAiMastering, "id" | "status" | "createdAt">
  | Omit<OrderVerticalVideo, "id" | "status" | "createdAt">
  | Omit<OrderTrackCover, "id" | "status" | "createdAt">
  | Omit<OrderPromotionService, "id" | "status" | "createdAt">
  | Omit<OrderUploadAddonBundle, "id" | "status" | "createdAt">

interface OrderRow {
  id: string
  order_type: string
  status: string
  payment_id: string | null
  created_at: string
  paid_at: string | null
  user_email: string | null
  telegram: string | null
  plan_id: string | null
  period: string | null
  periods_count: number | null
  total_amount: string
  user_id: string | null
  tracks_count: number | null
  is_recurring_renewal: number | null
  draft_id: string | null
  upload_addon_bundle_payload_json: string | null
}

function rowToOrder(row: OrderRow): Order {
  const base: OrderBase = {
    id: row.id,
    status: row.status as OrderStatus,
    paymentId: row.payment_id ?? undefined,
    draftId: row.draft_id ?? undefined,
    createdAt: row.created_at,
    paidAt: row.paid_at ?? undefined,
  }
  if (row.order_type === "upload_addon_bundle") {
    return {
      ...base,
      orderType: "upload_addon_bundle",
      userId: row.user_id ?? "",
      totalAmount: row.total_amount,
      draftId: row.draft_id ?? "",
      tracksCount: row.tracks_count ?? 0,
      uploadAddonBundlePayloadJson: row.upload_addon_bundle_payload_json ?? undefined,
    }
  }
  if (row.order_type === "tracks_topup") {
    return {
      ...base,
      orderType: "tracks_topup",
      userId: row.user_id ?? "",
      tracksCount: row.tracks_count ?? 0,
      totalAmount: row.total_amount,
    }
  }
  if (row.order_type === "ai_mastering") {
    return {
      ...base,
      orderType: "ai_mastering",
      userId: row.user_id ?? "",
      tracksCount: row.tracks_count ?? 0,
      totalAmount: row.total_amount,
      contactEmail: row.user_email ?? undefined,
      contactTelegram: row.telegram ?? undefined,
    }
  }
  if (row.order_type === "vertical_video") {
    return {
      ...base,
      orderType: "vertical_video",
      userId: row.user_id ?? "",
      tracksCount: row.tracks_count ?? 0,
      totalAmount: row.total_amount,
      contactEmail: row.user_email ?? undefined,
      contactTelegram: row.telegram ?? undefined,
    }
  }
  if (row.order_type === "track_cover") {
    return {
      ...base,
      orderType: "track_cover",
      userId: row.user_id ?? "",
      tracksCount: row.tracks_count ?? 0,
      totalAmount: row.total_amount,
      contactEmail: row.user_email ?? undefined,
      contactTelegram: row.telegram ?? undefined,
    }
  }
  if (
    row.order_type === "ai_cover" ||
    row.order_type === "yandex_videoshot" ||
    row.order_type === "yandex_videoshot_creation" ||
    row.order_type === "yandex_videoavatar" ||
    row.order_type === "spotify_videoshot"
  ) {
    return {
      ...base,
      orderType: row.order_type,
      userId: row.user_id ?? "",
      tracksCount: row.tracks_count ?? 0,
      totalAmount: row.total_amount,
      contactEmail: row.user_email ?? undefined,
      contactTelegram: row.telegram ?? undefined,
    } as OrderPromotionService
  }
  return {
    ...base,
    orderType: "subscription",
    userEmail: row.user_email ?? "",
    telegram: row.telegram ?? undefined,
    planId: row.plan_id ?? "",
    period: row.period ?? "",
    periodsCount: row.periods_count ?? 0,
    totalAmount: row.total_amount,
    userId: row.user_id ?? undefined,
    isRecurringRenewal: row.is_recurring_renewal === 1,
  }
}

export async function createOrder(order: CreateOrderInput): Promise<Order> {
  const id = crypto.randomUUID()
  const createdAt = new Date().toISOString()
  const orderType = order.orderType
  const totalAmount = order.totalAmount

  const db = getDb()
  if (orderType === "upload_addon_bundle") {
    const o = order as Omit<OrderUploadAddonBundle, "id" | "status" | "createdAt">
    db.prepare(`
      INSERT INTO orders (id, order_type, status, payment_id, created_at, paid_at, user_email, telegram, plan_id, period, periods_count, total_amount, user_id, tracks_count, draft_id, upload_addon_bundle_payload_json)
      VALUES (?, ?, 'pending', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      "upload_addon_bundle",
      null,
      createdAt,
      null,
      null,
      null,
      null,
      null,
      null,
      totalAmount,
      o.userId,
      o.tracksCount,
      o.draftId,
      o.uploadAddonBundlePayloadJson ?? null
    )
    return rowToOrder(db.prepare("SELECT * FROM orders WHERE id = ?").get(id) as OrderRow)
  }
  if (orderType === "subscription") {
    const o = order as Omit<OrderSubscription, "id" | "status" | "createdAt">
    const recurring = o.isRecurringRenewal ? 1 : 0
    db.prepare(`
      INSERT INTO orders (id, order_type, status, payment_id, created_at, paid_at, user_email, telegram, plan_id, period, periods_count, total_amount, user_id, tracks_count, is_recurring_renewal)
      VALUES (?, ?, 'pending', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      "subscription",
      null,
      createdAt,
      null,
      o.userEmail,
      o.telegram ?? null,
      o.planId,
      o.period,
      o.periodsCount,
      totalAmount,
      o.userId ?? null,
      null,
      recurring
    )
    return rowToOrder(db.prepare("SELECT * FROM orders WHERE id = ?").get(id) as OrderRow)
  }
  if (orderType === "tracks_topup") {
    const o = order as Omit<OrderTracksTopup, "id" | "status" | "createdAt">
    db.prepare(`
      INSERT INTO orders (id, order_type, status, payment_id, created_at, paid_at, user_email, telegram, plan_id, period, periods_count, total_amount, user_id, tracks_count)
      VALUES (?, ?, 'pending', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      "tracks_topup",
      null,
      createdAt,
      null,
      null,
      null,
      null,
      null,
      null,
      totalAmount,
      o.userId,
      o.tracksCount
    )
    return rowToOrder(db.prepare("SELECT * FROM orders WHERE id = ?").get(id) as OrderRow)
  }
  if (orderType === "vertical_video") {
    const o = order as Omit<OrderVerticalVideo, "id" | "status" | "createdAt">
    db.prepare(`
      INSERT INTO orders (id, order_type, status, payment_id, created_at, paid_at, user_email, telegram, plan_id, period, periods_count, total_amount, user_id, tracks_count)
      VALUES (?, ?, 'pending', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      "vertical_video",
      null,
      createdAt,
      null,
      o.contactEmail?.trim() || null,
      o.contactTelegram?.trim() || null,
      null,
      null,
      null,
      totalAmount,
      o.userId,
      o.tracksCount
    )
    return rowToOrder(db.prepare("SELECT * FROM orders WHERE id = ?").get(id) as OrderRow)
  }
  if (orderType === "track_cover") {
    const o = order as Omit<OrderTrackCover, "id" | "status" | "createdAt">
    db.prepare(`
      INSERT INTO orders (id, order_type, status, payment_id, created_at, paid_at, user_email, telegram, plan_id, period, periods_count, total_amount, user_id, tracks_count)
      VALUES (?, ?, 'pending', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      "track_cover",
      null,
      createdAt,
      null,
      o.contactEmail?.trim() || null,
      o.contactTelegram?.trim() || null,
      null,
      null,
      null,
      totalAmount,
      o.userId,
      o.tracksCount
    )
    return rowToOrder(db.prepare("SELECT * FROM orders WHERE id = ?").get(id) as OrderRow)
  }
  if (
    orderType === "ai_cover" ||
    orderType === "yandex_videoshot" ||
    orderType === "yandex_videoshot_creation" ||
    orderType === "yandex_videoavatar" ||
    orderType === "spotify_videoshot"
  ) {
    const o = order as Omit<OrderPromotionService, "id" | "status" | "createdAt">
    db.prepare(`
      INSERT INTO orders (id, order_type, status, payment_id, created_at, paid_at, user_email, telegram, plan_id, period, periods_count, total_amount, user_id, tracks_count)
      VALUES (?, ?, 'pending', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      orderType,
      null,
      createdAt,
      null,
      o.contactEmail?.trim() || null,
      o.contactTelegram?.trim() || null,
      null,
      null,
      null,
      totalAmount,
      o.userId,
      o.tracksCount
    )
    return rowToOrder(db.prepare("SELECT * FROM orders WHERE id = ?").get(id) as OrderRow)
  }
  const o = order as Omit<OrderAiMastering, "id" | "status" | "createdAt">
  db.prepare(`
    INSERT INTO orders (id, order_type, status, payment_id, created_at, paid_at, user_email, telegram, plan_id, period, periods_count, total_amount, user_id, tracks_count)
    VALUES (?, ?, 'pending', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    "ai_mastering",
    null,
    createdAt,
    null,
    o.contactEmail?.trim() || null,
    o.contactTelegram?.trim() || null,
    null,
    null,
    null,
    totalAmount,
    o.userId,
    o.tracksCount
  )
  return rowToOrder(db.prepare("SELECT * FROM orders WHERE id = ?").get(id) as OrderRow)
}

export async function getOrderById(id: string): Promise<Order | null> {
  const db = getDb()
  const row = db.prepare("SELECT * FROM orders WHERE id = ?").get(id) as OrderRow | undefined
  return row ? rowToOrder(row) : null
}

export async function getOrderByPaymentId(paymentId: string): Promise<Order | null> {
  const db = getDb()
  const row = db.prepare("SELECT * FROM orders WHERE payment_id = ?").get(paymentId) as OrderRow | undefined
  return row ? rowToOrder(row) : null
}

export async function updateOrderStatus(
  id: string,
  status: OrderStatus,
  updates?: { paymentId?: string; paidAt?: string; userId?: string }
): Promise<Order | null> {
  const order = await getOrderById(id)
  if (!order) return null

  const db = getDb()
  const setClauses: string[] = ["status = ?"]
  const params: (string | null)[] = [status]

  if (updates?.paymentId !== undefined) {
    setClauses.push("payment_id = ?")
    params.push(updates.paymentId)
  }
  if (updates?.paidAt !== undefined) {
    setClauses.push("paid_at = ?")
    params.push(updates.paidAt)
  }
  if (updates?.userId !== undefined && order.orderType === "subscription") {
    setClauses.push("user_id = ?")
    params.push(updates.userId)
  }

  params.push(id)
  db.prepare(`UPDATE orders SET ${setClauses.join(", ")} WHERE id = ?`).run(...params)

  return getOrderById(id)
}

export async function getPaidOrdersByEmail(email: string): Promise<Order[]> {
  const db = getDb()
  const rows = db
    .prepare("SELECT * FROM orders WHERE status = 'paid' AND order_type = 'subscription' AND LOWER(user_email) = LOWER(?)")
    .all(email) as OrderRow[]
  return rows.map(rowToOrder)
}

export async function hasPendingRecurringSubscriptionChargeToday(userEmail: string): Promise<boolean> {
  const db = getDb()
  const rows = db
    .prepare(
      `SELECT created_at FROM orders
       WHERE order_type = 'subscription' AND status = 'pending'
         AND is_recurring_renewal = 1 AND LOWER(user_email) = LOWER(?)`
    )
    .all(userEmail.trim()) as { created_at: string }[]
  const todayMoscow = formatMoscowDateString(new Date())
  return rows.some((r) => formatMoscowDateString(new Date(r.created_at)) === todayMoscow)
}

export function calculateUploadAddonBundleAmount(items: UploadAddonBundleItem[]): { totalRub: number; aiMasteringTracksCount: number } {
  let totalRub = 0
  let aiMasteringTracksCount = 0
  for (const item of items) {
    if (!item || item.quantity <= 0) continue
    if (item.type === "track_cover") {
      totalRub += TRACK_COVER_PRICE_RUB
      continue
    }
    if (item.type === "vertical_video") {
      totalRub += getVerticalVideoUnitPrice(item.quantity) * item.quantity
      continue
    }
    if (item.type === "ai_mastering") {
      const bounded = Math.min(item.quantity, MAX_AI_MASTERING_TRACKS)
      aiMasteringTracksCount += bounded
      totalRub += AI_MASTERING_PRICE_RUB * bounded
      continue
    }
    if (item.type === "yandex_videoshot") {
      totalRub += YANDEX_VIDEOSHOT_PRICE_RUB * item.quantity
      continue
    }
    if (item.type === "yandex_videoshot_creation") {
      totalRub += YANDEX_VIDEOSHOT_CREATION_PRICE_RUB * item.quantity
      continue
    }
    if (item.type === "yandex_videoavatar") {
      totalRub += YANDEX_VIDEOAVATAR_PRICE_RUB * item.quantity
      continue
    }
    if (item.type === "spotify_videoshot") {
      totalRub += SPOTIFY_VIDEOSHOT_PRICE_RUB * item.quantity
    }
  }
  return { totalRub, aiMasteringTracksCount }
}
