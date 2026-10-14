import { NextRequest, NextResponse } from "next/server"
import { getCabinetSession, getCabinetToken } from "@/lib/cabinet-auth"
import { getCabinetUserByEmail } from "@/lib/cabinet-users"
import { setAiTracksResultFavorite } from "@/lib/ai-tracks-jobs"

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
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

  const favorite =
    body && typeof body === "object" && "favorite" in body
      ? Boolean((body as { favorite: unknown }).favorite)
      : true

  const { id } = await context.params
  const result = await setAiTracksResultFavorite({
    userId: user.id,
    resultId: id,
    favorite,
  })
  if (!result) {
    return NextResponse.json({ error: "Результат не найден" }, { status: 404 })
  }

  return NextResponse.json({ result })
}
