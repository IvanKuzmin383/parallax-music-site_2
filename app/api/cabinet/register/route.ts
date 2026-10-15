import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { addMonths } from "date-fns"
import {
  createCabinetUser,
  getCabinetUserByEmail,
  setCabinetUserAutopay,
  updateCabinetUserSubscription,
} from "@/lib/cabinet-users"
import { escapeHtml } from "@/lib/telegram"
import { notifyStaffInBackground } from "@/lib/form-notifications"
import { applyFixPackCreditsOnRegister } from "@/lib/fulfill-fix-pack-order"
import {
  checkCabinetRegisterEligibility,
  isPaidSubscriptionOrder,
} from "@/lib/cabinet-register-eligibility"
import { createCabinetSession, CABINET_SESSION_COOKIE } from "@/lib/cabinet-auth"
import { verifyTurnstileToken } from "@/lib/turnstile"
import {
  deletePendingSubscriptionAutopay,
  getPendingSubscriptionAutopay,
} from "@/lib/pending-subscription-autopay"
import { createCabinetArtistSubscriptionSlot } from "@/lib/cabinet-artist-subscriptions"
import { planIdToSubscriptionName } from "@/lib/plan-pricing"
import { consumeEmailVerificationCode } from "@/lib/email-verification"
import { isEmailConfigured } from "@/lib/email"

const registerSchema = z.object({
  email: z.string().email("Неверный формат email"),
  password: z.string().min(10, "Пароль должен быть не менее 10 символов"),
  artistName: z.string().optional(),
  telegram: z.string().optional(),
  captchaToken: z.string().optional(),
  /** 6-значный код из письма */
  emailCode: z.string().trim().min(4).max(12),
  /** Код из ?ref= / cookie партнёрки */
  referralCode: z.string().max(40).optional(),
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
      return NextResponse.json({ error: "Подтвердите, что вы не робот" }, { status: 429 })
    }

    const existingUser = await getCabinetUserByEmail(parsed.data.email, { includeDisabled: true })
    if (existingUser) {
      return NextResponse.json(
        { error: "Пользователь с таким email уже существует, используйте вход" },
        { status: 400 }
      )
    }

    const email = parsed.data.email.trim().toLowerCase()

    const skipVerify =
      !isEmailConfigured() && process.env.EMAIL_VERIFICATION_DEV_BYPASS === "1"
    if (!skipVerify) {
      const verified = await consumeEmailVerificationCode(email, parsed.data.emailCode)
      if (!verified.ok) {
        const message =
          verified.error === "expired"
            ? "Срок действия кода истёк. Запросите новый."
            : verified.error === "too_many_attempts"
              ? "Слишком много неверных попыток. Запросите новый код."
              : "Неверный код подтверждения"
        return NextResponse.json({ error: message, code: "EMAIL_CODE_INVALID" as const }, { status: 400 })
      }
    }

    const eligibility = await checkCabinetRegisterEligibility(email)
    if (!eligibility.ok) {
      return NextResponse.json(
        { error: eligibility.error, code: eligibility.code },
        { status: eligibility.status }
      )
    }

    const { eligiblePaidSubscriptions, eligiblePaidFixPacks, hasPaidFixPack } = eligibility

    const user = await createCabinetUser({
      email,
      password: parsed.data.password,
      artistName: parsed.data.artistName,
      telegram: parsed.data.telegram,
    })

    try {
      const { attachReferrerOnRegister, tryGrantReferralFirstPaymentBonus } = await import(
        "@/lib/cabinet-referrals"
      )
      await attachReferrerOnRegister({
        userId: user.id,
        referralCode: parsed.data.referralCode,
      })
      const firstPaid =
        (hasPaidFixPack
          ? eligiblePaidFixPacks[0]
          : eligiblePaidSubscriptions
              .filter(isPaidSubscriptionOrder)
              .sort((a, b) => (a.paidAt ?? "").localeCompare(b.paidAt ?? ""))[0]) ?? null
      if (firstPaid) {
        await tryGrantReferralFirstPaymentBonus({
          referredUserId: user.id,
          order: firstPaid,
        })
      }
      const { tryEvaluateAchievements } = await import("@/lib/cabinet-achievements")
      await tryEvaluateAchievements(user.id)
    } catch (e) {
      console.error("[cabinet/register] gamification hook failed", e)
    }

    if (hasPaidFixPack) {
      await applyFixPackCreditsOnRegister(user.id, email, eligiblePaidFixPacks)
    } else if (eligiblePaidSubscriptions.length > 0) {
      const subscriptionOrders = eligiblePaidSubscriptions
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
            artistName: parsed.data.artistName,
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

    const merged = await getCabinetUserByEmail(email, { includeDisabled: true })
    if (merged?.subscriptionExpiresAt) {
      const pend = await getPendingSubscriptionAutopay(email)
      if (pend) {
        await setCabinetUserAutopay(merged.id, {
          tbankRebillId: pend.tbankRebillId,
          yookassaPaymentMethodId: null,
          autopayEnabled: true,
          autopayPlanId: pend.planId,
          autopayPeriod: pend.period,
          autopayPeriodsCount: pend.periodsCount,
          autopayNextChargeAt: merged.subscriptionExpiresAt,
          autopayLastReminderSentAt: null,
        })
        await deletePendingSubscriptionAutopay(email)
      }
    }

    const token = createCabinetSession(user.email, {
      userAgent: request.headers.get("user-agent"),
      ip: clientIp,
    })

    const userOut = (await getCabinetUserByEmail(email, { includeDisabled: true })) ?? user

    const messageLines = [
      "<b>Новая регистрация в кабинете</b>",
      "",
      `<b>Email:</b> ${escapeHtml(user.email)}`,
      user.artistName ? `<b>Артист:</b> ${escapeHtml(user.artistName)}` : null,
      user.telegram ? `<b>Telegram:</b> ${escapeHtml(user.telegram)}` : null,
      "",
      "#регистрация #кабинет",
    ].filter(Boolean) as string[]

    notifyStaffInBackground({
      telegramMessage: messageLines.join("\n"),
      emailSubject: `[Parallax] Регистрация: ${user.email}`,
      logContext: "cabinet/register",
    })

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
    return NextResponse.json({ error: "Не удалось создать пользователя" }, { status: 500 })
  }
}
