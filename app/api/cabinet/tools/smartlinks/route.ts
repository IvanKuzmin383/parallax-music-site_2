import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { getCabinetToken, getCabinetSession } from "@/lib/cabinet-auth"
import { getCabinetUserByEmail } from "@/lib/cabinet-users"
import {
  coverUrlForSmartlink,
  createSmartlink,
  isSmartlinkPubliclyActive,
  listSmartlinksByUserId,
  updateSmartlink,
} from "@/lib/cabinet-smartlinks"
import { resolveCabinetSmartlinkContext } from "@/lib/cabinet-smartlink"
import { getServicePriceRub } from "@/lib/service-prices"

const createSchema = z.object({
  title: z.string().trim().max(200).optional(),
  artistName: z.string().trim().max(200).optional(),
  /** Импорт из релиза / трека кабинета */
  fromReleaseId: z.string().trim().optional(),
})

export async function GET(request: NextRequest) {
  const token = getCabinetToken(request)
  const session = getCabinetSession(token)
  if (!session) return NextResponse.json({ error: "Необходима авторизация" }, { status: 401 })

  const user = await getCabinetUserByEmail(session.email)
  if (!user) return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 })

  const [items, priceRub] = await Promise.all([
    listSmartlinksByUserId(user.id),
    getServicePriceRub("tools_smartlink"),
  ])
  return NextResponse.json({
    priceRub,
    items: items.map((link) => ({
      id: link.id,
      slug: link.slug,
      title: link.title,
      artistName: link.artistName,
      status: link.status,
      mode: link.mode,
      paidUntil: link.paidUntil,
      publicPath: `/s/${link.slug}`,
      isPublic: isSmartlinkPubliclyActive(link),
      coverUrl: coverUrlForSmartlink(link),
      updatedAt: link.updatedAt,
    })),
  })
}

export async function POST(request: NextRequest) {
  const token = getCabinetToken(request)
  const session = getCabinetSession(token)
  if (!session) return NextResponse.json({ error: "Необходима авторизация" }, { status: 401 })

  const user = await getCabinetUserByEmail(session.email)
  if (!user) return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 })

  let body: unknown
  try {
    body = await request.json()
  } catch {
    body = {}
  }
  const parsed = createSchema.safeParse(body ?? {})
  if (!parsed.success) {
    return NextResponse.json({ error: "Некорректные данные" }, { status: 400 })
  }

  const fromId = parsed.data.fromReleaseId?.trim()
  if (fromId) {
    const ctx = await resolveCabinetSmartlinkContext(fromId, session.email)
    if (!ctx) return NextResponse.json({ error: "Релиз не найден" }, { status: 404 })

    // cover: physical path from track/release
    const coverPath = ctx.track.coverPath?.trim() || null
    const audioPath = ctx.track.audioPath?.trim() || null
    const created = await createSmartlink({
      userId: user.id,
      title: ctx.title,
      artistName: ctx.artist,
      mode: "promo",
      releaseId: ctx.releaseId,
      trackId: ctx.track.id,
      coverPath,
      previewAudioPath: audioPath,
      platformLinks: ctx.platformLinks,
      theme: ctx.theme,
    })
    // Для артистов дистрибуции промо из релиза - без отдельной оплаты
    await updateSmartlink(created.id, { status: "active", paidUntil: null })
    return NextResponse.json({ id: created.id, slug: created.slug }, { status: 201 })
  }

  const created = await createSmartlink({
    userId: user.id,
    title: parsed.data.title,
    artistName: parsed.data.artistName,
    mode: "standalone",
  })
  return NextResponse.json({ id: created.id, slug: created.slug }, { status: 201 })
}
