import path from "path"
import crypto from "crypto"
import { createReadStream } from "node:fs"
import { stat } from "node:fs/promises"
import { Readable } from "node:stream"
import { NextRequest, NextResponse } from "next/server"
import { getAdminToken, verifySession } from "@/lib/auth"
import {
  MAX_CABINET_COVER_BYTES,
  validateCabinetCoverImageFromFilePath,
} from "@/lib/cabinet-cover-validation"
import { copyFileToPathAtomic } from "@/lib/node-atomic-upload"
import {
  MultipartRequestError,
  parseMultipartRequestStream,
} from "@/lib/node-streaming-multipart"
import {
  getUploadDraftById,
  getUploadDraftsDir,
  unlinkUploadDraftMediaFile,
  updateUploadDraft,
  type UploadDraftStatus,
} from "@/lib/upload-drafts"

function adminCanEditDraftMedia(status: UploadDraftStatus): boolean {
  return status === "collecting" || status === "awaiting_payment" || status === "paid"
}

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

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = getAdminToken(request)
  if (!verifySession(token)) {
    return NextResponse.json({ error: "Необходима авторизация" }, { status: 401 })
  }

  const { id } = await params
  const draft = await getUploadDraftById(id)
  if (!draft) {
    return NextResponse.json({ error: "Черновик не найден" }, { status: 404 })
  }
  if (!adminCanEditDraftMedia(draft.status)) {
    return NextResponse.json({ error: "Этот черновик больше нельзя редактировать" }, { status: 400 })
  }

  try {
    const multipart = await parseMultipartRequestStream(request, {
      maxFiles: 1,
      maxFields: 4,
      maxFileSizeBytes: MAX_CABINET_COVER_BYTES,
      maxFieldSizeBytes: 4 * 1024,
    })
    try {
      const cover = multipart.getFile("cover")
      if (!cover || cover.size === 0) {
        return NextResponse.json({ error: "Выберите файл обложки" }, { status: 400 })
      }
      if (cover.size > MAX_CABINET_COVER_BYTES) {
        return NextResponse.json({ error: "Размер обложки не должен превышать 20 MB" }, { status: 400 })
      }
      const coverExt = cover.originalFilename.toLowerCase().split(".").pop()
      const coverError = await validateCabinetCoverImageFromFilePath(
        cover.tempFilePath,
        coverExt,
        cover.size
      )
      if (coverError) return NextResponse.json({ error: coverError }, { status: 400 })

      const newCoverRel = `${crypto.randomUUID()}.${coverExt}`
      const draftsDir = await getUploadDraftsDir()
      await copyFileToPathAtomic(cover.tempFilePath, path.join(draftsDir, newCoverRel))
      if (draft.coverRelPath) await unlinkUploadDraftMediaFile(draft.coverRelPath)

      const updated = await updateUploadDraft(id, { coverRelPath: newCoverRel })
      return NextResponse.json({ draft: updated })
    } finally {
      await multipart.cleanup()
    }
  } catch (error) {
    if (error instanceof MultipartRequestError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error("admin upload draft cover write:", error)
    return NextResponse.json({ error: "Не удалось загрузить обложку" }, { status: 500 })
  }
}
