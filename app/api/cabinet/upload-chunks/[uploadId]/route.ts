import { NextRequest, NextResponse } from "next/server"
import { getCabinetToken, getCabinetSession } from "@/lib/cabinet-auth"
import {
  listReceivedChunkIndexes,
  readChunkMeta,
  writeChunkFromRequest,
  type ChunkUploadMeta,
} from "@/lib/cabinet-chunk-uploads"

export const runtime = "nodejs"
export const maxDuration = 120

async function requireOwnedSession(
  request: NextRequest,
  uploadId: string
): Promise<{ error: NextResponse; meta?: undefined } | { error?: undefined; meta: ChunkUploadMeta }> {
  const token = getCabinetToken(request)
  const session = getCabinetSession(token)
  if (!session) return { error: NextResponse.json({ error: "Необходима авторизация" }, { status: 401 }) }
  const meta = await readChunkMeta(uploadId)
  if (!meta) return { error: NextResponse.json({ error: "Сессия загрузки не найдена" }, { status: 404 }) }
  if (meta.userId !== session.email.trim().toLowerCase()) {
    return { error: NextResponse.json({ error: "Нет доступа" }, { status: 403 }) }
  }
  return { meta }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ uploadId: string }> }
) {
  const { uploadId } = await params
  const owned = await requireOwnedSession(request, uploadId)
  if (owned.error) return owned.error
  const received = await listReceivedChunkIndexes(owned.meta.uploadId)
  return NextResponse.json({
    uploadId: owned.meta.uploadId,
    fileSize: owned.meta.fileSize,
    chunkSize: owned.meta.chunkSize,
    totalChunks: owned.meta.totalChunks,
    received,
  })
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ uploadId: string }> }
) {
  const { uploadId } = await params
  const owned = await requireOwnedSession(request, uploadId)
  if (owned.error) return owned.error
  const index = Number(new URL(request.url).searchParams.get("index"))
  if (!Number.isInteger(index) || index < 0) {
    return NextResponse.json({ error: "Укажите номер куска" }, { status: 400 })
  }
  try {
    await writeChunkFromRequest({ meta: owned.meta, index, request })
    return NextResponse.json({ ok: true, index })
  } catch (error) {
    const status = Number((error as { status?: number }).status) || 500
    const message = error instanceof Error ? error.message : "Не удалось сохранить кусок"
    return NextResponse.json({ error: message }, { status })
  }
}
