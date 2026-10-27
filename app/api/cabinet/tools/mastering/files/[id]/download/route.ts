import { promises as fs } from "node:fs"
import { NextRequest, NextResponse } from "next/server"
import { getCabinetSession, getCabinetToken } from "@/lib/cabinet-auth"
import { getCabinetUserByEmail } from "@/lib/cabinet-users"
import {
  getToolsMasteringFileForUser,
  getToolsMasteringFilesDir,
  toolsMasteringFileAbsolutePath,
} from "@/lib/tools-mastering-files"

export const runtime = "nodejs"

type RouteCtx = { params: Promise<{ id: string }> }

export async function GET(request: NextRequest, context: RouteCtx) {
  const token = getCabinetToken(request)
  const session = getCabinetSession(token)
  if (!session) return NextResponse.json({ error: "Необходима авторизация" }, { status: 401 })

  const user = await getCabinetUserByEmail(session.email)
  if (!user) return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 })

  const { id } = await context.params
  const file = await getToolsMasteringFileForUser(id, user.id)
  if (!file) {
    return NextResponse.json(
      { error: "Файл не найден или срок хранения истёк (14 дней)" },
      { status: 404 },
    )
  }

  const dir = await getToolsMasteringFilesDir(user.id)
  const fullPath = toolsMasteringFileAbsolutePath(user.id, file.storageName, dir)

  try {
    const data = await fs.readFile(fullPath)
    return new NextResponse(data, {
      status: 200,
      headers: {
        "Content-Type": "audio/wav",
        "Content-Length": String(data.byteLength),
        "Content-Disposition": `attachment; filename="${file.fileName.replace(/"/g, "")}"`,
        "Cache-Control": "private, no-store",
      },
    })
  } catch (error) {
    console.error("[tools-mastering-files] download missing:", error)
    return NextResponse.json({ error: "Файл недоступен на диске" }, { status: 404 })
  }
}
