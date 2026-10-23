import { createHash, randomUUID } from "node:crypto"
import { execute, query, queryOne } from "@/lib/database"

export type SmartlinkEventType = "view" | "click" | "audio_unlock"

export type SmartlinkAnalyticsTotals = {
  views: number
  uniqueVisitors: number
  clicks: number
  audioUnlocks: number
  ctr: number
}

export type SmartlinkAnalyticsReport = {
  from: string
  to: string
  totals: SmartlinkAnalyticsTotals
  daily: { date: string; views: number; clicks: number }[]
  platforms: { key: string; clicks: number }[]
  sources: { source: string; views: number }[]
  devices: { device: string; views: number }[]
  countries: { country: string; views: number }[]
  cities: { city: string; country: string | null; views: number }[]
  os: { os: string; views: number }[]
  browsers: { browser: string; views: number }[]
  campaigns: { campaign: string; views: number; clicks: number }[]
  hours: { hour: number; views: number; clicks: number }[]
}

export type SmartlinkListStats = {
  views7d: number
  clicks7d: number
}

type ClientHints = {
  device: string
  os: string
  browser: string
}

type IngestInput = {
  smartlinkKey: string
  slug: string
  eventType: SmartlinkEventType
  targetKey?: string | null
  targetUrl?: string | null
  sessionId?: string | null
  referrer?: string | null
  utmSource?: string | null
  utmMedium?: string | null
  utmCampaign?: string | null
  ip?: string | null
  userAgent?: string | null
  country?: string | null
  city?: string | null
}

const VIEW_DEDUPE_MINUTES = 30
const RATE_WINDOW_MS = 60_000
const RATE_MAX_PER_IP = 90

type RateBucket = { count: number; resetAt: number }
const rateByIp = new Map<string, RateBucket>()

function clampText(value: string | null | undefined, max: number): string | null {
  if (!value) return null
  const t = value.trim()
  if (!t) return null
  return t.length > max ? t.slice(0, max) : t
}

function hashVisitor(ip: string | null | undefined, ua: string | null | undefined): string | null {
  const day = new Date().toISOString().slice(0, 10)
  const base = `${ip?.trim() || "unknown"}|${ua?.trim() || "unknown"}|${day}`
  return createHash("sha256").update(base).digest("hex").slice(0, 32)
}

/** Простой разбор UA без внешних зависимостей. */
export function parseUserAgent(uaRaw: string | null | undefined): ClientHints {
  const ua = (uaRaw ?? "").toLowerCase()
  if (!ua) return { device: "unknown", os: "unknown", browser: "unknown" }

  const isBot =
    /bot|crawl|spider|slurp|facebookexternalhit|preview|wget|curl|python-requests|headless/i.test(ua)

  let device = "desktop"
  if (isBot) device = "bot"
  else if (/ipad|tablet|kindle|playbook|silk|(android(?!.*mobile))/i.test(ua)) device = "tablet"
  else if (/mobi|iphone|ipod|android.*mobile|windows phone/i.test(ua)) device = "mobile"

  let os = "other"
  if (/windows nt/i.test(ua)) os = "windows"
  else if (/android/i.test(ua)) os = "android"
  else if (/iphone|ipad|ipod/i.test(ua)) os = "ios"
  else if (/mac os x|macintosh/i.test(ua)) os = "macos"
  else if (/linux/i.test(ua)) os = "linux"

  let browser = "other"
  if (/edg\//i.test(ua)) browser = "edge"
  else if (/opr\/|opera/i.test(ua)) browser = "opera"
  else if (/chrome\//i.test(ua) && !/edg\//i.test(ua)) browser = "chrome"
  else if (/safari\//i.test(ua) && !/chrome\//i.test(ua)) browser = "safari"
  else if (/firefox\//i.test(ua)) browser = "firefox"

  return { device, os, browser }
}

export function checkSmartlinkEventRateLimit(ip: string | null | undefined): boolean {
  const key = (ip?.trim() || "unknown").slice(0, 64)
  const now = Date.now()
  const bucket = rateByIp.get(key)
  if (!bucket || now >= bucket.resetAt) {
    rateByIp.set(key, { count: 1, resetAt: now + RATE_WINDOW_MS })
    if (rateByIp.size > 5000) {
      for (const [k, v] of rateByIp) {
        if (now >= v.resetAt) rateByIp.delete(k)
      }
    }
    return true
  }
  if (bucket.count >= RATE_MAX_PER_IP) return false
  bucket.count += 1
  return true
}

export function newSmartlinkSessionId(): string {
  return randomUUID()
}

export function smartlinkKeyForStandalone(id: string): string {
  return `sl:${id}`
}

export function smartlinkKeyForTrack(id: string): string {
  return `tr:${id}`
}

async function recentViewExists(smartlinkKey: string, sessionId: string): Promise<boolean> {
  const row = await queryOne<{ ok: number }>(
    `SELECT 1 AS ok
     FROM smartlink_events
     WHERE smartlink_key = ?
       AND session_id = ?
       AND event_type = 'view'
       AND created_at > NOW() - INTERVAL '${VIEW_DEDUPE_MINUTES} minutes'
     LIMIT 1`,
    [smartlinkKey, sessionId],
  )
  return Boolean(row)
}

export async function ingestSmartlinkEvent(input: IngestInput): Promise<{ stored: boolean }> {
  const eventType = input.eventType
  if (eventType !== "view" && eventType !== "click" && eventType !== "audio_unlock") {
    return { stored: false }
  }

  const sessionId = clampText(input.sessionId, 64)
  if (eventType === "view" && sessionId) {
    try {
      if (await recentViewExists(input.smartlinkKey, sessionId)) {
        return { stored: false }
      }
    } catch (error) {
      console.error("[smartlink-analytics] view dedupe failed:", error)
    }
  }

  const hints = parseUserAgent(input.userAgent)
  const visitorHash = hashVisitor(input.ip, input.userAgent)

  try {
    await execute(
      `INSERT INTO smartlink_events (
         smartlink_key, slug, event_type, target_key, target_url,
         session_id, visitor_hash, referrer,
         utm_source, utm_medium, utm_campaign,
         device, os, browser, country, city
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        input.smartlinkKey,
        clampText(input.slug, 120) ?? input.slug,
        eventType,
        clampText(input.targetKey, 80),
        clampText(input.targetUrl, 2000),
        sessionId,
        visitorHash,
        clampText(input.referrer, 500),
        clampText(input.utmSource, 120),
        clampText(input.utmMedium, 120),
        clampText(input.utmCampaign, 120),
        hints.device,
        hints.os,
        hints.browser,
        clampText(input.country, 8),
        clampText(input.city, 80),
      ],
    )
    return { stored: true }
  } catch (error) {
    console.error("[smartlink-analytics] insert failed:", error)
    return { stored: false }
  }
}

function toIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function emptyReport(from: Date, to: Date): SmartlinkAnalyticsReport {
  return {
    from: from.toISOString(),
    to: to.toISOString(),
    totals: { views: 0, uniqueVisitors: 0, clicks: 0, audioUnlocks: 0, ctr: 0 },
    daily: [],
    platforms: [],
    sources: [],
    devices: [],
    countries: [],
    cities: [],
    os: [],
    browsers: [],
    campaigns: [],
    hours: [],
  }
}

const BOT_FILTER = `AND COALESCE(device, '') <> 'bot'`

async function countByDim(
  smartlinkKey: string,
  fromIso: string,
  toIso: string,
  dimSql: string,
  eventType: "view" | "click" | null,
  limit: number,
): Promise<{ key: string; n: string }[]> {
  const typeClause = eventType ? `AND event_type = '${eventType}'` : ""
  return query<{ key: string; n: string }>(
    `SELECT ${dimSql} AS key, COUNT(*)::text AS n
     FROM smartlink_events
     WHERE smartlink_key = ?
       AND created_at >= ?
       AND created_at < ?
       ${BOT_FILTER}
       ${typeClause}
     GROUP BY 1
     ORDER BY COUNT(*) DESC
     LIMIT ?`,
    [smartlinkKey, fromIso, toIso, limit],
  )
}

/** Отчёт по одному смартлинку за период. Боты исключены из KPI. */
export async function getSmartlinkAnalyticsReport(
  smartlinkKey: string,
  from: Date,
  to: Date,
): Promise<SmartlinkAnalyticsReport> {
  if (!smartlinkKey.trim()) return emptyReport(from, to)

  try {
    const totalsRow = await queryOne<{
      views: string
      unique_visitors: string
      clicks: string
      audio_unlocks: string
    }>(
      `SELECT
         COUNT(*) FILTER (WHERE event_type = 'view')::text AS views,
         COUNT(DISTINCT visitor_hash) FILTER (WHERE event_type = 'view' AND visitor_hash IS NOT NULL)::text AS unique_visitors,
         COUNT(*) FILTER (WHERE event_type = 'click')::text AS clicks,
         COUNT(*) FILTER (WHERE event_type = 'audio_unlock')::text AS audio_unlocks
       FROM smartlink_events
       WHERE smartlink_key = ?
         AND created_at >= ?
         AND created_at < ?
         AND COALESCE(device, '') <> 'bot'`,
      [smartlinkKey, from.toISOString(), to.toISOString()],
    )

    const views = Number(totalsRow?.views ?? 0)
    const clicks = Number(totalsRow?.clicks ?? 0)
    const uniqueVisitors = Number(totalsRow?.unique_visitors ?? 0)
    const audioUnlocks = Number(totalsRow?.audio_unlocks ?? 0)
    const ctr = views > 0 ? Math.round((clicks / views) * 1000) / 10 : 0

    const dailyRows = await query<{ day: string; views: string; clicks: string }>(
      `SELECT
         to_char(date_trunc('day', created_at AT TIME ZONE 'UTC'), 'YYYY-MM-DD') AS day,
         COUNT(*) FILTER (WHERE event_type = 'view')::text AS views,
         COUNT(*) FILTER (WHERE event_type = 'click')::text AS clicks
       FROM smartlink_events
       WHERE smartlink_key = ?
         AND created_at >= ?
         AND created_at < ?
         AND COALESCE(device, '') <> 'bot'
       GROUP BY 1
       ORDER BY 1 ASC`,
      [smartlinkKey, from.toISOString(), to.toISOString()],
    )

    const platformRows = await query<{ key: string; clicks: string }>(
      `SELECT COALESCE(NULLIF(trim(target_key), ''), 'other') AS key,
              COUNT(*)::text AS clicks
       FROM smartlink_events
       WHERE smartlink_key = ?
         AND event_type = 'click'
         AND created_at >= ?
         AND created_at < ?
         AND COALESCE(device, '') <> 'bot'
       GROUP BY 1
       ORDER BY COUNT(*) DESC
       LIMIT 20`,
      [smartlinkKey, from.toISOString(), to.toISOString()],
    )

    const sourceRows = await query<{ source: string; views: string }>(
      `SELECT
         CASE
           WHEN utm_source IS NOT NULL AND trim(utm_source) <> '' THEN lower(trim(utm_source))
           WHEN referrer IS NOT NULL AND trim(referrer) <> '' THEN
             lower(split_part(regexp_replace(referrer, '^https?://', ''), '/', 1))
           ELSE 'direct'
         END AS source,
         COUNT(*)::text AS views
       FROM smartlink_events
       WHERE smartlink_key = ?
         AND event_type = 'view'
         AND created_at >= ?
         AND created_at < ?
         AND COALESCE(device, '') <> 'bot'
       GROUP BY 1
       ORDER BY COUNT(*) DESC
       LIMIT 15`,
      [smartlinkKey, from.toISOString(), to.toISOString()],
    )

    const fromIso = from.toISOString()
    const toIso = to.toISOString()

    const deviceRows = await query<{ device: string; views: string }>(
      `SELECT COALESCE(NULLIF(trim(device), ''), 'unknown') AS device,
              COUNT(*)::text AS views
       FROM smartlink_events
       WHERE smartlink_key = ?
         AND event_type = 'view'
         AND created_at >= ?
         AND created_at < ?
         AND COALESCE(device, '') <> 'bot'
       GROUP BY 1
       ORDER BY COUNT(*) DESC`,
      [smartlinkKey, fromIso, toIso],
    )

    const [countryRows, cityRows, osRows, browserRows, campaignRows, hourRows] =
      await Promise.all([
        countByDim(
          smartlinkKey,
          fromIso,
          toIso,
          `COALESCE(NULLIF(upper(trim(country)), ''), '??')`,
          "view",
          30,
        ),
        query<{ city: string; country: string | null; n: string }>(
          `SELECT COALESCE(NULLIF(trim(city), ''), 'unknown') AS city,
                  NULLIF(upper(trim(country)), '') AS country,
                  COUNT(*)::text AS n
           FROM smartlink_events
           WHERE smartlink_key = ?
             AND event_type = 'view'
             AND created_at >= ?
             AND created_at < ?
             AND COALESCE(device, '') <> 'bot'
             AND city IS NOT NULL AND trim(city) <> ''
           GROUP BY 1, 2
           ORDER BY COUNT(*) DESC
           LIMIT 20`,
          [smartlinkKey, fromIso, toIso],
        ),
        countByDim(
          smartlinkKey,
          fromIso,
          toIso,
          `COALESCE(NULLIF(trim(os), ''), 'unknown')`,
          "view",
          12,
        ),
        countByDim(
          smartlinkKey,
          fromIso,
          toIso,
          `COALESCE(NULLIF(trim(browser), ''), 'unknown')`,
          "view",
          12,
        ),
        query<{ campaign: string; views: string; clicks: string }>(
          `SELECT COALESCE(NULLIF(lower(trim(utm_campaign)), ''), '(без utm_campaign)') AS campaign,
                  COUNT(*) FILTER (WHERE event_type = 'view')::text AS views,
                  COUNT(*) FILTER (WHERE event_type = 'click')::text AS clicks
           FROM smartlink_events
           WHERE smartlink_key = ?
             AND created_at >= ?
             AND created_at < ?
             AND COALESCE(device, '') <> 'bot'
             AND utm_campaign IS NOT NULL AND trim(utm_campaign) <> ''
           GROUP BY 1
           ORDER BY COUNT(*) FILTER (WHERE event_type = 'view') DESC
           LIMIT 20`,
          [smartlinkKey, fromIso, toIso],
        ),
        query<{ hour: string; views: string; clicks: string }>(
          `SELECT EXTRACT(HOUR FROM created_at AT TIME ZONE 'UTC')::int::text AS hour,
                  COUNT(*) FILTER (WHERE event_type = 'view')::text AS views,
                  COUNT(*) FILTER (WHERE event_type = 'click')::text AS clicks
           FROM smartlink_events
           WHERE smartlink_key = ?
             AND created_at >= ?
             AND created_at < ?
             AND COALESCE(device, '') <> 'bot'
           GROUP BY 1
           ORDER BY 1 ASC`,
          [smartlinkKey, fromIso, toIso],
        ),
      ])

    const dayMap = new Map(dailyRows.map((r) => [r.day, r]))
    const daily: SmartlinkAnalyticsReport["daily"] = []
    const cursor = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()))
    const endDay = new Date(Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate()))
    while (cursor < endDay) {
      const key = toIsoDate(cursor)
      const row = dayMap.get(key)
      daily.push({
        date: key,
        views: Number(row?.views ?? 0),
        clicks: Number(row?.clicks ?? 0),
      })
      cursor.setUTCDate(cursor.getUTCDate() + 1)
    }

    const hourMap = new Map(hourRows.map((r) => [Number(r.hour), r]))
    const hours: SmartlinkAnalyticsReport["hours"] = []
    for (let h = 0; h < 24; h++) {
      const row = hourMap.get(h)
      hours.push({
        hour: h,
        views: Number(row?.views ?? 0),
        clicks: Number(row?.clicks ?? 0),
      })
    }

    return {
      from: fromIso,
      to: toIso,
      totals: { views, uniqueVisitors, clicks, audioUnlocks, ctr },
      daily,
      platforms: platformRows.map((r) => ({ key: r.key, clicks: Number(r.clicks) })),
      sources: sourceRows.map((r) => ({ source: r.source, views: Number(r.views) })),
      devices: deviceRows.map((r) => ({ device: r.device, views: Number(r.views) })),
      countries: countryRows.map((r) => ({ country: r.key, views: Number(r.n) })),
      cities: cityRows.map((r) => ({
        city: r.city,
        country: r.country,
        views: Number(r.n),
      })),
      os: osRows.map((r) => ({ os: r.key, views: Number(r.n) })),
      browsers: browserRows.map((r) => ({ browser: r.key, views: Number(r.n) })),
      campaigns: campaignRows.map((r) => ({
        campaign: r.campaign,
        views: Number(r.views),
        clicks: Number(r.clicks),
      })),
      hours,
    }
  } catch (error) {
    console.error("[smartlink-analytics] report failed:", error)
    return emptyReport(from, to)
  }
}

/** Сводка за 7 дней для списка смартлинков (по ключам sl:id). */
export async function getSmartlinkListStatsByKeys(
  keys: string[],
): Promise<Map<string, SmartlinkListStats>> {
  const map = new Map<string, SmartlinkListStats>()
  if (keys.length === 0) return map

  try {
    const placeholders = keys.map(() => "?").join(", ")
    const rows = await query<{ smartlink_key: string; views: string; clicks: string }>(
      `SELECT smartlink_key,
              COUNT(*) FILTER (WHERE event_type = 'view')::text AS views,
              COUNT(*) FILTER (WHERE event_type = 'click')::text AS clicks
       FROM smartlink_events
       WHERE smartlink_key IN (${placeholders})
         AND created_at >= NOW() - INTERVAL '7 days'
         AND COALESCE(device, '') <> 'bot'
       GROUP BY smartlink_key`,
      keys,
    )
    for (const row of rows) {
      map.set(row.smartlink_key, {
        views7d: Number(row.views),
        clicks7d: Number(row.clicks),
      })
    }
  } catch (error) {
    console.error("[smartlink-analytics] list stats failed:", error)
  }
  return map
}

export function defaultAnalyticsRange(days = 30): { from: Date; to: Date } {
  const to = new Date()
  const from = new Date(to.getTime() - days * 24 * 60 * 60 * 1000)
  return { from, to }
}

export function parseAnalyticsRange(
  fromRaw: string | null,
  toRaw: string | null,
  maxDays = 90,
): { from: Date; to: Date } | null {
  const fallback = defaultAnalyticsRange(30)
  let from = fallback.from
  let to = fallback.to

  if (fromRaw?.trim()) {
    const d = new Date(fromRaw)
    if (Number.isNaN(d.getTime())) return null
    from = d
  }
  if (toRaw?.trim()) {
    const d = new Date(toRaw)
    if (Number.isNaN(d.getTime())) return null
    to = d
  }
  if (to <= from) return null
  const spanDays = (to.getTime() - from.getTime()) / (24 * 60 * 60 * 1000)
  if (spanDays > maxDays) return null
  return { from, to }
}

/** Страна/город из CDN-заголовков (Cloudflare / Vercel / CloudFront). Без внешнего GeoIP. */
export function readGeoFromHeaders(headers: Headers): { country: string | null; city: string | null } {
  const countryRaw =
    headers.get("cf-ipcountry")?.trim() ||
    headers.get("x-vercel-ip-country")?.trim() ||
    headers.get("cloudfront-viewer-country")?.trim() ||
    null
  let country = countryRaw ? countryRaw.toUpperCase().slice(0, 8) : null
  if (country === "XX" || country === "T1" || country === "ZZ") country = null

  const cityRaw =
    headers.get("cf-ipcity")?.trim() ||
    headers.get("x-vercel-ip-city")?.trim() ||
    headers.get("cloudfront-viewer-city")?.trim() ||
    null
  let city: string | null = null
  if (cityRaw) {
    try {
      city = decodeURIComponent(cityRaw).slice(0, 80)
    } catch {
      city = cityRaw.slice(0, 80)
    }
  }
  return { country, city }
}

function csvEscape(value: string | null | undefined): string {
  const s = value ?? ""
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

export type SmartlinkEventExportRow = {
  created_at: string
  event_type: string
  target_key: string | null
  target_url: string | null
  referrer: string | null
  utm_source: string | null
  utm_medium: string | null
  utm_campaign: string | null
  device: string | null
  os: string | null
  browser: string | null
  country: string | null
  city: string | null
}

export async function listSmartlinkEventsForExport(
  smartlinkKey: string,
  from: Date,
  to: Date,
  limit = 5000,
): Promise<SmartlinkEventExportRow[]> {
  return query<SmartlinkEventExportRow>(
    `SELECT created_at::text AS created_at,
            event_type,
            target_key,
            target_url,
            referrer,
            utm_source,
            utm_medium,
            utm_campaign,
            device,
            os,
            browser,
            country,
            city
     FROM smartlink_events
     WHERE smartlink_key = ?
       AND created_at >= ?
       AND created_at < ?
       AND COALESCE(device, '') <> 'bot'
     ORDER BY created_at DESC
     LIMIT ?`,
    [smartlinkKey, from.toISOString(), to.toISOString(), Math.min(10_000, Math.max(1, limit))],
  )
}

export function smartlinkEventsToCsv(rows: SmartlinkEventExportRow[]): string {
  const header = [
    "created_at",
    "event_type",
    "target_key",
    "target_url",
    "referrer",
    "utm_source",
    "utm_medium",
    "utm_campaign",
    "device",
    "os",
    "browser",
    "country",
    "city",
  ].join(",")
  const lines = rows.map((r) =>
    [
      csvEscape(r.created_at),
      csvEscape(r.event_type),
      csvEscape(r.target_key),
      csvEscape(r.target_url),
      csvEscape(r.referrer),
      csvEscape(r.utm_source),
      csvEscape(r.utm_medium),
      csvEscape(r.utm_campaign),
      csvEscape(r.device),
      csvEscape(r.os),
      csvEscape(r.browser),
      csvEscape(r.country),
      csvEscape(r.city),
    ].join(","),
  )
  return `\uFEFF${header}\n${lines.join("\n")}\n`
}
