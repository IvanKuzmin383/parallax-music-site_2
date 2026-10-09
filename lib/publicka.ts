import { createHash, randomUUID } from "node:crypto"
import {
  clientExecute,
  clientQuery,
  execute,
  query,
  queryOne,
  withTransaction,
} from "@/lib/database"
import { getCabinetUserByEmail, getCabinetUserById } from "@/lib/cabinet-users"
import { creditRoyalty } from "@/lib/cabinet-balance"
import { parseRuOrIsoDateToIso } from "@/lib/music-stats-shared"
import {
  playsToEarningsRub,
  PUBLICKA_RATE_RUB,
  type PublickaPlacementStatus,
  type PublickaPlacementView,
  type PublickaStatsResponse,
} from "@/lib/publicka-shared"

export { PUBLICKA_RATE_RUB, playsToEarningsRub }
export type { PublickaPlacementStatus, PublickaPlacementView, PublickaStatsResponse }

type PlacementRow = {
  id: string
  user_id: string
  track_id: string | null
  title: string
  artist: string
  status: string
  external_key: string | null
  order_id: string | null
  credited_plays: number
  created_at: string
  updated_at: string
}

function isStatus(v: string): v is PublickaPlacementStatus {
  return v === "pending" || v === "active" || v === "paused" || v === "rejected"
}

async function totalPlaysForPlacement(placementId: string): Promise<number> {
  const row = await queryOne<{ total: number | string }>(
    `SELECT COALESCE(SUM(plays), 0)::float AS total FROM publicka_daily_plays WHERE placement_id = ?`,
    [placementId]
  )
  return Math.floor(Number(row?.total) || 0)
}

function toView(row: PlacementRow, totalPlays: number): PublickaPlacementView {
  const status = isStatus(row.status) ? row.status : "pending"
  return {
    id: row.id,
    title: row.title,
    artist: row.artist,
    status,
    trackId: row.track_id,
    totalPlays,
    earningsRub: playsToEarningsRub(totalPlays),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export async function listPublickaPlacementsForUser(
  userId: string
): Promise<PublickaPlacementView[]> {
  const rows = await query<PlacementRow>(
    `
    SELECT * FROM publicka_placements
    WHERE user_id = ?
    ORDER BY updated_at DESC, created_at DESC
    `,
    [userId]
  )
  const out: PublickaPlacementView[] = []
  for (const row of rows) {
    const plays = await totalPlaysForPlacement(row.id)
    out.push(toView(row, plays))
  }
  return out
}

export async function listAllPublickaPlacements(args?: {
  userId?: string | null
  status?: string | null
  limit?: number
  offset?: number
}): Promise<{ rows: PublickaPlacementView[]; total: number }> {
  const limit = Math.min(Math.max(1, args?.limit ?? 50), 200)
  const offset = Math.max(0, args?.offset ?? 0)
  const where: string[] = []
  const params: Array<string | number> = []

  if (args?.userId?.trim()) {
    where.push("user_id = ?")
    params.push(args.userId.trim())
  }
  if (args?.status?.trim()) {
    where.push("status = ?")
    params.push(args.status.trim())
  }
  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : ""

  const countRow = await queryOne<{ c: number | string }>(
    `SELECT COUNT(*)::int AS c FROM publicka_placements ${whereSql}`,
    params
  )
  const total = Number(countRow?.c) || 0

  const rows = await query<PlacementRow>(
    `
    SELECT * FROM publicka_placements
    ${whereSql}
    ORDER BY updated_at DESC
    LIMIT ? OFFSET ?
    `,
    [...params, limit, offset]
  )

  const views: PublickaPlacementView[] = []
  for (const row of rows) {
    views.push(toView(row, await totalPlaysForPlacement(row.id)))
  }
  return { rows: views, total }
}

export async function createPublickaPlacement(input: {
  userId: string
  title: string
  artist: string
  trackId?: string | null
  status?: PublickaPlacementStatus
  externalKey?: string | null
  orderId?: string | null
}): Promise<PublickaPlacementView> {
  const id = randomUUID()
  const now = new Date().toISOString()
  const status = input.status ?? "pending"
  await execute(
    `
    INSERT INTO publicka_placements (
      id, user_id, track_id, title, artist, status, external_key, order_id,
      credited_plays, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)
    `,
    [
      id,
      input.userId,
      input.trackId ?? null,
      input.title.trim(),
      input.artist.trim(),
      status,
      input.externalKey?.trim() || null,
      input.orderId ?? null,
      now,
      now,
    ]
  )
  return toView(
    {
      id,
      user_id: input.userId,
      track_id: input.trackId ?? null,
      title: input.title.trim(),
      artist: input.artist.trim(),
      status,
      external_key: input.externalKey?.trim() || null,
      order_id: input.orderId ?? null,
      credited_plays: 0,
      created_at: now,
      updated_at: now,
    },
    0
  )
}

export async function updatePublickaPlacement(
  id: string,
  patch: {
    status?: PublickaPlacementStatus
    title?: string
    artist?: string
    trackId?: string | null
    externalKey?: string | null
  }
): Promise<PublickaPlacementView | null> {
  const existing = await queryOne<PlacementRow>(
    `SELECT * FROM publicka_placements WHERE id = ?`,
    [id]
  )
  if (!existing) return null

  const status = patch.status ?? (isStatus(existing.status) ? existing.status : "pending")
  const title = patch.title?.trim() || existing.title
  const artist = patch.artist?.trim() || existing.artist
  const trackId = patch.trackId !== undefined ? patch.trackId : existing.track_id
  const externalKey =
    patch.externalKey !== undefined
      ? patch.externalKey?.trim() || null
      : existing.external_key
  const now = new Date().toISOString()

  await execute(
    `
    UPDATE publicka_placements
    SET status = ?, title = ?, artist = ?, track_id = ?, external_key = ?, updated_at = ?
    WHERE id = ?
    `,
    [status, title, artist, trackId, externalKey, now, id]
  )

  const plays = await totalPlaysForPlacement(id)
  return toView({ ...existing, status, title, artist, track_id: trackId, external_key: externalKey, updated_at: now }, plays)
}

export async function ensurePublickaPlacementFromOrder(input: {
  userId: string
  orderId: string
  title: string
  artist?: string
}): Promise<void> {
  const existing = await queryOne<{ id: string }>(
    `SELECT id FROM publicka_placements WHERE order_id = ? LIMIT 1`,
    [input.orderId]
  )
  if (existing) return

  const user = await getCabinetUserById(input.userId)
  const artist = input.artist?.trim() || user?.artistName?.trim() || "Без артиста"
  await createPublickaPlacement({
    userId: input.userId,
    title: input.title.trim() || "Без названия",
    artist,
    status: "pending",
    orderId: input.orderId,
    externalKey: `order:${input.orderId}`,
  })
}

export async function getPublickaStatsForUser(
  userId: string,
  opts?: { from?: string | null; to?: string | null }
): Promise<PublickaStatsResponse> {
  const placements = await query<PlacementRow>(
    `SELECT * FROM publicka_placements WHERE user_id = ?`,
    [userId]
  )
  if (placements.length === 0) {
    return {
      totalPlays: 0,
      earningsRub: 0,
      rateRub: PUBLICKA_RATE_RUB,
      daysCount: 0,
      placementsCount: 0,
      dailyStats: [],
      cityStatsByDate: [],
      topTracks: [],
    }
  }

  const ids = placements.map((p) => p.id)
  const placeholders = ids.map(() => "?").join(", ")
  const dateFilters: string[] = []
  const params: string[] = [...ids]
  if (opts?.from) {
    dateFilters.push("stat_date >= ?")
    params.push(opts.from)
  }
  if (opts?.to) {
    dateFilters.push("stat_date <= ?")
    params.push(opts.to)
  }
  const dateSql = dateFilters.length ? `AND ${dateFilters.join(" AND ")}` : ""

  const dailyRows = await query<{ stat_date: string; plays: number | string }>(
    `
    SELECT stat_date, SUM(plays)::float AS plays
    FROM publicka_daily_plays
    WHERE placement_id IN (${placeholders}) ${dateSql}
    GROUP BY stat_date
    ORDER BY stat_date
    `,
    params
  )

  const cityRows = await query<{
    stat_date: string
    city: string
    plays: number | string
  }>(
    `
    SELECT stat_date, city, SUM(plays)::float AS plays
    FROM publicka_daily_plays_by_city
    WHERE placement_id IN (${placeholders}) ${dateSql}
    GROUP BY stat_date, city
    ORDER BY stat_date, city
    `,
    params
  )

  const perPlacement = await query<{
    placement_id: string
    plays: number | string
  }>(
    `
    SELECT placement_id, SUM(plays)::float AS plays
    FROM publicka_daily_plays
    WHERE placement_id IN (${placeholders}) ${dateSql}
    GROUP BY placement_id
    `,
    params
  )
  const playsByPlacement = new Map(
    perPlacement.map((r) => [r.placement_id, Math.floor(Number(r.plays) || 0)])
  )

  const dailyStats = dailyRows.map((r) => ({
    date: r.stat_date,
    totalPlays: Math.floor(Number(r.plays) || 0),
  }))
  const totalPlays = dailyStats.reduce((s, d) => s + d.totalPlays, 0)

  const topTracks = placements
    .map((p) => {
      const plays = playsByPlacement.get(p.id) ?? 0
      return {
        title: p.title,
        artist: p.artist,
        plays,
        earningsRub: playsToEarningsRub(plays),
      }
    })
    .filter((t) => t.plays > 0)
    .sort((a, b) => b.plays - a.plays)
    .slice(0, 20)

  return {
    totalPlays,
    earningsRub: playsToEarningsRub(totalPlays),
    rateRub: PUBLICKA_RATE_RUB,
    daysCount: dailyStats.length,
    placementsCount: placements.length,
    dailyStats,
    cityStatsByDate: cityRows.map((r) => ({
      date: r.stat_date,
      city: r.city,
      plays: Math.floor(Number(r.plays) || 0),
    })),
    topTracks,
  }
}

function normHeader(v: string): string {
  return v
    .toLowerCase()
    .replace(/^\uFEFF/, "")
    .trim()
    .replace(/\s+/g, " ")
}

function findCol(headers: string[], aliases: string[]): number {
  const normalized = headers.map(normHeader)
  for (const alias of aliases) {
    const i = normalized.indexOf(alias)
    if (i >= 0) return i
  }
  for (const alias of aliases) {
    const i = normalized.findIndex((h) => h.includes(alias))
    if (i >= 0) return i
  }
  return -1
}

function parsePlays(raw: string): number {
  const n = Number(String(raw).replace(/\s/g, "").replace(",", "."))
  if (!Number.isFinite(n) || n < 0) return 0
  return Math.floor(n)
}

export type PublickaImportRow = {
  email: string
  title: string
  artist: string
  date: string
  city: string
  plays: number
}

function matrixFromCsvBuffer(buffer: Buffer): string[][] {
  const text = buffer.toString("utf8").replace(/^\uFEFF/, "")
  return text.split(/\r?\n/).map((line) => {
    if (line.includes(";")) return line.split(";")
    return line.split(",")
  })
}

export async function parsePublickaExcelBuffer(
  buffer: Buffer,
  fileName?: string
): Promise<{
  rows: PublickaImportRow[]
  warnings: string[]
}> {
  const ext = (fileName?.split(".").pop() ?? "").toLowerCase()
  let matrix: string[][]

  if (ext === "csv") {
    matrix = matrixFromCsvBuffer(buffer)
  } else {
    let XLSX: typeof import("xlsx")
    try {
      XLSX = await import("xlsx")
    } catch {
      throw new Error("Для файлов .xlsx нужен пакет xlsx. Выполните: pnpm install")
    }

    const workbook = XLSX.read(buffer, { type: "buffer", raw: false })
    const sheetName = workbook.SheetNames[0]
    if (!sheetName) return { rows: [], warnings: ["Пустой файл"] }
    const sheet = workbook.Sheets[sheetName]
    matrix = XLSX.utils.sheet_to_json<string[]>(sheet, {
      header: 1,
      defval: "",
      raw: false,
    }) as string[][]
  }

  let headerIdx = -1
  let cols = {
    email: -1,
    title: -1,
    artist: -1,
    date: -1,
    city: -1,
    plays: -1,
  }

  for (let i = 0; i < Math.min(matrix.length, 30); i++) {
    const headers = (matrix[i] ?? []).map((c) => `${c ?? ""}`)
    const email = findCol(headers, ["email", "e-mail", "почта", "email пользователя", "логин"])
    const title = findCol(headers, ["title", "track", "трек", "название", "название трека"])
    const artist = findCol(headers, ["artist", "исполнитель", "артист"])
    const date = findCol(headers, ["date", "дата", "день"])
    const city = findCol(headers, ["city", "город", "населенный пункт", "населённый пункт"])
    const plays = findCol(headers, [
      "plays",
      "прослушивания",
      "прослушиваний",
      "count",
      "количество",
    ])
    if (email >= 0 && title >= 0 && date >= 0 && plays >= 0) {
      headerIdx = i
      cols = { email, title, artist, date, city, plays }
      break
    }
  }

  if (headerIdx < 0) {
    return {
      rows: [],
      warnings: [
        "Не найдена строка заголовков. Нужны колонки: email, название/трек, дата, прослушивания (опционально: исполнитель, город).",
      ],
    }
  }

  const rows: PublickaImportRow[] = []
  const warnings: string[] = []
  for (let i = headerIdx + 1; i < matrix.length; i++) {
    const line = matrix[i] ?? []
    const email = `${line[cols.email] ?? ""}`.trim().toLowerCase()
    const title = `${line[cols.title] ?? ""}`.trim()
    const artist =
      cols.artist >= 0 ? `${line[cols.artist] ?? ""}`.trim() : ""
    const dateRaw = `${line[cols.date] ?? ""}`.trim()
    const city =
      cols.city >= 0 ? `${line[cols.city] ?? ""}`.trim() || "Не указан" : "Не указан"
    const plays = parsePlays(`${line[cols.plays] ?? ""}`)
    if (!email && !title && !dateRaw) continue
    if (!email || !title || !dateRaw) {
      warnings.push(`Строка ${i + 1}: пропущена (нужны email, название, дата)`)
      continue
    }
    let dateIso = parseRuOrIsoDateToIso(dateRaw)
    if (!dateIso) {
      // Excel иногда отдаёт D/M/YYYY или M/D/YYYY
      const slash = /^(\d{1,2})[/.](\d{1,2})[/.](\d{4})$/.exec(dateRaw)
      if (slash) {
        const a = Number(slash[1])
        const b = Number(slash[2])
        const y = slash[3]!
        // если первое > 12 - это день (европейский формат)
        if (a > 12) {
          dateIso = `${y}-${String(b).padStart(2, "0")}-${String(a).padStart(2, "0")}`
        } else if (b > 12) {
          dateIso = `${y}-${String(a).padStart(2, "0")}-${String(b).padStart(2, "0")}`
        } else {
          // неоднозначно: считаем Д.М.Г
          dateIso = `${y}-${String(b).padStart(2, "0")}-${String(a).padStart(2, "0")}`
        }
      }
    }
    if (!dateIso) {
      warnings.push(`Строка ${i + 1}: неверный формат даты «${dateRaw}»`)
      continue
    }
    if (plays <= 0) continue
    rows.push({
      email,
      title,
      artist: artist || "Без артиста",
      date: dateIso,
      city,
      plays,
    })
  }

  return { rows, warnings }
}

function titleNorm(s: string): string {
  return s
    .toLowerCase()
    .replace(/[\s\---]+/g, "")
    .trim()
}

export async function importPublickaRows(args: {
  fileName: string
  fileBuffer: Buffer
  rows: PublickaImportRow[]
}): Promise<{
  importId: string
  totalPlays: number
  rowsCount: number
  matchedRows: number
  earningsCreditedRub: number
  createdPlacements: number
  skippedDuplicateFile: boolean
}> {
  const fileHash = createHash("sha256").update(args.fileBuffer).digest("hex")
  const existingImport = await queryOne<{ id: string }>(
    `SELECT id FROM publicka_stat_imports WHERE file_hash = ?`,
    [fileHash]
  )
  if (existingImport) {
    return {
      importId: existingImport.id,
      totalPlays: 0,
      rowsCount: args.rows.length,
      matchedRows: 0,
      earningsCreditedRub: 0,
      createdPlacements: 0,
      skippedDuplicateFile: true,
    }
  }

  const importId = randomUUID()
  const now = new Date().toISOString()
  let matchedRows = 0
  let createdPlacements = 0
  let totalPlays = 0
  let earningsCreditedRub = 0

  const userCache = new Map<string, Awaited<ReturnType<typeof getCabinetUserByEmail>>>()
  const touchedPlacementIds = new Set<string>()

  await withTransaction(async (client) => {
    // Aggregate city plays first: placement lookup key → date → city → plays
    type AggKey = string
    const cityAgg = new Map<AggKey, number>()
    const placementMeta = new Map<
      string,
      { userId: string; title: string; artist: string; email: string }
    >()

    for (const row of args.rows) {
      let user = userCache.get(row.email)
      if (user === undefined) {
        user = await getCabinetUserByEmail(row.email)
        userCache.set(row.email, user)
      }
      if (!user) continue

      matchedRows += 1
      totalPlays += row.plays

      const metaKey = `${user.id}::${titleNorm(row.title)}::${titleNorm(row.artist)}`
      placementMeta.set(metaKey, {
        userId: user.id,
        title: row.title,
        artist: row.artist,
        email: row.email,
      })
      const aggKey = `${metaKey}||${row.date}||${row.city}`
      cityAgg.set(aggKey, (cityAgg.get(aggKey) ?? 0) + row.plays)
    }

    // Ensure placements exist
    const placementIdByMeta = new Map<string, string>()
    for (const [metaKey, meta] of placementMeta) {
      const extKey = `title:${titleNorm(meta.title)}|artist:${titleNorm(meta.artist)}`
      const found = await clientQuery<{ id: string }>(
        client,
        `
        SELECT id FROM publicka_placements
        WHERE user_id = ? AND (
          external_key = ?
          OR (
            REPLACE(REPLACE(REPLACE(LOWER(title), ' ', ''), '-', ''), '-', '') = ?
            AND REPLACE(REPLACE(REPLACE(LOWER(artist), ' ', ''), '-', ''), '-', '') = ?
          )
        )
        LIMIT 1
        `,
        [meta.userId, extKey, titleNorm(meta.title), titleNorm(meta.artist)]
      )
      let placement = found[0] ?? null

      if (!placement) {
        const id = randomUUID()
        await clientExecute(
          client,
          `
          INSERT INTO publicka_placements (
            id, user_id, track_id, title, artist, status, external_key, order_id,
            credited_plays, created_at, updated_at
          ) VALUES (?, ?, NULL, ?, ?, 'active', ?, NULL, 0, ?, ?)
          `,
          [id, meta.userId, meta.title, meta.artist, extKey, now, now]
        )
        placement = { id }
        createdPlacements += 1
      } else {
        await clientExecute(
          client,
          `UPDATE publicka_placements SET status = 'active', updated_at = ? WHERE id = ? AND status = 'pending'`,
          [now, placement.id]
        )
      }
      placementIdByMeta.set(metaKey, placement.id)
      touchedPlacementIds.add(placement.id)
    }

    // Day totals from city agg
    const dayAgg = new Map<string, number>()
    for (const [aggKey, plays] of cityAgg) {
      const [metaKey, date, city] = aggKey.split("||")
      const placementId = placementIdByMeta.get(metaKey!)
      if (!placementId || !date || !city) continue

      await clientExecute(
        client,
        `
        INSERT INTO publicka_daily_plays_by_city (placement_id, stat_date, city, plays)
        VALUES (?, ?, ?, ?)
        ON CONFLICT (placement_id, stat_date, city)
        DO UPDATE SET plays = EXCLUDED.plays
        `,
        [placementId, date, city, plays]
      )

      const dayKey = `${placementId}||${date}`
      dayAgg.set(dayKey, (dayAgg.get(dayKey) ?? 0) + plays)
    }

    for (const [dayKey, plays] of dayAgg) {
      const [placementId, date] = dayKey.split("||")
      if (!placementId || !date) continue
      await clientExecute(
        client,
        `
        INSERT INTO publicka_daily_plays (placement_id, stat_date, plays)
        VALUES (?, ?, ?)
        ON CONFLICT (placement_id, stat_date)
        DO UPDATE SET plays = EXCLUDED.plays
        `,
        [placementId, date, plays]
      )
    }

    await clientExecute(
      client,
      `
      INSERT INTO publicka_stat_imports (
        id, file_name, file_hash, total_plays, rows_count, matched_rows,
        earnings_credited_rub, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, 0, ?)
      `,
      [importId, args.fileName, fileHash, totalPlays, args.rows.length, matchedRows, now]
    )
  })

  // Credit earnings outside the import transaction (balance ops have their own tx)
  for (const placementId of touchedPlacementIds) {
    const row = await queryOne<PlacementRow>(
      `SELECT * FROM publicka_placements WHERE id = ?`,
      [placementId]
    )
    if (!row) continue
    const plays = await totalPlaysForPlacement(placementId)
    const already = Math.floor(Number(row.credited_plays) || 0)
    const delta = plays - already
    if (delta <= 0) continue
    const amount = playsToEarningsRub(delta)
    if (amount <= 0) continue

    const credited = await creditRoyalty({
      userId: row.user_id,
      amount,
      note: `Музыка для бизнеса: ${row.title} (+${delta} прослушиваний)`,
    })
    if (credited.ok) {
      earningsCreditedRub += amount
      await execute(
        `UPDATE publicka_placements SET credited_plays = ?, updated_at = ? WHERE id = ?`,
        [plays, new Date().toISOString(), placementId]
      )
    }
  }

  if (earningsCreditedRub > 0) {
    await execute(
      `UPDATE publicka_stat_imports SET earnings_credited_rub = ? WHERE id = ?`,
      [earningsCreditedRub, importId]
    )
  }

  return {
    importId,
    totalPlays,
    rowsCount: args.rows.length,
    matchedRows,
    earningsCreditedRub,
    createdPlacements,
    skippedDuplicateFile: false,
  }
}
