import { createHash, randomUUID } from "node:crypto"
import { getDb } from "./db"
import {
  ADMIN_TOP_TRACKS_MAX_PAGE,
  ADMIN_TOP_TRACKS_PAGE_SIZE,
  MUSIC_PLATFORM_LABELS,
  type MusicPlatformKey,
  type MusicStatsFile,
  type MusicStatsResponse,
  computeStatsFromMusicData,
  parseRuOrIsoDateToIso,
  type TopTrack,
} from "./music-stats-shared"

function getLatestMusicImportMeta(platformKey: MusicPlatformKey): {
  source: string | null
  exportedAt: string | null
  totalRows: number
  totalTracksInFile: number
} | null {
  const db = getDb()
  const row = db
    .prepare(
      `
        SELECT
          source,
          exported_at,
          total_rows,
          total_tracks_in_file
        FROM music_stat_imports
        WHERE platform_key = ?
        ORDER BY created_at DESC
        LIMIT 1
      `,
    )
    .get(platformKey) as {
    source: string | null
    exported_at: string | null
    total_rows: number
    total_tracks_in_file: number
  } | undefined

  if (!row) return null

  return {
    source: row.source ?? null,
    exportedAt: row.exported_at ?? null,
    totalRows: row.total_rows ?? 0,
    totalTracksInFile: row.total_tracks_in_file ?? 0,
  }
}

/** unicode_lower - UDF из lib/db.ts (SQLite LOWER() не трогает кириллицу). */
const TITLE_NORM_SQL =
  "REPLACE(REPLACE(REPLACE(REPLACE(unicode_lower(t.title), ' ', ''), '-', ''), '–', ''), '-', '')"

/** Нормализация названия для сравнения (пробелы и дефисы убраны). */
function titleNormSql(columnRef: string): string {
  return `REPLACE(REPLACE(REPLACE(REPLACE(unicode_lower(${columnRef}), ' ', ''), '-', ''), '–', ''), '-', '')`
}

function normalizeTrackTitleForMatch(title: string): string {
  return title
    .toLowerCase()
    .replace(/[\s\-–-]+/g, "")
    .trim()
}

/**
 * Пагинация рейтинга треков для админки: из `music_platform_track_daily_plays`, а не из урезанной `music_platform_top_tracks`.
 */
export function getAdminMusicStatsTopTracksPage(args: {
  platformKeys: MusicPlatformKey[]
  artist?: string
  filters?: { albumId?: string | null; trackId?: string | null; trackTitle?: string | null }
  offset: number
  limit: number
}): { tracks: TopTrack[]; hasMore: boolean } {
  const db = getDb()
  const rawKeys = [...new Set(args.platformKeys)].filter((k) => k in MUSIC_PLATFORM_LABELS)
  if (rawKeys.length === 0) return { tracks: [], hasMore: false }

  const limit = Math.min(Math.max(1, Math.floor(args.limit)), ADMIN_TOP_TRACKS_MAX_PAGE)
  const offset = Math.max(0, Math.floor(args.offset))
  const fetchLimit = limit + 1

  const artistTerm = args.artist?.trim()
  const hasArtistFilter = !!artistTerm
  const albumId = args.filters?.albumId?.trim() ? args.filters!.albumId!.trim() : null
  const trackId = args.filters?.trackId?.trim() ? args.filters!.trackId!.trim() : null
  const directTrackTitle = args.filters?.trackTitle?.trim() ? args.filters!.trackTitle!.trim() : null

  const trackTitleFromTrackId =
    !directTrackTitle && trackId
      ? (
          db.prepare(
            `
              SELECT track_name
              FROM tracks
              WHERE id = ?
              LIMIT 1
            `,
          ).get(trackId) as { track_name: string } | undefined
        )?.track_name?.trim() || null
      : null

  const trackTitle = directTrackTitle ?? trackTitleFromTrackId
  const hasReleaseFilter = !!albumId || !!trackId || !!trackTitle

  const joinTracks = albumId || (trackId && !trackTitle) ? "JOIN tracks c ON c.id = d.track_key" : ""

  const whereParts: string[] = []
  const params: Array<string | number> = []

  if (rawKeys.length === 1) {
    whereParts.push("d.platform_key = ?")
    params.push(rawKeys[0]!)
  } else {
    whereParts.push(`d.platform_key IN (${rawKeys.map(() => "?").join(",")})`)
    params.push(...rawKeys)
  }

  if (hasArtistFilter) {
    const likeTerm = `${artistTerm!.toLowerCase()}%`
    whereParts.push("unicode_lower(t.author) LIKE ?")
    params.push(likeTerm)
  }
  if (trackTitle) {
    const normalizedTrackTitle = normalizeTrackTitleForMatch(trackTitle)
    whereParts.push(`${TITLE_NORM_SQL} LIKE ?`)
    params.push(`%${normalizedTrackTitle}%`)
  } else if (trackId) {
    whereParts.push("c.id = ?")
    params.push(trackId)
  }
  if (albumId) {
    whereParts.push("c.album_id = ?")
    params.push(albumId)
  }

  const whereSql = whereParts.join(" AND ")
  const useMergedRanking = rawKeys.length > 1

  const rows = (
    useMergedRanking
      ? db
          .prepare(
            `
              SELECT
                MAX(t.author) AS author,
                MAX(t.title) AS title,
                SUM(d.plays) AS plays
              FROM music_platform_track_daily_plays d
              JOIN music_platform_tracks t
                ON t.platform_key = d.platform_key AND t.track_key = d.track_key
              ${joinTracks}
              WHERE ${whereSql}
              GROUP BY unicode_lower(t.author) || '__' || unicode_lower(t.title)
              ORDER BY plays DESC
              LIMIT ? OFFSET ?
            `,
          )
          .all(...params, fetchLimit, offset)
      : db
          .prepare(
            `
              SELECT
                t.title AS title,
                t.author AS author,
                SUM(d.plays) AS plays
              FROM music_platform_track_daily_plays d
              JOIN music_platform_tracks t
                ON t.platform_key = d.platform_key AND t.track_key = d.track_key
              ${joinTracks}
              WHERE ${whereSql}
              GROUP BY d.track_key
              ORDER BY plays DESC
              LIMIT ? OFFSET ?
            `,
          )
          .all(...params, fetchLimit, offset)
  ) as Array<{ title: string; author: string; plays: number }>

  const hasMore = rows.length > limit
  const slice = rows.slice(0, limit)
  return {
    tracks: slice.map((r) => ({ title: r.title, author: r.author, plays: Number(r.plays) || 0 })),
    hasMore,
  }
}

export function getMusicStatsByPlatformKey(platformKey: MusicPlatformKey): MusicStatsResponse {
  const db = getDb()

  const importMeta = getLatestMusicImportMeta(platformKey)

  // Backward-compatible: previous callers passed only `platformKey`.
  // New behavior: when `artist` is passed via a second argument, we compute stats dynamically.
  return getMusicStatsByPlatformKeyWithArtist(platformKey)
}

export function getMusicStatsByPlatformKeyWithArtist(
  platformKey: MusicPlatformKey,
  artist?: string,
  filters?: { albumId?: string | null; trackId?: string | null; trackTitle?: string | null },
): MusicStatsResponse {
  const db = getDb()

  const importMeta = getLatestMusicImportMeta(platformKey)

  const artistTerm = artist?.trim()
  const hasArtistFilter = !!artistTerm
  const albumId = filters?.albumId?.trim() ? filters?.albumId?.trim() : null
  const trackId = filters?.trackId?.trim() ? filters?.trackId?.trim() : null
  const directTrackTitle = filters?.trackTitle?.trim() ? filters?.trackTitle?.trim() : null

  // For legacy callers that send `trackId`, resolve cabinet track name and search by platform title.
  // This avoids strict dependence on `track_key === tracks.id`.
  const trackTitleFromTrackId =
    !directTrackTitle && trackId
      ? (
          db.prepare(
            `
              SELECT track_name
              FROM tracks
              WHERE id = ?
              LIMIT 1
            `,
          ).get(trackId) as { track_name: string } | undefined
        )?.track_name?.trim() || null
      : null

  const trackTitle = directTrackTitle ?? trackTitleFromTrackId
  const hasReleaseFilter = !!albumId || !!trackId || !!trackTitle

  // Fast path: no filters that require joining with `music_platform_track_daily_plays`.
  if (!hasArtistFilter && !hasReleaseFilter) {
    const dailyRows = db
      .prepare(
        `
          SELECT stat_date, total_plays, tracks_with_plays
          FROM music_platform_daily_stats
          WHERE platform_key = ?
          ORDER BY stat_date ASC
        `,
      )
      .all(platformKey) as Array<{ stat_date: string; total_plays: number; tracks_with_plays: number }>

    const topSlice = getAdminMusicStatsTopTracksPage({
      platformKeys: [platformKey],
      filters: {},
      offset: 0,
      limit: ADMIN_TOP_TRACKS_PAGE_SIZE,
    })

    const totalsRow = db
      .prepare(
        `
          SELECT
            COALESCE(SUM(total_plays), 0) AS total_plays,
            COUNT(*) AS days_count,
            COALESCE((SELECT COUNT(DISTINCT track_key) FROM music_platform_track_daily_plays WHERE platform_key = ?), 0) AS tracks_in_db
          FROM music_platform_daily_stats
          WHERE platform_key = ?
        `,
      )
      .get(platformKey, platformKey) as { total_plays: number; days_count: number; tracks_in_db: number }

    const countryRows = db
      .prepare(
        `
          SELECT stat_date AS date, country, SUM(plays) AS plays
          FROM music_platform_track_daily_plays_by_country
          WHERE platform_key = ?
          GROUP BY stat_date, country
          ORDER BY stat_date ASC, country ASC
        `,
      )
      .all(platformKey) as Array<{ date: string; country: string; plays: number }>

    return {
      source: importMeta?.source ?? null,
      platformKey,
      platformLabel: MUSIC_PLATFORM_LABELS[platformKey],
      exportedAt: importMeta?.exportedAt ?? null,
      totalRows: importMeta?.totalRows ?? 0,
      totalTracksInFile: totalsRow?.tracks_in_db ?? 0,
      totalPlays: totalsRow?.total_plays ?? 0,
      daysCount: totalsRow?.days_count ?? 0,
      dailyStats: dailyRows.map((r) => ({
        date: r.stat_date,
        totalPlays: r.total_plays,
        tracksWithPlays: r.tracks_with_plays,
      })),
      topTracks: topSlice.tracks,
      countryStatsByDate: countryRows,
    }
  }

  // Dynamic query: we need track-level joins to support filtering by:
  // - author prefix (music_platform_tracks.author)
  // - album/track (cabinet `tracks` table joined by `track_key`)
  const whereParts: string[] = ["d.platform_key = ?"]
  const params: Array<string> = [platformKey]

  const joinTracks = albumId || (trackId && !trackTitle) ? "JOIN tracks c ON c.id = d.track_key" : ""
  if (hasArtistFilter) {
    const likeTerm = `${artistTerm!.toLowerCase()}%`
    whereParts.push("unicode_lower(t.author) LIKE ?")
    params.push(likeTerm)
  }
  if (trackTitle) {
    const normalizedTrackTitle = normalizeTrackTitleForMatch(trackTitle)

    // Normalize both DB value and filter value so variants like
    // "Любовь-боль", "Любовь - боль", "Любовь-боль" match each other.
    whereParts.push(`${TITLE_NORM_SQL} LIKE ?`)
    params.push(`%${normalizedTrackTitle}%`)
  } else if (trackId) {
    whereParts.push("c.id = ?")
    params.push(trackId)
  }
  if (albumId) {
    whereParts.push("c.album_id = ?")
    params.push(albumId)
  }

  const whereSql = whereParts.join(" AND ")

  const dailyRows = db
    .prepare(
      `
        SELECT
          d.stat_date,
          COALESCE(SUM(d.plays), 0) AS total_plays,
          COUNT(DISTINCT d.track_key) AS tracks_with_plays
        FROM music_platform_track_daily_plays d
        JOIN music_platform_tracks t
          ON t.platform_key = d.platform_key AND t.track_key = d.track_key
        ${joinTracks}
        WHERE ${whereSql}
        GROUP BY d.stat_date
        ORDER BY d.stat_date ASC
      `,
    )
    .all(...params) as Array<{ stat_date: string; total_plays: number; tracks_with_plays: number }>

  const topSlice = getAdminMusicStatsTopTracksPage({
    platformKeys: [platformKey],
    artist: artistTerm,
    filters: { albumId, trackId, trackTitle: directTrackTitle },
    offset: 0,
    limit: ADMIN_TOP_TRACKS_PAGE_SIZE,
  })

  const totalsRow = db
    .prepare(
      `
        SELECT
          COALESCE(SUM(d.plays), 0) AS total_plays,
          COUNT(DISTINCT d.stat_date) AS days_count,
          COALESCE(COUNT(DISTINCT d.track_key), 0) AS tracks_in_db
        FROM music_platform_track_daily_plays d
        JOIN music_platform_tracks t
          ON t.platform_key = d.platform_key AND t.track_key = d.track_key
        ${joinTracks}
        WHERE ${whereSql}
      `,
    )
    .get(...params) as { total_plays: number; days_count: number; tracks_in_db: number }

  const countryRows = db
    .prepare(
      `
        SELECT
          d.stat_date AS date,
          d.country,
          COALESCE(SUM(d.plays), 0) AS plays
        FROM music_platform_track_daily_plays_by_country d
        JOIN music_platform_tracks t
          ON t.platform_key = d.platform_key AND t.track_key = d.track_key
        ${joinTracks}
        WHERE ${whereSql}
        GROUP BY d.stat_date, d.country
        ORDER BY d.stat_date ASC, d.country ASC
      `,
    )
    .all(...params) as Array<{ date: string; country: string; plays: number }>

  return {
    source: importMeta?.source ?? null,
    platformKey,
    platformLabel: `${MUSIC_PLATFORM_LABELS[platformKey]}${
      hasArtistFilter ? ` • ${artistTerm}` : ""
    }${hasReleaseFilter ? ` • filtered` : ""}`,
    exportedAt: importMeta?.exportedAt ?? null,
    totalRows: importMeta?.totalRows ?? 0,
    totalTracksInFile: totalsRow?.tracks_in_db ?? 0,
    totalPlays: totalsRow?.total_plays ?? 0,
    daysCount: totalsRow?.days_count ?? 0,
    dailyStats: dailyRows.map((r) => ({
      date: r.stat_date,
      totalPlays: r.total_plays,
      tracksWithPlays: r.tracks_with_plays,
    })),
    topTracks: topSlice.tracks,
    countryStatsByDate: countryRows,
  }
}

/**
 * Статистика только по трекам кабинета. Строка импорта (`music_platform_tracks`) сопоставляется
 * с `tracks` того же пользователя по паре: author из импорта ≈ `tracks.artist_name`, нормализованное
 * title из импорта ≈ нормализованному `tracks.track_name`. Ключ `track_key` в БД статистики не связываем с UUID трека.
 */
export function getMusicStatsForCabinetUser(
  platformKey: MusicPlatformKey,
  cabinetUserEmail: string,
  filters?: { albumId?: string | null; trackIds?: string[] | null },
): MusicStatsResponse {
  const db = getDb()
  const importMeta = getLatestMusicImportMeta(platformKey)
  const email = cabinetUserEmail.trim()
  if (!email) {
    return {
      source: importMeta?.source ?? null,
      platformKey,
      platformLabel: MUSIC_PLATFORM_LABELS[platformKey],
      exportedAt: importMeta?.exportedAt ?? null,
      totalRows: importMeta?.totalRows ?? 0,
      totalTracksInFile: 0,
      totalPlays: 0,
      daysCount: 0,
      dailyStats: [],
      topTracks: [],
      countryStatsByDate: [],
    }
  }

  const albumId = filters?.albumId?.trim() ? filters.albumId.trim() : null
  const trackIds = (filters?.trackIds ?? []).map((id) => id.trim()).filter((id) => id.length > 0)

  const tn = titleNormSql
  const cabinetTrackJoin = `
    JOIN tracks c ON c.id = (
      SELECT c2.id FROM tracks c2
      WHERE LOWER(c2.user_id) = LOWER(?)
        AND unicode_lower(c2.artist_name) = unicode_lower(t.author)
        AND ${tn("c2.track_name")} = ${tn("t.title")}
      ORDER BY c2.id
      LIMIT 1
    )
  `

  const whereParts: string[] = ["d.platform_key = ?"]
  const params: string[] = [email, platformKey]

  if (trackIds.length > 0) {
    whereParts.push(`c.id IN (${trackIds.map(() => "?").join(",")})`)
    params.push(...trackIds)
  } else if (albumId) {
    whereParts.push("c.album_id = ?")
    params.push(albumId)
  }

  const whereSql = whereParts.join(" AND ")
  const hasReleaseFilter = !!(albumId || trackIds.length > 0)

  const dailyRows = db
    .prepare(
      `
        SELECT
          d.stat_date,
          COALESCE(SUM(d.plays), 0) AS total_plays,
          COUNT(DISTINCT d.track_key) AS tracks_with_plays
        FROM music_platform_track_daily_plays d
        JOIN music_platform_tracks t
          ON t.platform_key = d.platform_key AND t.track_key = d.track_key
        ${cabinetTrackJoin}
        WHERE ${whereSql}
        GROUP BY d.stat_date
        ORDER BY d.stat_date ASC
      `,
    )
    .all(...params) as Array<{ stat_date: string; total_plays: number; tracks_with_plays: number }>

  const topRows = db
    .prepare(
      `
        SELECT
          t.title AS title,
          t.author AS author,
          SUM(d.plays) AS plays
        FROM music_platform_track_daily_plays d
        JOIN music_platform_tracks t
          ON t.platform_key = d.platform_key AND t.track_key = d.track_key
        ${cabinetTrackJoin}
        WHERE ${whereSql}
        GROUP BY d.track_key
        ORDER BY SUM(d.plays) DESC
        LIMIT 10
      `,
    )
    .all(...params) as Array<{ title: string; author: string; plays: number }>

  const totalsRow = db
    .prepare(
      `
        SELECT
          COALESCE(SUM(d.plays), 0) AS total_plays,
          COUNT(DISTINCT d.stat_date) AS days_count,
          COALESCE(COUNT(DISTINCT d.track_key), 0) AS tracks_in_db
        FROM music_platform_track_daily_plays d
        JOIN music_platform_tracks t
          ON t.platform_key = d.platform_key AND t.track_key = d.track_key
        ${cabinetTrackJoin}
        WHERE ${whereSql}
      `,
    )
    .get(...params) as { total_plays: number; days_count: number; tracks_in_db: number }

  const countryRows = db
    .prepare(
      `
        SELECT
          d.stat_date AS date,
          d.country,
          COALESCE(SUM(d.plays), 0) AS plays
        FROM music_platform_track_daily_plays_by_country d
        JOIN music_platform_tracks t
          ON t.platform_key = d.platform_key AND t.track_key = d.track_key
        ${cabinetTrackJoin}
        WHERE ${whereSql}
        GROUP BY d.stat_date, d.country
        ORDER BY d.stat_date ASC, d.country ASC
      `,
    )
    .all(...params) as Array<{ date: string; country: string; plays: number }>

  return {
    source: importMeta?.source ?? null,
    platformKey,
    platformLabel: `${MUSIC_PLATFORM_LABELS[platformKey]}${
      hasReleaseFilter ? " • мои релизы (фильтр)" : " • мои релизы"
    }`,
    exportedAt: importMeta?.exportedAt ?? null,
    totalRows: importMeta?.totalRows ?? 0,
    totalTracksInFile: totalsRow?.tracks_in_db ?? 0,
    totalPlays: totalsRow?.total_plays ?? 0,
    daysCount: totalsRow?.days_count ?? 0,
    dailyStats: dailyRows.map((r) => ({
      date: r.stat_date,
      totalPlays: r.total_plays,
      tracksWithPlays: r.tracks_with_plays,
    })),
    topTracks: topRows.map((r) => ({ title: r.title, author: r.author, plays: r.plays })),
    countryStatsByDate: countryRows,
  }
}

export async function importMusicStatsFileToDb(args: {
  fileBuffer: Buffer
  fileName: string
  platformKey: MusicPlatformKey
}) {
  const rawText = args.fileBuffer.toString("utf8")
  const parsed = JSON.parse(rawText) as MusicStatsFile
  const fileHash = createHash("sha256").update(rawText, "utf8").digest("hex")
  return importMusicStatsParsedToDb({
    fileName: args.fileName,
    platformKey: args.platformKey,
    parsed,
    fileHash,
  })
}

export async function importMusicStatsRawTextToDb(args: {
  rawText: string
  fileName: string
  platformKey: MusicPlatformKey
}) {
  const parsed = JSON.parse(args.rawText) as MusicStatsFile
  const fileHash = createHash("sha256").update(args.rawText, "utf8").digest("hex")
  return importMusicStatsParsedToDb({
    fileName: args.fileName,
    platformKey: args.platformKey,
    parsed,
    fileHash,
  })
}

export async function importMusicStatsParsedToDb(args: {
  fileName: string
  platformKey: MusicPlatformKey
  parsed: MusicStatsFile
  fileHash?: string
}) {
  const db = getDb()
  const fileHash =
    args.fileHash ?? createHash("sha256").update(JSON.stringify(args.parsed), "utf8").digest("hex")

  const computed = computeStatsFromMusicData(args.parsed)
  const nowIso = new Date().toISOString()

  const platformLabel = args.parsed.platform ?? MUSIC_PLATFORM_LABELS[args.platformKey]

  const ensureMetaInserted = () => {
    const existing = db
      .prepare("SELECT id FROM music_stat_imports WHERE platform_key = ? AND file_hash = ?")
      .get(args.platformKey, fileHash) as { id: string } | undefined

    if (existing?.id) return

    const importId = randomUUID()
    db.prepare(
      `
        INSERT INTO music_stat_imports (
          id,
          platform_key,
          platform_label,
          file_name,
          file_hash,
          source,
          exported_at,
          total_rows,
          total_tracks_in_file,
          total_plays,
          days_count,
          created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
    ).run(
      importId,
        args.platformKey,
      platformLabel,
        args.fileName,
      fileHash,
        args.parsed.source ?? null,
        args.parsed.exportedAt ?? null,
      computed.totalRows,
      computed.totalTracksInFile,
      computed.totalPlays,
      computed.daysCount,
      nowIso,
    )
  }

  const COUNTRY_KEY_SEP = "\x1f"

  // Parse into per-track per-date plays so we can replace only affected dates.
  const trackMeta = new Map<string, { title: string; author: string }>()
  const trackDatePlays = new Map<string, number>() // `${trackKey}::${dateIso}` => plays
  const trackDateCountryPlays = new Map<string, number>() // trackKey+date+country => plays
  const statDates = new Set<string>()

  for (const track of args.parsed.tracks ?? []) {
    const title = track.title?.trim() || "Без названия"
    const author = track.author?.trim() || "Неизвестный исполнитель"
    const trackKey = (track.trackId?.trim() || "").length > 0 ? track.trackId!.trim() : `${author}__${title}`

    trackMeta.set(trackKey, { title, author })

    for (const point of track.points ?? []) {
      if (!point?.date) continue

      const dateIso = parseRuOrIsoDateToIso(String(point.date))
      if (!dateIso) continue

      const countNum = typeof point.count === "number" ? point.count : Number(point.count)
      if (!Number.isFinite(countNum) || countNum <= 0) continue

      statDates.add(dateIso)
      const key = `${trackKey}::${dateIso}`
      trackDatePlays.set(key, (trackDatePlays.get(key) ?? 0) + countNum)

      const rawCountry = typeof point.country === "string" ? point.country.trim() : ""
      const country = rawCountry.length > 0 ? rawCountry : "Unknown"
      const ckey = `${trackKey}${COUNTRY_KEY_SEP}${dateIso}${COUNTRY_KEY_SEP}${country}`
      trackDateCountryPlays.set(ckey, (trackDateCountryPlays.get(ckey) ?? 0) + countNum)
    }
  }

  const dates = [...statDates.values()].sort()
  if (dates.length === 0) {
    // File is empty of valid points; still store import meta if needed.
    ensureMetaInserted()
    return getMusicStatsByPlatformKey(args.platformKey)
  }

  const placeholders = dates.map(() => "?").join(",")

  const importTx = db.transaction(() => {
    ensureMetaInserted()

    // Upsert tracks metadata for trackKey => (title, author)
    const upsertTrack = db.prepare(
      `
        INSERT INTO music_platform_tracks (platform_key, track_key, title, author)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(platform_key, track_key) DO UPDATE SET
          title = excluded.title,
          author = excluded.author
      `,
    )
    for (const [trackKey, meta] of trackMeta.entries()) {
      upsertTrack.run(args.platformKey, trackKey, meta.title, meta.author)
    }

    // Replace affected dates only
    db.prepare(
      `
        DELETE FROM music_platform_track_daily_plays
        WHERE platform_key = ?
          AND stat_date IN (${placeholders})
      `,
    ).run(args.platformKey, ...dates)

    db.prepare(
      `
        DELETE FROM music_platform_track_daily_plays_by_country
        WHERE platform_key = ?
          AND stat_date IN (${placeholders})
      `,
    ).run(args.platformKey, ...dates)

    const insertTrackDaily = db.prepare(
      `
        INSERT INTO music_platform_track_daily_plays (platform_key, track_key, stat_date, plays)
        VALUES (?, ?, ?, ?)
      `,
    )

    for (const [key, plays] of trackDatePlays.entries()) {
      const lastIdx = key.lastIndexOf("::")
      const trackKey = lastIdx >= 0 ? key.slice(0, lastIdx) : key
      const statDate = lastIdx >= 0 ? key.slice(lastIdx + 2) : ""
      if (!statDate) continue
      insertTrackDaily.run(args.platformKey, trackKey, statDate, plays)
    }

    const insertTrackCountry = db.prepare(
      `
        INSERT INTO music_platform_track_daily_plays_by_country (platform_key, track_key, stat_date, country, plays)
        VALUES (?, ?, ?, ?, ?)
      `,
    )

    for (const [ckey, plays] of trackDateCountryPlays.entries()) {
      const parts = ckey.split(COUNTRY_KEY_SEP)
      if (parts.length !== 3) continue
      const [tk, statDate, country] = parts as [string, string, string]
      if (!tk || !statDate || !country) continue
      insertTrackCountry.run(args.platformKey, tk, statDate, country, plays)
    }

    db.prepare(
      `
        DELETE FROM music_platform_daily_stats
        WHERE platform_key = ?
          AND stat_date IN (${placeholders})
      `,
    ).run(args.platformKey, ...dates)

    db.prepare(
      `
        INSERT INTO music_platform_daily_stats (platform_key, stat_date, total_plays, tracks_with_plays)
        SELECT
          d.platform_key,
          d.stat_date,
          SUM(d.plays) AS total_plays,
          COUNT(*) AS tracks_with_plays
        FROM music_platform_track_daily_plays d
        WHERE d.platform_key = ?
          AND d.stat_date IN (${placeholders})
        GROUP BY d.stat_date
      `,
    ).run(args.platformKey, ...dates)

    // Recompute top tracks for the whole platform (top-10)
    db.prepare(`DELETE FROM music_platform_top_tracks WHERE platform_key = ?`).run(args.platformKey)

    db.prepare(
      `
        INSERT INTO music_platform_top_tracks (platform_key, track_key, title, author, plays)
        SELECT
          d.platform_key,
          d.track_key,
          t.title,
          t.author,
          SUM(d.plays) AS plays
        FROM music_platform_track_daily_plays d
        JOIN music_platform_tracks t
          ON t.platform_key = d.platform_key AND t.track_key = d.track_key
        WHERE d.platform_key = ?
        GROUP BY d.track_key
        ORDER BY SUM(d.plays) DESC
        LIMIT 10
      `,
    ).run(args.platformKey)
  })

  importTx()

  return getMusicStatsByPlatformKey(args.platformKey)
}

export * from "./music-stats-shared"
