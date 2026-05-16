import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { getAdminToken, verifySession } from "@/lib/auth"
import {
  getTrackById,
  updateTrack,
  deleteTrack,
  isSmartlinkSlugTaken,
  type Track,
} from "@/lib/tracks"
import { getCabinetUserByEmail } from "@/lib/cabinet-users"
import { getAlbumById } from "@/lib/albums"
import { GENRES, TRACK_MOODS } from "@/lib/track-constants"
import { DEFAULT_RELEASE_LABEL_NAME } from "@/lib/release-label"

const optionalUrl = z.union([z.string().url(), z.literal("")]).optional()

const patchBodySchema = z.object({
  trackName: z.string().min(1).max(200).optional(),
  artistName: z.string().min(1).max(200).optional(),
  labelName: z.string().max(100).optional().nullable(),
  genre: z.union([z.enum([...GENRES] as [string, ...string[]]), z.string().min(1).max(100)]).optional(),
  mood: z.union([z.enum([...TRACK_MOODS] as [string, ...string[]]), z.literal(""), z.null()]).optional(),
  shortDescription: z.string().max(5000).optional().nullable(),
  lyricsText: z.string().max(15000).optional().nullable(),
  musicAuthor: z.string().max(200).optional().nullable(),
  lyricsAuthor: z.string().max(200).optional().nullable(),
  musicRights: z.string().max(500).optional().nullable(),
  musicAiService: z.string().max(500).optional().nullable(),
  lyricsRights: z.string().max(500).optional().nullable(),
  performanceRights: z.string().max(500).optional().nullable(),
  backingAuthor: z.string().max(200).optional().nullable(),
  isInstrumental: z.boolean().optional(),
  status: z
    .enum([
      "upload_pending",
      "on_moderation",
      "sent_to_platforms",
      "approved_by_platforms",
      "released",
      "rejected",
      "postponed",
    ])
    .optional(),
  releaseDate: z
    .union([
      z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      z.literal(""),
      z.null(),
    ])
    .optional(),
  moderationNote: z.string().max(1000).optional().nullable(),
  upc: z.string().max(32).optional().nullable(),
  isrc: z.string().max(32).optional().nullable(),
  transferFromOtherDistributor: z.boolean().optional(),
  smartlinkSlug: z.string().max(80).optional().nullable(),
  albumId: z.string().uuid().optional().nullable(),
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
  userId: z.string().trim().email().optional(),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = getAdminToken(request)
  if (!verifySession(token)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params

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

  const data = parsed.data
  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Нет полей для обновления" }, { status: 400 })
  }

  const current = await getTrackById(id)
  if (!current) {
    return NextResponse.json({ error: "Трек не найден" }, { status: 404 })
  }

  let effectiveUserId = current.userId
  if (data.userId !== undefined) {
    const cabinetUser = await getCabinetUserByEmail(data.userId)
    if (!cabinetUser) {
      return NextResponse.json(
        { error: "Пользователь с таким email не найден в кабинете" },
        { status: 404 }
      )
    }
    effectiveUserId = cabinetUser.email
  }

  const effectiveAlbumId =
    data.albumId !== undefined ? data.albumId : current.albumId ?? null
  if (effectiveAlbumId) {
    const album = await getAlbumById(effectiveAlbumId)
    if (!album) {
      return NextResponse.json({ error: "Альбом не найден" }, { status: 404 })
    }
    if (album.userId.toLowerCase() !== effectiveUserId.toLowerCase()) {
      return NextResponse.json(
        {
          error:
            "Альбом привязан к другому пользователю. Уберите альбом в карточке или выберите альбом этого пользователя.",
        },
        { status: 400 }
      )
    }
  }

  if (data.smartlinkSlug !== undefined && data.smartlinkSlug && data.smartlinkSlug.trim()) {
    const slug = data.smartlinkSlug.trim()
    if (isSmartlinkSlugTaken(slug, id)) {
      return NextResponse.json(
        { error: "Такой смартлинк уже занят другим треком" },
        { status: 409 }
      )
    }
  }

  const updatePayload: Partial<Omit<Track, "id" | "createdAt">> = {}

  if (data.trackName !== undefined) updatePayload.trackName = data.trackName.trim()
  if (data.artistName !== undefined) updatePayload.artistName = data.artistName.trim()
  if (data.labelName !== undefined) {
    const trimmed = data.labelName?.trim() ?? ""
    updatePayload.labelName = trimmed || DEFAULT_RELEASE_LABEL_NAME
  }
  if (data.genre !== undefined) updatePayload.genre = data.genre as Track["genre"]
  if (data.mood !== undefined) {
    updatePayload.mood =
      data.mood === null || data.mood === "" ? "" : (data.mood as Track["mood"])
  }
  if (data.shortDescription !== undefined) {
    updatePayload.shortDescription = data.shortDescription?.trim() ?? ""
  }
  if (data.lyricsText !== undefined) {
    updatePayload.lyricsText = data.lyricsText?.trim() ?? ""
  }
  if (data.musicAuthor !== undefined) updatePayload.musicAuthor = data.musicAuthor?.trim() ?? ""
  if (data.lyricsAuthor !== undefined) updatePayload.lyricsAuthor = data.lyricsAuthor?.trim() ?? ""
  if (data.musicRights !== undefined) updatePayload.musicRights = data.musicRights?.trim() ?? ""
  if (data.musicAiService !== undefined) updatePayload.musicAiService = data.musicAiService?.trim() ?? ""
  if (data.lyricsRights !== undefined) updatePayload.lyricsRights = data.lyricsRights?.trim() ?? ""
  if (data.performanceRights !== undefined) {
    updatePayload.performanceRights = data.performanceRights?.trim() ?? ""
  }
  if (data.backingAuthor !== undefined) updatePayload.backingAuthor = data.backingAuthor?.trim() ?? ""
  if (data.isInstrumental !== undefined) updatePayload.isInstrumental = data.isInstrumental
  if (data.status !== undefined) updatePayload.status = data.status
  if (data.releaseDate !== undefined) {
    if (data.releaseDate === null || data.releaseDate === "") {
      updatePayload.releaseDate = undefined
    } else {
      updatePayload.releaseDate = data.releaseDate
    }
  }
  if (data.moderationNote !== undefined) {
    updatePayload.moderationNote =
      data.moderationNote && data.moderationNote.trim().length > 0
        ? data.moderationNote.trim()
        : null
  }
  if (data.upc !== undefined) updatePayload.upc = data.upc?.trim() || null
  if (data.isrc !== undefined) updatePayload.isrc = data.isrc?.trim() || null
  if (data.transferFromOtherDistributor !== undefined) {
    updatePayload.transferFromOtherDistributor = data.transferFromOtherDistributor
  }
  if (data.smartlinkSlug !== undefined) {
    const s = data.smartlinkSlug?.trim()
    updatePayload.smartlinkSlug = s && s.length > 0 ? s : undefined
  }
  if (data.albumId !== undefined) {
    updatePayload.albumId = data.albumId ?? undefined
  }
  if (data.platformLinks !== undefined) {
    const links = data.platformLinks
    updatePayload.platformLinks = {
      spotify: links.spotify === "" ? undefined : links.spotify,
      appleMusic: links.appleMusic === "" ? undefined : links.appleMusic,
      yandex: links.yandex === "" ? undefined : links.yandex,
      youtubeMusic: links.youtubeMusic === "" ? undefined : links.youtubeMusic,
      vk: links.vk === "" ? undefined : links.vk,
      sberzvuk: links.sberzvuk === "" ? undefined : links.sberzvuk,
      kion: links.kion === "" ? undefined : links.kion,
    }
  }

  if (data.userId !== undefined) {
    updatePayload.userId = effectiveUserId
  }

  const updated = await updateTrack(id, updatePayload)
  if (!updated) {
    return NextResponse.json({ error: "Трек не найден" }, { status: 404 })
  }

  return NextResponse.json({ track: updated })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = getAdminToken(request)
  if (!verifySession(token)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params

  const deleted = await deleteTrack(id)
  if (!deleted) {
    return NextResponse.json({ error: "Трек не найден" }, { status: 404 })
  }

  return NextResponse.json({ success: true })
}
