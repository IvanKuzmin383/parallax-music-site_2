import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { getCabinetToken, getCabinetSession } from "@/lib/cabinet-auth"
import {
  ensureSmartlinkSlugOnTrack,
  isTrackSmartlinkPubliclyVisible,
  resolveCabinetSmartlinkContext,
} from "@/lib/cabinet-smartlink"
import { SMARTLINK_SLUG_REGEX } from "@/lib/smartlink"
import { smartlinkPublicPath, smartlinkPublicUrl } from "@/lib/smartlink-public-origin"
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
import { isAnySmartlinkSlugTaken } from "@/lib/cabinet-smartlinks"
import { setTrackSmartlinkPublic, updateTrack } from "@/lib/tracks"

const optionalUrl = z.string().trim().max(2000).optional().nullable()

const platformLinksSchema = z
  .object(
    Object.fromEntries(PLATFORM_LINK_KEYS.map((key) => [key, optionalUrl])) as Record<
      (typeof PLATFORM_LINK_KEYS)[number],
      typeof optionalUrl
    >,
  )
  .partial()

const patchSchema = z.object({
  theme: z.unknown().optional(),
  platformLinks: platformLinksSchema.optional(),
  smartlinkSlug: z.string().optional(),
  ensureSlug: z.boolean().optional(),
  smartlinkPublic: z.boolean().optional(),
})

function toResponse(ctx: NonNullable<Awaited<ReturnType<typeof resolveCabinetSmartlinkContext>>>) {
  const tiktokStart =
    typeof ctx.track.tiktokSoundStartSec === "number" && Number.isFinite(ctx.track.tiktokSoundStartSec)
      ? Math.max(0, Math.trunc(ctx.track.tiktokSoundStartSec))
      : 0
  const isPublic = isTrackSmartlinkPubliclyVisible(ctx.track) && Boolean(ctx.coverUrl)
  return {
    releaseId: ctx.releaseId,
    trackId: ctx.track.id,
    title: ctx.title,
    artist: ctx.artist,
    coverUrl: ctx.coverUrl,
    status: ctx.status,
    theme: ctx.theme,
    platformLinks: ctx.platformLinks,
    smartlinkSlug: ctx.smartlinkSlug,
    publicPath: ctx.smartlinkSlug ? smartlinkPublicPath(ctx.smartlinkSlug) : null,
    publicUrl: ctx.smartlinkSlug ? smartlinkPublicUrl(ctx.smartlinkSlug) : null,
    isPublic,
    smartlinkPublic: ctx.smartlinkPublic,
    canEnablePromo: ctx.canEnablePromo,
    /** Подсказка для хука смартлинка - секунда из карточки релиза (TikTok). */
    defaultPreviewStartSec: tiktokStart,
  }
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const token = getCabinetToken(_request)
  const session = getCabinetSession(token)
  if (!session) return NextResponse.json({ error: "Необходима авторизация" }, { status: 401 })

  const { id } = await params
  const ctx = await resolveCabinetSmartlinkContext(id, session.email)
  if (!ctx) return NextResponse.json({ error: "Релиз не найден" }, { status: 404 })

  return NextResponse.json(toResponse(ctx))
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const token = getCabinetToken(request)
  const session = getCabinetSession(token)
  if (!session) return NextResponse.json({ error: "Необходима авторизация" }, { status: 401 })

  const { id } = await params
  const ctx = await resolveCabinetSmartlinkContext(id, session.email)
  if (!ctx) return NextResponse.json({ error: "Релиз не найден" }, { status: 404 })

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Некорректный JSON" }, { status: 400 })
  }

  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Некорректные данные", errors: parsed.error.flatten() },
      { status: 400 },
    )
  }

  const payload = parsed.data
  let nextSlug = ctx.smartlinkSlug

  if (payload.smartlinkSlug !== undefined) {
    const slug = payload.smartlinkSlug.trim()
    if (!slug) {
      return NextResponse.json({ error: "Укажите slug смартлинка" }, { status: 400 })
    }
    if (!SMARTLINK_SLUG_REGEX.test(slug)) {
      return NextResponse.json(
        { error: "Slug: 6-20 символов, латиница, цифры, _ или -" },
        { status: 400 },
      )
    }
    const sameAsCurrent =
      Boolean(ctx.smartlinkSlug) && ctx.smartlinkSlug!.toLowerCase() === slug.toLowerCase()
    if (
      !sameAsCurrent &&
      (await isAnySmartlinkSlugTaken(slug, { excludeTrackId: ctx.track.id }))
    ) {
      return NextResponse.json({ error: "Такой смартлинк уже занят" }, { status: 409 })
    }
    nextSlug = slug
  } else if (payload.ensureSlug || !nextSlug) {
    nextSlug = await ensureSmartlinkSlugOnTrack(ctx.track)
  }

  let nextTheme = ctx.theme
  if (payload.theme !== undefined) {
    const theme = parseSmartlinkTheme(payload.theme)
    const accent = normalizeAccentHex(theme.accent)
    if (!accent || !isSmartlinkPreset(theme.preset)) {
      return NextResponse.json({ error: "Некорректная тема" }, { status: 400 })
    }
    if (!isSmartlinkButtonStyle(theme.buttons) || !isSmartlinkCoverShape(theme.cover)) {
      return NextResponse.json({ error: "Некорректная тема" }, { status: 400 })
    }
    nextTheme = theme
  }

  let nextPlatformLinks: PlatformLinks | undefined
  if (payload.platformLinks !== undefined) {
    const cleaned: Partial<PlatformLinks> = {}
    for (const key of PLATFORM_LINK_KEYS) {
      const value = payload.platformLinks[key]
      cleaned[key] = typeof value === "string" ? value : undefined
    }
    nextPlatformLinks = normalizePlatformLinks(cleaned)
  }

  const updated = await updateTrack(ctx.track.id, {
    smartlinkSlug: nextSlug ?? undefined,
    smartlinkTheme: nextTheme,
    ...(nextPlatformLinks !== undefined ? { platformLinks: nextPlatformLinks } : {}),
  })
  if (!updated) {
    return NextResponse.json({ error: "Не удалось сохранить" }, { status: 500 })
  }

  if (payload.smartlinkPublic !== undefined) {
    if (payload.smartlinkPublic && !ctx.canEnablePromo && ctx.track.status !== "released") {
      return NextResponse.json(
        {
          error:
            "Промо-смартлинк доступен на модерации, после отправки агрегатору или на площадках",
        },
        { status: 400 }
      )
    }
    // Для released флаг не нужен - страница и так публичная
    if (ctx.track.status !== "released") {
      await setTrackSmartlinkPublic(ctx.track.id, payload.smartlinkPublic)
    }
  }

  const refreshed = await resolveCabinetSmartlinkContext(id, session.email)
  if (!refreshed) {
    return NextResponse.json({ error: "Не удалось сохранить" }, { status: 500 })
  }

  return NextResponse.json(toResponse(refreshed))
}
