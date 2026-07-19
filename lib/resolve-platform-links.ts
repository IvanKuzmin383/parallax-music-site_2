import type { PlatformLinks } from "@/lib/smartlink-platforms"

const FETCH_TIMEOUT_MS = 15_000

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
    yandexSearch?: boolean
  }
  errors: string[]
}

type ItunesResult = {
  wrapperType?: string
  collectionId?: number
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

type YandexSearchAlbum = {
  id?: number
  title?: string
  artists?: Array<{ name?: string }>
}

type YandexSearchResponse = {
  result?: {
    albums?: {
      results?: YandexSearchAlbum[]
    }
  }
}

function normalizeUpc(raw: string): string {
  return raw.replace(/\D/g, "")
}

function normalizeMatchText(value: string): string {
  return value
    .toLowerCase()
    .replace(/\s*-\s*single\b/gi, "")
    .replace(/[«»"']/g, "")
    .replace(/\s+/g, " ")
    .trim()
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

/** Stable Apple Music album URL by numeric id (no Cyrillic slug — better for Odesli). */
function appleMusicAlbumUrl(collectionId: number | string, country = "ru"): string {
  return `https://music.apple.com/${country}/album/${collectionId}`
}

function cleanAppleMusicUrl(url: string): string {
  try {
    const u = new URL(url)
    u.search = ""
    u.hash = ""
    const idMatch = u.pathname.match(/\/album\/(?:[^/]+\/)?(\d+)/)
    if (idMatch?.[1]) {
      const country = u.pathname.split("/")[1] || "ru"
      return appleMusicAlbumUrl(idMatch[1], country.length === 2 ? country : "ru")
    }
    if (u.hostname.includes("music.apple.com") || u.hostname.includes("geo.music.apple.com")) {
      u.hostname = "music.apple.com"
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

function applyYandexAlbumId(links: PlatformLinks, albumId: string) {
  links.yandex = `https://music.yandex.ru/album/${albumId}`
  // Project convention: kion field stores МТС Music URL
  links.kion = mtsUrlFromYandexAlbumId(albumId)
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
    const qs = new URLSearchParams({
      url: seedUrl,
      userCountry: "RU",
    })
    return await fetchJson<OdesliResponse>(`https://api.song.link/v1-alpha.1/links?${qs}`)
  } catch {
    return null
  }
}

async function searchYandexAlbum(
  title: string,
  artistName: string
): Promise<string | undefined> {
  const query = `${title} ${artistName}`.trim()
  if (!query) return undefined
  try {
    const data = await fetchJson<YandexSearchResponse>(
      `https://api.music.yandex.net/search?text=${encodeURIComponent(query)}&type=album&page=0`
    )
    const results = data.result?.albums?.results ?? []
    if (!results.length) return undefined

    const wantTitle = normalizeMatchText(title)
    const wantArtist = normalizeMatchText(artistName)

    const exact = results.find((album) => {
      const albumTitle = normalizeMatchText(album.title ?? "")
      const albumArtist = normalizeMatchText(album.artists?.[0]?.name ?? "")
      return albumTitle === wantTitle && (!wantArtist || albumArtist === wantArtist)
    })
    if (exact?.id != null) return String(exact.id)

    const titleOnly = results.find(
      (album) => normalizeMatchText(album.title ?? "") === wantTitle
    )
    if (titleOnly?.id != null) return String(titleOnly.id)

    // Artist match + title contained (handles slight naming differences)
    const fuzzy = results.find((album) => {
      const albumTitle = normalizeMatchText(album.title ?? "")
      const albumArtist = normalizeMatchText(album.artists?.[0]?.name ?? "")
      return (
        albumArtist === wantArtist &&
        (albumTitle.includes(wantTitle) || wantTitle.includes(albumTitle))
      )
    })
    if (fuzzy?.id != null) return String(fuzzy.id)

    return undefined
  } catch {
    return undefined
  }
}

function pickItunesCollection(data: ItunesLookupResponse | null): ItunesResult | undefined {
  if (!data?.results?.length) return undefined
  return (
    data.results.find((r) => r.wrapperType === "collection" && (r.collectionId || r.collectionViewUrl)) ??
    data.results.find((r) => r.collectionViewUrl || r.trackViewUrl || r.collectionId)
  )
}

function applyOdesliLinks(links: PlatformLinks, odesli: OdesliResponse) {
  const by = odesli.linksByPlatform
  if (!by) return

  if (by.spotify?.url) links.spotify = by.spotify.url
  if (by.appleMusic?.url && !links.appleMusic) {
    links.appleMusic = cleanAppleMusicUrl(by.appleMusic.url)
  }
  if (by.yandex?.url) {
    const albumId = yandexAlbumIdFromUrl(by.yandex.url)
    if (albumId) applyYandexAlbumId(links, albumId)
    else links.yandex = by.yandex.url.split("?")[0] ?? by.yandex.url
  }
  const yt = by.youtubeMusic?.url || by.youtube?.url
  if (yt) links.youtubeMusic = yt.split("?")[0] ?? yt
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
  let appleSeedUrl: string | undefined
  let meta: ResolvePlatformLinksResult["meta"]

  if (itunesHit) {
    sources.itunes = true
    const collectionId = itunesHit.collectionId
    if (collectionId) {
      appleSeedUrl = appleMusicAlbumUrl(collectionId, itunesRu?.resultCount ? "ru" : "us")
      links.appleMusic = appleSeedUrl
    } else {
      const raw = itunesHit.collectionViewUrl || itunesHit.trackViewUrl
      if (raw) {
        appleSeedUrl = cleanAppleMusicUrl(raw)
        links.appleMusic = appleSeedUrl
      }
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

  const seedCandidates = [appleSeedUrl, deezerUrl].filter(
    (u): u is string => typeof u === "string" && u.length > 0
  )

  if (!seedCandidates.length) {
    return {
      links,
      found: Object.values(links).some((v) => typeof v === "string" && v.trim().length > 0),
      meta,
      sources,
      errors: [...errors, "Нет seed-ссылки для Odesli (релиз ещё не в каталоге?)"],
    }
  }

  let odesliOk = false
  for (const seed of seedCandidates) {
    const odesli = await lookupOdesli(seed)
    if (!odesli?.linksByPlatform) continue
    odesliOk = true
    sources.odesli = true
    applyOdesliLinks(links, odesli)

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

    if (links.yandex) break
  }

  if (!odesliOk) {
    errors.push("Odesli: не удалось получить ссылки")
  }

  // Fallback: Yandex Music search by title + artist (public API, no token)
  if (!links.yandex && meta?.title && meta?.artistName) {
    const albumId = await searchYandexAlbum(meta.title, meta.artistName)
    if (albumId) {
      sources.yandexSearch = true
      applyYandexAlbumId(links, albumId)
    } else {
      errors.push("Яндекс: релиз не найден поиском")
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
