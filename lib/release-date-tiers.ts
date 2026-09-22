import {
  addWorkingDays,
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

/** Ускоренная: 4–6 рабочих дней включительно. */
export const RELEASE_DATE_ACCELERATED_WORKING_DAYS = { from: 4, to: 6 } as const

/** Быстрая: 7–13 рабочих дней включительно. */
export const RELEASE_DATE_FAST_WORKING_DAYS = { from: 7, to: 13 } as const

/** Стандарт бесплатно: от 14-го рабочего дня. */
export const RELEASE_DATE_STANDARD_FROM_WORKING_DAYS = 14

/** @deprecated Используйте RELEASE_DATE_ACCELERATED_WORKING_DAYS.from */
export const RELEASE_DATE_ACCELERATED_WORKING_DAY = RELEASE_DATE_ACCELERATED_WORKING_DAYS.from

export function getReleaseWorkingDaysAhead(date: Date, from = new Date()): number {
  return countWorkingDaysAhead(date, from)
}

export function isReleaseDateSelectable(date: Date, from = new Date()): boolean {
  if (isReleaseDateWeekend(date)) return false
  return getReleaseWorkingDaysAhead(date, from) >= MIN_RELEASE_WORKING_DAYS_AHEAD
}

export function getEarliestAvailableReleaseDate(from = new Date()): Date {
  return addWorkingDays(startOfLocalDay(from), MIN_RELEASE_WORKING_DAYS_AHEAD)
}

export function getReleaseDateTier(
  date: Date,
  from = new Date(),
): ReleaseDateTier | null {
  if (!isReleaseDateSelectable(date, from)) return null
  const wd = getReleaseWorkingDaysAhead(date, from)
  if (
    wd >= RELEASE_DATE_ACCELERATED_WORKING_DAYS.from &&
    wd <= RELEASE_DATE_ACCELERATED_WORKING_DAYS.to
  ) {
    return "accelerated"
  }
  if (wd >= RELEASE_DATE_FAST_WORKING_DAYS.from && wd <= RELEASE_DATE_FAST_WORKING_DAYS.to) {
    return "fast"
  }
  if (wd >= RELEASE_DATE_STANDARD_FROM_WORKING_DAYS) return "standard"
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

/** Дата раньше стандарта (менее 14 раб. дней) — нужен флаг принятия риска. */
export function isShortReleaseDate(date: Date, from = new Date()): boolean {
  if (!isReleaseDateSelectable(date, from)) return false
  return getReleaseWorkingDaysAhead(date, from) < RELEASE_DATE_STANDARD_FROM_WORKING_DAYS
}
