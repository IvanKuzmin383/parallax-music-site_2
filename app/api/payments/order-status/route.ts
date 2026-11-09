import { NextRequest, NextResponse } from "next/server"
import { getOrderById } from "@/lib/orders"

/**
 * Публичная проверка статуса заказа для страниц возврата после оплаты (в том числе для гостей).
 * Статус берётся из БД: его выставляет только подтверждённый вебхук платёжной системы.
 * Отдаём минимум: статус и тип заказа. Email, сумма и прочие данные заказа не раскрываются.
 * Идентификатор заказа - случайный UUID, перебором не угадывается.
 */
const ORDER_ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const NO_STORE = { "Cache-Control": "no-store" }

export async function GET(request: NextRequest) {
  const orderId = request.nextUrl.searchParams.get("orderId")?.trim() ?? ""
  if (!ORDER_ID_RE.test(orderId)) {
    return NextResponse.json({ error: "Некорректный orderId" }, { status: 400, headers: NO_STORE })
  }

  try {
    const order = await getOrderById(orderId)
    if (!order) {
      return NextResponse.json({ status: "unknown" }, { status: 404, headers: NO_STORE })
    }
    return NextResponse.json(
      { status: order.status, orderType: order.orderType },
      { headers: NO_STORE },
    )
  } catch (error) {
    console.error("[payments/order-status] failed", error)
    return NextResponse.json({ error: "Не удалось проверить статус" }, { status: 500, headers: NO_STORE })
  }
}
