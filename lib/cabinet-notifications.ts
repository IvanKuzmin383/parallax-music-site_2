import crypto from "crypto"
import { execute, query, queryOne } from "@/lib/database"
import { getCabinetUserByEmail, getCabinetUserById } from "@/lib/cabinet-users"

export type CabinetNotificationType =
  | "release_status"
  | "release_moderation_note"
  | "withdrawal_status"
  | "payment_success"
  | "royalty_to_wallet"

export type CabinetNotification = {
  id: string
  userId: string
  type: CabinetNotificationType | string
  title: string
  body: string | null
  href: string | null
  entityType: string | null
  entityId: string | null
  readAt: string | null
  createdAt: string
}

type NotificationRow = {
  id: string
  user_id: string
  type: string
  title: string
  body: string | null
  href: string | null
  entity_type: string | null
  entity_id: string | null
  read_at: string | null
  created_at: string
}

const RELEASE_STATUS_LABELS: Record<string, string> = {
  draft: "Черновик",
  awaiting_payment: "Ожидает оплаты",
  upload_pending: "Требуется доработка",
  on_moderation: "На модерации",
  sent_to_platforms: "Отправлен агрегатору",
  approved_by_platforms: "Отправлен на площадки",
  released: "Выпущен",
  rejected: "Отклонён",
  postponed: "Отозван",
}

const ORDER_TYPE_LABELS: Record<string, string> = {
  subscription: "Подписка",
  fix_pack: "Пакет треков Fix",
  tracks_topup: "Докупка треков",
  ai_mastering: "AI-мастеринг",
  vertical_video: "Вертикальное видео",
  track_cover: "Обложка трека",
  ai_cover: "AI-обложка",
  yandex_videoshot: "Яндекс Видеошот",
  yandex_videoshot_creation: "Создание видеошота",
  yandex_videoavatar: "Видео-аватар",
  spotify_videoshot: "Spotify Video Shot",
  upload_addon_bundle: "Дополнения к релизу",
}

function rowToNotification(row: NotificationRow): CabinetNotification {
  return {
    id: row.id,
    userId: row.user_id,
    type: row.type,
    title: row.title,
    body: row.body,
    href: row.href,
    entityType: row.entity_type,
    entityId: row.entity_id,
    readAt: row.read_at,
    createdAt: row.created_at,
  }
}

/** Релизы часто хранят email в user_id; заявки на вывод — UUID. */
export async function resolveCabinetUserId(
  userKey: string | null | undefined
): Promise<string | null> {
  const key = userKey?.trim()
  if (!key) return null
  if (key.includes("@")) {
    const byEmail = await getCabinetUserByEmail(key)
    return byEmail?.id ?? null
  }
  const byId = await getCabinetUserById(key)
  if (byId) return byId.id
  const byEmailFallback = await getCabinetUserByEmail(key)
  return byEmailFallback?.id ?? null
}

export async function createCabinetNotification(params: {
  userId: string
  type: CabinetNotificationType | string
  title: string
  body?: string | null
  href?: string | null
  entityType?: string | null
  entityId?: string | null
}): Promise<CabinetNotification> {
  const id = crypto.randomUUID()
  const createdAt = new Date().toISOString()
  await execute(
    `
    INSERT INTO cabinet_notifications (
      id, user_id, type, title, body, href, entity_type, entity_id, read_at, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, ?)
    `,
    [
      id,
      params.userId,
      params.type,
      params.title.trim(),
      params.body?.trim() || null,
      params.href?.trim() || null,
      params.entityType ?? null,
      params.entityId ?? null,
      createdAt,
    ]
  )
  return {
    id,
    userId: params.userId,
    type: params.type,
    title: params.title.trim(),
    body: params.body?.trim() || null,
    href: params.href?.trim() || null,
    entityType: params.entityType ?? null,
    entityId: params.entityId ?? null,
    readAt: null,
    createdAt,
  }
}

/** Ошибка записи не должна ломать основной поток. */
export async function tryCreateCabinetNotification(
  params: Parameters<typeof createCabinetNotification>[0]
): Promise<CabinetNotification | null> {
  try {
    return await createCabinetNotification(params)
  } catch (error) {
    console.error("[cabinet-notifications] create failed:", error)
    return null
  }
}

export async function listCabinetNotifications(
  userId: string,
  options?: { limit?: number; unreadOnly?: boolean }
): Promise<CabinetNotification[]> {
  const limit = Math.min(Math.max(options?.limit ?? 30, 1), 100)
  const unreadOnly = Boolean(options?.unreadOnly)
  const rows = await query<NotificationRow>(
    `
    SELECT * FROM cabinet_notifications
    WHERE user_id = ?
      ${unreadOnly ? "AND read_at IS NULL" : ""}
    ORDER BY created_at DESC
    LIMIT ?
    `,
    [userId, limit]
  )
  return rows.map(rowToNotification)
}

export async function countUnreadCabinetNotifications(userId: string): Promise<number> {
  const row = await queryOne<{ count: number | string }>(
    `
    SELECT COUNT(*)::int AS count
    FROM cabinet_notifications
    WHERE user_id = ? AND read_at IS NULL
    `,
    [userId]
  )
  return Number(row?.count ?? 0)
}

export async function markCabinetNotificationsRead(
  userId: string,
  ids: string[]
): Promise<number> {
  const clean = [...new Set(ids.map((id) => id.trim()).filter(Boolean))]
  if (clean.length === 0) return 0
  const now = new Date().toISOString()
  const placeholders = clean.map(() => "?").join(", ")
  return execute(
    `
    UPDATE cabinet_notifications
    SET read_at = ?
    WHERE user_id = ?
      AND read_at IS NULL
      AND id IN (${placeholders})
    `,
    [now, userId, ...clean]
  )
}

export async function markAllCabinetNotificationsRead(userId: string): Promise<number> {
  const now = new Date().toISOString()
  return execute(
    `
    UPDATE cabinet_notifications
    SET read_at = ?
    WHERE user_id = ? AND read_at IS NULL
    `,
    [now, userId]
  )
}

function releaseStatusLabel(status: string): string {
  return RELEASE_STATUS_LABELS[status] ?? status
}

function truncate(text: string, max = 180): string {
  const t = text.trim()
  if (t.length <= max) return t
  return `${t.slice(0, max - 1)}…`
}

/** Уведомление при смене статуса / комментария модерации релиза. */
export async function tryNotifyReleaseModeration(params: {
  releaseUserKey: string
  releaseId: string
  releaseTitle: string
  prevStatus: string
  nextStatus?: string
  nextNote?: string | null
  noteChanged: boolean
}): Promise<void> {
  const userId = await resolveCabinetUserId(params.releaseUserKey)
  if (!userId) return

  const href = `/cabinet/music/releases/${params.releaseId}`
  const titleName = params.releaseTitle.trim() || "Релиз"
  const statusChanged =
    params.nextStatus !== undefined && params.nextStatus !== params.prevStatus

  if (statusChanged && params.nextStatus) {
    const label = releaseStatusLabel(params.nextStatus)
    let title = `Релиз: ${label}`
    if (params.nextStatus === "upload_pending") title = "Требуется доработка релиза"
    if (params.nextStatus === "rejected") title = "Релиз отклонён"
    if (params.nextStatus === "postponed") title = "Релиз отозван"
    if (params.nextStatus === "released") title = "Релиз выпущен"
    if (params.nextStatus === "sent_to_platforms") title = "Релиз отправлен агрегатору"
    if (params.nextStatus === "approved_by_platforms") title = "Релиз отправлен на площадки"
    if (params.nextStatus === "on_moderation") title = "Релиз на модерации"

    const bodyParts = [`«${titleName}» — статус: ${label}.`]
    if (
      params.nextNote &&
      (params.nextStatus === "upload_pending" ||
        params.nextStatus === "rejected" ||
        params.nextStatus === "postponed")
    ) {
      bodyParts.push(truncate(params.nextNote))
    }

    await tryCreateCabinetNotification({
      userId,
      type: "release_status",
      title,
      body: bodyParts.join(" "),
      href,
      entityType: "release",
      entityId: params.releaseId,
    })
    return
  }

  if (params.noteChanged && params.nextNote) {
    await tryCreateCabinetNotification({
      userId,
      type: "release_moderation_note",
      title: "Новый комментарий модерации",
      body: `«${titleName}»: ${truncate(params.nextNote)}`,
      href,
      entityType: "release",
      entityId: params.releaseId,
    })
  }
}

export async function tryNotifyWithdrawalStatus(params: {
  userId: string
  withdrawalId: string
  amount: number
  status: "completed" | "rejected" | string
}): Promise<void> {
  if (params.status !== "completed" && params.status !== "rejected") return
  const amountLabel = params.amount.toLocaleString("ru-RU")
  const title =
    params.status === "completed"
      ? "Вывод роялти выполнен"
      : "Вывод роялти отклонён"
  const body =
    params.status === "completed"
      ? `Заявка на ${amountLabel} ₽ отмечена как выполненная.`
      : `Заявка на ${amountLabel} ₽ отклонена.`

  await tryCreateCabinetNotification({
    userId: params.userId,
    type: "withdrawal_status",
    title,
    body,
    href: "/cabinet/finance/royalty-withdrawal",
    entityType: "withdrawal",
    entityId: params.withdrawalId,
  })
}

export async function tryNotifyPaymentSuccess(params: {
  userKey?: string | null
  orderId: string
  orderType: string
  amountRub?: string | number | null
}): Promise<void> {
  const userId = await resolveCabinetUserId(params.userKey)
  if (!userId) return

  const typeLabel = ORDER_TYPE_LABELS[params.orderType] ?? "Заказ"
  const amount =
    params.amountRub != null && String(params.amountRub).trim()
      ? `${String(params.amountRub)} ₽`
      : null

  await tryCreateCabinetNotification({
    userId,
    type: "payment_success",
    title: `Оплата прошла: ${typeLabel}`,
    body: amount ? `Сумма ${amount}. Заказ доступен в разделе «Заказы».` : "Заказ доступен в разделе «Заказы».",
    href: `/cabinet/orders/${params.orderId}`,
    entityType: "order",
    entityId: params.orderId,
  })
}

export async function tryNotifyRoyaltyToWallet(params: {
  userId: string
  amount: number
}): Promise<void> {
  const amountLabel = params.amount.toLocaleString("ru-RU")
  await tryCreateCabinetNotification({
    userId: params.userId,
    type: "royalty_to_wallet",
    title: "Роялти переведены на баланс",
    body: `${amountLabel} ₽ доступны для оплаты услуг.`,
    href: "/cabinet/finance/balance",
    entityType: "balance",
    entityId: params.userId,
  })
}
