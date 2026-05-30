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

const rebuiltCabinetTrackMapPlatforms = new Set<MusicPlatformKey>()

export const ADMIN_CABINET_MUSIC_TRACK_MAP_PAGE_SIZE = 15
export const ADMIN_CABINET_MUSIC_TRACK_MAP_MAX_LIMIT = 100

export type AdminCabinetMusicTrackMapRow = {
  userId: string
  platformKey: MusicPlatformKey
  trackKey: string
  cabinetTrackId: string
  matchedAt: string
  importTrackTitle: string | null
  importTrackAuthor: string | null
  cabinetTrackName: string | null
  cabinetArtistName: string | null
}

export function listCabinetMusicTrackMapPage(args: {
  platformKey?: MusicPlatformKey | null
  userId?: string | null
  trackKey?: string | null
  cabinetTrackId?: string | null
  limit?: number
  offset?: number
}): { rows: AdminCabinetMusicTrackMapRow[]; total: number; limit: number; offset: number; hasMore: boolean } {
  const db = getDb()
  const limit = Math.min(
    Math.max(1, Math.floor(args.limit ?? ADMIN_CABINET_MUSIC_TRACK_MAP_PAGE_SIZE)),
    ADMIN_CABINET_MUSIC_TRACK_MAP_MAX_LIMIT,
  )
  const offset = Math.max(0, Math.floor(args.offset ?? 0))

  const whereParts: string[] = []
  const params: string[] = []

  const platformKey = args.platformKey?.trim()
  if (platformKey && platformKey in MUSIC_PLATFORM_LABELS) {
    whereParts.push("m.platform_key = ?")
    params.push(platformKey)
  }

  const userIdFilter = args.userId?.trim().toLowerCase()
  if (userIdFilter) {
    whereParts.push("LOWER(m.user_id) LIKE ?")
    params.push(`%${userIdFilter}%`)
  }

  const trackKeyFilter = args.trackKey?.trim()
  if (trackKeyFilter) {
    whereParts.push("m.track_key LIKE ?")
    params.push(`%${trackKeyFilter}%`)
  }

  const cabinetTrackIdFilter = args.cabinetTrackId?.trim()
  if (cabinetTrackIdFilter) {
    whereParts.push("m.cabinet_track_id LIKE ?")
    params.push(`%${cabinetTrackIdFilter}%`)
  }

  const whereSql = whereParts.length > 0 ? `WHERE ${whereParts.join(" AND ")}` : ""

  const totalRow = db
    .prepare(
      `
        SELECT COUNT(*) AS total
        FROM cabinet_music_track_map m
        ${whereSql}
      `,
    )
    .get(...params) as { total?: number } | undefined
  const total = totalRow?.total ?? 0

  const rows = db
    .prepare(
      `
        SELECT
          m.user_id AS userId,
          m.platform_key AS platformKey,
          m.track_key AS trackKey,
          m.cabinet_track_id AS cabinetTrackId,
          m.matched_at AS matchedAt,
          p.title AS importTrackTitle,
          p.author AS importTrackAuthor,
          c.track_name AS cabinetTrackName,
          c.artist_name AS cabinetArtistName
        FROM cabinet_music_track_map m
        LEFT JOIN music_platform_tracks p
          ON p.platform_key = m.platform_key AND p.track_key = m.track_key
        LEFT JOIN tracks c
          ON c.id = m.cabinet_track_id
        ${whereSql}
        ORDER BY m.matched_at DESC, m.user_id ASC, m.platform_key ASC, m.track_key ASC
        LIMIT ?
        OFFSET ?
      `,
    )
    .all(...params, limit, offset) as AdminCabinetMusicTrackMapRow[]

  return {
    rows,
    total,
    limit,
    offset,
    hasMore: offset + rows.length < total,
  }
}

export function updateCabinetMusicTrackMapEntry(args: {
  userId: string
  platformKey: MusicPlatformKey
  trackKey: string
  cabinetTrackId: string
}): void {
  const db = getDb()
  const userId = args.userId.trim().toLowerCase()
  const platformKey = args.platformKey
  const trackKey = args.trackKey.trim()
  const cabinetTrackId = args.cabinetTrackId.trim()

  if (!userId || !trackKey || !cabinetTrackId) {
    throw new Error("missing_required_fields")
  }
  if (!(platformKey in MUSIC_PLATFORM_LABELS)) {
    throw new Error("invalid_platform_key")
  }

  const exists = db
    .prepare(
      `
        SELECT 1
        FROM cabinet_music_track_map
        WHERE user_id = ?
          AND platform_key = ?
          AND track_key = ?
        LIMIT 1
      `,
    )
    .get(userId, platformKey, trackKey) as { 1?: number } | undefined

  if (!exists) {
    throw new Error("map_entry_not_found")
  }

  const ownerTrack = db
    .prepare(
      `
        SELECT id
        FROM tracks
        WHERE id = ?
          AND LOWER(user_id) = ?
        LIMIT 1
      `,
    )
    .get(cabinetTrackId, userId) as { id: string } | undefined

  if (!ownerTrack) {
    throw new Error("cabinet_track_not_found_for_user")
  }

  db.prepare(
    `
      UPDATE cabinet_music_track_map
      SET cabinet_track_id = ?,
          matched_at = ?
      WHERE user_id = ?
        AND platform_key = ?
        AND track_key = ?
    `,
  ).run(cabinetTrackId, new Date().toISOString(), userId, platformKey, trackKey)
}

function rebuildCabinetMusicTrackMapForPlatformWithDb(
  db: ReturnType<typeof getDb>,
  platformKey: MusicPlatformKey,
  matchedAtIso: string,
): void {
  const tn = titleNormSql
  db.prepare(`DELETE FROM cabinet_music_track_map WHERE platform_key = ?`).run(platformKey)
  db.prepare(
    `
      INSERT INTO cabinet_music_track_map (
        user_id,
        platform_key,
        track_key,
        cabinet_track_id,
        matched_at
      )
      SELECT
        LOWER(TRIM(c.user_id)) AS user_id,
        p.platform_key,
        p.track_key,
        MIN(c.id) AS cabinet_track_id,
        ? AS matched_at
      FROM music_platform_tracks p
      JOIN tracks c
        ON unicode_lower(c.artist_name) = unicode_lower(p.author)
       AND ${tn("c.track_name")} = ${tn("p.title")}
      WHERE p.platform_key = ?
        AND c.user_id IS NOT NULL
        AND TRIM(c.user_id) <> ''
      GROUP BY LOWER(TRIM(c.user_id)), p.platform_key, p.track_key
    `,
  ).run(matchedAtIso, platformKey)
}

export function rebuildCabinetMusicTrackMapForPlatform(platformKey: MusicPlatformKey): void {
  const db = getDb()
  const nowIso = new Date().toISOString()
  db.transaction(() => {
    rebuildCabinetMusicTrackMapForPlatformWithDb(db, platformKey, nowIso)
  })()
  rebuiltCabinetTrackMapPlatforms.add(platformKey)
}

function ensureCabinetMusicTrackMapForPlatform(platformKey: MusicPlatformKey): void {
  if (rebuiltCabinetTrackMapPlatforms.has(platformKey)) return
  const db = getDb()
  const row = db
    .prepare(
      `
        SELECT COUNT(*) AS total
        FROM cabinet_music_track_map
        WHERE platform_key = ?
      `,
    )
    .get(platformKey) as { total?: number } | undefined

  if ((row?.total ?? 0) === 0) {
    rebuildCabinetMusicTrackMapForPlatformWithDb(db, platformKey, new Date().toISOString())
  }
  rebuiltCabinetTrackMapPlatforms.add(platformKey)
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
 * Статистика только по трекам кабинета.
 * Использует готовую таблицу соответствий `cabinet_music_track_map` (user+platform+track_key -> cabinet_track_id),
 * чтобы не делать дорогой матчинг по строкам author/title в каждом запросе.
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

  ensureCabinetMusicTrackMapForPlatform(platformKey)

  const albumId = filters?.albumId?.trim() ? filters.albumId.trim() : null
  const trackIds = (filters?.trackIds ?? []).map((id) => id.trim()).filter((id) => id.length > 0)
  const userId = email.toLowerCase()
  const cabinetTrackJoin = `
    JOIN cabinet_music_track_map m
      ON m.platform_key = d.platform_key
     AND m.track_key = d.track_key
    JOIN tracks c
      ON c.id = m.cabinet_track_id
  `

  const whereParts: string[] = ["d.platform_key = ?", "m.user_id = ?"]
  const params: string[] = [platformKey, userId]

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
          COUNT(DISTINCT m.cabinet_track_id) AS tracks_with_plays
        FROM music_platform_track_daily_plays d
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
          COALESCE(COUNT(DISTINCT m.cabinet_track_id), 0) AS tracks_in_db
        FROM music_platform_track_daily_plays d
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

    rebuildCabinetMusicTrackMapForPlatformWithDb(db, args.platformKey, nowIso)
  })

  importTx()

  return getMusicStatsByPlatformKey(args.platformKey)
}

export * from "./music-stats-shared"
