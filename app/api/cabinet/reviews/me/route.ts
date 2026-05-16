import { NextRequest, NextResponse } from "next/server"
import { getCabinetToken, getCabinetSession } from "@/lib/cabinet-auth"
import { getCabinetUserByEmail } from "@/lib/cabinet-users"
import { getReviewByUserId } from "@/lib/reviews"

export async function GET(request: NextRequest) {
  const token = getCabinetToken(request)
  const session = getCabinetSession(token)
  if (!session) {
    return NextResponse.json({ error: "Необходима авторизация" }, { status: 401 })
  }

  try {
    const user = await getCabinetUserByEmail(session.email)
    if (!user) {
      return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 })
    }
    const review = await getReviewByUserId(user.id)
    return NextResponse.json({ review: review ?? null })
  } catch (error) {
    console.error("Error loading my review:", error)
    return NextResponse.json({ error: "Не удалось загрузить отзыв" }, { status: 500 })
  }
}
