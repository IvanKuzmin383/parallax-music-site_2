import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { getAdminToken, verifySession } from "@/lib/auth"
import { createAdminReview, getAllReviews } from "@/lib/reviews"

const createAdminReviewSchema = z.object({
  authorName: z.string().trim().min(2).max(80),
  text: z.string().trim().min(20).max(3000),
  rating: z.number().int().min(1).max(5),
  isPublished: z.boolean().optional().default(false),
})

export async function GET(request: NextRequest) {
  const token = getAdminToken(request)
  if (!verifySession(token)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const reviews = await getAllReviews()
    return NextResponse.json({ reviews })
  } catch (error) {
    console.error("Error fetching admin reviews:", error)
    return NextResponse.json({ error: "Не удалось загрузить отзывы" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const token = getAdminToken(request)
  if (!verifySession(token)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Неверный JSON" }, { status: 400 })
  }

  const parsed = createAdminReviewSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Ошибка валидации" }, { status: 400 })
  }

  try {
    const review = await createAdminReview(parsed.data)
    return NextResponse.json({ review }, { status: 201 })
  } catch (error) {
    console.error("Error creating admin review:", error)
    return NextResponse.json({ error: "Не удалось создать отзыв" }, { status: 500 })
  }
}
