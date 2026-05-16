import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { addMonths } from "date-fns"
import {
  createCabinetUser,
  getCabinetUserByEmail,
  getLastCabinetUserDeletionAt,
  setCabinetUserAutopay,
  updateCabinetUserSubscription,
} from "@/lib/cabinet-users"
import { escapeHtml, isTelegramConfigured, sendTelegramMessage } from "@/lib/telegram"
import { getPaidOrdersByEmail } from "@/lib/orders"
import { isPlanId, planIdToSubscriptionName, type PlanId } from "@/lib/plan-pricing"
import { createCabinetSession, CABINET_SESSION_COOKIE } from "@/lib/cabinet-auth"
import { verifyTurnstileToken } from "@/lib/turnstile"
import { deletePendingSubscriptionAutopay, getPendingSubscriptionAutopay } from "@/lib/pending-subscription-autopay"
import { createCabinetArtistSubscriptionSlot } from "@/lib/cabinet-artist-subscriptions"
import type { Order, OrderSubscription } from "@/lib/orders"

function isPaidSubscriptionOrder(order: Order): order is OrderSubscription & { planId: PlanId } {
  return order.orderType === "subscription" && isPlanId(order.planId)
}

const registerSchema = z.object({
  email: z.string().email("Неверный формат email"),
  password: z.string().min(10, "Пароль должен быть не менее 10 символов"),
  artistName: z.string().optional(),
  telegram: z.string().optional(),
  captchaToken: z.string().optional(),
  consentPersonalData: z.literal(true, {
    errorMap: () => ({ message: "Необходимо согласие на обработку персональных данных" }),
  }),
  consentPrivacyPolicy: z.literal(true, {
    errorMap: () => ({ message: "Необходимо подтвердить ознакомление с политикой конфиденциальности" }),
  }),
  consentTermsOfUse: z.literal(true, {
    errorMap: () => ({ message: "Необходимо согласие с условиями использования сервиса" }),
  }),
})

function sessionCookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    maxAge,
    path: "/",
  }
}

export async function POST(request: NextRequest) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Неверный JSON" }, { status: 400 })
  }

  const parsed = registerSchema.safeParse(body)
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0]
    const validationMessage = firstIssue?.message || "Ошибка валидации"

    return NextResponse.json(
      { error: validationMessage, errors: parsed.error.flatten() },
      { status: 400 }
    )
  }

  try {
    const ipHeader = request.headers.get("x-forwarded-for") || ""
    const clientIp = ipHeader.split(",")[0]?.trim() || null

    const isHuman = await verifyTurnstileToken(parsed.data.captchaToken, clientIp)
    if (!isHuman) {
      return NextResponse.json(
        { error: "Подтвердите, что вы не робот" },
        { status: 429 }
      )
    }

    const existingUser = await getCabinetUserByEmail(parsed.data.email, { includeDisabled: true })
    if (existingUser) {
      return NextResponse.json(
        { error: "Пользователь с таким email уже существует, используйте вход" },
        { status: 400 }
      )
    }

    const paidOrders = await getPaidOrdersByEmail(parsed.data.email)
    const deletedAt = await getLastCabinetUserDeletionAt(parsed.data.email)
    const eligiblePaidOrders = deletedAt
      ? paidOrders.filter((order) => {
          const orderDateRaw = order.paidAt ?? order.createdAt
          const orderDateTs = Date.parse(orderDateRaw)
          const deletedAtTs = Date.parse(deletedAt)
          if (Number.isNaN(orderDateTs) || Number.isNaN(deletedAtTs)) return false
          return orderDateTs > deletedAtTs
        })
      : paidOrders
    const hasPaidSubscription = eligiblePaidOrders.some(
      (o) => o.orderType === "subscription" && isPlanId(o.planId)
    )
    if (!hasPaidSubscription) {
      return NextResponse.json(
        {
          error:
            "Сначала оплатите тариф на сайте, указав этот email. После успешной оплаты вы сможете зарегистрироваться.",
          code: "SUBSCRIPTION_REQUIRED" as const,
        },
        { status: 403 }
      )
    }

    const user = await createCabinetUser({
      email: parsed.data.email,
      password: parsed.data.password,
      artistName: parsed.data.artistName,
      telegram: parsed.data.telegram,
    })

    if (eligiblePaidOrders.length > 0) {
      const subscriptionOrders = eligiblePaidOrders
        .filter(isPaidSubscriptionOrder)
        .sort((a, b) => (a.paidAt ?? "").localeCompare(b.paidAt ?? ""))
      if (subscriptionOrders.length > 0) {
        let latestExpiresAt: string | null = null
        let latestSubscriptionName: string | null = null
        for (const order of subscriptionOrders) {
          const subscriptionName = planIdToSubscriptionName(order.planId)
          const baseDate = order.paidAt ? new Date(order.paidAt) : new Date()
          const monthsToAdd =
            order.period === "year" ? 12 * (order.periodsCount ?? 1) : order.periodsCount ?? 1
          const expiresAt = addMonths(baseDate, monthsToAdd).toISOString()
          await createCabinetArtistSubscriptionSlot({
            userId: user.id,
            subscriptionName,
            subscriptionExpiresAt: expiresAt,
            subscriptionTrackLimit: user.subscriptionTrackLimit ?? null,
          })
          latestExpiresAt = expiresAt
          latestSubscriptionName = subscriptionName
        }
        if (latestSubscriptionName && latestExpiresAt) {
          await updateCabinetUserSubscription(
            user.id,
            latestSubscriptionName,
            latestExpiresAt,
            user.subscriptionTrackLimit ?? null
          )
        }
      }
    }

    const merged = await getCabinetUserByEmail(parsed.data.email, { includeDisabled: true })
    if (merged?.subscriptionExpiresAt) {
      const pend = getPendingSubscriptionAutopay(parsed.data.email)
      if (pend) {
        await setCabinetUserAutopay(merged.id, {
          yookassaPaymentMethodId: pend.yookassaPaymentMethodId,
          autopayEnabled: true,
          autopayPlanId: pend.planId,
          autopayPeriod: pend.period,
          autopayPeriodsCount: pend.periodsCount,
          autopayNextChargeAt: merged.subscriptionExpiresAt,
          autopayLastReminderSentAt: null,
        })
        deletePendingSubscriptionAutopay(parsed.data.email)
      }
    }

    const token = createCabinetSession(user.email)

    const userOut = (await getCabinetUserByEmail(parsed.data.email, { includeDisabled: true })) ?? user

    if (isTelegramConfigured()) {
      try {
        const messageLines = [
          "<b>Новая регистрация в кабинете</b>",
          "",
          `<b>Email:</b> ${escapeHtml(user.email)}`,
          user.artistName ? `<b>Артист:</b> ${escapeHtml(user.artistName)}` : null,
          user.telegram ? `<b>Telegram:</b> ${escapeHtml(user.telegram)}` : null,
          "",
          "#регистрация #кабинет",
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
          console.error("[cabinet/register] Telegram send failed for registration", {
            status: tgRes.status,
            statusText: tgRes.statusText,
            detail,
          })
        }
      } catch (err) {
        console.error("[cabinet/register] Telegram notification error for registration", err)
      }
    }

    const response = NextResponse.json(
      {
        user: {
          id: userOut.id,
          email: userOut.email,
          artistName: userOut.artistName,
          createdAt: userOut.createdAt,
          subscriptionName: userOut.subscriptionName,
          subscriptionExpiresAt: userOut.subscriptionExpiresAt,
        },
      },
      { status: 201 }
    )
    response.cookies.set(CABINET_SESSION_COOKIE, token, sessionCookieOptions(86400))
    return response
  } catch (error) {
    if (error instanceof Error && error.message.includes("already exists")) {
      return NextResponse.json(
        { error: "Пользователь с таким email уже существует, используйте вход" },
        { status: 400 }
      )
    }
    console.error("Error registering cabinet user:", error)
    return NextResponse.json(
      { error: "Не удалось создать пользователя" },
      { status: 500 }
    )
  }
}

