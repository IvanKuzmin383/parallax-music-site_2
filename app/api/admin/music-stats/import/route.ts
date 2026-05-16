import { NextRequest, NextResponse } from "next/server"
import { createHash } from "node:crypto"
import { getAdminToken, verifyMusicStatsImportToken, verifySession } from "@/lib/auth"
import {
  detectPlatformKeyFromFileName,
  detectPlatformKeyFromPlatformString,
  importMusicStatsParsedToDb,
  type MusicPlatformKey,
  type MusicStatsFile,
} from "@/lib/music-stats"
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
  const okSession = verifySession(sessionToken)
  const okImportToken = verifyMusicStatsImportToken(request)
  if (!okSession && !okImportToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: corsHeaders })
  }

  try {
    const multipart = await parseMultipartRequestStream(request, {
      maxFiles: 100,
      maxFields: 20,
      maxFileSizeBytes: 50 * 1024 * 1024,
      maxFieldSizeBytes: 64 * 1024,
    })
    try {
      const filesFromFiles = multipart.getFiles("files")
      const filesFromFile = multipart.getFiles("file")
      const files = [...filesFromFiles, ...filesFromFile].filter(Boolean)

      if (files.length === 0) {
        return NextResponse.json({ error: "Файлы не предоставлены" }, { status: 400, headers: corsHeaders })
      }

      const results: Array<{
        fileName: string
        platformKey?: MusicPlatformKey
        ok: boolean
        error?: string
        daysCount?: number
        totalPlays?: number
      }> = []

      for (const file of files) {
        const ext = (file.originalFilename.split(".").pop() ?? "").toLowerCase()
        if (ext !== "json") {
          results.push({ fileName: file.originalFilename, ok: false, error: "Можно загружать только .json" })
          continue
        }

        if (file.size > 50 * 1024 * 1024) {
          results.push({
            fileName: file.originalFilename,
            ok: false,
            error: "Файл слишком большой (макс. 50 MB)",
          })
          continue
        }

        try {
          const rawText = await readFile(file.tempFilePath, "utf8")
          const parsed = JSON.parse(rawText) as MusicStatsFile

          const platformKey =
            detectPlatformKeyFromFileName(file.originalFilename) ??
            detectPlatformKeyFromPlatformString(parsed.platform ?? null)

          if (!platformKey) {
            results.push({
              fileName: file.originalFilename,
              ok: false,
              error: "Не удалось определить платформу по имени или полю `platform` в JSON",
            })
            continue
          }

          const imported = await importMusicStatsParsedToDb({
            fileHash: createHash("sha256").update(rawText, "utf8").digest("hex"),
            fileName: file.originalFilename,
            platformKey,
            parsed,
          })

          results.push({
            fileName: file.originalFilename,
            platformKey,
            ok: true,
            daysCount: imported.daysCount,
            totalPlays: imported.totalPlays,
          })
        } catch (e) {
          const message = e instanceof Error ? e.message : "Неизвестная ошибка"
          results.push({ fileName: file.originalFilename, ok: false, error: `Ошибка обработки: ${message}` })
        }
      }

      const hasErrors = results.some((r) => !r.ok)
      return NextResponse.json({ results, ok: !hasErrors }, { headers: corsHeaders })
    } finally {
      await multipart.cleanup()
    }
  } catch (e) {
    if (e instanceof MultipartRequestError) {
      return NextResponse.json({ error: e.message }, { status: e.status, headers: corsHeaders })
    }
    console.error("Error importing music stats:", e)
    const message = e instanceof Error ? e.message : "Неизвестная ошибка"
    return NextResponse.json({ error: message }, { status: 500, headers: corsHeaders })
  }
}

