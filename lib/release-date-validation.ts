/** Суббота или воскресенье (локальный календарный день). */
export function isReleaseDateWeekend(date: Date): boolean {
  const d = date.getDay()
  return d === 0 || d === 6
}

export function startOfLocalDay(date = new Date()): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

/**
 * Число календарных дней строго после `from` до `date` включительно
 * (сегодня = 0; завтра = 1).
 */
export function countCalendarDaysAhead(date: Date, from = new Date()): number {
  const start = startOfLocalDay(from)
  const end = startOfLocalDay(date)
  if (end <= start) return 0
  return Math.round((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000))
}

/**
 * Число рабочих дней строго после `from` до `date` включительно
 * (день загрузки = 0; следующий пн–пт = 1).
 */
export function countWorkingDaysAhead(date: Date, from = new Date()): number {
  const start = startOfLocalDay(from)
  const end = startOfLocalDay(date)
  if (end <= start) return 0
  let count = 0
  const cur = new Date(start)
  while (cur < end) {
    cur.setDate(cur.getDate() + 1)
    if (!isReleaseDateWeekend(cur)) count += 1
  }
  return count
}

/** Дата через N рабочих дней после `from` (N ≥ 1). */
export function addWorkingDays(from: Date, workingDays: number): Date {
  const d = startOfLocalDay(from)
  let added = 0
  while (added < workingDays) {
    d.setDate(d.getDate() + 1)
    if (!isReleaseDateWeekend(d)) added += 1
  }
  return d
}

/** Минимальный срок до даты релиза: 3-й рабочий день от сегодня. */
export const MIN_RELEASE_WORKING_DAYS_AHEAD = 3

/** @deprecated Используйте MIN_RELEASE_WORKING_DAYS_AHEAD */
export const MIN_RELEASE_DAYS_AHEAD = MIN_RELEASE_WORKING_DAYS_AHEAD

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

/**
 * Проверка даты релиза (формат, выходные, минимум N рабочих дней от сегодня).
 * Возвращает текст ошибки или null, если дата допустима.
 */
export function validateReleaseDateYyyyMmDd(
  yyyyMmDd: string | undefined | null,
  options?: { minWorkingDaysAhead?: number; minDaysAhead?: number; required?: boolean },
): string | null {
  const required = options?.required !== false
  const trimmed = yyyyMmDd?.trim()
  if (!trimmed) {
    return required ? "Дата публикации обязательна" : null
  }
  const date = parseLocalDateFromYyyyMmDd(trimmed)
  if (!date) {
    return "Неверный формат даты публикации"
  }
  if (isReleaseDateWeekend(date)) {
    return "Дата публикации не может приходиться на выходной день (суббота или воскресенье)"
  }
  const today = startOfLocalDay()
  if (startOfLocalDay(date) < today) {
    return "Дата публикации не может быть в прошлом"
  }
  const minWorking =
    options?.minWorkingDaysAhead ??
    options?.minDaysAhead ??
    MIN_RELEASE_WORKING_DAYS_AHEAD
  const workingAhead = countWorkingDaysAhead(date, today)
  if (workingAhead < minWorking) {
    return `Дата публикации должна быть не ранее чем через ${minWorking} рабочих дней от сегодня`
  }
  return null
}

/** Дата релиза для проверки: payload → альбом → первый трек с датой. */
export function resolveAlbumReleaseDateYyyyMmDd(params: {
  payloadReleaseDate?: string | null
  albumReleaseDate?: string | null
  trackReleaseDates?: Array<string | undefined | null>
}): string | undefined {
  const fromPayload = params.payloadReleaseDate?.trim()
  if (fromPayload) return fromPayload
  const fromAlbum = params.albumReleaseDate?.trim()
  if (fromAlbum) return fromAlbum
  for (const d of params.trackReleaseDates ?? []) {
    const t = d?.trim()
    if (t) return t
  }
  return undefined
}
