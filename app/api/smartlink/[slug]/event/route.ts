import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import {
  checkSmartlinkEventRateLimit,
  ingestSmartlinkEvent,
  readGeoFromHeaders,
  smartlinkKeyForStandalone,
  smartlinkKeyForTrack,
  type SmartlinkEventType,
} from "@/lib/smartlink-analytics"
import { getPublicSmartlink, SMARTLINK_SLUG_REGEX } from "@/lib/smartlink"

export const runtime = "nodejs"

const bodySchema = z.object({
  type: z.enum(["view", "click", "audio_unlock"]),
  sessionId: z.string().trim().max(64).optional().nullable(),
  targetKey: z.string().trim().max(80).optional().nullable(),
  targetUrl: z.string().trim().max(2000).optional().nullable(),
  referrer: z.string().trim().max(500).optional().nullable(),
  utmSource: z.string().trim().max(120).optional().nullable(),
  utmMedium: z.string().trim().max(120).optional().nullable(),
  utmCampaign: z.string().trim().max(120).optional().nullable(),
})

function clientIp(request: NextRequest): string | null {
  const xf = request.headers.get("x-forwarded-for")
  if (xf) {
    const first = xf.split(",")[0]?.trim()
    if (first) return first.slice(0, 64)
  }
  const real = request.headers.get("x-real-ip")?.trim()
  return real ? real.slice(0, 64) : null
}

type RouteCtx = { params: Promise<{ slug: string }> }

export async function POST(request: NextRequest, context: RouteCtx) {
  const { slug: rawSlug } = await context.params
  const slug = rawSlug?.trim().toLowerCase() ?? ""
  if (!SMARTLINK_SLUG_REGEX.test(slug)) {
    return NextResponse.json({ ok: false }, { status: 400 })
  }

  const ip = clientIp(request)
  if (!checkSmartlinkEventRateLimit(ip)) {
    return NextResponse.json({ ok: true, stored: false }, { status: 429 })
  }

  let json: unknown
  try {
    json = await request.json()
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 })
  }

  const parsed = bodySchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json({ ok: false }, { status: 400 })
  }

  const pub = await getPublicSmartlink(slug)
  if (!pub) {
    // Не светим существование - мягкий ответ
    return NextResponse.json({ ok: true, stored: false })
  }

  const eventType = parsed.data.type as SmartlinkEventType
  if (eventType === "click") {
    const key = parsed.data.targetKey?.trim()
    if (!key) return NextResponse.json({ ok: false }, { status: 400 })
  }

  const smartlinkKey =
    pub.source === "standalone"
      ? smartlinkKeyForStandalone(pub.id)
      : smartlinkKeyForTrack(pub.id)

  const geo = readGeoFromHeaders(request.headers)

  const result = await ingestSmartlinkEvent({
    smartlinkKey,
    slug: pub.slug,
    eventType,
    targetKey: parsed.data.targetKey,
    targetUrl: parsed.data.targetUrl,
    sessionId: parsed.data.sessionId,
    referrer: parsed.data.referrer,
    utmSource: parsed.data.utmSource,
    utmMedium: parsed.data.utmMedium,
    utmCampaign: parsed.data.utmCampaign,
    ip,
    userAgent: request.headers.get("user-agent"),
    country: geo.country,
    city: geo.city,
  })

  return NextResponse.json({ ok: true, stored: result.stored })
}
