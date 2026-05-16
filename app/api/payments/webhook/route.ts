import { NextRequest, NextResponse } from "next/server"
import { addMonths, format } from "date-fns"
import { ru } from "date-fns/locale"
import { getOrderById, getOrderByPaymentId, updateOrderStatus } from "@/lib/orders"
import {
  getCabinetUserByEmail,
  getCabinetUserById,
  setCabinetUserAutopay,
  updateCabinetUserPurchasedTracks,
  updateCabinetUserSubscription,
} from "@/lib/cabinet-users"
import { planIdToSubscriptionName, isPlanId, type PlanId } from "@/lib/plan-pricing"
import { escapeHtml, isTelegramConfigured, sendTelegramMessage } from "@/lib/telegram"
import { isEmailConfigured, sendSubscriptionRegistrationEmail } from "@/lib/email"
import { fetchYooKassaPayment, type YooKassaPaymentObject } from "@/lib/yookassa-subscription"
import { upsertPendingSubscriptionAutopay } from "@/lib/pending-subscription-autopay"
import { createCabinetArtistSubscriptionSlot } from "@/lib/cabinet-artist-subscriptions"
import { markUploadDraftPaid } from "@/lib/upload-drafts"
import { isServiceOrderType, upsertNewFulfillmentIfMissing } from "@/lib/service-fulfillments"

function tryRecordServiceFulfillment(orderId: string, orderType: string) {
  if (!isServiceOrderType(orderType)) return
  try {
    upsertNewFulfillmentIfMissing(orderId)
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

    if (isTelegramConfigured()) {
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

        const message = messageLines.join("\n")

        const sendWithRetry = async (fn: () => Promise<Response>) => {
          let res = await fn()
          if (!res.ok && res.status >= 500) res = await fn()
          return res
        }

        const tgRes = await sendWithRetry(() => sendTelegramMessage(message))
        if (!tgRes.ok) {
          let detail: unknown = undefined
          try {
            detail = await tgRes.json()
          } catch {
            // ignore
          }
          console.error("[payments/webhook] Telegram send failed for tracks_topup", {
            status: tgRes.status,
            statusText: tgRes.statusText,
            detail,
          })
        }
      } catch (err) {
        console.error("[payments/webhook] Telegram notification error for tracks_topup", err)
      }
    }

    return NextResponse.json({ received: true })
  }

  if (order.orderType === "ai_mastering") {
    await updateOrderStatus(orderId, "paid", { paidAt })
    tryRecordServiceFulfillment(orderId, order.orderType)

    if (isTelegramConfigured()) {
      try {
        const user = await getCabinetUserById(order.userId)
        const accountEmail = user?.email ?? `userId=${order.userId}`
        const amount = amountValue ?? order.totalAmount
        const metadata = obj?.metadata ?? {}
        const trackTitles = metadata.trackTitles || "—"
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

        const message = messageLines.join("\n")

        const sendWithRetry = async (fn: () => Promise<Response>) => {
          let res = await fn()
          if (!res.ok && res.status >= 500) res = await fn()
          return res
        }

        const tgRes = await sendWithRetry(() => sendTelegramMessage(message))
        if (!tgRes.ok) {
          let detail: unknown = undefined
          try {
            detail = await tgRes.json()
          } catch {
            // ignore
          }
          console.error("[payments/webhook] Telegram send failed for ai_mastering", {
            status: tgRes.status,
            statusText: tgRes.statusText,
            detail,
          })
        }
      } catch (err) {
        console.error("[payments/webhook] Telegram notification error for ai_mastering", err)
      }
    }

    return NextResponse.json({ received: true })
  }

  if (order.orderType === "vertical_video") {
    await updateOrderStatus(orderId, "paid", { paidAt })
    tryRecordServiceFulfillment(orderId, order.orderType)

    if (isTelegramConfigured()) {
      try {
        const user = await getCabinetUserById(order.userId)
        const accountEmail = user?.email ?? `userId=${order.userId}`
        const amount = amountValue ?? order.totalAmount
        const metadata = obj?.metadata ?? {}
        const contactType = metadata.contactType || "—"
        const contactValue = metadata.contactValue || "—"
        const trackTitle = metadata.trackTitle || "—"
        const comment = metadata.comment || "—"
        const unitPrice = metadata.unitPrice || "—"

        const messageLines = [
          "<b>Оплата: вертикальные видео</b>",
          "",
          `<b>Аккаунт:</b> ${escapeHtml(accountEmail)}`,
          `<b>Название трека:</b> ${escapeHtml(String(trackTitle))}`,
          `<b>Количество видео:</b> ${order.tracksCount}`,
          `<b>Цена за 1 видео:</b> ${escapeHtml(String(unitPrice))} RUB`,
          `<b>Сумма:</b> ${escapeHtml(String(amount))} RUB`,
          `<b>Контакт:</b> ${escapeHtml(String(contactType))} — ${escapeHtml(String(contactValue))}`,
          `<b>Комментарий:</b> ${escapeHtml(String(comment))}`,
          `<b>ID заказа:</b> ${escapeHtml(orderId)}`,
          obj?.id ? `<b>ID платежа:</b> ${escapeHtml(obj.id ?? "")}` : null,
          "",
          "#vertical_video #оплата",
        ].filter(Boolean) as string[]

        const message = messageLines.join("\n")

        const sendWithRetry = async (fn: () => Promise<Response>) => {
          let res = await fn()
          if (!res.ok && res.status >= 500) res = await fn()
          return res
        }

        const tgRes = await sendWithRetry(() => sendTelegramMessage(message))
        if (!tgRes.ok) {
          let detail: unknown = undefined
          try {
            detail = await tgRes.json()
          } catch {
            // ignore
          }
          console.error("[payments/webhook] Telegram send failed for vertical_video", {
            status: tgRes.status,
            statusText: tgRes.statusText,
            detail,
          })
        }
      } catch (err) {
        console.error("[payments/webhook] Telegram notification error for vertical_video", err)
      }
    }

    return NextResponse.json({ received: true })
  }

  if (order.orderType === "track_cover") {
    await updateOrderStatus(orderId, "paid", { paidAt })
    tryRecordServiceFulfillment(orderId, order.orderType)

    if (isTelegramConfigured()) {
      try {
        const user = await getCabinetUserById(order.userId)
        const accountEmail = user?.email ?? `userId=${order.userId}`
        const amount = amountValue ?? order.totalAmount
        const metadata = obj?.metadata ?? {}
        const contactType = metadata.contactType || "—"
        const contactValue = metadata.contactValue || "—"
        const trackTitle = metadata.trackTitle || "—"
        const comment = metadata.comment || "—"

        const messageLines = [
          "<b>Оплата: обложка для трека</b>",
          "",
          `<b>Аккаунт:</b> ${escapeHtml(accountEmail)}`,
          `<b>Название трека:</b> ${escapeHtml(String(trackTitle))}`,
          `<b>Сумма:</b> ${escapeHtml(String(amount))} RUB`,
          `<b>Контакт:</b> ${escapeHtml(String(contactType))} — ${escapeHtml(String(contactValue))}`,
          `<b>Комментарий:</b> ${escapeHtml(String(comment))}`,
          `<b>ID заказа:</b> ${escapeHtml(orderId)}`,
          obj?.id ? `<b>ID платежа:</b> ${escapeHtml(obj.id ?? "")}` : null,
          "",
          "#track_cover #оплата",
        ].filter(Boolean) as string[]

        const message = messageLines.join("\n")

        const sendWithRetry = async (fn: () => Promise<Response>) => {
          let res = await fn()
          if (!res.ok && res.status >= 500) res = await fn()
          return res
        }

        const tgRes = await sendWithRetry(() => sendTelegramMessage(message))
        if (!tgRes.ok) {
          let detail: unknown = undefined
          try {
            detail = await tgRes.json()
          } catch {
            // ignore
          }
          console.error("[payments/webhook] Telegram send failed for track_cover", {
            status: tgRes.status,
            statusText: tgRes.statusText,
            detail,
          })
        }
      } catch (err) {
        console.error("[payments/webhook] Telegram notification error for track_cover", err)
      }
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
    tryRecordServiceFulfillment(orderId, order.orderType)

    if (isTelegramConfigured()) {
      try {
        const user = await getCabinetUserById(order.userId)
        const accountEmail = user?.email ?? `userId=${order.userId}`
        const amount = amountValue ?? order.totalAmount
        const metadata = obj?.metadata ?? {}
        const contactType = metadata.contactType || "—"
        const contactValue = metadata.contactValue || "—"
        const trackTitle = metadata.trackTitle || "—"
        const comment = metadata.comment || "—"

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
          `<b>Контакт:</b> ${escapeHtml(String(contactType))} — ${escapeHtml(String(contactValue))}`,
          `<b>Комментарий:</b> ${escapeHtml(String(comment))}`,
          `<b>ID заказа:</b> ${escapeHtml(orderId)}`,
          obj?.id ? `<b>ID платежа:</b> ${escapeHtml(obj.id ?? "")}` : null,
          "",
          `${config.hashtag} #оплата`,
        ].filter(Boolean) as string[]

        const message = messageLines.join("\n")

        const sendWithRetry = async (fn: () => Promise<Response>) => {
          let res = await fn()
          if (!res.ok && res.status >= 500) res = await fn()
          return res
        }

        const tgRes = await sendWithRetry(() => sendTelegramMessage(message))
        if (!tgRes.ok) {
          let detail: unknown = undefined
          try {
            detail = await tgRes.json()
          } catch {
            // ignore
          }
          console.error("[payments/webhook] Telegram send failed for promotion service", {
            orderType: order.orderType,
            status: tgRes.status,
            statusText: tgRes.statusText,
            detail,
          })
        }
      } catch (err) {
        console.error("[payments/webhook] Telegram notification error for promotion service", {
          orderType: order.orderType,
          err,
        })
      }
    }

    return NextResponse.json({ received: true })
  }

  if (order.orderType === "upload_addon_bundle") {
    await updateOrderStatus(orderId, "paid", { paidAt })
    tryRecordServiceFulfillment(orderId, order.orderType)
    if (order.draftId) {
      await markUploadDraftPaid(order.draftId, orderId)
    }
    return NextResponse.json({ received: true })
  }

  if (order.orderType === "subscription") {
    const email = obj.metadata?.email
    const planIdMeta = obj.metadata?.planId
    const periodMeta = obj.metadata?.period as "month" | "year" | undefined
    const periodsCountMeta = parseInt(obj.metadata?.periodsCount ?? "1", 10)

    if (!email || !planIdMeta || !isPlanId(planIdMeta) || !periodMeta || !periodsCountMeta || periodsCountMeta < 1) {
      console.error("[payments/webhook] Invalid subscription metadata", obj.metadata)
      await updateOrderStatus(orderId, "paid", { paidAt })
      return NextResponse.json({ received: true })
    }

    const planId: PlanId = planIdMeta
    const subscriptionName = planIdToSubscriptionName(planId)
    const periodsCount = periodsCountMeta
    const monthsToAdd = periodMeta === "year" ? 12 * periodsCount : periodsCount
    const isRenewal = Boolean(order.isRecurringRenewal || obj.metadata?.recurring === "true")

    const savedPaymentMethod = await resolveSavedPaymentMethod(obj.id, obj)

    const user = await getCabinetUserByEmail(email)
    let newExpiresAt: string | null = null
    let currentExpires: Date | null = null
    const now = new Date()

    if (user) {
      currentExpires =
        user.subscriptionName === subscriptionName && user.subscriptionExpiresAt
          ? new Date(user.subscriptionExpiresAt)
          : null
      const baseDate = currentExpires && currentExpires > now ? currentExpires : now
      newExpiresAt = addMonths(baseDate, monthsToAdd).toISOString()

      await updateCabinetUserSubscription(user.id, subscriptionName, newExpiresAt, user.subscriptionTrackLimit ?? null)
      await createCabinetArtistSubscriptionSlot({
        userId: user.id,
        subscriptionName,
        subscriptionExpiresAt: newExpiresAt,
        subscriptionTrackLimit: user.subscriptionTrackLimit ?? null,
      })
      await updateOrderStatus(orderId, "paid", { paidAt, userId: user.id })

      if (savedPaymentMethod && newExpiresAt) {
        await setCabinetUserAutopay(user.id, {
          yookassaPaymentMethodId: savedPaymentMethod.id,
          autopayEnabled: true,
          autopayPlanId: planId,
          autopayPeriod: periodMeta,
          autopayPeriodsCount: periodsCount,
          autopayNextChargeAt: newExpiresAt,
          autopayLastReminderSentAt: null,
        })
      }
    } else {
      await updateOrderStatus(orderId, "paid", { paidAt })

      if (savedPaymentMethod) {
        upsertPendingSubscriptionAutopay({
          email,
          yookassaPaymentMethodId: savedPaymentMethod.id,
          planId,
          period: periodMeta,
          periodsCount,
        })
      }

      if (!isRenewal && isEmailConfigured()) {
        try {
          const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://parallaxmusic.ru").replace(/\/$/, "")
          const registerLink = `${baseUrl}/cabinet?tab=register&email=${encodeURIComponent(email)}`
          const mailResult = await sendSubscriptionRegistrationEmail(email, registerLink, subscriptionName)
          if (!mailResult.ok) {
            console.error("[payments/webhook] Subscription registration email failed", {
              orderId,
              email,
              error: mailResult.error,
            })
          }
        } catch (err) {
          console.error("[payments/webhook] Subscription registration email error", err)
        }
      }
    }

    if (isTelegramConfigured()) {
      try {
        const amount = amountValue ?? order.totalAmount
        const periodLabel = periodMeta === "year" ? "год" : "месяц"
        const isRenewalTg = isRenewal || Boolean(user && currentExpires && currentExpires > now)
        const title = user
          ? isRenewalTg
            ? "Продление подписки / тарифа"
            : "Выполнена оплата подписки"
          : "Выполнена оплата подписки (пользователь ещё не зарегистрирован)"
        const autopayLine = savedPaymentMethod
          ? user
            ? "<b>Автосписание:</b> подключено"
            : "<b>Автосписание:</b> включается при регистрации в кабинете с этим email — привязка сохранена в системе, зарегистрироваться можно в любой момент"
          : "<b>Автосписание:</b> не подключено (способ оплаты не сохранён в ЮKassa)"
        const messageLines = [
          `<b>${title}</b>`,
          "",
          `<b>Тариф:</b> ${escapeHtml(subscriptionName)}`,
          `<b>Email:</b> ${escapeHtml(email)}`,
          ...(newExpiresAt
            ? [`<b>Действует до:</b> ${format(new Date(newExpiresAt), "d MMM yyyy", { locale: ru })}`]
            : []),
          `<b>ID заказа:</b> ${escapeHtml(orderId)}`,
          obj?.id ? `<b>ID платежа:</b> ${escapeHtml(obj.id ?? "")}` : null,
          `<b>Периодичность:</b> ${periodLabel}`,
          `<b>Количество периодов:</b> ${periodsCount}`,
          `<b>Сумма:</b> ${escapeHtml(String(amount))} RUB`,
          autopayLine,
          "",
          "#подписка #оплата",
        ].filter(Boolean) as string[]

        const message = messageLines.join("\n")

        const sendWithRetry = async (fn: () => Promise<Response>) => {
          let res = await fn()
          if (!res.ok && res.status >= 500) res = await fn()
          return res
        }

        const tgRes = await sendWithRetry(() => sendTelegramMessage(message))
        if (!tgRes.ok) {
          let detail: unknown = undefined
          try {
            detail = await tgRes.json()
          } catch {
            // ignore
          }
          console.error("[payments/webhook] Telegram send failed for subscription", {
            status: tgRes.status,
            statusText: tgRes.statusText,
            detail,
          })
        }
      } catch (err) {
        console.error("[payments/webhook] Telegram notification error for subscription", err)
      }
    }

    return NextResponse.json({ received: true })
  }

  return NextResponse.json({ received: true })
}
