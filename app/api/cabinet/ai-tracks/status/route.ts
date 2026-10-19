import { NextRequest, NextResponse } from "next/server"
import { getCabinetSession, getCabinetToken } from "@/lib/cabinet-auth"
import { getCabinetUserByEmail } from "@/lib/cabinet-users"
import { getAiTracksPublicConfig } from "@/lib/ai-tracks-config-server"
import { listActiveAiTracksJobs } from "@/lib/ai-tracks-jobs"
import { syncAiTracksJobsWithProvider } from "@/lib/ai-tracks-settle"

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

  const walletBalance = Math.max(0, Number(user.walletBalance ?? 0) || 0)

  try {
    let activeJobs = await listActiveAiTracksJobs(user.id)
    if (activeJobs.length > 0) {
      await syncAiTracksJobsWithProvider(activeJobs.map((j) => j.id))
      activeJobs = await listActiveAiTracksJobs(user.id)
    }

    return NextResponse.json({
      ...getAiTracksPublicConfig(),
      walletBalance,
      activeJobs,
    })
  } catch (e) {
    console.error("[ai-tracks/status]", e)
    return NextResponse.json({
      ...getAiTracksPublicConfig(),
      walletBalance,
      activeJobs: [],
    })
  }
}
