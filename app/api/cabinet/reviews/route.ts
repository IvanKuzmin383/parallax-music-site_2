import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { getCabinetToken, getCabinetSession } from "@/lib/cabinet-auth"
import { getCabinetUserByEmail } from "@/lib/cabinet-users"
import { createUserReview, getReviewByUserId } from "@/lib/reviews"

const createReviewSchema = z.object({
  authorName: z.string().trim().min(2).max(80),
  text: z.string().trim().min(20).max(3000),
  rating: z.number().int().min(1).max(5),
})

export async function POST(request: NextRequest) {
  const token = getCabinetToken(request)
  const session = getCabinetSession(token)
  if (!session) {
    return NextResponse.json({ error: "Необходима авторизация" }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Неверный JSON" }, { status: 400 })
  }

  const parsed = createReviewSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Ошибка валидации" }, { status: 400 })
  }

  try {
    const user = await getCabinetUserByEmail(session.email)
    if (!user) {
      return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 })
    }

    const existing = await getReviewByUserId(user.id)
    if (existing) {
      return NextResponse.json({ error: "Вы уже оставили отзыв" }, { status: 409 })
    }

    const review = await createUserReview({
      userId: user.id,
      authorName: parsed.data.authorName,
      text: parsed.data.text,
      rating: parsed.data.rating,
    })

    return NextResponse.json({ review }, { status: 201 })
  } catch (error) {
    console.error("Error creating cabinet review:", error)
    return NextResponse.json({ error: "Не удалось отправить отзыв" }, { status: 500 })
  }
}
