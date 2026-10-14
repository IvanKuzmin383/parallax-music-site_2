import { NextRequest, NextResponse } from "next/server"
import { promises as fs } from "fs"
import path from "path"
import { getCabinetSession, getCabinetToken } from "@/lib/cabinet-auth"
import { getCabinetUserByEmail } from "@/lib/cabinet-users"
import { getAiTracksResultAudioForUser } from "@/lib/ai-tracks-jobs"
import { getUploadsBasePath } from "@/lib/tracks"

function safeJoinUploads(base: string, storageKey: string): string | null {
  const normalized = storageKey.replace(/\\/g, "/").replace(/^\/+/, "")
  if (!normalized.startsWith("ai-tracks/") || normalized.includes("..")) return null
  const full = path.join(base, normalized)
  const resolved = path.resolve(full)
  const baseResolved = path.resolve(base)
  if (!resolved.startsWith(baseResolved + path.sep) && resolved !== baseResolved) return null
  return resolved
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const token = getCabinetToken(request)
  const session = getCabinetSession(token)
  if (!session) {
    return NextResponse.json({ error: "Необходима авторизация" }, { status: 401 })
  }

  const user = await getCabinetUserByEmail(session.email)
  if (!user) {
    return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 })
  }

  const { id } = await context.params
  const meta = await getAiTracksResultAudioForUser({ userId: user.id, resultId: id })
  if (!meta) {
    return NextResponse.json({ error: "Файл не найден" }, { status: 404 })
  }

  const base = await getUploadsBasePath()
  const filePath = safeJoinUploads(base, meta.storageKey)
  if (!filePath) {
    return NextResponse.json({ error: "Некорректный путь файла" }, { status: 400 })
  }

  try {
    const buf = await fs.readFile(filePath)
    const contentType =
      meta.format === "wav"
        ? "audio/wav"
        : meta.format === "flac"
          ? "audio/flac"
          : "audio/mpeg"
    return new NextResponse(buf, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Length": String(buf.byteLength),
        "Cache-Control": "private, no-store",
        "Content-Disposition": `inline; filename="${encodeURIComponent(meta.title)}.${meta.format || "mp3"}"`,
      },
    })
  } catch {
    return NextResponse.json({ error: "Файл недоступен" }, { status: 404 })
  }
}
