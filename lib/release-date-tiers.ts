import {
  addWorkingDays,
  countCalendarDaysAhead,
  countWorkingDaysAhead,
  isReleaseDateWeekend,
  MIN_RELEASE_WORKING_DAYS_AHEAD,
  startOfLocalDay,
} from "@/lib/release-date-validation"

export type ReleaseDateTier = "accelerated" | "fast" | "standard"

export const RELEASE_DATE_TIER_PRICE_RUB = {
  accelerated: 1000,
  fast: 500,
  standard: 0,
} as const

export const RELEASE_DATE_TIER_LABEL = {
  accelerated: "Ускоренная загрузка",
  fast: "Быстрая загрузка",
  standard: "Стандартная загрузка",
} as const

/**
 * Ускоренная: с минимально доступного (3-й раб. день) до 6 раб. дней включительно.
 * Только пока не наступил стандартный календарный порог.
 */
export const RELEASE_DATE_ACCELERATED_WORKING_DAYS = {
  from: MIN_RELEASE_WORKING_DAYS_AHEAD,
  to: 6,
} as const

/** Быстрая: с 7-го рабочего дня до дня перед стандартом. */
export const RELEASE_DATE_FAST_WORKING_DAYS = { from: 7, to: 13 } as const

/** Стандарт бесплатно: с 14-го календарного дня (не рабочего). */
export const RELEASE_DATE_STANDARD_FROM_CALENDAR_DAYS = 14

/** @deprecated Используйте RELEASE_DATE_STANDARD_FROM_CALENDAR_DAYS */
export const RELEASE_DATE_STANDARD_FROM_WORKING_DAYS = RELEASE_DATE_STANDARD_FROM_CALENDAR_DAYS

/** @deprecated Используйте RELEASE_DATE_ACCELERATED_WORKING_DAYS.from */
export const RELEASE_DATE_ACCELERATED_WORKING_DAY = RELEASE_DATE_ACCELERATED_WORKING_DAYS.from

export function getReleaseWorkingDaysAhead(date: Date, from = new Date()): number {
  return countWorkingDaysAhead(date, from)
}

export function getReleaseCalendarDaysAhead(date: Date, from = new Date()): number {
  return countCalendarDaysAhead(date, from)
}

/** Ближайшая допустимая дата: 3-й рабочий день от сегодня (не выходной). */
export function getEarliestAvailableReleaseDate(from = new Date()): Date {
  return addWorkingDays(from, MIN_RELEASE_WORKING_DAYS_AHEAD)
}

/** Доступны будни не раньше 3-го рабочего дня. */
export function isReleaseDateSelectable(date: Date, from = new Date()): boolean {
  if (isReleaseDateWeekend(date)) return false
  const earliest = getEarliestAvailableReleaseDate(from)
  return startOfLocalDay(date).getTime() >= earliest.getTime()
}

export function getReleaseDateTier(
  date: Date,
  from = new Date(),
): ReleaseDateTier | null {
  if (!isReleaseDateSelectable(date, from)) return null

  const calendarDays = getReleaseCalendarDaysAhead(date, from)
  if (calendarDays >= RELEASE_DATE_STANDARD_FROM_CALENDAR_DAYS) {
    return "standard"
  }

  const wd = getReleaseWorkingDaysAhead(date, from)
  if (
    wd >= RELEASE_DATE_ACCELERATED_WORKING_DAYS.from &&
    wd <= RELEASE_DATE_ACCELERATED_WORKING_DAYS.to
  ) {
    return "accelerated"
  }
  if (wd >= RELEASE_DATE_FAST_WORKING_DAYS.from) {
    return "fast"
  }
  return null
}

/** Раскраска календаря совпадает с тарифом. */
export function getReleaseDateCalendarTier(
  date: Date,
  from = new Date(),
): ReleaseDateTier | null {
  return getReleaseDateTier(date, from)
}

export function getReleaseDateTierPriceRub(date: Date, from = new Date()): number {
  const tier = getReleaseDateTier(date, from)
  if (!tier) return 0
  return RELEASE_DATE_TIER_PRICE_RUB[tier]
}

/** Парсинг `yyyy-MM-dd` в локальную дату (полдень) — без сдвига суток из UTC. */
export function parseReleaseDateInput(isoDate: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate.trim())
  if (!m) return null
  const y = Number(m[1])
  const mo = Number(m[2])
  const d = Number(m[3])
  if (!y || mo < 1 || mo > 12 || d < 1 || d > 31) return null
  return new Date(y, mo - 1, d, 12, 0, 0, 0)
}

export function getReleaseDateTierPriceRubFromIso(
  isoDate: string | null | undefined,
  from = new Date(),
): number {
  if (!isoDate) return 0
  const date = parseReleaseDateInput(isoDate)
  if (!date) return 0
  return getReleaseDateTierPriceRub(date, from)
}

/** Дата раньше стандарта (менее 14 календарных дней) — нужен флаг принятия риска. */
export function isShortReleaseDate(date: Date, from = new Date()): boolean {
  if (!isReleaseDateSelectable(date, from)) return false
  return getReleaseCalendarDaysAhead(date, from) < RELEASE_DATE_STANDARD_FROM_CALENDAR_DAYS
}
