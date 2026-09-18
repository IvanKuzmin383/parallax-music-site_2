/** Суббота или воскресенье (локальный календарный день). */
export function isReleaseDateWeekend(date: Date): boolean {
  const d = date.getDay()
  return d === 0 || d === 6
}

/** Минимальный срок до даты релиза (дней от сегодня, локальный календарь). */
export const MIN_RELEASE_DAYS_AHEAD = 14

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
 * Проверка даты релиза (формат, выходные, минимум N дней от сегодня).
 * Возвращает текст ошибки или null, если дата допустима.
 */
export function validateReleaseDateYyyyMmDd(
  yyyyMmDd: string | undefined | null,
  options?: { minDaysAhead?: number; required?: boolean },
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
  const minDays = options?.minDaysAhead ?? MIN_RELEASE_DAYS_AHEAD
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const minDate = new Date(today)
  minDate.setDate(minDate.getDate() + minDays)
  if (date < minDate) {
    return `Дата публикации должна быть не ранее чем через ${minDays} дней от сегодня`
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
