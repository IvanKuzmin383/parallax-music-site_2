import { NextRequest, NextResponse } from "next/server"
import { getCabinetToken, getCabinetSession } from "@/lib/cabinet-auth"
import { getCabinetUserByEmail } from "@/lib/cabinet-users"
import { respondWithWalletPayment } from "@/lib/cabinet-wallet-pay"
import { createOrder } from "@/lib/orders"
import { validateAiCoverOrder } from "@/lib/ai-cover-order"
const YOOKASSA_PAYMENT_DESCRIPTION = "AI обложка для трека"

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
    return NextResponse.json({ error: "Неверный JSON" }, { status: 400 })
  }

  const raw = body as Record<string, unknown>
  const validated = validateAiCoverOrder({
    includeTextOnCover: raw.includeTextOnCover === true,
    artistName: typeof raw.artistName === "string" ? raw.artistName : null,
    releaseTitle: typeof raw.releaseTitle === "string" ? raw.releaseTitle : null,
    trackTitle: typeof raw.trackTitle === "string" ? raw.trackTitle : null,
    comment: typeof raw.comment === "string" ? raw.comment : null,
    contactType: typeof raw.contactType === "string" ? raw.contactType : null,
    contactValue: typeof raw.contactValue === "string" ? raw.contactValue : null,
  })

  if (!validated.ok) {
    return NextResponse.json({ error: validated.error, fieldErrors: validated.fieldErrors }, { status: 400 })
  }

  const isTelegramContact = validated.contactType === "telegram"
  const order = await createOrder({
    orderType: "ai_cover",
    userId: user.id,
    tracksCount: 1,
    totalAmount: validated.totalAmount,
    contactEmail: isTelegramContact ? undefined : `${validated.contactType}: ${validated.contactValue}`,
    contactTelegram: isTelegramContact ? validated.contactValue : undefined,
    serviceDetails: validated.serviceDetails,
  })

  return respondWithWalletPayment(order)
}
