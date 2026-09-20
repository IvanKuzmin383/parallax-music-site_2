import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { getAdminToken, verifySession } from "@/lib/auth"
import {
  deleteMusicArtistAlias,
  listMusicArtistAliases,
  upsertMusicArtistAlias,
} from "@/lib/music-stats"

const upsertSchema = z.object({
  userId: z.string().trim().email().max(320),
  alias: z.string().trim().min(1).max(200),
})

const deleteSchema = z.object({
  userId: z.string().trim().email().max(320),
  alias: z.string().trim().min(1).max(200),
})

export async function GET(request: NextRequest) {
  const token = getAdminToken(request)
  if (!verifySession(token)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const userId = request.nextUrl.searchParams.get("userId")
    const aliases = await listMusicArtistAliases(userId)
    return NextResponse.json({ aliases })
  } catch (error) {
    console.error("[admin/music-stats/artist-aliases] GET", error)
    return NextResponse.json({ error: "Не удалось загрузить алиасы" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
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

  const parsed = upsertSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Ошибка валидации" }, { status: 400 })
  }

  try {
    const alias = await upsertMusicArtistAlias(parsed.data)
    return NextResponse.json({ ok: true, alias })
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown"
    if (message === "missing_required_fields" || message === "alias_too_long") {
      return NextResponse.json({ error: "Некорректные данные" }, { status: 400 })
    }
    console.error("[admin/music-stats/artist-aliases] POST", error)
    return NextResponse.json({ error: "Не удалось сохранить алиас" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
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

  const parsed = deleteSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Ошибка валидации" }, { status: 400 })
  }

  try {
    const ok = await deleteMusicArtistAlias(parsed.data)
    if (!ok) {
      return NextResponse.json({ error: "Алиас не найден" }, { status: 404 })
    }
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("[admin/music-stats/artist-aliases] DELETE", error)
    return NextResponse.json({ error: "Не удалось удалить алиас" }, { status: 500 })
  }
}
