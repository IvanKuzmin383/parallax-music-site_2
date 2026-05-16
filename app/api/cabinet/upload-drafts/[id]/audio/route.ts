import path from "path"
import { createReadStream } from "node:fs"
import { stat } from "node:fs/promises"
import { Readable } from "node:stream"
import { NextRequest, NextResponse } from "next/server"
import { getCabinetToken, getCabinetSession } from "@/lib/cabinet-auth"
import { getUploadDraftById, getUploadDraftsDir } from "@/lib/upload-drafts"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = getCabinetToken(req)
  const session = getCabinetSession(token)
  if (!session) return NextResponse.json({ error: "Необходима авторизация" }, { status: 401 })

  const { id } = await params
  const draft = await getUploadDraftById(id)
  if (!draft || draft.userId.toLowerCase() !== session.email.toLowerCase()) {
    return NextResponse.json({ error: "Черновик не найден" }, { status: 404 })
  }

  if (!draft.audioRelPath) {
    return NextResponse.json({ error: "В черновике нет аудио" }, { status: 404 })
  }

  const safeName = path.basename(draft.audioRelPath)
  if (safeName !== draft.audioRelPath || !safeName.endsWith(".wav")) {
    return NextResponse.json({ error: "Некорректный путь к файлу" }, { status: 400 })
  }

  const draftsDir = await getUploadDraftsDir()
  const absPath = path.join(draftsDir, safeName)

  try {
    const info = await stat(absPath)
    const stream = createReadStream(absPath)
    const body = Readable.toWeb(stream) as ReadableStream
    return new NextResponse(body, {
      headers: {
        "Content-Type": "audio/wav",
        "Content-Length": String(info.size),
        "Cache-Control": "private, no-store",
      },
    })
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      return NextResponse.json({ error: "Файл не найден" }, { status: 404 })
    }
    console.error("upload draft audio read:", err)
    return NextResponse.json({ error: "Не удалось отдать аудио" }, { status: 500 })
  }
}
