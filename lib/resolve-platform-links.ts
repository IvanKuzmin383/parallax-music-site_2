import type { PlatformLinks } from "@/lib/smartlink-platforms"

const FETCH_TIMEOUT_MS = 12_000

export type ResolvePlatformLinksResult = {
  links: PlatformLinks
  found: boolean
  meta?: {
    title?: string
    artistName?: string
    artworkUrl?: string
  }
  sources: {
    itunes?: boolean
    deezer?: boolean
    odesli?: boolean
  }
  errors: string[]
}

type ItunesResult = {
  wrapperType?: string
  collectionViewUrl?: string
  trackViewUrl?: string
  collectionName?: string
  trackName?: string
  artistName?: string
  artworkUrl100?: string
}

type ItunesLookupResponse = {
  resultCount?: number
  results?: ItunesResult[]
}

type DeezerAlbumResponse = {
  id?: number
  title?: string
  link?: string
  upc?: string
  cover_medium?: string
  artist?: { name?: string }
  error?: { message?: string; code?: number }
}

type OdesliPlatformLink = {
  url?: string
  entityUniqueId?: string
}

type OdesliResponse = {
  linksByPlatform?: Record<string, OdesliPlatformLink>
  entitiesByUniqueId?: Record<
    string,
    { title?: string; artistName?: string; thumbnailUrl?: string }
  >
}

function normalizeUpc(raw: string): string {
  return raw.replace(/\D/g, "")
}

async function fetchJson<T>(url: string): Promise<T> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
      cache: "no-store",
    })
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`)
    }
    return (await res.json()) as T
  } finally {
    clearTimeout(timeoutId)
  }
}

function cleanAppleMusicUrl(url: string): string {
  try {
    const u = new URL(url)
    // Drop iTunes affiliate / geo junk; keep path with album id.
    u.search = ""
    u.hash = ""
    if (u.hostname.includes("music.apple.com") || u.hostname.includes("geo.music.apple.com")) {
      u.hostname = "music.apple.com"
      // geo.music.apple.com/nl/... → prefer /us/ or keep path as-is without geo host
      return u.toString().replace(/\/$/, "")
    }
    return u.toString().replace(/\/$/, "")
  } catch {
    return url.split("?")[0] ?? url
  }
}

function yandexAlbumIdFromUrl(url: string): string | undefined {
  const m = url.match(/music\.yandex\.[a-z.]+\/album\/(\d+)/i)
  return m?.[1]
}

function mtsUrlFromYandexAlbumId(albumId: string): string {
  return `https://music.mts.ru/album/${albumId}`
}

async function lookupItunes(upc: string, country: string): Promise<ItunesLookupResponse | null> {
  try {
    return await fetchJson<ItunesLookupResponse>(
      `https://itunes.apple.com/lookup?upc=${encodeURIComponent(upc)}&entity=song&country=${country}`
    )
  } catch {
    return null
  }
}

async function lookupDeezer(upc: string): Promise<DeezerAlbumResponse | null> {
  try {
    return await fetchJson<DeezerAlbumResponse>(
      `https://api.deezer.com/album/upc:${encodeURIComponent(upc)}`
    )
  } catch {
    return null
  }
}

async function lookupOdesli(seedUrl: string): Promise<OdesliResponse | null> {
  try {
    return await fetchJson<OdesliResponse>(
      `https://api.song.link/v1-alpha.1/links?url=${encodeURIComponent(seedUrl)}`
    )
  } catch {
    return null
  }
}

function pickItunesCollection(data: ItunesLookupResponse | null): ItunesResult | undefined {
  if (!data?.results?.length) return undefined
  return (
    data.results.find((r) => r.wrapperType === "collection" && r.collectionViewUrl) ??
    data.results.find((r) => r.collectionViewUrl || r.trackViewUrl)
  )
}

/**
 * Resolve streaming platform URLs for a release UPC.
 * Maps Yandex album id → `kion` as MTS Music (project convention).
 */
export async function resolvePlatformLinksByUpc(rawUpc: string): Promise<ResolvePlatformLinksResult> {
  const upc = normalizeUpc(rawUpc)
  const errors: string[] = []
  const sources: ResolvePlatformLinksResult["sources"] = {}
  const links: PlatformLinks = {}

  if (!upc || upc.length < 12) {
    return {
      links: {},
      found: false,
      sources: {},
      errors: ["Укажите корректный UPC (минимум 12 цифр)"],
    }
  }

  const [itunesRu, itunesUs, deezer] = await Promise.all([
    lookupItunes(upc, "ru"),
    lookupItunes(upc, "us"),
    lookupDeezer(upc),
  ])

  const itunesHit = pickItunesCollection(itunesRu) ?? pickItunesCollection(itunesUs)
  let appleUrl: string | undefined
  let meta: ResolvePlatformLinksResult["meta"]

  if (itunesHit) {
    sources.itunes = true
    const raw = itunesHit.collectionViewUrl || itunesHit.trackViewUrl
    if (raw) {
      appleUrl = cleanAppleMusicUrl(raw)
      links.appleMusic = appleUrl
    }
    meta = {
      title: itunesHit.collectionName || itunesHit.trackName,
      artistName: itunesHit.artistName,
      artworkUrl: itunesHit.artworkUrl100,
    }
  } else {
    errors.push("iTunes: релиз не найден")
  }

  let deezerUrl: string | undefined
  if (deezer && !deezer.error && deezer.link) {
    sources.deezer = true
    deezerUrl = deezer.link
    if (!meta) {
      meta = {
        title: deezer.title,
        artistName: deezer.artist?.name,
        artworkUrl: deezer.cover_medium,
      }
    }
  } else {
    errors.push("Deezer: релиз не найден")
  }

  const seedUrl = appleUrl || deezerUrl
  if (!seedUrl) {
    return {
      links,
      found: Object.keys(links).length > 0,
      meta,
      sources,
      errors: [...errors, "Нет seed-ссылки для Odesli (релиз ещё не в каталоге?)"],
    }
  }

  const odesli = await lookupOdesli(seedUrl)
  if (!odesli?.linksByPlatform) {
    errors.push("Odesli: не удалось получить ссылки")
    return { links, found: Object.keys(links).length > 0, meta, sources, errors }
  }

  sources.odesli = true
  const by = odesli.linksByPlatform

  if (by.spotify?.url) links.spotify = by.spotify.url
  if (by.appleMusic?.url && !links.appleMusic) {
    links.appleMusic = cleanAppleMusicUrl(by.appleMusic.url)
  }
  if (by.yandex?.url) {
    links.yandex = by.yandex.url.split("?")[0] ?? by.yandex.url
    const albumId = yandexAlbumIdFromUrl(links.yandex)
    if (albumId) {
      // Project convention: КИОН field stores МТС Music URL
      links.kion = mtsUrlFromYandexAlbumId(albumId)
    }
  }
  const yt = by.youtubeMusic?.url || by.youtube?.url
  if (yt) links.youtubeMusic = yt.split("?")[0] ?? yt

  if (!meta && odesli.entitiesByUniqueId) {
    const first = Object.values(odesli.entitiesByUniqueId)[0]
    if (first) {
      meta = {
        title: first.title,
        artistName: first.artistName,
        artworkUrl: first.thumbnailUrl,
      }
    }
  }

  const found = Object.values(links).some((v) => typeof v === "string" && v.trim().length > 0)
  return { links, found, meta, sources, errors }
}

/** Merge resolved links into existing ones: overwrite only keys that were resolved. */
export function mergePlatformLinks(
  existing: PlatformLinks | undefined,
  resolved: PlatformLinks
): PlatformLinks {
  const next: PlatformLinks = { ...(existing ?? {}) }
  for (const [key, value] of Object.entries(resolved) as [keyof PlatformLinks, string | undefined][]) {
    if (typeof value === "string" && value.trim()) {
      next[key] = value.trim()
    }
  }
  return next
}
