import { NextRequest, NextResponse } from "next/server"
import { getCabinetSession, getCabinetToken } from "@/lib/cabinet-auth"
import { getCabinetUserByEmail } from "@/lib/cabinet-users"
import { TOOLS_STORY_VIDEO_DOWNLOAD_PRICE_RUB } from "@/lib/tools-story-video-pricing"
import { getToolsStoryVideoEntitlement } from "@/lib/tools-story-video-entitlement"

export async function GET(request: NextRequest) {
  try {
    const token = getCabinetToken(request)
    const session = getCabinetSession(token)
    if (!session) {
      return NextResponse.json({ error: "Необходима авторизация" }, { status: 401 })
    }

    const user = await getCabinetUserByEmail(session.email)
    if (!user) {
      return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 })
    }

    const entitlement = await getToolsStoryVideoEntitlement(user.id)
    return NextResponse.json(entitlement)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error("[tools/story-video/entitlement]", msg)
    // Пока миграция не накатана - не ломаем UI: считаем, что бесплатное ещё доступно
    if (/tools_story_video_/i.test(msg) || /column .+ does not exist/i.test(msg)) {
      return NextResponse.json({
        freeUsed: false,
        freeAvailable: true,
        credits: 0,
        canDownload: true,
        priceRub: TOOLS_STORY_VIDEO_DOWNLOAD_PRICE_RUB,
      })
    }
    return NextResponse.json({ error: "Не удалось получить доступ к скачиванию" }, { status: 500 })
  }
}
