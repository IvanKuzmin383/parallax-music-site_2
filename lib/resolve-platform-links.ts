import type { PlatformLinks } from "@/lib/smartlink-platforms"
import { resolvePlatformLinksViaBandlink } from "@/lib/bandlink-resolve"

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
    bandlink?: boolean
    itunes?: boolean
    deezer?: boolean
    odesli?: boolean
    yandexSearch?: boolean
    spotify?: boolean
    youtubeMusic?: boolean
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

type SpotifyTokenResponse = {
  access_token?: string
  expires_in?: number
  error?: string
}

type SpotifyAlbumItem = {
  id?: string
  name?: string
  external_urls?: { spotify?: string }
  artists?: Array<{ name?: string }>
}

type SpotifySearchResponse = {
  albums?: { items?: SpotifyAlbumItem[] }
  error?: { message?: string; status?: number }
}

let spotifyTokenCache: { token: string; expiresAt: number } | null = null

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

async function fetchJson<T>(
  url: string,
  init?: RequestInit & { timeoutMs?: number }
): Promise<T> {
  const controller = new AbortController()
  const timeoutMs = init?.timeoutMs ?? FETCH_TIMEOUT_MS
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const { timeoutMs: _t, ...rest } = init ?? {}
    const res = await fetch(url, {
      ...rest,
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        ...(rest.headers ?? {}),
      },
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
  const query = `${artistName} ${normalizeMatchText(title)}`.trim()
  if (!query) return undefined
  try {
    const data = await fetchJson<YandexSearchResponse>(
      `https://api.music.yandex.net/search?text=${encodeURIComponent(query)}&type=album&page=0`
    )
    const results = data.result?.albums?.results ?? []
    if (!results.length) return undefined

    // Single unambiguous result — take it (same idea as YouTube fallback)
    if (results.length === 1 && results[0]?.id != null) {
      return String(results[0].id)
    }

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

async function getSpotifyAccessToken(): Promise<string | null> {
  const clientId = process.env.SPOTIFY_CLIENT_ID?.trim()
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET?.trim()
  if (!clientId || !clientSecret) return null

  if (spotifyTokenCache && Date.now() < spotifyTokenCache.expiresAt - 60_000) {
    return spotifyTokenCache.token
  }

  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64")
  try {
    const data = await fetchJson<SpotifyTokenResponse>("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        Authorization: `Basic ${basic}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials",
    })
    if (!data.access_token) return null
    spotifyTokenCache = {
      token: data.access_token,
      expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000,
    }
    return data.access_token
  } catch {
    return null
  }
}

function pickSpotifyAlbum(
  items: SpotifyAlbumItem[],
  title?: string,
  artistName?: string
): SpotifyAlbumItem | undefined {
  if (!items.length) return undefined
  if (!title) return items[0]

  const wantTitle = normalizeMatchText(title)
  const wantArtist = artistName ? normalizeMatchText(artistName) : ""

  const exact = items.find((album) => {
    const albumTitle = normalizeMatchText(album.name ?? "")
    const albumArtist = normalizeMatchText(album.artists?.[0]?.name ?? "")
    return albumTitle === wantTitle && (!wantArtist || albumArtist === wantArtist)
  })
  if (exact) return exact

  return items.find((album) => normalizeMatchText(album.name ?? "") === wantTitle) ?? items[0]
}

async function searchSpotifyAlbum(
  upc: string,
  title?: string,
  artistName?: string
): Promise<
  | { url: string }
  | { missingCreds: true }
  | { premiumRequired: true }
  | null
> {
  const token = await getSpotifyAccessToken()
  if (!token) return { missingCreds: true }

  const queries: string[] = [`upc:${upc}`]
  if (title && artistName) {
    queries.push(`album:${normalizeMatchText(title)} artist:${artistName}`)
    queries.push(`${title} ${artistName}`)
  }

  let sawPremiumBlock = false

  for (const market of ["RU", "US", "GB"]) {
    for (const q of queries) {
      try {
        const qs = new URLSearchParams({
          q,
          type: "album",
          limit: "5",
          market,
        })
        const res = await fetch(`https://api.spotify.com/v1/search?${qs}`, {
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
          cache: "no-store",
        })
        if (!res.ok) {
          const body = await res.text()
          if (
            res.status === 403 &&
            /premium subscription required/i.test(body)
          ) {
            sawPremiumBlock = true
            break
          }
          continue
        }
        const data = (await res.json()) as SpotifySearchResponse
        const hit = pickSpotifyAlbum(data.albums?.items ?? [], title, artistName)
        const url = hit?.external_urls?.spotify
        if (url) return { url: url.split("?")[0] ?? url }
      } catch {
        // try next query/market
      }
    }
    if (sawPremiumBlock) break
  }

  if (sawPremiumBlock) return { premiumRequired: true }
  return null
}

/**
 * YouTube Music / YouTube Data API search.
 * Prefer album browse URL when possible; else watch URL.
 */
async function searchYoutubeMusic(
  title: string,
  artistName: string,
  upc?: string
): Promise<string | undefined> {
  const apiKey = process.env.YOUTUBE_API_KEY?.trim()
  const query = `${artistName} ${normalizeMatchText(title)}`.trim()

  if (apiKey) {
    try {
      const qs = new URLSearchParams({
        part: "snippet",
        type: "video",
        maxResults: "5",
        q: query,
        key: apiKey,
      })
      const data = await fetchJson<{
        items?: Array<{ id?: { videoId?: string }; snippet?: { title?: string; channelTitle?: string } }>
      }>(`https://www.googleapis.com/youtube/v3/search?${qs}`)

      const wantTitle = normalizeMatchText(title)
      const wantArtist = normalizeMatchText(artistName)
      const items = data.items ?? []
      const best =
        items.find((item) => {
          const t = normalizeMatchText(item.snippet?.title ?? "")
          const ch = normalizeMatchText(item.snippet?.channelTitle ?? "")
          return t.includes(wantTitle) && (ch.includes(wantArtist) || t.includes(wantArtist))
        }) ?? items[0]
      const videoId = best?.id?.videoId
      if (videoId) return `https://music.youtube.com/watch?v=${videoId}`
    } catch {
      // fall through to innertube
    }
  }

  // Unofficial YouTube Music search (WEB_REMIX). May fail if Google is blocked.
  try {
    const body = {
      context: {
        client: {
          clientName: "WEB_REMIX",
          clientVersion: "1.20250317.01.00",
          hl: "ru",
          gl: "RU",
        },
      },
      query: upc ? `${upc} ${query}` : query,
    }
    const data = await fetchJson<Record<string, unknown>>(
      "https://music.youtube.com/youtubei/v1/search?prettyPrint=false",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        },
        body: JSON.stringify(body),
        timeoutMs: 12_000,
      }
    )
    const raw = JSON.stringify(data)
    const browseIds = [...raw.matchAll(/"browseId":"(MPREb_[^"]+)"/g)].map((m) => m[1])
    if (browseIds[0]) return `https://music.youtube.com/browse/${browseIds[0]}`

    const videoIds = [...raw.matchAll(/"videoId":"([a-zA-Z0-9_-]{11})"/g)].map((m) => m[1])
    if (videoIds[0]) return `https://music.youtube.com/watch?v=${videoIds[0]}`
  } catch {
    return undefined
  }

  return undefined
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

  if (by.spotify?.url && !links.spotify) links.spotify = by.spotify.url
  if (by.deezer?.url && !links.deezer) {
    links.deezer = by.deezer.url.split("?")[0] ?? by.deezer.url
  }
  if (by.appleMusic?.url && !links.appleMusic) {
    links.appleMusic = cleanAppleMusicUrl(by.appleMusic.url)
  }
  if (by.yandex?.url && !links.yandex) {
    const albumId = yandexAlbumIdFromUrl(by.yandex.url)
    if (albumId) applyYandexAlbumId(links, albumId)
    else links.yandex = by.yandex.url.split("?")[0] ?? by.yandex.url
  }
  const yt = by.youtubeMusic?.url || by.youtube?.url
  if (yt && !links.youtubeMusic) {
    const cleaned = yt.split("?")[0] ?? yt
    links.youtubeMusic = cleaned.includes("youtube.com")
      ? cleaned.replace("www.youtube.com", "music.youtube.com").replace("youtube.com/watch", "music.youtube.com/watch")
      : cleaned
  }
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

  let meta: ResolvePlatformLinksResult["meta"]

  const bandlinkResult = await resolvePlatformLinksViaBandlink(upc)
  if (bandlinkResult) {
    if (bandlinkResult.ok) {
      sources.bandlink = true
      for (const [key, value] of Object.entries(bandlinkResult.links) as [
        keyof PlatformLinks,
        string | undefined,
      ][]) {
        if (typeof value === "string" && value.trim()) {
          links[key] = value.trim()
        }
      }
      if (bandlinkResult.meta) {
        meta = {
          title: bandlinkResult.meta.title ?? meta?.title,
          artistName: bandlinkResult.meta.artistName ?? meta?.artistName,
          artworkUrl: bandlinkResult.meta.artworkUrl ?? meta?.artworkUrl,
        }
      }
    } else if (bandlinkResult.error) {
      errors.push(`Bandlink: ${bandlinkResult.error}`)
    }
  }

  const [itunesRu, itunesUs, deezer] = await Promise.all([
    lookupItunes(upc, "ru"),
    lookupItunes(upc, "us"),
    lookupDeezer(upc),
  ])

  const itunesHit = pickItunesCollection(itunesRu) ?? pickItunesCollection(itunesUs)
  let appleSeedUrl: string | undefined

  if (itunesHit && !links.appleMusic) {
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
  } else if (!itunesHit && !links.appleMusic) {
    errors.push("iTunes: релиз не найден")
  } else if (itunesHit && links.appleMusic) {
    sources.itunes = true
    if (!meta) {
      meta = {
        title: itunesHit.collectionName || itunesHit.trackName,
        artistName: itunesHit.artistName,
        artworkUrl: itunesHit.artworkUrl100,
      }
    }
    const collectionId = itunesHit.collectionId
    if (collectionId) {
      appleSeedUrl = appleMusicAlbumUrl(collectionId, itunesRu?.resultCount ? "ru" : "us")
    } else {
      appleSeedUrl = cleanAppleMusicUrl(itunesHit.collectionViewUrl || itunesHit.trackViewUrl || "")
    }
  }

  let deezerUrl: string | undefined
  if (deezer && !deezer.error && deezer.link) {
    sources.deezer = true
    deezerUrl = deezer.link
    if (!links.deezer) {
      links.deezer = deezer.link.split("?")[0] ?? deezer.link
    }
    if (!meta) {
      meta = {
        title: deezer.title,
        artistName: deezer.artist?.name,
        artworkUrl: deezer.cover_medium,
      }
    }
  } else if (!sources.bandlink) {
    errors.push("Deezer: релиз не найден")
  }

  const seedCandidates = [appleSeedUrl, deezerUrl, links.appleMusic].filter(
    (u): u is string => typeof u === "string" && u.length > 0
  )

  if (seedCandidates.length === 0) {
    const foundEarly = Object.values(links).some(
      (v) => typeof v === "string" && v.trim().length > 0
    )
    if (!foundEarly) {
      return {
        links,
        found: false,
        meta,
        sources,
        errors: [...errors, "Нет seed-ссылки для Odesli (релиз ещё не в каталоге?)"],
      }
    }
  } else {
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

      if (links.yandex && links.spotify && links.youtubeMusic) break
    }

    if (!odesliOk) {
      errors.push("Odesli: не удалось получить ссылки")
    }
  }

  if (!links.yandex && meta?.title && meta?.artistName) {
    const albumId = await searchYandexAlbum(meta.title, meta.artistName)
    if (albumId) {
      sources.yandexSearch = true
      applyYandexAlbumId(links, albumId)
    } else if (!sources.bandlink) {
      errors.push("Яндекс: релиз не найден поиском")
    }
  }

  // Spotify: Odesli often skips it — use Web API (Client Credentials)
  if (!links.spotify) {
    const spotify = await searchSpotifyAlbum(upc, meta?.title, meta?.artistName)
    if (spotify && "missingCreds" in spotify) {
      errors.push(
        "Spotify: задайте SPOTIFY_CLIENT_ID и SPOTIFY_CLIENT_SECRET в .env (developer.spotify.com)"
      )
    } else if (spotify && "premiumRequired" in spotify) {
      errors.push(
        "Spotify: у владельца приложения в developer.spotify.com нужна активная подписка Spotify Premium (с февраля 2026 это обязательно для Search API)"
      )
    } else if (spotify && "url" in spotify) {
      sources.spotify = true
      links.spotify = spotify.url
      // Second Odesli pass with Spotify seed sometimes unlocks YouTube
      if (!links.youtubeMusic) {
        const odesliFromSpotify = await lookupOdesli(spotify.url)
        if (odesliFromSpotify?.linksByPlatform) {
          applyOdesliLinks(links, odesliFromSpotify)
        }
      }
    } else {
      errors.push("Spotify: релиз не найден (ещё нет в каталоге?)")
    }
  }

  if (!links.youtubeMusic && meta?.title && meta?.artistName) {
    const yt = await searchYoutubeMusic(meta.title, meta.artistName, upc)
    if (yt) {
      sources.youtubeMusic = true
      links.youtubeMusic = yt
    } else {
      errors.push(
        process.env.YOUTUBE_API_KEY?.trim()
          ? "YouTube Music: релиз не найден"
          : "YouTube Music: не найден (опционально задайте YOUTUBE_API_KEY)"
      )
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
