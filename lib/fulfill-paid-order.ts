import { promises as fs } from "fs"
import path from "path"
import { getCabinetUserByEmail, getCabinetUserById, updateCabinetUserPurchasedTracks } from "@/lib/cabinet-users"
import { isStaffNotificationConfigured, notifyStaffInBackground } from "@/lib/form-notifications"
import type { Order } from "@/lib/orders"
import { updateOrderStatus } from "@/lib/orders"
import { isServiceOrderType, upsertNewFulfillmentIfMissing } from "@/lib/service-fulfillments"
import { escapeHtml } from "@/lib/telegram"
import { markUploadDraftPaid } from "@/lib/upload-drafts"
import { getUploadsBasePath } from "@/lib/tracks"

async function tryRecordServiceFulfillment(orderId: string, orderType: string) {
  if (!isServiceOrderType(orderType)) return
  try {
    await upsertNewFulfillmentIfMissing(orderId)
  } catch (e) {
    console.error("[fulfill-paid-order] service_fulfillments insert failed", { orderId, orderType, e })
  }
}

function notifyStaff(
  telegramMessage: string,
  emailSubject: string,
  logContext: string,
  provider: "tbank" | "yookassa"
) {
  if (!isStaffNotificationConfigured()) return
  notifyStaffInBackground({
    telegramMessage,
    emailSubject,
    logContext: `payments/${provider}/webhook ${logContext}`,
  })
}

async function listAiMasteringFilenames(orderId: string): Promise<string[]> {
  try {
    const base = await getUploadsBasePath()
    const dir = path.join(base, "ai-mastering-orders", orderId)
    const names = await fs.readdir(dir)
    return names
      .filter((name) => /^track-\d+\.wav$/i.test(name))
      .sort((a, b) => parseInt(a.replace(/[^\d]/g, ""), 10) - parseInt(b.replace(/[^\d]/g, ""), 10))
  } catch {
    return []
  }
}

export type FulfillPaidOrderParams = {
  order: Order
  paymentId: string
  paidAt: string
  amountRub?: string
  metadata?: Record<string, string>
  provider?: "tbank" | "yookassa"
}

/**
 * Бизнес-логика после успешной оплаты (кроме подписки — она только в ЮKassa webhook).
 */
export async function fulfillPaidOrder(params: FulfillPaidOrderParams): Promise<void> {
  const { order, paymentId, paidAt } = params
  const orderId = order.id
  const amount = params.amountRub ?? order.totalAmount
  const metadata = params.metadata ?? {}
  const provider = params.provider ?? "tbank"

  if (order.orderType === "subscription") {
    console.error("[fulfill-paid-order] subscription must use fulfillSubscriptionOrder", orderId)
    return
  }

  if (order.orderType === "fix_pack") {
    console.error("[fulfill-paid-order] fix_pack must use fulfillFixPackOrder", orderId)
    return
  }

  if (order.orderType === "tracks_topup") {
    const updatedUser = await updateCabinetUserPurchasedTracks(order.userId, order.tracksCount)
    if (!updatedUser) {
      console.error("[fulfill-paid-order] User not found for tracks_topup", { orderId, userId: order.userId })
    }
    await updateOrderStatus(orderId, "paid", { paidAt, paymentId })

    const user = updatedUser ?? (await getCabinetUserById(order.userId))
    const email = user?.email ?? `userId=${order.userId}`
    notifyStaff(
      [
        "<b>Выполнена оплата (тариф Fix)</b>",
        "",
        `<b>Пользователь:</b> ${escapeHtml(email)}`,
        `<b>Количество треков:</b> ${order.tracksCount}`,
        `<b>Сумма:</b> ${escapeHtml(String(amount))} RUB`,
        `<b>ID заказа:</b> ${escapeHtml(orderId)}`,
        `<b>ID платежа:</b> ${escapeHtml(paymentId)}`,
        "",
        "#оплата #кабинет",
      ].join("\n"),
      `[Parallax] Оплата Fix: ${email}`,
      "tracks_topup",
      provider
    )
    return
  }

  if (order.orderType === "ai_mastering") {
    await updateOrderStatus(orderId, "paid", { paidAt, paymentId })
    await tryRecordServiceFulfillment(orderId, order.orderType)

    const user = await getCabinetUserById(order.userId)
    const accountEmail = user?.email ?? `userId=${order.userId}`
    const trackTitles =
      metadata.trackTitles ||
      (await listAiMasteringFilenames(orderId)).join(" | ") ||
      "-"
    const filesPath = metadata.aiMasteringFilesPath || `ai-mastering-orders/${orderId}`

    const contactLines: string[] = []
    if (order.contactEmail) contactLines.push(`<b>Контакт (email):</b> ${escapeHtml(order.contactEmail)}`)
    if (order.contactTelegram) contactLines.push(`<b>Контакт (Telegram):</b> ${escapeHtml(order.contactTelegram)}`)

    notifyStaff(
      [
        `<b>Оплата: AI мастеринг (${provider})</b>`,
        "",
        `<b>Аккаунт:</b> ${escapeHtml(accountEmail)}`,
        ...contactLines,
        `<b>Файлы (каталог):</b> ${escapeHtml(filesPath)}`,
        `<b>Имена файлов:</b> ${escapeHtml(String(trackTitles))}`,
        `<b>Количество треков:</b> ${order.tracksCount}`,
        `<b>Сумма:</b> ${escapeHtml(String(amount))} RUB`,
        `<b>ID заказа:</b> ${escapeHtml(orderId)}`,
        `<b>ID платежа:</b> ${escapeHtml(paymentId)}`,
        "",
        "#ai_mastering #оплата",
      ].join("\n"),
      `[Parallax] Оплата AI мастеринг: ${accountEmail}`,
      "ai_mastering",
      provider
    )
    return
  }

  if (order.orderType === "vertical_video") {
    await updateOrderStatus(orderId, "paid", { paidAt, paymentId })
    await tryRecordServiceFulfillment(orderId, order.orderType)

    const user = await getCabinetUserById(order.userId)
    const accountEmail = user?.email ?? `userId=${order.userId}`
    const unitPrice =
      metadata.unitPrice ||
      (order.tracksCount > 0 ?
        (parseFloat(order.totalAmount) / order.tracksCount).toFixed(2)
      : "-")

    notifyStaff(
      [
        `<b>Оплата: вертикальные видео (${provider})</b>`,
        "",
        `<b>Аккаунт:</b> ${escapeHtml(accountEmail)}`,
        metadata.trackTitle ? `<b>Название трека:</b> ${escapeHtml(metadata.trackTitle)}` : null,
        `<b>Количество видео:</b> ${order.tracksCount}`,
        `<b>Цена за 1 видео:</b> ${escapeHtml(String(unitPrice))} RUB`,
        `<b>Сумма:</b> ${escapeHtml(String(amount))} RUB`,
        order.contactEmail ? `<b>Контакт:</b> ${escapeHtml(order.contactEmail)}` : null,
        order.contactTelegram ? `<b>Telegram:</b> ${escapeHtml(order.contactTelegram)}` : null,
        metadata.comment ? `<b>Комментарий:</b> ${escapeHtml(metadata.comment)}` : null,
        `<b>ID заказа:</b> ${escapeHtml(orderId)}`,
        `<b>ID платежа:</b> ${escapeHtml(paymentId)}`,
        "",
        "#vertical_video #оплата",
      ]
        .filter(Boolean)
        .join("\n"),
      `[Parallax] Оплата вертикальные видео: ${accountEmail}`,
      "vertical_video",
      provider
    )
    return
  }

  if (order.orderType === "track_cover") {
    await updateOrderStatus(orderId, "paid", { paidAt, paymentId })
    await tryRecordServiceFulfillment(orderId, order.orderType)

    const user = await getCabinetUserById(order.userId)
    const accountEmail = user?.email ?? `userId=${order.userId}`

    notifyStaff(
      [
        `<b>Оплата: обложка для трека (${provider})</b>`,
        "",
        `<b>Аккаунт:</b> ${escapeHtml(accountEmail)}`,
        metadata.trackTitle ? `<b>Название трека:</b> ${escapeHtml(metadata.trackTitle)}` : null,
        `<b>Сумма:</b> ${escapeHtml(String(amount))} RUB`,
        order.contactEmail ? `<b>Контакт:</b> ${escapeHtml(order.contactEmail)}` : null,
        order.contactTelegram ? `<b>Telegram:</b> ${escapeHtml(order.contactTelegram)}` : null,
        metadata.comment ? `<b>Комментарий:</b> ${escapeHtml(metadata.comment)}` : null,
        `<b>ID заказа:</b> ${escapeHtml(orderId)}`,
        `<b>ID платежа:</b> ${escapeHtml(paymentId)}`,
        "",
        "#track_cover #оплата",
      ]
        .filter(Boolean)
        .join("\n"),
      `[Parallax] Оплата обложка: ${accountEmail}`,
      "track_cover",
      provider
    )
    return
  }

  if (
    order.orderType === "ai_cover" ||
    order.orderType === "yandex_videoshot" ||
    order.orderType === "yandex_videoshot_creation" ||
    order.orderType === "yandex_videoavatar" ||
    order.orderType === "spotify_videoshot"
  ) {
    await updateOrderStatus(orderId, "paid", { paidAt, paymentId })
    await tryRecordServiceFulfillment(orderId, order.orderType)

    const user = await getCabinetUserById(order.userId)
    const accountEmail = user?.email ?? `userId=${order.userId}`

    const config = {
      ai_cover: { title: "AI обложка для трека", hashtag: "#ai_cover" },
      yandex_videoshot: { title: "Загрузка видеошота в Яндекс Музыку", hashtag: "#yandex_videoshot" },
      yandex_videoshot_creation: {
        title: "Создание видеошота для Яндекс Музыки",
        hashtag: "#yandex_videoshot_creation",
      },
      yandex_videoavatar: {
        title: "Создание видеоаватара для Яндекс Музыки",
        hashtag: "#yandex_videoavatar",
      },
      spotify_videoshot: { title: "Видеошот для Spotify", hashtag: "#spotify_videoshot" },
    }[order.orderType]

    notifyStaff(
      [
        `<b>Оплата: ${config.title} (${provider})</b>`,
        "",
        `<b>Аккаунт:</b> ${escapeHtml(accountEmail)}`,
        metadata.trackTitle ? `<b>Название трека:</b> ${escapeHtml(metadata.trackTitle)}` : null,
        `<b>Сумма:</b> ${escapeHtml(String(amount))} RUB`,
        order.contactEmail ? `<b>Контакт:</b> ${escapeHtml(order.contactEmail)}` : null,
        order.contactTelegram ? `<b>Telegram:</b> ${escapeHtml(order.contactTelegram)}` : null,
        metadata.comment ? `<b>Комментарий:</b> ${escapeHtml(metadata.comment)}` : null,
        `<b>ID заказа:</b> ${escapeHtml(orderId)}`,
        `<b>ID платежа:</b> ${escapeHtml(paymentId)}`,
        "",
        `${config.hashtag} #оплата`,
      ]
        .filter(Boolean)
        .join("\n"),
      `[Parallax] Оплата ${config.title}: ${accountEmail}`,
      order.orderType,
      provider
    )
    return
  }

  if (order.orderType === "upload_addon_bundle") {
    await updateOrderStatus(orderId, "paid", { paidAt, paymentId })
    await tryRecordServiceFulfillment(orderId, order.orderType)
    if (order.draftId) {
      await markUploadDraftPaid(order.draftId, orderId)
    }
    return
  }

  console.error("[fulfill-paid-order] Unhandled order type", order.orderType, orderId)
}
