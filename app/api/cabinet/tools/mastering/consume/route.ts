import { NextRequest, NextResponse } from "next/server"
import { getCabinetSession, getCabinetToken } from "@/lib/cabinet-auth"
import { getCabinetUserByEmail } from "@/lib/cabinet-users"
import { consumeToolsMasteringDownload } from "@/lib/tools-mastering-entitlement"

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

  const result = await consumeToolsMasteringDownload(user.id)
  if (!result.ok) {
    if (result.error === "payment_required") {
      return NextResponse.json(
        {
          error: "Нужна оплата скачивания",
          code: "payment_required",
          entitlement: result.entitlement,
        },
        { status: 402 }
      )
    }
    return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 })
  }

  return NextResponse.json({
    ok: true,
    used: result.used,
    entitlement: result.entitlement,
  })
}
