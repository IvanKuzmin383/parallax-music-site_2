import { query, queryOne, execute } from "./database"
import type { OrderType, UploadAddonBundleItem } from "./orders"
import { addonBundleItemsFromUploadDraftPayload } from "./cabinet-upload-draft-addons"
import { getUploadDraftByBundleOrderId, getUploadDraftById } from "./upload-drafts"
import type { UploadDraftPayload } from "./upload-drafts"
import { promises as fs } from "fs"
import path from "path"
import { getUploadsBasePath } from "./tracks"
import { parseServiceDetails, type OrderServiceDetails } from "./order-service-details"

/** Заказы услуг, для которых ведётся исполнение (отдельно от оплаты). */
export const SERVICE_ORDER_TYPES: readonly OrderType[] = [
  "vertical_video",
  "track_cover",
  "ai_mastering",
  "ai_cover",
  "yandex_videoshot",
  "yandex_videoshot_creation",
  "yandex_videoavatar",
  "spotify_videoshot",
  "upload_addon_bundle",
] as const

const SERVICE_ORDER_TYPE_SET = new Set<string>(SERVICE_ORDER_TYPES)

export type FulfillmentStatus = "new" | "in_progress" | "done"

export type ServiceFulfillmentFilter = "all" | "in_work" | "done"

export function isServiceOrderType(orderType: string): boolean {
  return SERVICE_ORDER_TYPE_SET.has(orderType)
}

export function parseServiceFulfillmentFilter(raw: string | null): ServiceFulfillmentFilter {
  if (raw === "in_work" || raw === "done") return raw
  return "all"
}

function nowIso(): string {
  return new Date().toISOString()
}

/** Вставить строку исполнения со статусом `new`, если её ещё нет (идемпотентно). */
export async function upsertNewFulfillmentIfMissing(orderId: string): Promise<void> {
  const exists = await queryOne("SELECT 1 AS ok FROM service_fulfillments WHERE order_id = ?", [orderId])
  if (exists) return
  const t = nowIso()
  await execute(
    `INSERT INTO service_fulfillments (order_id, fulfillment_status, created_at, updated_at)
     VALUES (?, 'new', ?, ?)`,
    [orderId, t, t]
  )
}

const placeholders = SERVICE_ORDER_TYPES.map(() => "?").join(", ")

/** Для всех оплаченных заказов услуг без строки исполнения - вставить `new`. */
export async function ensureMissingFulfillmentRowsForPaidOrders(options?: { userId?: string }): Promise<void> {
  const t = nowIso()
  const types = [...SERVICE_ORDER_TYPES]
  if (options?.userId) {
    await execute(
      `INSERT INTO service_fulfillments (order_id, fulfillment_status, created_at, updated_at)
       SELECT o.id, 'new', ?, ?
       FROM orders o
       WHERE o.user_id = ?
         AND o.status = 'paid'
         AND o.order_type IN (${placeholders})
         AND NOT EXISTS (SELECT 1 FROM service_fulfillments sf WHERE sf.order_id = o.id)`,
      [t, t, options.userId, ...types]
    )
  } else {
    await execute(
      `INSERT INTO service_fulfillments (order_id, fulfillment_status, created_at, updated_at)
       SELECT o.id, 'new', ?, ?
       FROM orders o
       WHERE o.status = 'paid'
         AND o.order_type IN (${placeholders})
         AND NOT EXISTS (SELECT 1 FROM service_fulfillments sf WHERE sf.order_id = o.id)`,
      [t, t, ...types]
    )
  }
}

export interface ServiceFulfillmentListRow {
  orderId: string
  orderType: string
  paymentStatus: string
  fulfillmentStatus: FulfillmentStatus
  totalAmount: string
  createdAt: string
  paidAt: string | null
  paymentId: string | null
  draftId: string | null
  tracksCount: number | null
  userId: string | null
  userEmail: string | null
  contactEmail: string | null
  contactTelegram: string | null
  aiMasteringAudioFiles: string[]
  /** Для `upload_addon_bundle`: позиции из черновика загрузки (пусто, если черновик не найден). */
  uploadAddonBundleItems: UploadAddonBundleItem[]
  /** Для `upload_addon_bundle`: запрошена AI-обложка в payload. */
  uploadAddonAiCoverRequested: boolean
  /** Детали услуги: трек, пожелания (из orders.service_details_json). */
  serviceDetails: OrderServiceDetails | null
  /** Детализация допов загрузки (трек/пожелания по каждой услуге). */
  uploadAddonDetails: UploadAddonDetailLine[]
  /** Имя трека/артиста из черновика загрузки (для upload_addon_bundle). */
  draftTrackName: string | null
  draftArtistName: string | null
}

export type UploadAddonDetailLine = {
  type: UploadAddonBundleItem["type"] | "ai_cover"
  trackTitle?: string
  comment?: string
  videosCount?: number
  tracksCount?: number
  contactType?: string
  contactValue?: string
  contactEmail?: string
  contactTelegram?: string
  trackTitles?: string[]
}

function fulfillmentFilterSql(filter: ServiceFulfillmentFilter): string {
  if (filter === "in_work") {
    return "AND sf.fulfillment_status IN ('new', 'in_progress')"
  }
  if (filter === "done") {
    return "AND sf.fulfillment_status = 'done'"
  }
  return ""
}

async function listAiMasteringAudioFiles(orderId: string): Promise<string[]> {
  try {
    const base = await getUploadsBasePath()
    const dir = path.join(base, "ai-mastering-orders", orderId)
    const names = await fs.readdir(dir)
    return names
      .filter((name) => /^track-\d+\.wav$/i.test(name))
      .sort((a, b) => {
        const ai = parseInt(a.replace(/[^\d]/g, ""), 10)
        const bi = parseInt(b.replace(/[^\d]/g, ""), 10)
        return ai - bi
      })
  } catch {
    return []
  }
}

function parseUploadAddonPayloadJson(payloadJson: string | null): UploadDraftPayload | null {
  if (!payloadJson) return null
  try {
    const payload = JSON.parse(payloadJson) as UploadDraftPayload
    if (!payload || typeof payload !== "object") return null
    return payload
  } catch {
    return null
  }
}

async function uploadAddonBundleDataForRow(
  orderType: string,
  draftId: string | null,
  orderId: string,
  payloadSnapshotJson: string | null
): Promise<{
  items: UploadAddonBundleItem[]
  aiCoverRequested: boolean
  details: UploadAddonDetailLine[]
  draftTrackName: string | null
  draftArtistName: string | null
}> {
  if (orderType !== "upload_addon_bundle") {
    return {
      items: [],
      aiCoverRequested: false,
      details: [],
      draftTrackName: null,
      draftArtistName: null,
    }
  }
  const draft = draftId ? await getUploadDraftById(draftId) : null
  const resolvedDraft = draft ?? (await getUploadDraftByBundleOrderId(orderId))
  const payload = resolvedDraft?.payload ?? parseUploadAddonPayloadJson(payloadSnapshotJson)
  if (!payload) {
    return {
      items: [],
      aiCoverRequested: false,
      details: [],
      draftTrackName: null,
      draftArtistName: null,
    }
  }
  return {
    items: addonBundleItemsFromUploadDraftPayload(payload),
    aiCoverRequested:
      Boolean(payload.requestAiCover) || Boolean(payload.addons?.trackCover?.enabled),
    details: extractUploadAddonDetails(payload),
    draftTrackName: payload.trackName?.trim() || payload.albumTitle?.trim() || null,
    draftArtistName: payload.artistName?.trim() || payload.albumArtistName?.trim() || null,
  }
}

function extractUploadAddonDetails(payload: UploadDraftPayload): UploadAddonDetailLine[] {
  const a = payload.addons ?? {}
  const lines: UploadAddonDetailLine[] = []
  if (a.trackCover?.enabled) {
    lines.push({
      type: "track_cover",
      trackTitle: a.trackCover.trackTitle,
      comment: a.trackCover.comment,
      contactType: a.trackCover.contactType,
      contactValue: a.trackCover.contactValue,
    })
  }
  if (a.verticalVideo?.enabled) {
    lines.push({
      type: "vertical_video",
      trackTitle: a.verticalVideo.trackTitle,
      comment: a.verticalVideo.comment,
      videosCount: a.verticalVideo.videosCount,
      contactType: a.verticalVideo.contactType,
      contactValue: a.verticalVideo.contactValue,
    })
  }
  if (a.aiMastering?.enabled) {
    lines.push({
      type: "ai_mastering",
      tracksCount: a.aiMastering.tracksCount,
      trackTitles: a.aiMastering.trackTitles,
      contactEmail: a.aiMastering.contactEmail,
      contactTelegram: a.aiMastering.contactTelegram,
    })
  }
  if (a.yandexVideoshot?.enabled) {
    lines.push({
      type: "yandex_videoshot",
      trackTitle: a.yandexVideoshot.trackTitle,
      comment: a.yandexVideoshot.comment,
    })
  }
  if (a.yandexVideoshotCreation?.enabled) {
    lines.push({
      type: "yandex_videoshot_creation",
      trackTitle: a.yandexVideoshotCreation.trackTitle,
      comment: a.yandexVideoshotCreation.comment,
    })
  }
  if (a.yandexVideoavatar?.enabled) {
    lines.push({
      type: "yandex_videoavatar",
      trackTitle: a.yandexVideoavatar.trackTitle,
      comment: a.yandexVideoavatar.comment,
    })
  }
  if (a.spotifyVideoshot?.enabled) {
    lines.push({
      type: "spotify_videoshot",
      trackTitle: a.spotifyVideoshot.trackTitle,
      comment: a.spotifyVideoshot.comment,
    })
  }
  if (payload.requestAiCover && !a.trackCover?.enabled) {
    lines.push({ type: "ai_cover" })
  }
  return lines
}

function mapDbRowsBase(
  rows: {
    order_id: string
    order_type: string
    payment_status: string
    fulfillment_status: string
    total_amount: string
    created_at: string
    paid_at: string | null
    payment_id: string | null
    draft_id: string | null
    tracks_count: number | null
    user_id: string | null
    user_email: string | null
    contact_email: string | null
    contact_telegram: string | null
    upload_addon_bundle_payload_json: string | null
    service_details_json: string | null
  }[]
): Promise<ServiceFulfillmentListRow[]> {
  return Promise.all(
    rows.map(async (r) => {
      const uploadAddon = await uploadAddonBundleDataForRow(
        r.order_type,
        r.draft_id,
        r.order_id,
        r.upload_addon_bundle_payload_json
      )
      return {
        orderId: r.order_id,
        orderType: r.order_type,
        paymentStatus: r.payment_status,
        fulfillmentStatus: r.fulfillment_status as FulfillmentStatus,
        totalAmount: r.total_amount,
        createdAt: r.created_at,
        paidAt: r.paid_at,
        paymentId: r.payment_id,
        draftId: r.draft_id,
        tracksCount: r.tracks_count,
        userId: r.user_id,
        userEmail: r.user_email,
        contactEmail: r.contact_email,
        contactTelegram: r.contact_telegram,
        aiMasteringAudioFiles:
          r.order_type === "ai_mastering" ? await listAiMasteringAudioFiles(r.order_id) : [],
        uploadAddonBundleItems: uploadAddon.items,
        uploadAddonAiCoverRequested: uploadAddon.aiCoverRequested,
        serviceDetails: parseServiceDetails(r.service_details_json),
        uploadAddonDetails: uploadAddon.details,
        draftTrackName: uploadAddon.draftTrackName,
        draftArtistName: uploadAddon.draftArtistName,
      }
    })
  )
}

export async function listServiceFulfillmentsForUser(
  userId: string,
  filter: ServiceFulfillmentFilter
): Promise<ServiceFulfillmentListRow[]> {
  await ensureMissingFulfillmentRowsForPaidOrders({ userId })
  const extra = fulfillmentFilterSql(filter)
  const types = [...SERVICE_ORDER_TYPES]
  const rows = await query<{
    order_id: string
    order_type: string
    payment_status: string
    fulfillment_status: string
    total_amount: string
    created_at: string
    paid_at: string | null
    payment_id: string | null
    draft_id: string | null
    tracks_count: number | null
    user_id: string | null
    user_email: string | null
    contact_email: string | null
    contact_telegram: string | null
    upload_addon_bundle_payload_json: string | null
    service_details_json: string | null
  }>(
    `SELECT o.id AS order_id, o.order_type, o.status AS payment_status, sf.fulfillment_status,
            o.total_amount, o.created_at, o.paid_at, o.payment_id, o.draft_id, o.tracks_count,
            o.user_id, cu.email AS user_email, o.user_email AS contact_email, o.telegram AS contact_telegram,
            o.upload_addon_bundle_payload_json, o.service_details_json
     FROM orders o
     INNER JOIN service_fulfillments sf ON sf.order_id = o.id
     LEFT JOIN cabinet_users cu ON cu.id = o.user_id
     WHERE o.user_id = ?
       AND o.status = 'paid'
       AND o.order_type IN (${placeholders})
       ${extra}
     ORDER BY COALESCE(o.paid_at, o.created_at) DESC
     LIMIT 200`,
    [userId, ...types]
  )

  return mapDbRowsBase(rows)
}

export async function listServiceFulfillmentsAdmin(
  filter: ServiceFulfillmentFilter
): Promise<ServiceFulfillmentListRow[]> {
  await ensureMissingFulfillmentRowsForPaidOrders()
  const extra = fulfillmentFilterSql(filter)
  const types = [...SERVICE_ORDER_TYPES]
  const rows = await query<{
    order_id: string
    order_type: string
    payment_status: string
    fulfillment_status: string
    total_amount: string
    created_at: string
    paid_at: string | null
    payment_id: string | null
    draft_id: string | null
    tracks_count: number | null
    user_id: string | null
    user_email: string | null
    contact_email: string | null
    contact_telegram: string | null
    upload_addon_bundle_payload_json: string | null
    service_details_json: string | null
  }>(
    `SELECT o.id AS order_id, o.order_type, o.status AS payment_status, sf.fulfillment_status,
            o.total_amount, o.created_at, o.paid_at, o.payment_id, o.draft_id, o.tracks_count,
            o.user_id, cu.email AS user_email, o.user_email AS contact_email, o.telegram AS contact_telegram,
            o.upload_addon_bundle_payload_json, o.service_details_json
     FROM orders o
     INNER JOIN service_fulfillments sf ON sf.order_id = o.id
     LEFT JOIN cabinet_users cu ON cu.id = o.user_id
     WHERE o.status = 'paid'
       AND o.order_type IN (${placeholders})
       ${extra}
     ORDER BY COALESCE(o.paid_at, o.created_at) DESC
     LIMIT 500`,
    types
  )

  return mapDbRowsBase(rows)
}

export async function canSetFulfillmentForOrder(orderId: string): Promise<{
  ok: boolean
  reason?: string
}> {
  const row = await queryOne<{ id: string; order_type: string; status: string }>(
    `SELECT id, order_type, status FROM orders WHERE id = ?`,
    [orderId]
  )
  if (!row) return { ok: false, reason: "ORDER_NOT_FOUND" }
  if (row.status !== "paid") return { ok: false, reason: "ORDER_NOT_PAID" }
  if (!SERVICE_ORDER_TYPE_SET.has(row.order_type)) return { ok: false, reason: "ORDER_TYPE_NOT_SERVICE" }
  return { ok: true }
}

export async function setFulfillmentStatus(orderId: string, status: FulfillmentStatus): Promise<FulfillmentStatus | null> {
  const check = await canSetFulfillmentForOrder(orderId)
  if (!check.ok) return null
  await upsertNewFulfillmentIfMissing(orderId)
  const t = nowIso()
  await execute(
    `UPDATE service_fulfillments SET fulfillment_status = ?, updated_at = ? WHERE order_id = ?`,
    [status, t, orderId]
  )
  const cur = await queryOne<{ fulfillment_status: string }>(
    `SELECT fulfillment_status FROM service_fulfillments WHERE order_id = ?`,
    [orderId]
  )
  return (cur?.fulfillment_status as FulfillmentStatus) ?? null
}
