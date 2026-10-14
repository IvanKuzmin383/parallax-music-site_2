import { NextRequest, NextResponse } from "next/server"
import { getCabinetSession, getCabinetToken } from "@/lib/cabinet-auth"
import { getCabinetUserByEmail } from "@/lib/cabinet-users"
import { getAiTracksPublicConfig } from "@/lib/ai-tracks-config-server"

/**
 * Покупка пакета попыток.
 * Пока пакеты не утверждены в AI_TRACKS_PACKS - всегда 503 (без фиктивной оплаты).
 */
export async function POST(request: NextRequest) {
  const token = getCabinetToken(request)
  const session = getCabinetSession(token)
  if (!session) {
    return NextResponse.json({ error: "Необходима авторизация" }, { status: 401 })
  }

  const user = await getCabinetUserByEmail(session.email)
  if (!user) {
    return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 })
  }

  const cfg = getAiTracksPublicConfig()
  if (!cfg.packsAvailable) {
    return NextResponse.json(
      {
        error: "Пополнение попыток пока недоступно. Тарифы ещё не настроены.",
        code: "packs_unavailable",
      },
      { status: 503 }
    )
  }

  return NextResponse.json(
    {
      error: "Пополнение попыток пока недоступно. Тарифы ещё не настроены.",
      code: "packs_unavailable",
    },
    { status: 503 }
  )
}
