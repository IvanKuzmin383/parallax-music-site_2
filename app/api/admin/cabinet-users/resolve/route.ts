import { NextRequest, NextResponse } from "next/server"
import { getAdminToken, verifySession } from "@/lib/auth"
import { getCabinetUserByEmail, getCabinetUserById } from "@/lib/cabinet-users"

/**
 * Резолв карточки по email или UUID без email в path
 * (иначе сегмент вроде user@gmail.com может ломать роут Next.js).
 */
export async function GET(request: NextRequest) {
  const token = getAdminToken(request)
  if (!verifySession(token)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const email = request.nextUrl.searchParams.get("email")?.trim() || ""
  const id = request.nextUrl.searchParams.get("id")?.trim() || ""

  if (!email && !id) {
    return NextResponse.json({ error: "Укажите email или id" }, { status: 400 })
  }

  let user = id ? await getCabinetUserById(id) : null
  if (!user && email) {
    user = await getCabinetUserByEmail(email, { includeDisabled: true })
  }
  if (!user && id.includes("@")) {
    user = await getCabinetUserByEmail(id, { includeDisabled: true })
  }

  if (!user) {
    return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 })
  }

  return NextResponse.json({
    id: user.id,
    email: user.email,
    artistName: user.artistName ?? null,
  })
}
