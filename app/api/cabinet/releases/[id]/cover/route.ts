import path from "path"
import crypto from "crypto"
import os from "os"
import { NextRequest, NextResponse } from "next/server"
import { promises as fs } from "fs"
import { getCabinetToken, getCabinetSession } from "@/lib/cabinet-auth"
import {
  MAX_CABINET_COVER_BYTES,
  validateCabinetCoverImageFromFilePath,
} from "@/lib/cabinet-cover-validation"
import { copyFileToPathAtomic } from "@/lib/node-atomic-upload"
import { getCoversDir } from "@/lib/tracks"
import { getReleaseById, isReleaseEditableStatus, updateRelease } from "@/lib/releases"

function coverExtFromUpload(file: File): string | undefined {
  const fromName = (file.name ?? "").toLowerCase().split(".").pop()
  if (fromName && ["jpg", "jpeg", "png"].includes(fromName)) return fromName
  if (file.type === "image/png") return "png"
  if (file.type === "image/jpeg") return "jpg"
  return fromName || undefined
}

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

  if (!isReleaseEditableStatus(release.status)) {
    return NextResponse.json({ error: "Релиз нельзя редактировать" }, { status: 400 })
  }

  let tempCoverPath: string | null = null
  try {
    const form = await request.formData()
    const coverEntry = form.get("cover")
    if (!(coverEntry instanceof File) || coverEntry.size === 0) {
      return NextResponse.json({ error: "Обложка обязательна" }, { status: 400 })
    }
    if (coverEntry.size > MAX_CABINET_COVER_BYTES) {
      return NextResponse.json({ error: "Размер обложки не должен превышать 20 MB" }, { status: 400 })
    }
    const coverExt = coverExtFromUpload(coverEntry)
    const tmpDir = path.join(os.tmpdir(), "parallax-multipart")
    await fs.mkdir(tmpDir, { recursive: true })
    tempCoverPath = path.join(tmpDir, `${crypto.randomUUID()}.part`)
    await fs.writeFile(tempCoverPath, Buffer.from(await coverEntry.arrayBuffer()))

    const coverError = await validateCabinetCoverImageFromFilePath(
      tempCoverPath,
      coverExt,
      coverEntry.size
    )
    if (coverError) return NextResponse.json({ error: coverError }, { status: 400 })

    const coverId = crypto.randomUUID()
    const coversDir = await getCoversDir()
    const coverPath = path.join(coversDir, `release-${coverId}.${coverExt}`)
    await copyFileToPathAtomic(tempCoverPath, coverPath)

    const updated = await updateRelease(id, { coverPath })
    return NextResponse.json({ release: updated })
  } catch (error) {
    console.error("[releases/cover POST]", error)
    return NextResponse.json({ error: "Не удалось загрузить обложку" }, { status: 500 })
  } finally {
    if (tempCoverPath) {
      await fs.unlink(tempCoverPath).catch(() => {})
    }
  }
}

export async function DELETE(
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

  if (!isReleaseEditableStatus(release.status)) {
    return NextResponse.json({ error: "Релиз нельзя редактировать" }, { status: 400 })
  }

  if (release.coverPath) {
    try {
      await fs.unlink(release.coverPath)
    } catch {
      // файл мог уже отсутствовать
    }
  }

  const updated = await updateRelease(id, { coverPath: "" })
  return NextResponse.json({ release: updated })
}
