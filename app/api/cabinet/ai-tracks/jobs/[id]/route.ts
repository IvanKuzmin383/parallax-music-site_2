import { NextRequest, NextResponse } from "next/server"
import { getCabinetSession, getCabinetToken } from "@/lib/cabinet-auth"
import { getCabinetUserByEmail } from "@/lib/cabinet-users"
import { getAiTracksJobForUser } from "@/lib/ai-tracks-jobs"
import { syncAiTracksJobWithProvider } from "@/lib/ai-tracks-settle"

export async function GET(
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

  const { id } = await context.params
  await syncAiTracksJobWithProvider(id)
  const job = await getAiTracksJobForUser(user.id, id)
  if (!job) {
    return NextResponse.json({ error: "Задача не найдена" }, { status: 404 })
  }

  return NextResponse.json({ job })
}
