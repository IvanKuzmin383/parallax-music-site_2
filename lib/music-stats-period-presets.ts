export type MusicStatsPeriodPreset = "week" | "month" | "quarter"

export function toYmdLocal(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

/** Вчера по локальному календарю (конец периода для пресетов «Неделя» / «Месяц» / «Квартал»). */
export function getYesterdayIsoLocal(): string {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return toYmdLocal(d)
}

export function addDaysToYmd(ymd: string, delta: number): string {
  const [y, m, day] = ymd.split("-").map(Number)
  const d = new Date(y!, m! - 1, day!)
  d.setDate(d.getDate() + delta)
  return toYmdLocal(d)
}

export function getRangeByPreset(
  preset: MusicStatsPeriodPreset,
  endYmd: string,
  minDataYmd: string,
): { startIso: string; endIso: string } {
  const span = preset === "week" ? 7 : preset === "month" ? 30 : 90
  const startIso = addDaysToYmd(endYmd, -(span - 1))
  return {
    startIso: startIso < minDataYmd ? minDataYmd : startIso,
    endIso: endYmd,
  }
}
