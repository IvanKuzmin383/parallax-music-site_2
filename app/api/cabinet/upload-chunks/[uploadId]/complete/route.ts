import { NextRequest, NextResponse } from "next/server"
import { getCabinetToken, getCabinetSession } from "@/lib/cabinet-auth"
import { assembleChunkUpload, readChunkMeta } from "@/lib/cabinet-chunk-uploads"

export const runtime = "nodejs"
export const maxDuration = 120

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ uploadId: string }> }
) {
  const token = getCabinetToken(request)
  const session = getCabinetSession(token)
  if (!session) return NextResponse.json({ error: "Необходима авторизация" }, { status: 401 })

  const { uploadId } = await params
  const meta = await readChunkMeta(uploadId)
  if (!meta) return NextResponse.json({ error: "Сессия загрузки не найдена" }, { status: 404 })
  if (meta.userId !== session.email.trim().toLowerCase()) {
    return NextResponse.json({ error: "Нет доступа" }, { status: 403 })
  }

  try {
    const result = await assembleChunkUpload(meta)
    return NextResponse.json({ ok: true, audioRelPath: result.audioRelPath })
  } catch (error) {
    const status = Number((error as { status?: number }).status) || 500
    const message = error instanceof Error ? error.message : "Не удалось собрать файл"
    return NextResponse.json({ error: message }, { status })
  }
}
