import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { getCabinetToken, getCabinetSession } from "@/lib/cabinet-auth"
import { getCabinetUserByEmail } from "@/lib/cabinet-users"
import {
  coverUrlForSmartlink,
  deleteSmartlink,
  getSmartlinkById,
  isSmartlinkPubliclyActive,
  updateSmartlink,
} from "@/lib/cabinet-smartlinks"
import { SMARTLINK_SLUG_REGEX } from "@/lib/smartlink"
import {
  PLATFORM_LINK_KEYS,
  normalizePlatformLinks,
  type PlatformLinks,
} from "@/lib/smartlink-platforms"
import {
  isSmartlinkButtonStyle,
  isSmartlinkCoverShape,
  isSmartlinkPreset,
  normalizeAccentHex,
  parseSmartlinkTheme,
} from "@/lib/smartlink-theme"
import { TOOLS_SMARTLINK_PRICE_RUB } from "@/lib/tools-smartlink-pricing"

const optionalUrl = z.string().trim().max(2000).optional().nullable()
const platformLinksSchema = z
  .object(
    Object.fromEntries(PLATFORM_LINK_KEYS.map((key) => [key, optionalUrl])) as Record<
      (typeof PLATFORM_LINK_KEYS)[number],
      typeof optionalUrl
    >
  )
  .partial()

const patchSchema = z.object({
  title: z.string().trim().max(200).optional(),
  artistName: z.string().trim().max(200).optional(),
  slug: z.string().optional(),
  theme: z.unknown().optional(),
  platformLinks: platformLinksSchema.optional(),
})

function toResponse(link: NonNullable<Awaited<ReturnType<typeof getSmartlinkById>>>) {
  return {
    id: link.id,
    slug: link.slug,
    title: link.title,
    artistName: link.artistName,
    coverUrl: coverUrlForSmartlink(link),
    hasPreviewAudio: Boolean(link.previewAudioPath),
    theme: link.theme,
    platformLinks: link.platformLinks,
    status: link.status,
    mode: link.mode,
    paidUntil: link.paidUntil,
    publicPath: `/s/${link.slug}`,
    isPublic: isSmartlinkPubliclyActive(link),
    priceRub: TOOLS_SMARTLINK_PRICE_RUB,
    needsPayment: link.status !== "active" || !isSmartlinkPubliclyActive(link),
  }
}

async function requireOwned(id: string, email: string) {
  const user = await getCabinetUserByEmail(email)
  if (!user) return { error: NextResponse.json({ error: "Пользователь не найден" }, { status: 404 }) }
  const link = await getSmartlinkById(id)
  if (!link || link.userId !== user.id) {
    return { error: NextResponse.json({ error: "Смартлинк не найден" }, { status: 404 }) }
  }
  return { user, link }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = getCabinetToken(request)
  const session = getCabinetSession(token)
  if (!session) return NextResponse.json({ error: "Необходима авторизация" }, { status: 401 })

  const { id } = await params
  const owned = await requireOwned(id, session.email)
  if ("error" in owned && owned.error) return owned.error
  return NextResponse.json(toResponse(owned.link!))
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = getCabinetToken(request)
  const session = getCabinetSession(token)
  if (!session) return NextResponse.json({ error: "Необходима авторизация" }, { status: 401 })

  const { id } = await params
  const owned = await requireOwned(id, session.email)
  if ("error" in owned && owned.error) return owned.error

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Некорректный JSON" }, { status: 400 })
  }
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Некорректные данные" }, { status: 400 })
  }

  const payload = parsed.data
  let theme = owned.link!.theme
  if (payload.theme !== undefined) {
    theme = parseSmartlinkTheme(payload.theme)
    const accent = normalizeAccentHex(theme.accent)
    if (!accent || !isSmartlinkPreset(theme.preset)) {
      return NextResponse.json({ error: "Некорректная тема" }, { status: 400 })
    }
    if (!isSmartlinkButtonStyle(theme.buttons) || !isSmartlinkCoverShape(theme.cover)) {
      return NextResponse.json({ error: "Некорректная тема" }, { status: 400 })
    }
  }

  let platformLinks: PlatformLinks | undefined
  if (payload.platformLinks !== undefined) {
    const cleaned: Partial<PlatformLinks> = {}
    for (const key of PLATFORM_LINK_KEYS) {
      const value = payload.platformLinks[key]
      cleaned[key] = typeof value === "string" ? value : undefined
    }
    platformLinks = normalizePlatformLinks(cleaned)
  }

  if (payload.slug !== undefined && !SMARTLINK_SLUG_REGEX.test(payload.slug.trim())) {
    return NextResponse.json(
      { error: "Slug: 6-20 символов, латиница, цифры, _ или -" },
      { status: 400 }
    )
  }

  try {
    const updated = await updateSmartlink(id, {
      title: payload.title,
      artistName: payload.artistName,
      slug: payload.slug,
      theme,
      platformLinks,
    })
    if (!updated) return NextResponse.json({ error: "Не удалось сохранить" }, { status: 500 })
    return NextResponse.json(toResponse(updated))
  } catch (e) {
    const msg = e instanceof Error ? e.message : ""
    if (msg === "slug_taken") {
      return NextResponse.json({ error: "Такой смартлинк уже занят" }, { status: 409 })
    }
    if (msg === "invalid_slug") {
      return NextResponse.json({ error: "Некорректный slug" }, { status: 400 })
    }
    throw e
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = getCabinetToken(request)
  const session = getCabinetSession(token)
  if (!session) return NextResponse.json({ error: "Необходима авторизация" }, { status: 401 })

  const user = await getCabinetUserByEmail(session.email)
  if (!user) return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 })

  const { id } = await params
  const ok = await deleteSmartlink(id, user.id)
  if (!ok) return NextResponse.json({ error: "Смартлинк не найден" }, { status: 404 })
  return NextResponse.json({ ok: true })
}
