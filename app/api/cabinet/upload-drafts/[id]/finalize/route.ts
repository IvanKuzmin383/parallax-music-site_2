import { NextRequest, NextResponse } from "next/server"
import { getCabinetToken, getCabinetSession } from "@/lib/cabinet-auth"
import { getUploadDraftById } from "@/lib/upload-drafts"
import { finalizeUploadDraftCore } from "@/lib/upload-draft-finalize"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = getCabinetToken(request)
  const session = getCabinetSession(token)
  if (!session) return NextResponse.json({ error: "Необходима авторизация" }, { status: 401 })
  const { id } = await params
  const draft = await getUploadDraftById(id)
  if (!draft || draft.userId.toLowerCase() !== session.email.toLowerCase()) {
    return NextResponse.json({ error: "Черновик не найден" }, { status: 404 })
  }

  const result = await finalizeUploadDraftCore(draft)
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
