import { NextRequest, NextResponse } from "next/server"
import { getCabinetToken, getCabinetSession } from "@/lib/cabinet-auth"
import { getCabinetUserByEmail } from "@/lib/cabinet-users"
import { markSupportThreadReadForUser } from "@/lib/support-chat"

export async function POST(request: NextRequest) {
  const token = getCabinetToken(request)
  const session = getCabinetSession(token)
  if (!session) {
    return NextResponse.json({ error: "Необходима авторизация" }, { status: 401 })
  }

  const user = await getCabinetUserByEmail(session.email)
  if (!user || user.isDisabled) {
    return NextResponse.json({ error: "Необходима авторизация" }, { status: 401 })
  }

  try {
    await markSupportThreadReadForUser(user.id)
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("[cabinet/support/read] failed:", error)
    return NextResponse.json({ error: "Не удалось отметить прочитанным" }, { status: 500 })
  }
}
