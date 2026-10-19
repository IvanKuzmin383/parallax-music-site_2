import { promises as fs } from "node:fs"
import path from "node:path"
import { NextRequest, NextResponse } from "next/server"
import { getCabinetToken, getCabinetSession } from "@/lib/cabinet-auth"
import { getCabinetUserByEmail } from "@/lib/cabinet-users"
import {
  getSmartlinkById,
  smartlinkUploadsDir,
  updateSmartlink,
} from "@/lib/cabinet-smartlinks"
import { MAX_CABINET_WAV_BYTES, cabinetWavMaxSizeError } from "@/lib/cabinet-wav-upload-limits"
import { createFileRangeResponse } from "@/lib/node-file-range-response"
import { transcodeSmartlinkUploadToMp3 } from "@/lib/smartlink-preview-audio"
import { parseSmartlinkTheme } from "@/lib/smartlink-theme"

export const runtime = "nodejs"

async function requireOwned(id: string, email: string) {
  const user = await getCabinetUserByEmail(email)
  if (!user) return null
  const link = await getSmartlinkById(id)
  if (!link || link.userId !== user.id) return null
  return link
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = getCabinetToken(request)
  const session = getCabinetSession(token)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const link = await requireOwned(id, session.email)
  if (!link?.previewAudioPath) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  try {
    const info = await fs.stat(link.previewAudioPath)
    const ext = path.extname(link.previewAudioPath).toLowerCase()
    const contentType = ext === ".mp3" ? "audio/mpeg" : "audio/wav"
    return createFileRangeResponse({
      contentType,
      fileSize: info.size,
      absPath: link.previewAudioPath,
      rangeHeader: request.headers.get("range"),
      contentDisposition: `inline; filename="preview${ext || ".wav"}"`,
    })
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = getCabinetToken(request)
  const session = getCabinetSession(token)
  if (!session) return NextResponse.json({ error: "Необходима авторизация" }, { status: 401 })

  const user = await getCabinetUserByEmail(session.email)
  if (!user) return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 })

  const { id } = await params
  const link = await getSmartlinkById(id)
  if (!link || link.userId !== user.id) {
    return NextResponse.json({ error: "Смартлинк не найден" }, { status: 404 })
  }

  const form = await request.formData()
  const file = form.get("file")
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Файл не передан" }, { status: 400 })
  }
  if (file.size > MAX_CABINET_WAV_BYTES) {
    return NextResponse.json({ error: cabinetWavMaxSizeError() }, { status: 400 })
  }
  const name = file.name.toLowerCase()
  const okType =
    file.type === "audio/wav" ||
    file.type === "audio/x-wav" ||
    file.type === "audio/mpeg" ||
    name.endsWith(".wav") ||
    name.endsWith(".mp3")
  if (!okType) {
    return NextResponse.json({ error: "Нужен WAV или MP3" }, { status: 400 })
  }

  const dir = await smartlinkUploadsDir(id)
  const srcExt = name.endsWith(".mp3") || file.type === "audio/mpeg" ? "mp3" : "wav"
  const uploadTmp = path.join(dir, `preview.upload.${process.pid}.${Date.now()}.${srcExt}`)
  const dest = path.join(dir, "preview.mp3")
  const legacyWav = path.join(dir, "preview.wav")
  const buf = Buffer.from(await file.arrayBuffer())
  await fs.writeFile(uploadTmp, buf)

  try {
    await transcodeSmartlinkUploadToMp3({ sourcePath: uploadTmp, destPath: dest })
  } catch (err) {
    console.warn("[smartlink/audio] ffmpeg mp3 failed, storing source as-is", err)
    // Без ffmpeg: mp3 кладём как есть, wav оставляем (публичка сама нарежет при наличии ffmpeg).
    if (srcExt === "mp3") {
      await fs.rename(uploadTmp, dest).catch(async () => {
        await fs.copyFile(uploadTmp, dest)
        await fs.unlink(uploadTmp).catch(() => undefined)
      })
    } else {
      await fs.rename(uploadTmp, legacyWav).catch(async () => {
        await fs.copyFile(uploadTmp, legacyWav)
        await fs.unlink(uploadTmp).catch(() => undefined)
      })
      await fs.unlink(dest).catch(() => undefined)
      const theme = parseSmartlinkTheme(link.theme)
      await updateSmartlink(id, {
        previewAudioPath: legacyWav,
        theme: { ...theme, previewAudioEnabled: true },
      })
      return NextResponse.json({ ok: true, format: "wav" })
    }
  } finally {
    await fs.unlink(uploadTmp).catch(() => undefined)
  }

  await fs.unlink(legacyWav).catch(() => undefined)

  const theme = parseSmartlinkTheme(link.theme)
  await updateSmartlink(id, {
    previewAudioPath: dest,
    theme: { ...theme, previewAudioEnabled: true },
  })
  return NextResponse.json({ ok: true, format: "mp3" })
}
