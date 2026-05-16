import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { getAdminToken, verifySession } from "@/lib/auth"
import { deleteReview, updateReview } from "@/lib/reviews"

const updateReviewSchema = z.object({
  authorName: z.string().trim().min(2).max(80).optional(),
  text: z.string().trim().min(20).max(3000).optional(),
  rating: z.number().int().min(1).max(5).optional(),
  isPublished: z.boolean().optional(),
})

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const token = getAdminToken(request)
  if (!verifySession(token)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await context.params
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Неверный JSON" }, { status: 400 })
  }

  const parsed = updateReviewSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Ошибка валидации" }, { status: 400 })
  }

  try {
    const review = await updateReview(id, parsed.data)
    if (!review) {
      return NextResponse.json({ error: "Отзыв не найден" }, { status: 404 })
    }
    return NextResponse.json({ review })
  } catch (error) {
    console.error("Error updating review:", error)
    return NextResponse.json({ error: "Не удалось обновить отзыв" }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const token = getAdminToken(request)
  if (!verifySession(token)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await context.params

  try {
    const ok = await deleteReview(id)
    if (!ok) {
      return NextResponse.json({ error: "Отзыв не найден" }, { status: 404 })
    }
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting review:", error)
    return NextResponse.json({ error: "Не удалось удалить отзыв" }, { status: 500 })
  }
}
