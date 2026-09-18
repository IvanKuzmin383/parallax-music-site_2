import {
  isReleaseDateWeekend,
  MIN_RELEASE_DAYS_AHEAD,
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

/** С этого числа дней от сегодня — «быстрая» (включительно). */
export const RELEASE_DATE_FAST_FROM_DAYS = 17

/** С этого числа дней от сегодня — «стандарт» / бесплатно (включительно). */
export const RELEASE_DATE_STANDARD_FROM_DAYS = 21

export function startOfLocalDay(date = new Date()): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

export function getReleaseDaysAhead(date: Date, from = new Date()): number {
  const a = startOfLocalDay(date).getTime()
  const b = startOfLocalDay(from).getTime()
  return Math.round((a - b) / 86_400_000)
}

export function isReleaseDateSelectable(date: Date, from = new Date()): boolean {
  if (isReleaseDateWeekend(date)) return false
  return getReleaseDaysAhead(date, from) >= MIN_RELEASE_DAYS_AHEAD
}

export function getEarliestAvailableReleaseDate(from = new Date()): Date {
  const d = startOfLocalDay(from)
  d.setDate(d.getDate() + MIN_RELEASE_DAYS_AHEAD)
  while (isReleaseDateWeekend(d)) {
    d.setDate(d.getDate() + 1)
  }
  return d
}

export function getReleaseDateTier(
  date: Date,
  from = new Date(),
): ReleaseDateTier | null {
  if (!isReleaseDateSelectable(date, from)) return null
  const days = getReleaseDaysAhead(date, from)
  if (days < RELEASE_DATE_FAST_FROM_DAYS) return "accelerated"
  if (days < RELEASE_DATE_STANDARD_FROM_DAYS) return "fast"
  return "standard"
}

export function getReleaseDateTierPriceRub(date: Date, from = new Date()): number {
  const tier = getReleaseDateTier(date, from)
  if (!tier) return 0
  return RELEASE_DATE_TIER_PRICE_RUB[tier]
}
