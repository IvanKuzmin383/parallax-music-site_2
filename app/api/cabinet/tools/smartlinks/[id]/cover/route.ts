import { createReadStream } from "node:fs"
import { promises as fs } from "node:fs"
import path from "node:path"
import { Readable } from "node:stream"
import { NextRequest, NextResponse } from "next/server"
import { getCabinetToken, getCabinetSession } from "@/lib/cabinet-auth"
import { getCabinetUserByEmail } from "@/lib/cabinet-users"
import {
  getSmartlinkById,
  smartlinkUploadsDir,
  updateSmartlink,
} from "@/lib/cabinet-smartlinks"

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
  if (!link?.coverPath) return NextResponse.json({ error: "Not found" }, { status: 404 })

  try {
    const stream = createReadStream(link.coverPath)
    const ext = path.extname(link.coverPath).toLowerCase()
    const type = ext === ".png" ? "image/png" : "image/jpeg"
    return new NextResponse(Readable.toWeb(stream) as ReadableStream, {
      headers: { "Content-Type": type, "Cache-Control": "private, max-age=60" },
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

  const { id } = await params
  const link = await requireOwned(id, session.email)
  if (!link) return NextResponse.json({ error: "Смартлинк не найден" }, { status: 404 })

  const form = await request.formData()
  const file = form.get("file")
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Файл не передан" }, { status: 400 })
  }
  if (file.size > 8 * 1024 * 1024) {
    return NextResponse.json({ error: "Обложка не больше 8 МБ" }, { status: 400 })
  }
  const type = file.type
  if (type !== "image/jpeg" && type !== "image/png") {
    return NextResponse.json({ error: "Нужен JPEG или PNG" }, { status: 400 })
  }

  const dir = await smartlinkUploadsDir(id)
  const ext = type === "image/png" ? "png" : "jpg"
  const dest = path.join(dir, `cover.${ext}`)
  const buf = Buffer.from(await file.arrayBuffer())
  await fs.writeFile(dest, buf)
  await updateSmartlink(id, { coverPath: dest })
  return NextResponse.json({ ok: true, coverUrl: `/api/cabinet/tools/smartlinks/${id}/cover` })
}
