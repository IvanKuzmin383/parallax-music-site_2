import { NextRequest, NextResponse } from "next/server"
import { getAdminToken, verifySession } from "@/lib/auth"
import {
  createPublickaPlacement,
  listAllPublickaPlacements,
  updatePublickaPlacement,
  type PublickaPlacementStatus,
} from "@/lib/publicka"
import { getCabinetUserByEmail, getCabinetUserById } from "@/lib/cabinet-users"

function requireAdmin(request: NextRequest) {
  const token = getAdminToken(request)
  return verifySession(token)
}

export async function GET(request: NextRequest) {
  if (!requireAdmin(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const url = new URL(request.url)
  const userId = url.searchParams.get("userId")
  const status = url.searchParams.get("status")
  const limit = Number(url.searchParams.get("limit") || 50)
  const offset = Number(url.searchParams.get("offset") || 0)
  const result = await listAllPublickaPlacements({ userId, status, limit, offset })
  return NextResponse.json(result)
}

export async function POST(request: NextRequest) {
  if (!requireAdmin(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const body = (await request.json()) as {
    userId?: string
    email?: string
    title?: string
    artist?: string
    status?: PublickaPlacementStatus
    trackId?: string
    externalKey?: string
  }

  let userId = body.userId?.trim()
  if (!userId && body.email?.trim()) {
    const user = await getCabinetUserByEmail(body.email.trim())
    if (!user) {
      return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 })
    }
    userId = user.id
  }
  if (!userId) {
    return NextResponse.json({ error: "Укажите userId или email" }, { status: 400 })
  }
  const user = await getCabinetUserById(userId)
  if (!user) {
    return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 })
  }

  const title = body.title?.trim()
  if (!title) {
    return NextResponse.json({ error: "Укажите название трека" }, { status: 400 })
  }
  const artist = body.artist?.trim() || user.artistName?.trim() || "Без артиста"

  const placement = await createPublickaPlacement({
    userId,
    title,
    artist,
    status: body.status ?? "active",
    trackId: body.trackId ?? null,
    externalKey: body.externalKey ?? null,
  })
  return NextResponse.json({ placement })
}

export async function PATCH(request: NextRequest) {
  if (!requireAdmin(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const body = (await request.json()) as {
    id?: string
    status?: PublickaPlacementStatus
    title?: string
    artist?: string
    trackId?: string | null
    externalKey?: string | null
  }
  if (!body.id?.trim()) {
    return NextResponse.json({ error: "Укажите id" }, { status: 400 })
  }
  const placement = await updatePublickaPlacement(body.id.trim(), {
    status: body.status,
    title: body.title,
    artist: body.artist,
    trackId: body.trackId,
    externalKey: body.externalKey,
  })
  if (!placement) {
    return NextResponse.json({ error: "Не найдено" }, { status: 404 })
  }
  return NextResponse.json({ placement })
}
