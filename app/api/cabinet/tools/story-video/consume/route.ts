import { NextRequest, NextResponse } from "next/server"
import { getCabinetSession, getCabinetToken } from "@/lib/cabinet-auth"
import { getCabinetUserByEmail } from "@/lib/cabinet-users"
import { consumeToolsStoryVideoDownload } from "@/lib/tools-story-video-entitlement"

export async function POST(request: NextRequest) {
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

    const result = await consumeToolsStoryVideoDownload(user.id)
    if (!result.ok) {
      if (result.error === "payment_required") {
        return NextResponse.json(
          {
            error: "Нужна оплата скачивания",
            code: "payment_required",
            entitlement: result.entitlement,
          },
          { status: 402 }
        )
      }
      return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 })
    }

    return NextResponse.json({
      ok: true,
      used: result.used,
      entitlement: result.entitlement,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error("[tools/story-video/consume]", msg)
    if (/tools_story_video_/i.test(msg) || /column .+ does not exist/i.test(msg)) {
      return NextResponse.json(
        {
          error:
            "Скачивание сниппета ещё не настроено в базе (нужна миграция 035_tools_story_video).",
        },
        { status: 503 }
      )
    }
    return NextResponse.json({ error: "Не удалось подтвердить скачивание" }, { status: 500 })
  }
}
