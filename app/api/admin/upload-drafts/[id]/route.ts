import { NextRequest, NextResponse } from "next/server"
import { getAdminToken, verifySession } from "@/lib/auth"
import { deleteUploadDraft, getUploadDraftById, updateUploadDraft } from "@/lib/upload-drafts"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = getAdminToken(request)
  if (!verifySession(token)) {
    return NextResponse.json({ error: "Необходима авторизация" }, { status: 401 })
  }
  const { id } = await params
  const draft = await getUploadDraftById(id)
  if (!draft) return NextResponse.json({ error: "Черновик не найден" }, { status: 404 })
  return NextResponse.json({ draft })
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = getAdminToken(request)
  if (!verifySession(token)) {
    return NextResponse.json({ error: "Необходима авторизация" }, { status: 401 })
  }
  const { id } = await params
  let body: Record<string, unknown>
  try {
    body = (await request.json()) as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: "Неверный JSON" }, { status: 400 })
  }
  const updated = await updateUploadDraft(id, {
    status: body.status as never,
    payload: body.payload as never,
    expiresAt: typeof body.expiresAt === "string" ? body.expiresAt : undefined,
  })
  if (!updated) return NextResponse.json({ error: "Черновик не найден" }, { status: 404 })
  return NextResponse.json({ draft: updated })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = getAdminToken(request)
  if (!verifySession(token)) {
    return NextResponse.json({ error: "Необходима авторизация" }, { status: 401 })
  }
  const { id } = await params
  const draft = await getUploadDraftById(id)
  if (!draft) return NextResponse.json({ error: "Черновик не найден" }, { status: 404 })
  const deleted = await deleteUploadDraft(id)
  if (!deleted) {
    return NextResponse.json({ error: "Не удалось удалить черновик" }, { status: 500 })
  }
  return NextResponse.json({ success: true })
}
