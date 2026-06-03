import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { getAdminToken, verifySession } from "@/lib/auth"
import { getCabinetUserById } from "@/lib/cabinet-users"
import {
  cleanupStreamingReportPreview,
  getStreamingReportPreview,
} from "@/lib/streaming-report-bulk-preview"
import { createReportFromTempFile } from "@/lib/streaming-reports"

const commitSchema = z.object({
  items: z
    .array(
      z.object({
        tempFileId: z.string().uuid(),
        userId: z.string().min(1),
        amount: z.number().positive(),
      }),
    )
    .min(1)
    .max(50),
})

export async function POST(request: NextRequest) {
  const token = getAdminToken(request)
  if (!verifySession(token)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await request.json()
    const parsed = commitSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Некорректные данные", details: parsed.error.flatten() },
        { status: 400 },
      )
    }

    const results: Array<{
      tempFileId: string
      ok: boolean
      reportId?: string
      fileName?: string
      error?: string
    }> = []

    for (const item of parsed.data.items) {
      const preview = await getStreamingReportPreview(item.tempFileId)
      if (!preview) {
        results.push({
          tempFileId: item.tempFileId,
          ok: false,
          error: "Сессия превью истекла — загрузите файл снова",
        })
        continue
      }

      const user = await getCabinetUserById(item.userId)
      if (!user) {
        results.push({
          tempFileId: item.tempFileId,
          ok: false,
          error: "Пользователь не найден",
        })
        continue
      }

      if (user.isDisabled) {
        results.push({
          tempFileId: item.tempFileId,
          ok: false,
          error: "Пользователь отключён",
        })
        continue
      }

      try {
        const report = await createReportFromTempFile(
          item.userId,
          item.amount,
          preview.tempFilePath,
          preview.originalFileName,
        )
        await cleanupStreamingReportPreview(item.tempFileId)
        results.push({
          tempFileId: item.tempFileId,
          ok: true,
          reportId: report.id,
          fileName: report.fileName,
        })
      } catch (e) {
        const message = e instanceof Error ? e.message : "Не удалось создать отчёт"
        results.push({
          tempFileId: item.tempFileId,
          ok: false,
          error: message,
        })
      }
    }

    const ok = results.every((r) => r.ok)
    return NextResponse.json({ ok, results })
  } catch (e) {
    console.error("Error in bulk report commit:", e)
    const message = e instanceof Error ? e.message : "Неизвестная ошибка"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
