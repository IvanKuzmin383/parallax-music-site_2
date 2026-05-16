import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { getAdminToken, verifySession } from "@/lib/auth"
import { getTracksByAlbumId, updateTracksByAlbumId, type TrackStatus } from "@/lib/tracks"

const optionalUrl = z.union([z.string().url(), z.literal("")]).optional()

const trackStatusValues = [
  "upload_pending",
  "on_moderation",
  "sent_to_platforms",
  "approved_by_platforms",
  "released",
  "rejected",
  "postponed",
] as const satisfies readonly TrackStatus[]

const patchBodySchema = z.object({
  upc: z.string().max(32).optional().nullable(),
  platformLinks: z
    .object({
      spotify: optionalUrl,
      appleMusic: optionalUrl,
      yandex: optionalUrl,
      youtubeMusic: optionalUrl,
      vk: optionalUrl,
      sberzvuk: optionalUrl,
      kion: optionalUrl,
    })
    .optional(),
  status: z.enum(trackStatusValues).optional(),
  moderationNote: z.string().max(1000).optional().nullable(),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ albumId: string }> }
) {
  const token = getAdminToken(request)
  if (!verifySession(token)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { albumId } = await params

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Неверный JSON" }, { status: 400 })
  }

  const parsed = patchBodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Ошибка валидации", errors: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const tracksInAlbum = await getTracksByAlbumId(albumId)
  if (tracksInAlbum.length === 0) {
    return NextResponse.json(
      { error: "В альбоме нет треков или альбом не найден" },
      { status: 404 }
    )
  }

  const partial: {
    upc?: string | null
    platformLinks?: Record<string, string | undefined>
    status?: TrackStatus
    moderationNote?: string | null
  } = {}
  if (parsed.data.upc !== undefined) partial.upc = parsed.data.upc
  if (parsed.data.platformLinks !== undefined) {
    const links = parsed.data.platformLinks
    partial.platformLinks = {
      spotify: links.spotify === "" ? undefined : links.spotify,
      appleMusic: links.appleMusic === "" ? undefined : links.appleMusic,
      yandex: links.yandex === "" ? undefined : links.yandex,
      youtubeMusic: links.youtubeMusic === "" ? undefined : links.youtubeMusic,
      vk: links.vk === "" ? undefined : links.vk,
      sberzvuk: links.sberzvuk === "" ? undefined : links.sberzvuk,
      kion: links.kion === "" ? undefined : links.kion,
    }
  }
  if (parsed.data.status !== undefined) partial.status = parsed.data.status
  if (parsed.data.moderationNote !== undefined) {
    const n = parsed.data.moderationNote
    partial.moderationNote =
      n && typeof n === "string" && n.trim().length > 0 ? n.trim() : null
  }

  if (Object.keys(partial).length === 0) {
    return NextResponse.json(
      { error: "Укажите поля для обновления (UPC, ссылки, статус и/или комментарий)" },
      { status: 400 }
    )
  }

  const updated = await updateTracksByAlbumId(albumId, partial)
  return NextResponse.json({ updated: updated.length, tracks: updated })
}
