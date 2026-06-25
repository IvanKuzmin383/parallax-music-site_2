import { NextRequest, NextResponse } from "next/server"
import { getOrderById, getOrderByPaymentId, updateOrderStatus, type OrderSubscription } from "@/lib/orders"
import {
  getCabinetUserById,
  updateCabinetUserPurchasedTracks,
} from "@/lib/cabinet-users"
import { escapeHtml } from "@/lib/telegram"
import { isStaffNotificationConfigured, notifyStaffInBackground } from "@/lib/form-notifications"
import { fetchYooKassaPayment, type YooKassaPaymentObject } from "@/lib/yookassa-subscription"
import { fulfillSubscriptionOrder } from "@/lib/fulfill-subscription-order"
import { markUploadDraftPaid } from "@/lib/upload-drafts"
import { isServiceOrderType, upsertNewFulfillmentIfMissing } from "@/lib/service-fulfillments"

async function tryRecordServiceFulfillment(orderId: string, orderType: string) {
  if (!isServiceOrderType(orderType)) return
  try {
    await upsertNewFulfillmentIfMissing(orderId)
  } catch (e) {
    console.error("[payments/webhook] service_fulfillments insert failed", { orderId, orderType, e })
  }
}

type YooKassaNotification = {
  type?: string
  event?: string
  object?: YooKassaPaymentObject & {
    metadata?: Record<string, string>
  }
}

function getClientIp(request: NextRequest): string | null {
  const forwarded = request.headers.get("x-forwarded-for")
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() || null
  }
  return request.headers.get("x-real-ip")
}

function notifyPaymentStaff(
  telegramMessage: string,
  emailSubject: string,
  logContext: string
): void {
  if (!isStaffNotificationConfigured()) return
  notifyStaffInBackground({
    telegramMessage,
    emailSubject,
    logContext: `payments/webhook ${logContext}`,
  })
}

function isIpAllowed(ip: string | null): boolean {
  const whitelist = process.env.YOOKASSA_WEBHOOK_IP_WHITELIST
  if (!whitelist || !ip) return true
  const allowed = whitelist
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean)
  return allowed.includes(ip)
}

async function resolveSavedPaymentMethod(
  paymentId: string | undefined,
  obj: YooKassaNotification["object"]
): Promise<{ id: string } | null> {
  let pmId = obj?.payment_method?.id
  let saved = obj?.payment_method?.saved
  if (pmId && saved === true) {
    return { id: pmId }
  }
  if (!paymentId) return null
  const full = await fetchYooKassaPayment(paymentId)
  if (!full) return null
  pmId = full.payment_method?.id
  saved = full.payment_method?.saved
  if (pmId && saved === true) {
    return { id: pmId }
  }
  return null
}

export async function POST(request: NextRequest) {
  const clientIp = getClientIp(request)
  if (!isIpAllowed(clientIp)) {
    console.error("[payments/webhook] Forbidden IP", clientIp)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  let body: YooKassaNotification
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const event = body.event
  const obj = body.object

  if (event === "payment.canceled" && obj?.id) {
    const order = await getOrderByPaymentId(obj.id)
    if (
      order &&
      order.orderType === "subscription" &&
      order.isRecurringRenewal &&
      order.status === "pending"
    ) {
      await updateOrderStatus(order.id, "failed")
    }
    return NextResponse.json({ received: true })
  }

  if (event !== "payment.succeeded" || !obj?.metadata?.orderId) {
    return NextResponse.json({ received: true })
  }

  const orderId = obj.metadata.orderId
  const order = await getOrderById(orderId)
  if (!order) {
    console.error("[payments/webhook] Order not found:", orderId)
    return NextResponse.json({ received: true })
  }

  if (order.status === "paid") {
    return NextResponse.json({ received: true })
  }

  const amountValue = obj.amount?.value
  if (amountValue != null && parseFloat(amountValue) !== parseFloat(order.totalAmount)) {
    console.error("[payments/webhook] Amount mismatch", {
      orderId,
      expected: order.totalAmount,
      received: amountValue,
    })
    return NextResponse.json({ error: "Amount mismatch" }, { status: 400 })
  }

  const paidAt = new Date().toISOString()

  if (order.orderType === "tracks_topup") {
    const updatedUser = await updateCabinetUserPurchasedTracks(order.userId, order.tracksCount)
    if (!updatedUser) {
      console.error("[payments/webhook] User not found for tracks_topup", { orderId, userId: order.userId })
    }
    await updateOrderStatus(orderId, "paid", { paidAt })

    try {
      const user = updatedUser ?? (await getCabinetUserById(order.userId))
      const email = user?.email ?? `userId=${order.userId}`
      const amount = amountValue ?? order.totalAmount

      const messageLines = [
        "<b>Выполнена оплата (тариф Fix)</b>",
        "",
        `<b>Пользователь:</b> ${escapeHtml(email)}`,
        `<b>Количество треков:</b> ${order.tracksCount}`,
        `<b>Сумма:</b> ${escapeHtml(String(amount))} RUB`,
        `<b>ID заказа:</b> ${escapeHtml(orderId)}`,
        obj?.id ? `<b>ID платежа:</b> ${escapeHtml(obj.id ?? "")}` : null,
        "",
        "#оплата #кабинет",
      ].filter(Boolean) as string[]

      notifyPaymentStaff(
        messageLines.join("\n"),
        `[Parallax] Оплата Fix: ${email}`,
        "tracks_topup"
      )
    } catch (err) {
      console.error("[payments/webhook] Notification error for tracks_topup", err)
    }

    return NextResponse.json({ received: true })
  }

  if (order.orderType === "ai_mastering") {
    await updateOrderStatus(orderId, "paid", { paidAt })
    await tryRecordServiceFulfillment(orderId, order.orderType)

    try {
      const user = await getCabinetUserById(order.userId)
      const accountEmail = user?.email ?? `userId=${order.userId}`
      const amount = amountValue ?? order.totalAmount
      const metadata = obj?.metadata ?? {}
      const trackTitles = metadata.trackTitles || "-"
      const filesPath = metadata.aiMasteringFilesPath
        ? String(metadata.aiMasteringFilesPath)
        : `ai-mastering-orders/${orderId}`

      const contactLines: string[] = []
      if (order.contactEmail) {
        contactLines.push(`<b>Контакт (email):</b> ${escapeHtml(order.contactEmail)}`)
      }
      if (order.contactTelegram) {
        contactLines.push(`<b>Контакт (Telegram):</b> ${escapeHtml(order.contactTelegram)}`)
      }

      const messageLines = [
        "<b>Оплата: AI мастеринг</b>",
        "",
        `<b>Аккаунт:</b> ${escapeHtml(accountEmail)}`,
        ...contactLines,
        `<b>Файлы (каталог):</b> ${escapeHtml(filesPath)}`,
        `<b>Имена файлов:</b> ${escapeHtml(String(trackTitles))}`,
        `<b>Количество треков:</b> ${order.tracksCount}`,
        `<b>Сумма:</b> ${escapeHtml(String(amount))} RUB`,
        `<b>ID заказа:</b> ${escapeHtml(orderId)}`,
        obj?.id ? `<b>ID платежа:</b> ${escapeHtml(obj.id ?? "")}` : null,
        "",
        "#ai_mastering #оплата",
      ].filter(Boolean) as string[]

      notifyPaymentStaff(
        messageLines.join("\n"),
        `[Parallax] Оплата AI мастеринг: ${accountEmail}`,
        "ai_mastering"
      )
    } catch (err) {
      console.error("[payments/webhook] Notification error for ai_mastering", err)
    }

    return NextResponse.json({ received: true })
  }

  if (order.orderType === "vertical_video") {
    await updateOrderStatus(orderId, "paid", { paidAt })
    await tryRecordServiceFulfillment(orderId, order.orderType)

    try {
      const user = await getCabinetUserById(order.userId)
      const accountEmail = user?.email ?? `userId=${order.userId}`
      const amount = amountValue ?? order.totalAmount
      const metadata = obj?.metadata ?? {}
      const contactType = metadata.contactType || "-"
      const contactValue = metadata.contactValue || "-"
      const trackTitle = metadata.trackTitle || "-"
      const comment = metadata.comment || "-"
      const unitPrice = metadata.unitPrice || "-"

      const messageLines = [
        "<b>Оплата: вертикальные видео</b>",
        "",
        `<b>Аккаунт:</b> ${escapeHtml(accountEmail)}`,
        `<b>Название трека:</b> ${escapeHtml(String(trackTitle))}`,
        `<b>Количество видео:</b> ${order.tracksCount}`,
        `<b>Цена за 1 видео:</b> ${escapeHtml(String(unitPrice))} RUB`,
        `<b>Сумма:</b> ${escapeHtml(String(amount))} RUB`,
        `<b>Контакт:</b> ${escapeHtml(String(contactType))} - ${escapeHtml(String(contactValue))}`,
        `<b>Комментарий:</b> ${escapeHtml(String(comment))}`,
        `<b>ID заказа:</b> ${escapeHtml(orderId)}`,
        obj?.id ? `<b>ID платежа:</b> ${escapeHtml(obj.id ?? "")}` : null,
        "",
        "#vertical_video #оплата",
      ].filter(Boolean) as string[]

      notifyPaymentStaff(
        messageLines.join("\n"),
        `[Parallax] Оплата вертикальные видео: ${accountEmail}`,
        "vertical_video"
      )
    } catch (err) {
      console.error("[payments/webhook] Notification error for vertical_video", err)
    }

    return NextResponse.json({ received: true })
  }

  if (order.orderType === "track_cover") {
    await updateOrderStatus(orderId, "paid", { paidAt })
    await tryRecordServiceFulfillment(orderId, order.orderType)

    try {
      const user = await getCabinetUserById(order.userId)
      const accountEmail = user?.email ?? `userId=${order.userId}`
      const amount = amountValue ?? order.totalAmount
      const metadata = obj?.metadata ?? {}
      const contactType = metadata.contactType || "-"
      const contactValue = metadata.contactValue || "-"
      const trackTitle = metadata.trackTitle || "-"
      const comment = metadata.comment || "-"

      const messageLines = [
        "<b>Оплата: обложка для трека</b>",
        "",
        `<b>Аккаунт:</b> ${escapeHtml(accountEmail)}`,
        `<b>Название трека:</b> ${escapeHtml(String(trackTitle))}`,
        `<b>Сумма:</b> ${escapeHtml(String(amount))} RUB`,
        `<b>Контакт:</b> ${escapeHtml(String(contactType))} - ${escapeHtml(String(contactValue))}`,
        `<b>Комментарий:</b> ${escapeHtml(String(comment))}`,
        `<b>ID заказа:</b> ${escapeHtml(orderId)}`,
        obj?.id ? `<b>ID платежа:</b> ${escapeHtml(obj.id ?? "")}` : null,
        "",
        "#track_cover #оплата",
      ].filter(Boolean) as string[]

      notifyPaymentStaff(
        messageLines.join("\n"),
        `[Parallax] Оплата обложка: ${accountEmail}`,
        "track_cover"
      )
    } catch (err) {
      console.error("[payments/webhook] Notification error for track_cover", err)
    }

    return NextResponse.json({ received: true })
  }

  if (
    order.orderType === "ai_cover" ||
    order.orderType === "yandex_videoshot" ||
    order.orderType === "yandex_videoshot_creation" ||
    order.orderType === "yandex_videoavatar" ||
    order.orderType === "spotify_videoshot"
  ) {
    await updateOrderStatus(orderId, "paid", { paidAt })
    await tryRecordServiceFulfillment(orderId, order.orderType)

    try {
      const user = await getCabinetUserById(order.userId)
      const accountEmail = user?.email ?? `userId=${order.userId}`
      const amount = amountValue ?? order.totalAmount
      const metadata = obj?.metadata ?? {}
      const contactType = metadata.contactType || "-"
      const contactValue = metadata.contactValue || "-"
      const trackTitle = metadata.trackTitle || "-"
      const comment = metadata.comment || "-"

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

      const messageLines = [
        `<b>Оплата: ${config.title}</b>`,
        "",
        `<b>Аккаунт:</b> ${escapeHtml(accountEmail)}`,
        `<b>Название трека:</b> ${escapeHtml(String(trackTitle))}`,
        `<b>Сумма:</b> ${escapeHtml(String(amount))} RUB`,
        `<b>Контакт:</b> ${escapeHtml(String(contactType))} - ${escapeHtml(String(contactValue))}`,
        `<b>Комментарий:</b> ${escapeHtml(String(comment))}`,
        `<b>ID заказа:</b> ${escapeHtml(orderId)}`,
        obj?.id ? `<b>ID платежа:</b> ${escapeHtml(obj.id ?? "")}` : null,
        "",
        `${config.hashtag} #оплата`,
      ].filter(Boolean) as string[]

      notifyPaymentStaff(
        messageLines.join("\n"),
        `[Parallax] Оплата ${config.title}: ${accountEmail}`,
        order.orderType
      )
    } catch (err) {
      console.error("[payments/webhook] Notification error for promotion service", {
        orderType: order.orderType,
        err,
      })
    }

    return NextResponse.json({ received: true })
  }

  if (order.orderType === "upload_addon_bundle") {
    await updateOrderStatus(orderId, "paid", { paidAt })
    await tryRecordServiceFulfillment(orderId, order.orderType)
    if (order.draftId) {
      await markUploadDraftPaid(order.draftId, orderId)
    }
    return NextResponse.json({ received: true })
  }

  if (order.orderType === "subscription") {
    const savedPaymentMethod = await resolveSavedPaymentMethod(obj.id, obj)
    await fulfillSubscriptionOrder({
      order: order as OrderSubscription,
      paymentId: obj.id ?? "",
      paidAt,
      amountRub: amountValue ?? order.totalAmount,
      yookassaPaymentMethodId: savedPaymentMethod?.id ?? null,
      provider: "yookassa",
    })
    return NextResponse.json({ received: true })
  }

  return NextResponse.json({ received: true })
}
