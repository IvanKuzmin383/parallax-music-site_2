import { NextRequest, NextResponse } from "next/server"
import { getAdminToken, verifySession } from "@/lib/auth"
import { getUploadDraftById, updateUploadDraft, type UploadDraftPayload } from "@/lib/upload-drafts"
import { getClientIp, getUserAgent } from "@/lib/legal-acceptance"
import { finalizeUploadDraftCore } from "@/lib/upload-draft-finalize"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = getAdminToken(request)
  if (!verifySession(token)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params
  let draft = await getUploadDraftById(id)
  if (!draft) {
    return NextResponse.json({ error: "Черновик не найден" }, { status: 404 })
  }

  const contentType = request.headers.get("content-type") ?? ""
  if (contentType.includes("application/json")) {
    try {
      const body = (await request.json()) as { payload?: UploadDraftPayload }
      if (body?.payload && typeof body.payload === "object") {
        const updated = await updateUploadDraft(id, { payload: body.payload })
        if (!updated) {
          return NextResponse.json({ error: "Черновик не найден" }, { status: 404 })
        }
        draft = updated
      }
    } catch {
      // пустое тело - финализируем текущее состояние черновика в БД
    }
  }

  const result = await finalizeUploadDraftCore(draft, {
    clientIp: getClientIp(request),
    userAgent: getUserAgent(request),
  })
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }

  const { draft: updated, track, tracks, album, albumId } = result
  if (albumId && !track && !tracks) {
    return NextResponse.json({ ok: true, draft: updated, albumId })
  }
  if (album && tracks) {
    return NextResponse.json({ ok: true, draft: updated, album, tracks })
  }
  if (track) {
    return NextResponse.json({ ok: true, draft: updated, track })
  }
  return NextResponse.json({ ok: true, draft: updated })
}
