import { NextRequest, NextResponse } from "next/server"
import { getCabinetSession, getCabinetToken } from "@/lib/cabinet-auth"
import { getCabinetUserByEmail } from "@/lib/cabinet-users"
import { getOrderById } from "@/lib/orders"

export async function GET(request: NextRequest) {
  const token = getCabinetToken(request)
  const session = getCabinetSession(token)
  if (!session) {
    return NextResponse.json({ error: "Необходима авторизация" }, { status: 401 })
  }

  const orderId = request.nextUrl.searchParams.get("orderId")?.trim()
  if (!orderId) {
    return NextResponse.json({ error: "Не указан orderId" }, { status: 400 })
  }

  const user = await getCabinetUserByEmail(session.email)
  if (!user) {
    return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 })
  }

  const order = await getOrderById(orderId)
  if (!order) {
    return NextResponse.json({ error: "Заказ не найден" }, { status: 404 })
  }

  if ("userId" in order && order.userId !== user.id) {
    return NextResponse.json({ error: "Доступ запрещен" }, { status: 403 })
  }

  return NextResponse.json({
    orderId: order.id,
    status: order.status,
    paid: order.status === "paid",
  })
}
