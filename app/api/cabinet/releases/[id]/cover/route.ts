import path from "path"
import crypto from "crypto"
import { NextRequest, NextResponse } from "next/server"
import { promises as fs } from "fs"
import { getCabinetToken, getCabinetSession } from "@/lib/cabinet-auth"
import {
  MAX_CABINET_COVER_BYTES,
  validateCabinetCoverImageFromFilePath,
} from "@/lib/cabinet-cover-validation"
import { copyFileToPathAtomic } from "@/lib/node-atomic-upload"
import {
  MultipartRequestError,
  parseMultipartRequestStream,
} from "@/lib/node-streaming-multipart"
import { getCoversDir } from "@/lib/tracks"
import { getReleaseById, updateRelease } from "@/lib/releases"

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = getCabinetToken(_request)
  const session = getCabinetSession(token)
  if (!session) return NextResponse.json({ error: "Необходима авторизация" }, { status: 401 })

  const { id } = await params
  const release = await getReleaseById(id)
  if (!release || release.userId.toLowerCase() !== session.email.toLowerCase()) {
    return NextResponse.json({ error: "Релиз не найден" }, { status: 404 })
  }

  if (!release.coverPath) {
    return NextResponse.json({ error: "Обложка не загружена" }, { status: 404 })
  }

  try {
    const data = await fs.readFile(release.coverPath)
    const ext = release.coverPath.split(".").pop()?.toLowerCase()
    const contentType = ext === "png" ? "image/png" : "image/jpeg"
    return new NextResponse(data, {
      headers: { "Content-Type": contentType, "Cache-Control": "private, max-age=3600" },
    })
  } catch {
    return NextResponse.json({ error: "Файл не найден" }, { status: 404 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = getCabinetToken(request)
  const session = getCabinetSession(token)
  if (!session) return NextResponse.json({ error: "Необходима авторизация" }, { status: 401 })

  const { id } = await params
  const release = await getReleaseById(id)
  if (!release || release.userId.toLowerCase() !== session.email.toLowerCase()) {
    return NextResponse.json({ error: "Релиз не найден" }, { status: 404 })
  }

  if (!["draft", "awaiting_payment"].includes(release.status)) {
    return NextResponse.json({ error: "Релиз нельзя редактировать" }, { status: 400 })
  }

  try {
    const multipart = await parseMultipartRequestStream(request, {
      maxFiles: 1,
      maxFields: 5,
      maxFileSizeBytes: MAX_CABINET_COVER_BYTES,
      maxFieldSizeBytes: 64 * 1024,
    })

    try {
      const cover = multipart.getFile("cover")
      if (!cover || cover.size === 0) {
        return NextResponse.json({ error: "Обложка обязательна" }, { status: 400 })
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

      const coverId = crypto.randomUUID()
      const coversDir = await getCoversDir()
      const coverPath = path.join(coversDir, `release-${coverId}.${coverExt}`)
      await copyFileToPathAtomic(cover.tempFilePath, coverPath)

      const updated = await updateRelease(id, { coverPath })
      return NextResponse.json({ release: updated })
    } finally {
      await multipart.cleanup()
    }
  } catch (error) {
    if (error instanceof MultipartRequestError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error("[releases/cover POST]", error)
    return NextResponse.json({ error: "Не удалось загрузить обложку" }, { status: 500 })
  }
}
