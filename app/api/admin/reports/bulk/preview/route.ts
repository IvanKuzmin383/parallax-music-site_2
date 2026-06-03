import { readFile } from "node:fs/promises"
import { NextRequest, NextResponse } from "next/server"
import { getAdminToken, verifySession } from "@/lib/auth"
import { matchStreamingReportFileName } from "@/lib/streaming-report-match"
import { saveStreamingReportPreview } from "@/lib/streaming-report-bulk-preview"
import { parseStreamingReportBuffer } from "@/lib/streaming-report-parse"
import {
  MultipartRequestError,
  parseMultipartRequestStream,
} from "@/lib/node-streaming-multipart"

const ALLOWED_EXT = new Set(["csv", "xlsx"])

export async function POST(request: NextRequest) {
  const token = getAdminToken(request)
  if (!verifySession(token)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const multipart = await parseMultipartRequestStream(request, {
      maxFiles: 50,
      maxFields: 4,
      maxFileSizeBytes: 50 * 1024 * 1024,
      maxFieldSizeBytes: 8 * 1024,
    })

    try {
      const files = [...multipart.getFiles("files"), ...multipart.getFiles("file")].filter(Boolean)

      if (files.length === 0) {
        return NextResponse.json({ error: "Файлы не предоставлены" }, { status: 400 })
      }

      const items: Array<{
        tempFileId: string
        fileName: string
        artistFromFile: string
        amountRub: number | null
        amountUsd: number | null
        amountEur: number | null
        rowCount: number
        suggestedUserId: string | null
        requiresManual: boolean
        matchConfidence: string
        candidateUserIds: string[]
        warnings: string[]
        ok: boolean
        error?: string
      }> = []

      for (const file of files) {
        const ext = (file.originalFilename.split(".").pop() ?? "").toLowerCase()
        if (!ALLOWED_EXT.has(ext)) {
          items.push({
            tempFileId: "",
            fileName: file.originalFilename,
            artistFromFile: "",
            amountRub: null,
            amountUsd: null,
            amountEur: null,
            rowCount: 0,
            suggestedUserId: null,
            requiresManual: true,
            matchConfidence: "none",
            candidateUserIds: [],
            warnings: ["Допустимы только .csv и .xlsx"],
            ok: false,
            error: "Неподдерживаемый формат",
          })
          continue
        }

        try {
          const buffer = await readFile(file.tempFilePath)
          const parsed = await parseStreamingReportBuffer(buffer, file.originalFilename)
          const match = matchStreamingReportFileName(file.originalFilename)

          const warnings = [...match.warnings]
          if (parsed.amountRub == null) {
            warnings.push("Не найдена итоговая сумма RUR в файле")
          }

          const meta = await saveStreamingReportPreview(file.tempFilePath, file.originalFilename, {
            amountRub: parsed.amountRub,
            amountUsd: parsed.amountUsd,
            amountEur: parsed.amountEur,
            rowCount: parsed.rowCount,
            artistFromFile: match.artistFromFile,
            requiresManual: match.requiresManual,
            suggestedUserId: match.suggestedUserId,
            matchConfidence: match.matchConfidence,
            candidateUserIds: match.candidateUserIds,
            warnings,
          })

          items.push({
            tempFileId: meta.tempFileId,
            fileName: file.originalFilename,
            artistFromFile: match.artistFromFile,
            amountRub: parsed.amountRub,
            amountUsd: parsed.amountUsd,
            amountEur: parsed.amountEur,
            rowCount: parsed.rowCount,
            suggestedUserId: match.suggestedUserId,
            requiresManual: match.requiresManual,
            matchConfidence: match.matchConfidence,
            candidateUserIds: match.candidateUserIds,
            warnings,
            ok: true,
          })
        } catch (e) {
          const message = e instanceof Error ? e.message : "Ошибка обработки файла"
          items.push({
            tempFileId: "",
            fileName: file.originalFilename,
            artistFromFile: "",
            amountRub: null,
            amountUsd: null,
            amountEur: null,
            rowCount: 0,
            suggestedUserId: null,
            requiresManual: true,
            matchConfidence: "none",
            candidateUserIds: [],
            warnings: [message],
            ok: false,
            error: message,
          })
        }
      }

      return NextResponse.json({ items })
    } finally {
      await multipart.cleanup()
    }
  } catch (e) {
    if (e instanceof MultipartRequestError) {
      return NextResponse.json({ error: e.message }, { status: e.status })
    }
    console.error("Error in bulk report preview:", e)
    const message = e instanceof Error ? e.message : "Неизвестная ошибка"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
