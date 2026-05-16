import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { addMonths } from "date-fns"
import { getAdminToken, verifySession } from "@/lib/auth"
import {
  getAllCabinetUsers,
  createCabinetUser,
  updateCabinetUserSubscription,
} from "@/lib/cabinet-users"
import { getPaidOrdersByEmail } from "@/lib/orders"
import { isPlanId, planIdToSubscriptionName } from "@/lib/plan-pricing"

const createUserSchema = z.object({
  email: z.string().email("Неверный формат email"),
  password: z.string().min(10, "Пароль должен быть не менее 10 символов"),
  artistName: z.string().optional(),
  telegram: z.string().optional(),
})

export async function GET(request: NextRequest) {
  const token = getAdminToken(request)
  if (!verifySession(token)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const users = await getAllCabinetUsers()
    const safeUsers = users.map(
      ({
        id,
        email,
        createdAt,
        artistName,
        isDisabled,
        counterpartyType,
        subscriptionName,
        subscriptionExpiresAt,
        subscriptionTrackLimit,
        purchasedTracksBalance,
        streamingBalance,
      }) => ({
        id,
        email,
        artistName,
        isDisabled: isDisabled ?? false,
        counterpartyType: counterpartyType ?? "individual",
        createdAt,
        subscriptionName,
        subscriptionExpiresAt,
        subscriptionTrackLimit,
        purchasedTracksBalance: purchasedTracksBalance ?? 0,
        streamingBalance: streamingBalance || 0,
      })
    )
    return NextResponse.json({ users: safeUsers })
  } catch (error) {
    console.error("Error fetching cabinet users:", error)
    return NextResponse.json(
      { error: "Не удалось загрузить пользователей" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  const token = getAdminToken(request)
  if (!verifySession(token)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Неверный JSON" }, { status: 400 })
  }

  const parsed = createUserSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Ошибка валидации", errors: parsed.error.flatten() },
      { status: 400 }
    )
  }

  try {
    const user = await createCabinetUser({
      email: parsed.data.email,
      password: parsed.data.password,
      artistName: parsed.data.artistName,
      telegram: parsed.data.telegram,
    })

    const paidOrders = await getPaidOrdersByEmail(parsed.data.email)
    if (paidOrders.length > 0) {
      const subscriptionOrders = paidOrders.filter((o) => o.orderType === "subscription")
      if (subscriptionOrders.length > 0) {
        const order = subscriptionOrders.sort((a, b) => (a.paidAt ?? "").localeCompare(b.paidAt ?? ""))[
          subscriptionOrders.length - 1
        ]
        if (order && isPlanId(order.planId) && order.orderType === "subscription") {
          const subscriptionName = planIdToSubscriptionName(order.planId)
          const baseDate = order.paidAt ? new Date(order.paidAt) : new Date()
          const monthsToAdd =
            order.period === "year" ? 12 * (order.periodsCount ?? 1) : order.periodsCount ?? 1
          const expiresAt = addMonths(baseDate, monthsToAdd).toISOString()
          await updateCabinetUserSubscription(user.id, subscriptionName, expiresAt, user.subscriptionTrackLimit ?? null)
        }
      }
    }
    return NextResponse.json(
      {
        user: {
          id: user.id,
          email: user.email,
          artistName: user.artistName,
          createdAt: user.createdAt,
          subscriptionName: user.subscriptionName,
          subscriptionExpiresAt: user.subscriptionExpiresAt,
        },
      },
      { status: 201 }
    )
  } catch (error) {
    if (error instanceof Error && error.message.includes("already exists")) {
      return NextResponse.json(
        { error: "Пользователь с таким email уже существует, используйте вход" },
        { status: 400 }
      )
    }
    console.error("Error creating cabinet user:", error)
    return NextResponse.json(
      { error: "Не удалось создать пользователя" },
      { status: 500 }
    )
  }
}
