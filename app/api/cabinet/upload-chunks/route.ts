import { NextRequest, NextResponse } from "next/server"
import { getCabinetToken, getCabinetSession } from "@/lib/cabinet-auth"
import { createChunkUploadSession } from "@/lib/cabinet-chunk-uploads"

export const runtime = "nodejs"

export async function POST(request: NextRequest) {
  const token = getCabinetToken(request)
  const session = getCabinetSession(token)
  if (!session) return NextResponse.json({ error: "Необходима авторизация" }, { status: 401 })

  let body: { fileName?: unknown; fileSize?: unknown }
  try {
    body = (await request.json()) as { fileName?: unknown; fileSize?: unknown }
  } catch {
    return NextResponse.json({ error: "Неверный JSON" }, { status: 400 })
  }

  const fileName = typeof body.fileName === "string" ? body.fileName : "audio.wav"
  const fileSize = typeof body.fileSize === "number" ? body.fileSize : Number(body.fileSize)
  try {
    const meta = await createChunkUploadSession({
      userId: session.email,
      fileName,
      fileSize,
    })
    return NextResponse.json({
      uploadId: meta.uploadId,
      chunkSize: meta.chunkSize,
      totalChunks: meta.totalChunks,
      fileSize: meta.fileSize,
    })
  } catch (error) {
    const status = Number((error as { status?: number }).status) || 500
    const message = error instanceof Error ? error.message : "Не удалось начать загрузку"
    return NextResponse.json({ error: message }, { status })
  }
}
