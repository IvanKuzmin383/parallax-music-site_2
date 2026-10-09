import { NextRequest, NextResponse } from "next/server"
import { getAdminToken, verifySession } from "@/lib/auth"
import {
  importPublickaRows,
  parsePublickaExcelBuffer,
} from "@/lib/publicka"
import {
  MultipartRequestError,
  parseMultipartRequestStream,
} from "@/lib/node-streaming-multipart"
import { readFile } from "node:fs/promises"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
  "Access-Control-Max-Age": "86400",
} as const

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders })
}

export async function POST(request: NextRequest) {
  const sessionToken = getAdminToken(request)
  if (!verifySession(sessionToken)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: corsHeaders })
  }

  try {
    const multipart = await parseMultipartRequestStream(request, {
      maxFiles: 20,
      maxFields: 10,
      maxFileSizeBytes: 50 * 1024 * 1024,
      maxFieldSizeBytes: 64 * 1024,
    })
    try {
      const files = [...multipart.getFiles("files"), ...multipart.getFiles("file")].filter(Boolean)
      if (files.length === 0) {
        return NextResponse.json(
          { error: "Файлы не предоставлены" },
          { status: 400, headers: corsHeaders }
        )
      }

      const results: Array<{
        fileName: string
        ok: boolean
        error?: string
        warnings?: string[]
        totalPlays?: number
        matchedRows?: number
        earningsCreditedRub?: number
        createdPlacements?: number
        skippedDuplicateFile?: boolean
      }> = []

      for (const file of files) {
        const ext = (file.originalFilename.split(".").pop() ?? "").toLowerCase()
        if (ext !== "xlsx" && ext !== "csv") {
          results.push({
            fileName: file.originalFilename,
            ok: false,
            error: "Можно загружать только .xlsx или .csv",
          })
          continue
        }

        try {
          const buffer = await readFile(file.tempFilePath)
          const parsed = await parsePublickaExcelBuffer(buffer, file.originalFilename)
          if (parsed.rows.length === 0) {
            results.push({
              fileName: file.originalFilename,
              ok: false,
              error: "Нет валидных строк",
              warnings: parsed.warnings,
            })
            continue
          }

          const imported = await importPublickaRows({
            fileName: file.originalFilename,
            fileBuffer: buffer,
            rows: parsed.rows,
          })

          results.push({
            fileName: file.originalFilename,
            ok: true,
            warnings: parsed.warnings.slice(0, 20),
            totalPlays: imported.totalPlays,
            matchedRows: imported.matchedRows,
            earningsCreditedRub: imported.earningsCreditedRub,
            createdPlacements: imported.createdPlacements,
            skippedDuplicateFile: imported.skippedDuplicateFile,
          })
        } catch (e) {
          const message = e instanceof Error ? e.message : "Неизвестная ошибка"
          results.push({
            fileName: file.originalFilename,
            ok: false,
            error: message,
          })
        }
      }

      const hasErrors = results.some((r) => !r.ok)
      return NextResponse.json({ results, ok: !hasErrors }, { headers: corsHeaders })
    } finally {
      await multipart.cleanup()
    }
  } catch (e) {
    if (e instanceof MultipartRequestError) {
      return NextResponse.json({ error: e.message }, { status: 400, headers: corsHeaders })
    }
    console.error("[admin/publicka/import]", e)
    return NextResponse.json(
      { error: "Ошибка импорта" },
      { status: 500, headers: corsHeaders }
    )
  }
}
