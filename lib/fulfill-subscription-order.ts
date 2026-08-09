import { addMonths, format } from "date-fns"
import { ru } from "date-fns/locale"
import {
  getCabinetUserByEmail,
  setCabinetUserAutopay,
  updateCabinetUserSubscription,
} from "@/lib/cabinet-users"
import { applyPaidSubscriptionToArtistSlots } from "@/lib/cabinet-artist-subscriptions"
import { isEmailConfigured, sendSubscriptionRegistrationEmail } from "@/lib/email"
import { isStaffNotificationConfigured, notifyStaffInBackground } from "@/lib/form-notifications"
import type { OrderSubscription } from "@/lib/orders"
import { updateOrderStatus } from "@/lib/orders"
import { isPlanId, planIdToSubscriptionName, type PlanId } from "@/lib/plan-pricing"
import {
  deletePendingSubscriptionAutopay,
  getPendingSubscriptionAutopay,
  upsertPendingSubscriptionAutopay,
} from "@/lib/pending-subscription-autopay"
import { escapeHtml } from "@/lib/telegram"
import { getTracksByUserId } from "@/lib/tracks"

export type FulfillSubscriptionOrderParams = {
  order: OrderSubscription
  paymentId: string
  paidAt: string
  amountRub?: string
  /** RebillId из webhook Т‑Банка (привязка карты для автопродления). */
  tbankRebillId?: string | null
  provider?: "tbank" | "yookassa"
  /** ЮKassa: id сохранённого способа оплаты (legacy). */
  yookassaPaymentMethodId?: string | null
}

export async function fulfillSubscriptionOrder(params: FulfillSubscriptionOrderParams): Promise<void> {
  const { order, paymentId, paidAt } = params
  const orderId = order.id
  const amount = params.amountRub ?? order.totalAmount
  const provider = params.provider ?? "tbank"

  const email = order.userEmail?.trim().toLowerCase()
  const planIdMeta = order.planId
  const periodMeta = order.period as "month" | "year"
  const periodsCountMeta = order.periodsCount ?? 1

  if (!email || !planIdMeta || !isPlanId(planIdMeta) || !periodMeta || periodsCountMeta < 1) {
    console.error("[fulfill-subscription-order] Invalid order subscription fields", {
      orderId,
      email,
      planIdMeta,
      periodMeta,
      periodsCountMeta,
    })
    await updateOrderStatus(orderId, "paid", { paidAt, paymentId })
    return
  }

  const planId: PlanId = planIdMeta
  const subscriptionName = planIdToSubscriptionName(planId)
  const periodsCount = periodsCountMeta
  const monthsToAdd = periodMeta === "year" ? 12 * periodsCount : periodsCount
  const isRenewal = Boolean(order.isRecurringRenewal)

  const savedRebillId = params.tbankRebillId?.trim() || null
  const hasAutopayBinding = Boolean(savedRebillId)

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
    const tracks = await getTracksByUserId(user.email)
    const latestTrackArtist = [...tracks]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .find((t) => t.artistName?.trim())?.artistName
    await applyPaidSubscriptionToArtistSlots({
      userId: user.id,
      subscriptionName,
      subscriptionExpiresAt: newExpiresAt,
      subscriptionTrackLimit: user.subscriptionTrackLimit ?? null,
      preferredArtistNames: [user.artistName, latestTrackArtist],
    })
    await updateOrderStatus(orderId, "paid", { paidAt, paymentId, userId: user.id })

    if (hasAutopayBinding && newExpiresAt) {
      await setCabinetUserAutopay(user.id, {
        tbankRebillId: savedRebillId,
        yookassaPaymentMethodId: null,
        autopayEnabled: true,
        autopayPlanId: planId,
        autopayPeriod: periodMeta,
        autopayPeriodsCount: periodsCount,
        autopayNextChargeAt: newExpiresAt,
        autopayLastReminderSentAt: null,
      })
    }
  } else {
    await updateOrderStatus(orderId, "paid", { paidAt, paymentId })

    if (hasAutopayBinding) {
      await upsertPendingSubscriptionAutopay({
        email,
        tbankRebillId: savedRebillId,
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
          console.error("[fulfill-subscription-order] Registration email failed", {
            orderId,
            email,
            error: mailResult.error,
          })
        }
      } catch (err) {
        console.error("[fulfill-subscription-order] Registration email error", err)
      }
    }
  }

  try {
    const periodLabel = periodMeta === "year" ? "год" : "месяц"
    const isRenewalTg = isRenewal || Boolean(user && currentExpires && currentExpires > now)
    const title = user
      ? isRenewalTg
        ? "Продление подписки / тарифа"
        : "Выполнена оплата подписки"
      : "Выполнена оплата подписки (пользователь ещё не зарегистрирован)"
    const autopayLine =
      hasAutopayBinding ?
        user
          ? "<b>Автосписание:</b> подключено (Т‑Банк)"
          : "<b>Автосписание:</b> включается при регистрации в кабинете с этим email - привязка сохранена"
      : "<b>Автосписание:</b> не подключено (карта не привязана для рекуррентов)"

    const messageLines = [
      `<b>${title}</b> (${provider})`,
      "",
      `<b>Тариф:</b> ${escapeHtml(subscriptionName)}`,
      `<b>Email:</b> ${escapeHtml(email)}`,
      ...(newExpiresAt
        ? [`<b>Действует до:</b> ${format(new Date(newExpiresAt), "d MMM yyyy", { locale: ru })}`]
        : []),
      `<b>ID заказа:</b> ${escapeHtml(orderId)}`,
      `<b>ID платежа:</b> ${escapeHtml(paymentId)}`,
      `<b>Периодичность:</b> ${periodLabel}`,
      `<b>Количество периодов:</b> ${periodsCount}`,
      `<b>Сумма:</b> ${escapeHtml(String(amount))} RUB`,
      autopayLine,
      "",
      "#подписка #оплата",
    ]

    if (isStaffNotificationConfigured()) {
      notifyStaffInBackground({
        telegramMessage: messageLines.join("\n"),
        emailSubject: `[Parallax] Оплата подписки ${subscriptionName}: ${email}`,
        logContext: `payments/${provider}/webhook subscription`,
      })
    }
  } catch (err) {
    console.error("[fulfill-subscription-order] Notification error", err)
  }
}

/** При регистрации: применить отложенную привязку RebillId. */
export async function applyPendingSubscriptionAutopayOnRegister(userId: string, email: string): Promise<void> {
  const pend = await getPendingSubscriptionAutopay(email)
  if (!pend?.tbankRebillId) return

  const user = await getCabinetUserByEmail(email, { includeDisabled: true })
  if (!user?.subscriptionExpiresAt) return

  await setCabinetUserAutopay(userId, {
    tbankRebillId: pend.tbankRebillId,
    yookassaPaymentMethodId: null,
    autopayEnabled: true,
    autopayPlanId: pend.planId,
    autopayPeriod: pend.period,
    autopayPeriodsCount: pend.periodsCount,
    autopayNextChargeAt: user.subscriptionExpiresAt,
    autopayLastReminderSentAt: null,
  })
  await deletePendingSubscriptionAutopay(email)
}
