import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { getAdminToken, verifySession } from "@/lib/auth"
import { setFulfillmentStatus } from "@/lib/service-fulfillments"

const bodySchema = z.object({
  fulfillmentStatus: z.enum(["new", "in_progress", "done"]),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const token = getAdminToken(request)
  if (!verifySession(token)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { orderId } = await params
  if (!orderId?.trim()) {
    return NextResponse.json({ error: "Не указан заказ" }, { status: 400 })
  }

  try {
    const body = await request.json()
    const { fulfillmentStatus } = bodySchema.parse(body)
    const updated = setFulfillmentStatus(orderId.trim(), fulfillmentStatus)
    if (!updated) {
      return NextResponse.json(
        { error: "Заказ не найден, не оплачен или не относится к услугам" },
        { status: 404 }
      )
    }
    return NextResponse.json({ orderId: orderId.trim(), fulfillmentStatus: updated })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Ошибка валидации данных", errors: error.errors },
        { status: 400 }
      )
    }
    console.error("[admin/service-fulfillments] PATCH", error)
    return NextResponse.json({ error: "Внутренняя ошибка" }, { status: 500 })
  }
}
