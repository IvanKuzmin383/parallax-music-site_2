/** Суббота или воскресенье (локальный календарный день). */
export function isReleaseDateWeekend(date: Date): boolean {
  const d = date.getDay()
  return d === 0 || d === 6
}

/** Разбор YYYY-MM-DD как локальной даты (без сдвига из‑за UTC). */
export function parseLocalDateFromYyyyMmDd(s: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s)
  if (!m) return null
  const y = Number(m[1])
  const mo = Number(m[2])
  const d = Number(m[3])
  const date = new Date(y, mo - 1, d)
  if (date.getFullYear() !== y || date.getMonth() !== mo - 1 || date.getDate() !== d) {
    return null
  }
  return date
}

export function isYyyyMmDdReleaseWeekend(yyyyMmDd: string): boolean {
  const date = parseLocalDateFromYyyyMmDd(yyyyMmDd)
  if (!date) return false
  return isReleaseDateWeekend(date)
}
