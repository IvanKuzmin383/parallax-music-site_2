import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { getAdminToken, verifySession } from "@/lib/auth"
import { COUNTERPARTY_TYPES } from "@/lib/cabinet-counterparty"
import {
  updateCabinetUserPassword,
  updateCabinetUserSubscription,
  updateCabinetUserArtistName,
  updateCabinetUserCounterpartyType,
  updateCabinetUserDisabled,
  updateCabinetUserAdminProfile,
  deleteCabinetUser,
  getCabinetUserById,
} from "@/lib/cabinet-users"
import { adminSetBalances } from "@/lib/cabinet-balance"
import { SUBSCRIPTION_PLANS } from "@/lib/subscription-plans"

const updatePasswordSchema = z.object({
  password: z.string().min(10, "Пароль должен быть не менее 10 символов"),
})

const updateSubscriptionSchema = z.object({
  subscriptionName: z
    .enum([...SUBSCRIPTION_PLANS])
    .nullable()
    .optional(),
  subscriptionExpiresAt: z.string().nullable().optional(),
  subscriptionTrackLimit: z.number().int().positive().nullable().optional(),
})

const updateArtistNameSchema = z.object({
  artistName: z.string().nullable().optional(),
})

const updateDisabledSchema = z.object({
  isDisabled: z.boolean(),
})

const updateCounterpartyTypeSchema = z.object({
  counterpartyType: z.enum(COUNTERPARTY_TYPES),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = getAdminToken(request)
  if (!verifySession(token)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Неверный JSON" }, { status: 400 })
  }

  // Проверяем, обновляется ли пароль
  const passwordParsed = updatePasswordSchema.safeParse(body)
  if (passwordParsed.success) {
    const updated = await updateCabinetUserPassword(id, passwordParsed.data.password)
    if (!updated) {
      return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 })
    }

    return NextResponse.json({
      user: {
        id: updated.id,
        email: updated.email,
        artistName: updated.artistName,
        createdAt: updated.createdAt,
        subscriptionName: updated.subscriptionName,
        subscriptionExpiresAt: updated.subscriptionExpiresAt,
        subscriptionTrackLimit: updated.subscriptionTrackLimit,
      },
    })
  }

  // Проверяем, обновляется ли имя артиста (только если в теле явно передан ключ artistName)
  const bodyObj = typeof body === "object" && body !== null ? (body as Record<string, unknown>) : {}
  const artistNameParsed = updateArtistNameSchema.safeParse(body)
  if (artistNameParsed.success && "artistName" in bodyObj) {
    const updated = await updateCabinetUserArtistName(
      id,
      artistNameParsed.data.artistName ?? null
    )
    if (!updated) {
      return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 })
    }

    return NextResponse.json({
      user: {
        id: updated.id,
        email: updated.email,
        artistName: updated.artistName,
        createdAt: updated.createdAt,
        subscriptionName: updated.subscriptionName,
        subscriptionExpiresAt: updated.subscriptionExpiresAt,
        subscriptionTrackLimit: updated.subscriptionTrackLimit,
      },
    })
  }

  // Проверяем, обновляется ли подписка (только если в теле есть хотя бы одно поле подписки)
  const subscriptionParsed = updateSubscriptionSchema.safeParse(body)
  const hasSubscriptionFields =
    "subscriptionName" in bodyObj ||
    "subscriptionExpiresAt" in bodyObj ||
    "subscriptionTrackLimit" in bodyObj
  if (subscriptionParsed.success && hasSubscriptionFields) {
    const updated = await updateCabinetUserSubscription(
      id,
      subscriptionParsed.data.subscriptionName ?? null,
      subscriptionParsed.data.subscriptionExpiresAt ?? null,
      subscriptionParsed.data.subscriptionTrackLimit ?? null
    )
    if (!updated) {
      return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 })
    }

    return NextResponse.json({
      user: {
        id: updated.id,
        email: updated.email,
        artistName: updated.artistName,
        createdAt: updated.createdAt,
        subscriptionName: updated.subscriptionName,
        subscriptionExpiresAt: updated.subscriptionExpiresAt,
        subscriptionTrackLimit: updated.subscriptionTrackLimit,
      },
    })
  }

  const counterpartyParsed = updateCounterpartyTypeSchema.safeParse(body)
  if (counterpartyParsed.success && "counterpartyType" in bodyObj) {
    const updated = await updateCabinetUserCounterpartyType(
      id,
      counterpartyParsed.data.counterpartyType
    )
    if (!updated) {
      return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 })
    }

    return NextResponse.json({
      user: {
        id: updated.id,
        email: updated.email,
        artistName: updated.artistName,
        counterpartyType: updated.counterpartyType ?? "individual",
        createdAt: updated.createdAt,
        subscriptionName: updated.subscriptionName,
        subscriptionExpiresAt: updated.subscriptionExpiresAt,
        subscriptionTrackLimit: updated.subscriptionTrackLimit,
      },
    })
  }

  // Проверяем, обновляется ли статус блокировки (только если в теле явно передан ключ isDisabled)
  const disabledParsed = updateDisabledSchema.safeParse(body)
  if (disabledParsed.success && "isDisabled" in bodyObj) {
    const updated = await updateCabinetUserDisabled(id, disabledParsed.data.isDisabled)
    if (!updated) {
      return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 })
    }

    return NextResponse.json({
      user: {
        id: updated.id,
        email: updated.email,
        artistName: updated.artistName,
        isDisabled: updated.isDisabled ?? false,
        createdAt: updated.createdAt,
        subscriptionName: updated.subscriptionName,
        subscriptionExpiresAt: updated.subscriptionExpiresAt,
        subscriptionTrackLimit: updated.subscriptionTrackLimit,
      },
    })
  }

  if ("streamingBalance" in bodyObj || "walletBalance" in bodyObj) {
    const streaming =
      typeof bodyObj.streamingBalance === "number" ? bodyObj.streamingBalance : undefined
    const wallet = typeof bodyObj.walletBalance === "number" ? bodyObj.walletBalance : undefined
    const note = typeof bodyObj.balanceNote === "string" ? bodyObj.balanceNote : ""
    if (streaming === undefined && wallet === undefined) {
      return NextResponse.json({ error: "Укажите числовой баланс" }, { status: 400 })
    }
    const result = await adminSetBalances({
      userId: id,
      streamingBalance: streaming,
      walletBalance: wallet,
      note,
    })
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status })
    }
    const updated = await getCabinetUserById(id)
    return NextResponse.json({
      user: {
        id,
        email: updated?.email,
        streamingBalance: result.streamingBalance,
        walletBalance: result.walletBalance,
      },
      transaction: result.transaction,
    })
  }

  if ("profile" in bodyObj && bodyObj.profile && typeof bodyObj.profile === "object") {
    const updated = await updateCabinetUserAdminProfile(
      id,
      bodyObj.profile as Record<string, string | boolean | null | undefined>
    )
    if (!updated) {
      return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 })
    }
    return NextResponse.json({
      user: {
        id: updated.id,
        email: updated.email,
        artistName: updated.artistName,
        counterpartyType: updated.counterpartyType ?? "individual",
        phone: updated.phone,
        telegram: updated.telegram,
      },
    })
  }

  return NextResponse.json(
    { error: "Ошибка валидации", errors: "Неверные данные для обновления" },
    { status: 400 }
  )
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = getAdminToken(request)
  if (!verifySession(token)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params
  const deleted = await deleteCabinetUser(id)
  if (!deleted) {
    return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 })
  }

  return NextResponse.json({ success: true })
}
