import path from "path"
import { createReadStream } from "node:fs"
import { stat } from "node:fs/promises"
import { Readable } from "node:stream"
import { NextRequest, NextResponse } from "next/server"
import { getAdminToken, verifySession } from "@/lib/auth"
import { getUploadDraftById, getUploadDraftsDir } from "@/lib/upload-drafts"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = getAdminToken(req)
  if (!verifySession(token)) {
    return NextResponse.json({ error: "Необходима авторизация" }, { status: 401 })
  }

  const { id } = await params
  const draft = await getUploadDraftById(id)
  if (!draft) {
    return NextResponse.json({ error: "Черновик не найден" }, { status: 404 })
  }

  if (!draft.coverRelPath) {
    return NextResponse.json({ error: "В черновике нет обложки" }, { status: 404 })
  }

  const safeName = path.basename(draft.coverRelPath)
  if (safeName !== draft.coverRelPath) {
    return NextResponse.json({ error: "Некорректный путь к файлу" }, { status: 400 })
  }

  const draftsDir = await getUploadDraftsDir()
  const absPath = path.join(draftsDir, safeName)

  try {
    const info = await stat(absPath)
    const stream = createReadStream(absPath)
    const body = Readable.toWeb(stream) as ReadableStream
    const ext = path.extname(draft.coverRelPath).toLowerCase()
    const contentType =
      ext === ".png" ? "image/png" : ext === ".jpg" || ext === ".jpeg" ? "image/jpeg" : "image/jpeg"

    return new NextResponse(body, {
      headers: {
        "Content-Type": contentType,
        "Content-Length": String(info.size),
        "Cache-Control": "private, no-store",
      },
    })
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      return NextResponse.json({ error: "Файл не найден" }, { status: 404 })
    }
    console.error("admin upload draft cover read:", err)
    return NextResponse.json({ error: "Не удалось отдать обложку" }, { status: 500 })
  }
}
