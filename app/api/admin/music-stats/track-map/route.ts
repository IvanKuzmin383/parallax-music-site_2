import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { getAdminToken, verifySession } from "@/lib/auth"
import {
  ADMIN_CABINET_MUSIC_TRACK_MAP_PAGE_SIZE,
  MUSIC_PLATFORM_LABELS,
  listCabinetMusicTrackMapPage,
  updateCabinetMusicTrackMapEntry,
  type MusicPlatformKey,
} from "@/lib/music-stats"

const patchSchema = z.object({
  userId: z.string().trim().min(1),
  platformKey: z.string().trim().min(1),
  trackKey: z.string().trim().min(1),
  cabinetTrackId: z.string().trim().min(1),
})

function parseLimit(value: string | null): number {
  if (!value) return ADMIN_CABINET_MUSIC_TRACK_MAP_PAGE_SIZE
  const n = Number(value)
  if (!Number.isFinite(n) || n < 1) return ADMIN_CABINET_MUSIC_TRACK_MAP_PAGE_SIZE
  return Math.floor(n)
}

function parseOffset(value: string | null): number {
  if (!value) return 0
  const n = Number(value)
  if (!Number.isFinite(n) || n < 0) return 0
  return Math.floor(n)
}

export async function GET(request: NextRequest) {
  const token = getAdminToken(request)
  if (!verifySession(token)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const rawPlatformKey = searchParams.get("platformKey")?.trim() || null
  const platformKey =
    rawPlatformKey && rawPlatformKey in MUSIC_PLATFORM_LABELS ?
      (rawPlatformKey as MusicPlatformKey)
    : null

  try {
    const page = listCabinetMusicTrackMapPage({
      platformKey,
      userId: searchParams.get("userId"),
      trackKey: searchParams.get("trackKey"),
      cabinetTrackId: searchParams.get("cabinetTrackId"),
      limit: parseLimit(searchParams.get("limit")),
      offset: parseOffset(searchParams.get("offset")),
    })

    return NextResponse.json(page)
  } catch (error) {
    console.error("Error fetching cabinet music track map:", error)
    return NextResponse.json({ error: "Не удалось загрузить таблицу сопоставлений" }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  const token = getAdminToken(request)
  if (!verifySession(token)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Неверный JSON" }, { status: 400 })
  }

  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Ошибка валидации данных" }, { status: 400 })
  }

  const platformKey = parsed.data.platformKey as MusicPlatformKey
  if (!(platformKey in MUSIC_PLATFORM_LABELS)) {
    return NextResponse.json({ error: "Неизвестная площадка" }, { status: 400 })
  }

  try {
    updateCabinetMusicTrackMapEntry({
      userId: parsed.data.userId,
      platformKey,
      trackKey: parsed.data.trackKey,
      cabinetTrackId: parsed.data.cabinetTrackId,
    })
    return NextResponse.json({ ok: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error"
    if (message === "cabinet_track_not_found_for_user") {
      return NextResponse.json(
        { error: "Трек не найден или не принадлежит указанному пользователю" },
        { status: 400 },
      )
    }
    if (message === "map_entry_not_found") {
      return NextResponse.json({ error: "Запись сопоставления не найдена" }, { status: 404 })
    }
    if (message === "missing_required_fields" || message === "invalid_platform_key") {
      return NextResponse.json({ error: "Некорректные входные данные" }, { status: 400 })
    }
    console.error("Error updating cabinet music track map:", error)
    return NextResponse.json({ error: "Не удалось обновить сопоставление" }, { status: 500 })
  }
}

