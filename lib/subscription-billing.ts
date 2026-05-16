import { subDays } from "date-fns"
import { listCabinetUsersWithActiveAutopay, touchAutopayReminderSent } from "@/lib/cabinet-users"
import { calculateTotalAmount, isPlanId, planIdToSubscriptionName } from "@/lib/plan-pricing"
import { createOrder, hasPendingRecurringSubscriptionChargeToday, updateOrderStatus } from "@/lib/orders"
import { buildSubscriptionReceipt, createYooKassaRecurrentPayment, shouldSendYooKassaReceipt } from "@/lib/yookassa-subscription"
import { formatMoscowDateString, moscowCalendarDayStart } from "@/lib/moscow-time"
import { SUBSCRIPTION_REMINDER_DAYS_BEFORE_CHARGE } from "@/lib/subscription-notification-config"
import { isEmailConfigured, sendAutopayReminderEmail } from "@/lib/email"

type AutopayUser = {
  id: string
  email: string
  telegram?: string
  yookassaPaymentMethodId?: string
  autopayPlanId?: string
  autopayPeriod?: "month" | "year"
  autopayPeriodsCount?: number
  autopayNextChargeAt?: string
  autopayLastReminderSentAt?: string
}

function shouldSendReminderToday(u: AutopayUser): boolean {
  if (!u.autopayNextChargeAt) return false
  const charge = new Date(u.autopayNextChargeAt)
  const chargeDay = moscowCalendarDayStart(charge)
  const reminderDay = subDays(chargeDay, SUBSCRIPTION_REMINDER_DAYS_BEFORE_CHARGE)
  if (formatMoscowDateString(reminderDay) !== formatMoscowDateString(new Date())) return false
  if (u.autopayLastReminderSentAt) {
    const sent = new Date(u.autopayLastReminderSentAt)
    if (formatMoscowDateString(sent) === formatMoscowDateString(new Date())) return false
  }
  return true
}

function shouldChargeDueOrOverdue(u: AutopayUser): boolean {
  if (!u.autopayNextChargeAt) return false
  const chargeDay = formatMoscowDateString(new Date(u.autopayNextChargeAt))
  const today = formatMoscowDateString(new Date())
  return chargeDay <= today
}

export type SubscriptionBillingRunResult = {
  ok: true
  usersConsidered: number
  remindersSent: number
  chargesInitiated: number
  errors?: string[]
}

export async function runSubscriptionBilling(): Promise<SubscriptionBillingRunResult> {
  const users = await listCabinetUsersWithActiveAutopay()
  let remindersSent = 0
  let chargesInitiated = 0
  const errors: string[] = []

  for (const u of users) {
    if (shouldSendReminderToday(u) && isEmailConfigured()) {
      const planId = u.autopayPlanId
      const period = u.autopayPeriod
      const periodsCount = u.autopayPeriodsCount
      if (planId && isPlanId(planId) && period && periodsCount) {
        const amount = calculateTotalAmount(planId, period, periodsCount)
        const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://parallaxmusic.ru").replace(/\/$/, "")
        const profileUrl = `${baseUrl}/cabinet/profile`
        const r = await sendAutopayReminderEmail({
          to: u.email,
          amountRub: amount.toFixed(2),
          chargeDateLabel: u.autopayNextChargeAt ?
              new Date(u.autopayNextChargeAt).toLocaleString("ru-RU", { timeZone: "Europe/Moscow" })
            : "",
          planName: planIdToSubscriptionName(planId),
          profileUrl,
        })
        if (r.ok) {
          remindersSent += 1
          await touchAutopayReminderSent(u.id, new Date().toISOString())
        } else {
          errors.push(`reminder ${u.email}: ${r.error}`)
        }
      }
    }

    if (!shouldChargeDueOrOverdue(u)) continue
    if (!u.autopayPlanId || !u.autopayPeriod || u.autopayPeriodsCount == null || !u.yookassaPaymentMethodId) {
      continue
    }
    if (!isPlanId(u.autopayPlanId)) continue

    const planId = u.autopayPlanId
    const period = u.autopayPeriod
    const periodsCount = u.autopayPeriodsCount

    try {
      if (await hasPendingRecurringSubscriptionChargeToday(u.email)) {
        continue
      }

      const totalNumber = calculateTotalAmount(planId, period, periodsCount)
      if (!Number.isFinite(totalNumber) || totalNumber <= 0) continue
      const totalAmount = totalNumber.toFixed(2)

      const order = await createOrder({
        orderType: "subscription",
        userEmail: u.email,
        telegram: u.telegram,
        planId,
        period,
        periodsCount,
        totalAmount,
        userId: u.id,
        isRecurringRenewal: true,
      })

      const subscriptionName = planIdToSubscriptionName(planId)
      const periodLabel = period === "month" ? "мес" : "год"
      const description = `Подписка ${subscriptionName}, ${periodLabel} x ${periodsCount}, ${u.email} (автопродление)`

      const receipt =
        shouldSendYooKassaReceipt() ?
          buildSubscriptionReceipt({
            customerEmail: u.email,
            planId,
            period,
            periodsCount,
            totalAmount,
          })
        : undefined

      const idempotenceKey = `${order.id}:${formatMoscowDateString(new Date())}`

      const pay = await createYooKassaRecurrentPayment({
        paymentMethodId: u.yookassaPaymentMethodId,
        amountValue: totalAmount,
        description,
        metadata: {
          orderId: order.id,
          orderType: "subscription",
          planId,
          period,
          periodsCount: String(periodsCount),
          email: u.email,
          telegram: u.telegram ?? "",
          recurring: "true",
        },
        idempotenceKey,
        receipt,
      })

      if (pay.ok) {
        await updateOrderStatus(order.id, "pending", { paymentId: pay.paymentId })
        chargesInitiated += 1
      } else {
        errors.push(`charge ${u.email}: ${JSON.stringify(pay.body)}`)
      }
    } catch (e) {
      errors.push(`charge ${u.email}: ${e instanceof Error ? e.message : String(e)}`)
    }
  }

  return {
    ok: true,
    usersConsidered: users.length,
    remindersSent,
    chargesInitiated,
    errors: errors.length ? errors : undefined,
  }
}
