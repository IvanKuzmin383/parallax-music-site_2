import { NextRequest, NextResponse } from "next/server"
import { getCabinetSession, getCabinetToken } from "@/lib/cabinet-auth"
import { getCabinetUserByEmail } from "@/lib/cabinet-users"
import { getTrackById } from "@/lib/tracks"
import {
  deleteStoryVideoDraft,
  draftToApiPayload,
  getStoryVideoDraftById,
  updateStoryVideoDraft,
} from "@/lib/story-video-drafts"
import { parseStoryVideoProject } from "@/lib/story-video-theme"

async function requireUser(request: NextRequest) {
  const token = getCabinetToken(request)
  const session = getCabinetSession(token)
  if (!session) return { error: NextResponse.json({ error: "Необходима авторизация" }, { status: 401 }) }
  const user = await getCabinetUserByEmail(session.email)
  if (!user) return { error: NextResponse.json({ error: "Пользователь не найден" }, { status: 404 }) }
  return { user, session }
}

async function resolveOwnedTrackId(
  trackIdRaw: unknown,
  sessionEmail: string
): Promise<string | null | undefined | { error: NextResponse }> {
  if (trackIdRaw === undefined) return undefined
  if (trackIdRaw == null || trackIdRaw === "") return null
  if (typeof trackIdRaw !== "string") {
    return { error: NextResponse.json({ error: "Некорректный trackId" }, { status: 400 }) }
  }
  const trackId = trackIdRaw.trim()
  if (!trackId) return null
  const track = await getTrackById(trackId)
  if (!track || track.userId.toLowerCase() !== sessionEmail.toLowerCase()) {
    return { error: NextResponse.json({ error: "Трек не найден" }, { status: 404 }) }
  }
  return trackId
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireUser(request)
    if ("error" in auth) return auth.error
    const { id } = await params
    const draft = await getStoryVideoDraftById(id, auth.user.id)
    if (!draft) {
      return NextResponse.json({ error: "Черновик не найден" }, { status: 404 })
    }
    return NextResponse.json(draftToApiPayload(draft))
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error("[tools/story-video/drafts/:id GET]", msg)
    return NextResponse.json({ error: "Не удалось загрузить черновик" }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireUser(request)
    if ("error" in auth) return auth.error
    const { id } = await params

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
    }
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid body" }, { status: 400 })
    }
    const b = body as Record<string, unknown>

    const trackResolved = await resolveOwnedTrackId(b.trackId, auth.session.email)
    if (trackResolved && typeof trackResolved === "object" && "error" in trackResolved) {
      return trackResolved.error
    }

    const updated = await updateStoryVideoDraft(id, auth.user.id, {
      name: typeof b.name === "string" ? b.name : undefined,
      trackId: trackResolved as string | null | undefined,
      project:
        b.project && typeof b.project === "object"
          ? parseStoryVideoProject(b.project)
          : undefined,
    })
    if (!updated) {
      return NextResponse.json({ error: "Черновик не найден" }, { status: 404 })
    }
    return NextResponse.json(draftToApiPayload(updated))
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error("[tools/story-video/drafts/:id PATCH]", msg)
    return NextResponse.json({ error: "Не удалось обновить черновик" }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireUser(request)
    if ("error" in auth) return auth.error
    const { id } = await params
    const ok = await deleteStoryVideoDraft(id, auth.user.id)
    if (!ok) {
      return NextResponse.json({ error: "Черновик не найден" }, { status: 404 })
    }
    return NextResponse.json({ ok: true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error("[tools/story-video/drafts/:id DELETE]", msg)
    return NextResponse.json({ error: "Не удалось удалить черновик" }, { status: 500 })
  }
}
