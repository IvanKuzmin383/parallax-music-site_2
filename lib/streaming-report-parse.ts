export type ParsedStreamingReportFile = {
  amountRub: number | null
  amountUsd: number | null
  amountEur: number | null
  rowCount: number
}

const RUR_TOTAL_RE = /RUR:\s*([\d,]+(?:\.\d+)?)/i
const USD_TOTAL_RE = /USD:\s*([\d,]+(?:\.\d+)?)/i
const EUR_TOTAL_RE = /EUR:\s*([\d,]+(?:\.\d+)?)/i

function parseAmountToken(raw: string): number {
  return parseFloat(raw.replace(",", "."))
}

function parseTotalsFromLines(lines: string[]): Pick<ParsedStreamingReportFile, "amountRub" | "amountUsd" | "amountEur"> {
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

async function linesFromXlsxBuffer(buffer: Buffer): Promise<string[]> {
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
  const rows = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1, defval: "", raw: false }) as string[][]
  return rows.map((row) => row.map((cell) => `${cell ?? ""}`).join(";"))
}

export async function parseStreamingReportBuffer(
  buffer: Buffer,
  fileName: string,
): Promise<ParsedStreamingReportFile> {
  const ext = fileName.split(".").pop()?.toLowerCase() ?? ""
  const lines =
    ext === "csv"
      ? linesFromCsvText(buffer.toString("utf8"))
      : ext === "xlsx"
        ? await linesFromXlsxBuffer(buffer)
        : []

  if (lines.length === 0) {
    throw new Error("Не удалось прочитать файл или неподдерживаемый формат")
  }

  const totals = parseTotalsFromLines(lines)
  const rowCount = lines.filter((line) => line.startsWith("RU-")).length

  return {
    ...totals,
    rowCount,
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

export function isCollabReportFileName(fileName: string): boolean {
  const artist = extractArtistNameFromReportFileName(fileName)
  return COLLAB_MARKERS_RE.test(artist)
}

export function normalizeArtistKey(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ")
}
