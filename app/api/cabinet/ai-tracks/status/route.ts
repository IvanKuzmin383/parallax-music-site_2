import { NextRequest, NextResponse } from "next/server"
import { getCabinetSession, getCabinetToken } from "@/lib/cabinet-auth"
import { getCabinetUserByEmail } from "@/lib/cabinet-users"
import { getAiTracksAttempts } from "@/lib/ai-tracks-attempts"
import { getAiTracksPublicConfig } from "@/lib/ai-tracks-config-server"
import { listActiveAiTracksJobs } from "@/lib/ai-tracks-jobs"

export async function GET(request: NextRequest) {
  const token = getCabinetToken(request)
  const session = getCabinetSession(token)
  if (!session) {
    return NextResponse.json({ error: "Необходима авторизация" }, { status: 401 })
  }

  const user = await getCabinetUserByEmail(session.email)
  if (!user) {
    return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 })
  }

  try {
    const [attempts, activeJobs] = await Promise.all([
      getAiTracksAttempts(user.id),
      listActiveAiTracksJobs(user.id),
    ])

    return NextResponse.json({
      ...getAiTracksPublicConfig(),
      attempts,
      activeJobs,
    })
  } catch (e) {
    console.error("[ai-tracks/status]", e)
    return NextResponse.json({
      ...getAiTracksPublicConfig(),
      attempts: 0,
      activeJobs: [],
    })
  }
}
