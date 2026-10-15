import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { getCabinetToken, getCabinetSession } from "@/lib/cabinet-auth"
import { getCabinetUserByEmail } from "@/lib/cabinet-users"
import { getSmartlinkById, isSmartlinkPubliclyActive } from "@/lib/cabinet-smartlinks"
import { respondWithWalletPayment } from "@/lib/cabinet-wallet-pay"
import { createOrder } from "@/lib/orders"
import { TOOLS_SMARTLINK_PRICE_RUB } from "@/lib/tools-smartlink-pricing"

const bodySchema = z.object({
  smartlinkId: z.string().trim().min(1),
})

export async function POST(request: NextRequest) {
  const token = getCabinetToken(request)
  const session = getCabinetSession(token)
  if (!session) {
    return NextResponse.json({ error: "Необходима авторизация" }, { status: 401 })
  }

  const user = await getCabinetUserByEmail(session.email)
  if (!user) {
    return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Некорректный JSON" }, { status: 400 })
  }
  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Укажите smartlinkId" }, { status: 400 })
  }

  const link = await getSmartlinkById(parsed.data.smartlinkId)
  if (!link || link.userId !== user.id) {
    return NextResponse.json({ error: "Смартлинк не найден" }, { status: 404 })
  }
  if (!link.coverPath?.trim()) {
    return NextResponse.json({ error: "Сначала загрузите обложку" }, { status: 400 })
  }
  if (isSmartlinkPubliclyActive(link)) {
    return NextResponse.json({ error: "Смартлинк уже активен" }, { status: 400 })
  }

  const order = await createOrder({
    orderType: "tools_smartlink",
    userId: user.id,
    totalAmount: TOOLS_SMARTLINK_PRICE_RUB.toFixed(2),
    releaseId: link.id,
  })

  return respondWithWalletPayment(order)
}
