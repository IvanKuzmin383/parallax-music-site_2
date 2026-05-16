import { addDays } from "date-fns"
import { formatMoscowDateString, moscowCalendarDayStart } from "./moscow-time"
import { isRussianNonWorkingHoliday } from "./russian-holidays"

function ymdFromDate(d: Date): string {
  return formatMoscowDateString(d)
}

/** День недели для календарной даты Y-M-D (как в Москве): 0 = вс … 6 = сб */
function weekdayUtcForYmd(ymd: string): number {
  const [y, m, day] = ymd.split("-").map(Number)
  return new Date(Date.UTC(y, m - 1, day)).getUTCDay()
}

function isWeekendYmd(ymd: string): boolean {
  const w = weekdayUtcForYmd(ymd)
  return w === 0 || w === 6
}

export function isRussianBusinessDayMoscow(d: Date): boolean {
  const ymd = ymdFromDate(d)
  if (isRussianNonWorkingHoliday(ymd)) return false
  if (isWeekendYmd(ymd)) return false
  return true
}

/**
 * Крайняя дата (календарный день по Москве, YYYY-MM-DD), до которой нужно отключить автоплатёж,
 * чтобы соблюсти «не позднее чем за 3 рабочих дня» до даты планового списания (оферта 5.5).
 */
export function getLatestMoscowDisableDateYmdBeforeCharge(chargeAt: Date): string | null {
  const chargeDay = moscowCalendarDayStart(chargeAt)
  let d = addDays(chargeDay, -1)
  let businessCounted = 0
  for (let i = 0; i < 400 && businessCounted < 3; i++) {
    if (isRussianBusinessDayMoscow(d)) {
      businessCounted += 1
      if (businessCounted === 3) {
        return ymdFromDate(d)
      }
    }
    d = addDays(d, -1)
  }
  return null
}
