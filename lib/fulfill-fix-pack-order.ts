import {
  getCabinetUserByEmail,
  updateCabinetUserSubscription,
} from "@/lib/cabinet-users"
import { addFixPackCredits } from "@/lib/fix-pack-credits"
import { isEmailConfigured, sendFixPackRegistrationEmail } from "@/lib/email"
import { isStaffNotificationConfigured, notifyStaffInBackground } from "@/lib/form-notifications"
import type { OrderFixPack } from "@/lib/orders"
import { updateOrderStatus } from "@/lib/orders"
import { addPendingFixCredits } from "@/lib/pending-fix-credits"
import { escapeHtml } from "@/lib/telegram"

export type FulfillFixPackOrderParams = {
  order: OrderFixPack
  paymentId: string
  paidAt: string
  amountRub?: string
  provider?: "tbank" | "yookassa"
}

export async function fulfillFixPackOrder(params: FulfillFixPackOrderParams): Promise<void> {
  const { order, paymentId, paidAt } = params
  const orderId = order.id
  const amount = params.amountRub ?? order.totalAmount
  const provider = params.provider ?? "tbank"
  const tracksCount = order.tracksCount

  const email = order.userEmail?.trim().toLowerCase()
  if (!email || !Number.isInteger(tracksCount) || tracksCount < 1) {
    console.error("[fulfill-fix-pack-order] Invalid order fields", { orderId, email, tracksCount })
    await updateOrderStatus(orderId, "paid", { paidAt, paymentId })
    return
  }

  const user = await getCabinetUserByEmail(email)

  if (user) {
    if (user.subscriptionName && user.subscriptionName !== "Fix") {
      console.error("[fulfill-fix-pack-order] User has non-Fix subscription", {
        orderId,
        email,
        subscriptionName: user.subscriptionName,
      })
      await updateOrderStatus(orderId, "paid", { paidAt, paymentId, userId: user.id })
      return
    }

    if (user.subscriptionName !== "Fix") {
      await updateCabinetUserSubscription(user.id, "Fix", null, user.subscriptionTrackLimit ?? 0)
    }

    await addFixPackCredits(user.id, tracksCount)
    await updateOrderStatus(orderId, "paid", { paidAt, paymentId, userId: user.id })
  } else {
    await addPendingFixCredits({ email, tracksCount, orderId })
    await updateOrderStatus(orderId, "paid", { paidAt, paymentId })

    if (isEmailConfigured()) {
      try {
        const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://parallaxmusic.ru").replace(/\/$/, "")
        const registerLink = `${baseUrl}/cabinet?tab=register&email=${encodeURIComponent(email)}`
        const mailResult = await sendFixPackRegistrationEmail(email, registerLink, tracksCount)
        if (!mailResult.ok) {
          console.error("[fulfill-fix-pack-order] Registration email failed", {
            orderId,
            email,
            error: mailResult.error,
          })
        }
      } catch (err) {
        console.error("[fulfill-fix-pack-order] Registration email error", err)
      }
    }
  }

  try {
    const title = user
      ? "Выполнена оплата пакета треков Fix"
      : "Оплата пакета Fix (пользователь ещё не зарегистрирован)"

    if (isStaffNotificationConfigured()) {
      notifyStaffInBackground({
        telegramMessage: [
          `<b>${title}</b> (${provider})`,
          "",
          `<b>Email:</b> ${escapeHtml(email)}`,
          `<b>Количество треков:</b> ${tracksCount}`,
          `<b>Сумма:</b> ${escapeHtml(String(amount))} RUB`,
          `<b>ID заказа:</b> ${escapeHtml(orderId)}`,
          `<b>ID платежа:</b> ${escapeHtml(paymentId)}`,
          "",
          "#оплата #fix #кабинет",
        ].join("\n"),
        emailSubject: `[Parallax] Оплата Fix-пакета: ${email}`,
        logContext: `payments/${provider}/webhook fix_pack`,
      })
    }
  } catch (err) {
    console.error("[fulfill-fix-pack-order] Notification error", err)
  }
}

/** При регистрации: начислить отложенные кредиты и paid fix_pack заказы. */
export async function applyFixPackCreditsOnRegister(
  userId: string,
  email: string,
  paidFixPackOrders: OrderFixPack[]
): Promise<void> {
  const { deletePendingFixCreditsByEmail, sumPendingFixCredits } = await import(
    "@/lib/pending-fix-credits"
  )

  const totalFromOrders = paidFixPackOrders.reduce(
    (sum, order) => sum + Math.max(0, order.tracksCount ?? 0),
    0
  )
  const totalFromPending = await sumPendingFixCredits(email)
  // Берём максимум: pending может содержать корректное число, если в заказе tracks_count = 0.
  // Не суммируем оба источника - один заказ может быть и в orders, и в pending.
  const totalTracks = Math.max(totalFromOrders, totalFromPending)

  await updateCabinetUserSubscription(userId, "Fix", null, 0)

  if (totalTracks > 0) {
    await addFixPackCredits(userId, totalTracks)
    await deletePendingFixCreditsByEmail(email)
  }
}
