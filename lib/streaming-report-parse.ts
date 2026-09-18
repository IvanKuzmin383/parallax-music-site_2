export type ParsedStreamingReportFile = {
  amountRub: number | null
  amountUsd: number | null
  amountEur: number | null
  rowCount: number
  /** Primary artist for display/match (most frequent in «Исполнитель»). */
  primaryArtist: string | null
  /** Unique artist names from content, frequency-desc. */
  artistsFromContent: string[]
}

const RUR_TOTAL_RE = /RUR:\s*([\d]+(?:[.,]\d+)?)/i
const USD_TOTAL_RE = /USD:\s*([\d]+(?:[.,]\d+)?)/i
const EUR_TOTAL_RE = /EUR:\s*([\d]+(?:[.,]\d+)?)/i

function parseAmountToken(raw: string): number {
  return parseFloat(raw.replace(",", "."))
}

function parseTotalsFromLines(
  lines: string[],
): Pick<ParsedStreamingReportFile, "amountRub" | "amountUsd" | "amountEur"> {
  let amountRub: number | null = null
  let amountUsd: number | null = null
  let amountEur: number | null = null

  for (const line of lines) {
    const rur = line.match(RUR_TOTAL_RE)
    if (rur) amountRub = parseAmountToken(rur[1])
    const usd = line.match(USD_TOTAL_RE)
    if (usd) amountUsd = parseAmountToken(usd[1])
    const eur = line.match(EUR_TOTAL_RE)
    if (eur) amountEur = parseAmountToken(eur[1])
  }

  return { amountRub, amountUsd, amountEur }
}

function linesFromCsvText(text: string): string[] {
  return text.replace(/^\uFEFF/, "").split(/\r?\n/)
}

async function rowsFromXlsxBuffer(buffer: Buffer): Promise<string[][]> {
  let XLSX: typeof import("xlsx")
  try {
    XLSX = await import("xlsx")
  } catch {
    throw new Error(
      "Для файлов .xlsx нужен пакет xlsx. Выполните в корне проекта: pnpm install",
    )
  }
  const workbook = XLSX.read(buffer, { type: "buffer", raw: false })
  const sheetName = workbook.SheetNames[0]
  if (!sheetName) return []
  const sheet = workbook.Sheets[sheetName]
  return XLSX.utils.sheet_to_json<string[]>(sheet, {
    header: 1,
    defval: "",
    raw: false,
  }) as string[][]
}

function rowsFromCsvText(text: string): string[][] {
  return linesFromCsvText(text).map((line) => {
    if (line.includes(";")) return line.split(";")
    return line.split(",")
  })
}

function findArtistColumnIndex(headerRow: string[]): number {
  const normalized = headerRow.map((c) => `${c ?? ""}`.trim().toLowerCase())
  const exact = normalized.findIndex(
    (c) => c === "исполнитель" || c === "artist" || c === "artist name",
  )
  if (exact >= 0) return exact
  return normalized.findIndex((c) => c.includes("исполнитель") || c === "artist")
}

function extractArtistsFromRows(rows: string[][]): string[] {
  let headerIdx = -1
  let artistCol = -1
  for (let i = 0; i < Math.min(rows.length, 20); i++) {
    const col = findArtistColumnIndex(rows[i] ?? [])
    if (col >= 0) {
      headerIdx = i
      artistCol = col
      break
    }
  }
  if (headerIdx < 0 || artistCol < 0) return []

  const counts = new Map<string, number>()
  for (let i = headerIdx + 1; i < rows.length; i++) {
    const row = rows[i] ?? []
    const first = `${row[0] ?? ""}`.trim()
    // Skip totals / empty
    if (!first || /^RUR:|^USD:|^EUR:/i.test(first)) continue
    const artist = `${row[artistCol] ?? ""}`.trim()
    if (!artist) continue
    counts.set(artist, (counts.get(artist) ?? 0) + 1)
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "ru"))
    .map(([name]) => name)
}

function countDataRows(rows: string[][]): number {
  let headerIdx = -1
  for (let i = 0; i < Math.min(rows.length, 20); i++) {
    if (findArtistColumnIndex(rows[i] ?? []) >= 0) {
      headerIdx = i
      break
    }
  }
  if (headerIdx < 0) {
    return rows.filter((row) => /^RU[-A-Z0-9]/i.test(`${row[0] ?? ""}`.trim())).length
  }
  let n = 0
  for (let i = headerIdx + 1; i < rows.length; i++) {
    const first = `${rows[i]?.[0] ?? ""}`.trim()
    if (!first || /^RUR:|^USD:|^EUR:/i.test(first)) continue
    n++
  }
  return n
}

export async function parseStreamingReportBuffer(
  buffer: Buffer,
  fileName: string,
): Promise<ParsedStreamingReportFile> {
  const ext = fileName.split(".").pop()?.toLowerCase() ?? ""
  const rows =
    ext === "csv"
      ? rowsFromCsvText(buffer.toString("utf8"))
      : ext === "xlsx"
        ? await rowsFromXlsxBuffer(buffer)
        : []

  if (rows.length === 0) {
    throw new Error("Не удалось прочитать файл или неподдерживаемый формат")
  }

  const lines = rows.map((row) => row.map((cell) => `${cell ?? ""}`).join(";"))
  const totals = parseTotalsFromLines(lines)
  const artistsFromContent = extractArtistsFromRows(rows)
  const rowCount = countDataRows(rows)

  return {
    ...totals,
    rowCount,
    primaryArtist: artistsFromContent[0] ?? null,
    artistsFromContent,
  }
}

const STREAMING_REPORT_PREFIX_RE = /^streaming-report-\d{4}q\d-(.+)$/i

export function extractArtistNameFromReportFileName(fileName: string): string {
  const base = fileName.replace(/\.[^.]+$/, "").trim()
  const match = base.match(STREAMING_REPORT_PREFIX_RE)
  if (match) return match[1].trim()
  return base
}

const COLLAB_MARKERS_RE = /,|\s+ft\.|\s+ft\s|(?:\s+&\s+)|(?:\s+feat\.?\s+)/i

export function isCollabArtistName(artist: string): boolean {
  return COLLAB_MARKERS_RE.test(artist)
}

export function isCollabReportFileName(fileName: string): boolean {
  const artist = extractArtistNameFromReportFileName(fileName)
  return isCollabArtistName(artist)
}

export function normalizeArtistKey(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ")
}

/** True if string looks like UTF-8 misread as latin1 (Ð°Ñ…). */
export function looksLikeMojibake(name: string): boolean {
  return /[ÐÑ]/.test(name) && !/[\u0400-\u04FF]/.test(name)
}
