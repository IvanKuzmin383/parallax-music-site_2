import { getDb } from "./db"
import type { OrderType, UploadAddonBundleItem } from "./orders"
import { addonBundleItemsFromUploadDraftPayload } from "./cabinet-upload-draft-addons"
import { getUploadDraftByBundleOrderId, getUploadDraftById } from "./upload-drafts"
import type { UploadDraftPayload } from "./upload-drafts"
import { promises as fs } from "fs"
import path from "path"
import { getUploadsBasePath } from "./tracks"

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
export function upsertNewFulfillmentIfMissing(orderId: string): void {
  const db = getDb()
  const exists = db.prepare("SELECT 1 FROM service_fulfillments WHERE order_id = ?").get(orderId)
  if (exists) return
  const t = nowIso()
  db.prepare(
    `INSERT INTO service_fulfillments (order_id, fulfillment_status, created_at, updated_at)
     VALUES (?, 'new', ?, ?)`
  ).run(orderId, t, t)
}

const placeholders = SERVICE_ORDER_TYPES.map(() => "?").join(", ")

/** Для всех оплаченных заказов услуг без строки исполнения - вставить `new`. */
export function ensureMissingFulfillmentRowsForPaidOrders(options?: { userId?: string }): void {
  const db = getDb()
  const t = nowIso()
  const types = [...SERVICE_ORDER_TYPES]
  if (options?.userId) {
    db.prepare(
      `INSERT INTO service_fulfillments (order_id, fulfillment_status, created_at, updated_at)
       SELECT o.id, 'new', ?, ?
       FROM orders o
       WHERE o.user_id = ?
         AND o.status = 'paid'
         AND o.order_type IN (${placeholders})
         AND NOT EXISTS (SELECT 1 FROM service_fulfillments sf WHERE sf.order_id = o.id)`
    ).run(t, t, options.userId, ...types)
  } else {
    db.prepare(
      `INSERT INTO service_fulfillments (order_id, fulfillment_status, created_at, updated_at)
       SELECT o.id, 'new', ?, ?
       FROM orders o
       WHERE o.status = 'paid'
         AND o.order_type IN (${placeholders})
         AND NOT EXISTS (SELECT 1 FROM service_fulfillments sf WHERE sf.order_id = o.id)`
    ).run(t, t, ...types)
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
): Promise<{ items: UploadAddonBundleItem[]; aiCoverRequested: boolean }> {
  if (orderType !== "upload_addon_bundle") return { items: [], aiCoverRequested: false }
  const draft = draftId ? await getUploadDraftById(draftId) : null
  const resolvedDraft = draft ?? (await getUploadDraftByBundleOrderId(orderId))
  const payload = resolvedDraft?.payload ?? parseUploadAddonPayloadJson(payloadSnapshotJson)
  if (!payload) return { items: [], aiCoverRequested: false }
  return {
    items: addonBundleItemsFromUploadDraftPayload(payload),
    aiCoverRequested:
      Boolean(payload.requestAiCover) || Boolean(payload.addons?.trackCover?.enabled),
  }
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
      }
    })
  )
}

export async function listServiceFulfillmentsForUser(
  userId: string,
  filter: ServiceFulfillmentFilter
): Promise<ServiceFulfillmentListRow[]> {
  ensureMissingFulfillmentRowsForPaidOrders({ userId })
  const db = getDb()
  const extra = fulfillmentFilterSql(filter)
  const types = [...SERVICE_ORDER_TYPES]
  const rows = db
    .prepare(
      `SELECT o.id AS order_id, o.order_type, o.status AS payment_status, sf.fulfillment_status,
              o.total_amount, o.created_at, o.paid_at, o.payment_id, o.draft_id, o.tracks_count,
              o.user_id, cu.email AS user_email, o.user_email AS contact_email, o.telegram AS contact_telegram,
              o.upload_addon_bundle_payload_json
       FROM orders o
       INNER JOIN service_fulfillments sf ON sf.order_id = o.id
       LEFT JOIN cabinet_users cu ON cu.id = o.user_id
       WHERE o.user_id = ?
         AND o.status = 'paid'
         AND o.order_type IN (${placeholders})
         ${extra}
       ORDER BY datetime(COALESCE(o.paid_at, o.created_at)) DESC
       LIMIT 200`
    )
    .all(userId, ...types) as {
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
  }[]

  return mapDbRowsBase(rows)
}

export async function listServiceFulfillmentsAdmin(
  filter: ServiceFulfillmentFilter
): Promise<ServiceFulfillmentListRow[]> {
  ensureMissingFulfillmentRowsForPaidOrders()
  const db = getDb()
  const extra = fulfillmentFilterSql(filter)
  const types = [...SERVICE_ORDER_TYPES]
  const rows = db
    .prepare(
      `SELECT o.id AS order_id, o.order_type, o.status AS payment_status, sf.fulfillment_status,
              o.total_amount, o.created_at, o.paid_at, o.payment_id, o.draft_id, o.tracks_count,
              o.user_id, cu.email AS user_email, o.user_email AS contact_email, o.telegram AS contact_telegram,
              o.upload_addon_bundle_payload_json
       FROM orders o
       INNER JOIN service_fulfillments sf ON sf.order_id = o.id
       LEFT JOIN cabinet_users cu ON cu.id = o.user_id
       WHERE o.status = 'paid'
         AND o.order_type IN (${placeholders})
         ${extra}
       ORDER BY datetime(COALESCE(o.paid_at, o.created_at)) DESC
       LIMIT 500`
    )
    .all(...types) as {
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
  }[]

  return mapDbRowsBase(rows)
}

export function canSetFulfillmentForOrder(orderId: string): {
  ok: boolean
  reason?: string
} {
  const db = getDb()
  const row = db
    .prepare(
      `SELECT id, order_type, status FROM orders WHERE id = ?`
    )
    .get(orderId) as { id: string; order_type: string; status: string } | undefined
  if (!row) return { ok: false, reason: "ORDER_NOT_FOUND" }
  if (row.status !== "paid") return { ok: false, reason: "ORDER_NOT_PAID" }
  if (!SERVICE_ORDER_TYPE_SET.has(row.order_type)) return { ok: false, reason: "ORDER_TYPE_NOT_SERVICE" }
  return { ok: true }
}

export function setFulfillmentStatus(orderId: string, status: FulfillmentStatus): FulfillmentStatus | null {
  const check = canSetFulfillmentForOrder(orderId)
  if (!check.ok) return null
  upsertNewFulfillmentIfMissing(orderId)
  const db = getDb()
  const t = nowIso()
  db.prepare(
    `UPDATE service_fulfillments SET fulfillment_status = ?, updated_at = ? WHERE order_id = ?`
  ).run(status, t, orderId)
  const cur = db
    .prepare(`SELECT fulfillment_status FROM service_fulfillments WHERE order_id = ?`)
    .get(orderId) as { fulfillment_status: string } | undefined
  return (cur?.fulfillment_status as FulfillmentStatus) ?? null
}
