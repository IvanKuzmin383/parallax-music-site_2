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
import {
  isToolCoverInputMime,
  normalizeToolCoverBuffer,
  TOOL_COVER_MAX_INPUT_BYTES,
} from "@/lib/normalize-tool-cover"

export const runtime = "nodejs"

async function requireOwned(id: string, email: string) {
  const user = await getCabinetUserByEmail(email)
  if (!user) return null
  const link = await getSmartlinkById(id)
  if (!link || link.userId !== user.id) return null
  return link
}

function contentTypeForCoverPath(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase()
  if (ext === ".webp") return "image/webp"
  if (ext === ".png") return "image/png"
  return "image/jpeg"
}

async function removeSiblingCovers(dir: string, keepName: string) {
  try {
    const names = await fs.readdir(dir)
    await Promise.all(
      names
        .filter((n) => /^cover\.(jpe?g|png|webp)$/i.test(n) && n !== keepName)
        .map((n) => fs.unlink(path.join(dir, n)).catch(() => undefined)),
    )
  } catch {
    // dir may not exist yet
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const token = getCabinetToken(request)
  const session = getCabinetSession(token)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const link = await requireOwned(id, session.email)
  if (!link?.coverPath) return NextResponse.json({ error: "Not found" }, { status: 404 })

  try {
    const stream = createReadStream(link.coverPath)
    return new NextResponse(Readable.toWeb(stream) as ReadableStream, {
      headers: {
        "Content-Type": contentTypeForCoverPath(link.coverPath),
        "Cache-Control": "private, max-age=60",
      },
    })
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
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
  if (file.size > TOOL_COVER_MAX_INPUT_BYTES) {
    return NextResponse.json({ error: "Обложка не больше 8 МБ" }, { status: 400 })
  }
  if (!isToolCoverInputMime(file.type)) {
    return NextResponse.json(
      { error: "Нужен JPEG, PNG или WebP" },
      { status: 400 },
    )
  }

  let normalized
  try {
    const raw = Buffer.from(await file.arrayBuffer())
    normalized = await normalizeToolCoverBuffer(raw)
  } catch (error) {
    console.error("[tools/smartlinks/cover] normalize", error)
    return NextResponse.json(
      { error: "Не удалось обработать обложку" },
      { status: 400 },
    )
  }

  const dir = await smartlinkUploadsDir(id)
  const fileName = `cover.${normalized.ext}`
  const dest = path.join(dir, fileName)
  await fs.writeFile(dest, normalized.buffer)
  await removeSiblingCovers(dir, fileName)
  await updateSmartlink(id, { coverPath: dest })

  return NextResponse.json({
    ok: true,
    coverUrl: `/api/cabinet/tools/smartlinks/${id}/cover`,
    width: normalized.width,
    height: normalized.height,
  })
}
