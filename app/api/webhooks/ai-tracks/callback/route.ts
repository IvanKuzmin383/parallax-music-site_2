import { NextRequest, NextResponse } from "next/server"
import { getAiTracksCallbackSecret } from "@/lib/ai-tracks-config-server"
import { settleAiTracksJobFromCallback } from "@/lib/ai-tracks-settle"
import { sanitizeRemoteMessage } from "@/lib/ai-tracks-remote"

export const runtime = "nodejs"

/**
 * Публичный callback внешнего генератора.
 * Без упоминания провайдера в ответах.
 */
export async function POST(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("t") || ""
  const expected = getAiTracksCallbackSecret()
  if (!token || token !== expected) {
    return NextResponse.json({ ok: false }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 })
  }

  const root = body && typeof body === "object" ? (body as Record<string, unknown>) : {}
  const code = typeof root.code === "number" ? root.code : 0
  const msg = typeof root.msg === "string" ? root.msg : ""
  const data = root.data && typeof root.data === "object" ? (root.data as Record<string, unknown>) : null
  const callbackType = typeof data?.callbackType === "string" ? data.callbackType : ""
  const taskId = typeof data?.task_id === "string" ? data.task_id : ""

  if (!taskId) {
    return NextResponse.json({ status: "received" })
  }

  // Промежуточные стадии - игнор; финал - complete (или сразу fail).
  if (callbackType && callbackType !== "complete") {
    return NextResponse.json({ status: "received" })
  }

  try {
    if (code !== 200) {
      await settleAiTracksJobFromCallback({
        externalTaskId: taskId,
        success: false,
        message: sanitizeRemoteMessage(msg) || "Не удалось завершить генерацию",
      })
      return NextResponse.json({ status: "received" })
    }

    const items = Array.isArray(data?.data) ? data.data : []
    const variants = items
      .map((item, index) => {
        if (!item || typeof item !== "object") return null
        const row = item as Record<string, unknown>
        const audioUrl =
          (typeof row.audio_url === "string" && row.audio_url) ||
          (typeof row.source_audio_url === "string" && row.source_audio_url) ||
          ""
        if (!audioUrl) return null
        return {
          index,
          title:
            typeof row.title === "string" && row.title.trim()
              ? row.title.trim()
              : "Без названия",
          audioUrl,
          coverUrl:
            (typeof row.image_url === "string" && row.image_url) ||
            (typeof row.source_image_url === "string" && row.source_image_url) ||
            undefined,
          durationSec: typeof row.duration === "number" ? row.duration : undefined,
          format: "mp3" as const,
          externalId: typeof row.id === "string" ? row.id : undefined,
        }
      })
      .filter((v): v is NonNullable<typeof v> => Boolean(v))

    await settleAiTracksJobFromCallback({
      externalTaskId: taskId,
      success: true,
      variants,
    })
  } catch (e) {
    console.error("[ai-tracks/callback] settle error")
  }

  return NextResponse.json({ status: "received" })
}
