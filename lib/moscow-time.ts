const MOSCOW_TZ = "Europe/Moscow"

/** YYYY-MM-DD для момента времени в календаре Москвы */
export function formatMoscowDateString(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: MOSCOW_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d)
}

/** Начало календарного дня по Москве (локально в JS Date) для сравнения «сегодня» */
export function moscowCalendarDayStart(isoOrDate: string | Date): Date {
  const d = typeof isoOrDate === "string" ? new Date(isoOrDate) : isoOrDate
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: MOSCOW_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(d)
  const y = parts.find((p) => p.type === "year")?.value
  const m = parts.find((p) => p.type === "month")?.value
  const day = parts.find((p) => p.type === "day")?.value
  if (!y || !m || !day) return d
  return new Date(`${y}-${m}-${day}T00:00:00+03:00`)
}

export function isSameMoscowCalendarDay(a: Date | string, b: Date | string): boolean {
  return formatMoscowDateString(new Date(a)) === formatMoscowDateString(new Date(b))
}
