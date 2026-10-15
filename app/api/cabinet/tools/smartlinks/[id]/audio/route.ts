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

export const runtime = "nodejs"

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
  const ext = name.endsWith(".mp3") || file.type === "audio/mpeg" ? "mp3" : "wav"
  const dest = path.join(dir, `preview.${ext}`)
  const buf = Buffer.from(await file.arrayBuffer())
  await fs.writeFile(dest, buf)
  await updateSmartlink(id, {
    previewAudioPath: dest,
    theme: { ...link.theme, previewAudioEnabled: true },
  })
  return NextResponse.json({ ok: true })
}
