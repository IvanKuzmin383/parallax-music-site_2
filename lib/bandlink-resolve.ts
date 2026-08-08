import type { PlatformLinks } from "@/lib/smartlink-platforms"

const BANDLINK_API = "https://api.band.link/v1"
const FETCH_TIMEOUT_MS = 20_000

export type BandlinkResolveResult = {
  ok: boolean
  links: PlatformLinks
  meta?: {
    title?: string
    artistName?: string
    artworkUrl?: string
  }
  error?: string
  hash?: string
}

type BandlinkConfig = {
  token: string
  artistId: number
  cookies: string
}

type BandlinkSmartlink = {
  settings?: {
    releaseName?: string
    artistName?: string
    releaseImgUrl?: string
    urls?: string[]
    presaves?: Array<{ url?: string | null; upc?: string }>
  }
  artist?: { name?: string }
}

function getBandlinkConfig(): BandlinkConfig | null {
  const token = process.env.BANDLINK_TOKEN?.trim()
  const artistIdRaw = process.env.BANDLINK_ARTIST_ID?.trim()
  if (!token || !artistIdRaw) return null

  const artistId = Number(artistIdRaw)
  if (!Number.isFinite(artistId) || artistId <= 0) return null

  const cookies =
    process.env.BANDLINK_COOKIES?.trim() || `loggedIn=${token}; token=${token}`

  return { token, artistId, cookies }
}

function buildHeaders(config: BandlinkConfig, withBody: boolean): HeadersInit {
  const headers: Record<string, string> = {
    Accept: "application/json, text/plain, */*",
    "Accept-Language": "ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7",
    Authorization: `Bearer ${config.token}`,
    "Cache-Control": "no-cache",
    Cookie: config.cookies,
    Origin: "https://band.link",
    Pragma: "no-cache",
    Referer: "https://band.link/",
    "Sec-CH-UA": '"Not=A?Brand";v="99", "Google Chrome";v="151", "Chromium";v="151"',
    "Sec-CH-UA-Mobile": "?0",
    "Sec-CH-UA-Platform": '"Windows"',
    "Sec-Fetch-Dest": "empty",
    "Sec-Fetch-Mode": "cors",
    "Sec-Fetch-Site": "same-site",
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36",
  }
  if (withBody) headers["Content-Type"] = "application/json"
  return headers
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function classifyBandlinkUrl(url: string): keyof PlatformLinks | null {
  const u = url.toLowerCase()
  if (u.includes("music.apple.com") && !u.includes("app=itunes")) return "appleMusic"
  if (u.includes("music.yandex.ru/album")) return "yandex"
  if (u.includes("music.mts.ru")) return "kion"
  if (u.includes("music.vk.com") || u.includes("vk.com/music")) return "vk"
  if (u.includes("zvuk.com") || u.includes("open.zvuk.com")) return "sberzvuk"
  if (u.includes("spotify.com") || u.startsWith("spotify:")) return "spotify"
  if (u.includes("music.youtube.com") || u.includes("youtube.com/watch")) return "youtubeMusic"
  return null
}

function normalizeSpotifyUrl(url: string): string | undefined {
  const trimmed = url.trim()
  if (trimmed.includes("open.spotify.com") || trimmed.includes("spotify.com")) {
    return trimmed.split("?")[0]
  }
  const albumMatch = trimmed.match(/^spotify:album:([a-zA-Z0-9]+)$/i)
  if (albumMatch?.[1]) {
    return `https://open.spotify.com/album/${albumMatch[1]}`
  }
  return undefined
}

/** Bandlink отдаёт open.zvuk.com/xxx?af_web_dp=https://zvuk.com/release/ID — берём нормальный release URL. */
export function normalizeSberzvukUrl(url: string): string | undefined {
  const trimmed = url.trim()
  if (!trimmed) return undefined

  try {
    const u = new URL(trimmed)
    const afWeb = u.searchParams.get("af_web_dp")
    if (afWeb?.includes("zvuk.com/release/")) {
      return afWeb.split("?")[0]
    }
    const id = u.searchParams.get("id")
    if (id && /^\d+$/.test(id) && (u.hostname.includes("zvuk.com") || u.hostname.includes("open.zvuk"))) {
      return `https://zvuk.com/release/${id}`
    }
    const pathMatch = u.pathname.match(/\/release\/(\d+)/)
    if (pathMatch?.[1] && u.hostname.includes("zvuk.com")) {
      return `https://zvuk.com/release/${pathMatch[1]}`
    }
  } catch {
    // fall through
  }

  const embedded = trimmed.match(/https?:\/\/zvuk\.com\/release\/\d+/i)
  if (embedded?.[0]) return embedded[0]

  const idInQuery = trimmed.match(/[?&]id=(\d+)/)
  if (idInQuery?.[1] && /zvuk/i.test(trimmed)) {
    return `https://zvuk.com/release/${idInQuery[1]}`
  }

  // уже нормальный или короткий без id — как есть без query
  if (/zvuk\.com/i.test(trimmed)) {
    return trimmed.split("?")[0]
  }
  return undefined
}

export function mapBandlinkUrlsToPlatformLinks(
  rawUrls: string[],
  presaves?: Array<{ url?: string | null; upc?: string }>
): PlatformLinks {
  const links: PlatformLinks = {}

  // Сначала предпочитаем «хорошие» zvuk.com/release/, потом короткие open.zvuk.com
  const sorted = [...rawUrls].sort((a, b) => {
    const score = (u: string) =>
      /zvuk\.com\/release\//i.test(u) || /af_web_dp=.*zvuk\.com%2Frelease/i.test(u) || /[?&]id=\d+/.test(u)
        ? 0
        : /zvuk/i.test(u)
          ? 1
          : 2
    return score(a) - score(b)
  })

  for (const raw of sorted) {
    if (typeof raw !== "string" || !raw.trim()) continue
    const url = raw.trim()
    const key = classifyBandlinkUrl(url)
    if (!key) continue

    if (key === "spotify") {
      if (links.spotify) continue
      const spotify = normalizeSpotifyUrl(url)
      if (spotify) links.spotify = spotify
      continue
    }

    if (key === "sberzvuk") {
      const zvuk = normalizeSberzvukUrl(url)
      if (!zvuk) continue
      // апгрейд короткой на release/
      if (!links.sberzvuk || (/\/release\//.test(zvuk) && !/\/release\//.test(links.sberzvuk))) {
        links.sberzvuk = zvuk
      }
      continue
    }

    if (links[key]) continue
    links[key] = url.split("?")[0] ?? url
  }

  for (const presave of presaves ?? []) {
    if (presave.url && !links.spotify) {
      const spotify = normalizeSpotifyUrl(presave.url)
      if (spotify) links.spotify = spotify
    }
    if (presave.upc?.startsWith("spotify:") && !links.spotify) {
      const spotify = normalizeSpotifyUrl(presave.upc)
      if (spotify) links.spotify = spotify
    }
  }

  return links
}

async function bandlinkFetch(
  config: BandlinkConfig,
  method: string,
  path: string,
  body?: unknown
): Promise<{ status: number; json: unknown }> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
  try {
    const res = await fetch(`${BANDLINK_API}${path}`, {
      method,
      headers: buildHeaders(config, body !== undefined),
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
      cache: "no-store",
    })
    const text = await res.text()
    let json: unknown = null
    if (text) {
      try {
        json = JSON.parse(text)
      } catch {
        json = { raw: text.slice(0, 300) }
      }
    }
    return { status: res.status, json }
  } finally {
    clearTimeout(timeoutId)
  }
}

function bandlinkErrorMessage(status: number, json: unknown): string {
  const raw = typeof json === "object" && json !== null && "raw" in json ? String(json.raw) : ""
  if (
    status === 403 &&
    (raw.includes("403") || raw.includes("smart-captcha") || raw.includes("temporarily blocked"))
  ) {
    return "403 — обновите BANDLINK_COOKIES в .env (cookie _yasc с band.link)"
  }
  if (status === 401) return "401 — неверный BANDLINK_TOKEN"
  return `HTTP ${status}`
}

/**
 * Resolve platform links via Bandlink API (POST smartlink → PATCH UPC → GET urls).
 * Returns null if BANDLINK_TOKEN / BANDLINK_ARTIST_ID not configured.
 */
export async function resolvePlatformLinksViaBandlink(
  upc: string
): Promise<BandlinkResolveResult | null> {
  const config = getBandlinkConfig()
  if (!config) return null

  try {
    const { status: createStatus, json: createJson } = await bandlinkFetch(
      config,
      "POST",
      "/smartlinks",
      { type: "release", artistId: config.artistId }
    )

    if (!createStatus || createStatus >= 400) {
      return {
        ok: false,
        links: {},
        error: bandlinkErrorMessage(createStatus, createJson),
      }
    }

    const hash =
      typeof createJson === "object" &&
      createJson !== null &&
      "hash" in createJson &&
      typeof createJson.hash === "string"
        ? createJson.hash
        : undefined

    if (!hash) {
      return { ok: false, links: {}, error: "не вернул hash" }
    }

    const { status: patchStatus, json: patchJson } = await bandlinkFetch(
      config,
      "PATCH",
      `/smartlinks/${hash}`,
      { action: "updateSmartlinkUrls", urls: [upc] }
    )

    if (patchStatus !== 204 && patchStatus >= 400) {
      return {
        ok: false,
        links: {},
        error: bandlinkErrorMessage(patchStatus, patchJson),
        hash,
      }
    }

    let smartlink: BandlinkSmartlink | null = null
    for (let attempt = 0; attempt < 12; attempt++) {
      await sleep(attempt === 0 ? 150 : 400)
      const { status: getStatus, json: getJson } = await bandlinkFetch(
        config,
        "GET",
        `/smartlinks/${hash}`
      )
      if (getStatus >= 400) {
        return {
          ok: false,
          links: {},
          error: bandlinkErrorMessage(getStatus, getJson),
          hash,
        }
      }
      smartlink = getJson as BandlinkSmartlink
      const urls = smartlink.settings?.urls ?? []
      if (urls.length > 0) break
    }

    const rawUrls = smartlink?.settings?.urls ?? []
    const links = mapBandlinkUrlsToPlatformLinks(rawUrls, smartlink?.settings?.presaves)
    const found = Object.values(links).some((v) => typeof v === "string" && v.trim())

    return {
      ok: found,
      links,
      meta: {
        title: smartlink?.settings?.releaseName,
        artistName: smartlink?.settings?.artistName ?? smartlink?.artist?.name,
        artworkUrl: smartlink?.settings?.releaseImgUrl,
      },
      hash,
      error: found ? undefined : "ссылки не найдены в каталогах",
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown error"
    return { ok: false, links: {}, error: message }
  }
}

export function isBandlinkConfigured(): boolean {
  return getBandlinkConfig() !== null
}
