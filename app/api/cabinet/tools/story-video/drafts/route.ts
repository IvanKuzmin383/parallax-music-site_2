import { NextRequest, NextResponse } from "next/server"
import { getCabinetSession, getCabinetToken } from "@/lib/cabinet-auth"
import { getCabinetUserByEmail } from "@/lib/cabinet-users"
import { getTrackById } from "@/lib/tracks"
import {
  createStoryVideoDraft,
  draftToApiPayload,
  listStoryVideoDraftsByUserId,
  STORY_VIDEO_DRAFTS_MAX_PER_USER,
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
): Promise<string | null | { error: NextResponse }> {
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

export async function GET(request: NextRequest) {
  try {
    const auth = await requireUser(request)
    if ("error" in auth) return auth.error

    const items = await listStoryVideoDraftsByUserId(auth.user.id)
    return NextResponse.json({
      items,
      max: STORY_VIDEO_DRAFTS_MAX_PER_USER,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error("[tools/story-video/drafts GET]", msg)
    if (/cabinet_story_video_drafts/i.test(msg) || /does not exist/i.test(msg)) {
      return NextResponse.json({ items: [], max: STORY_VIDEO_DRAFTS_MAX_PER_USER })
    }
    return NextResponse.json({ error: "Не удалось загрузить черновики" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireUser(request)
    if ("error" in auth) return auth.error

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
    if (!b.project || typeof b.project !== "object") {
      return NextResponse.json({ error: "Нужны настройки карточки" }, { status: 400 })
    }

    const trackResolved = await resolveOwnedTrackId(b.trackId, auth.session.email)
    if (trackResolved && typeof trackResolved === "object" && "error" in trackResolved) {
      return trackResolved.error
    }

    const project = parseStoryVideoProject(b.project)
    const created = await createStoryVideoDraft({
      userId: auth.user.id,
      name: typeof b.name === "string" ? b.name : undefined,
      trackId: trackResolved as string | null,
      project,
    })
    return NextResponse.json(draftToApiPayload(created), { status: 201 })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    if (msg.startsWith("LIMIT:")) {
      return NextResponse.json(
        {
          error: `Можно сохранить не больше ${STORY_VIDEO_DRAFTS_MAX_PER_USER} карточек. Удалите старые.`,
          code: "draft_limit",
        },
        { status: 400 }
      )
    }
    console.error("[tools/story-video/drafts POST]", msg)
    if (/cabinet_story_video_drafts/i.test(msg) || /does not exist/i.test(msg)) {
      return NextResponse.json(
        { error: "Черновики ещё не доступны на сервере (нужна миграция)" },
        { status: 503 }
      )
    }
    return NextResponse.json({ error: "Не удалось сохранить карточку" }, { status: 500 })
  }
}
