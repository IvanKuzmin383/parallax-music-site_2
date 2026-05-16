/** Склонение для 1 / 2–4 / 5+ (и 11–14 → форма «много») */
function ruPlural(n: number, one: string, few: string, many: string): string {
  const nAbs = Math.abs(n) % 100
  const n1 = nAbs % 10
  if (nAbs >= 11 && nAbs <= 14) return many
  if (n1 === 1) return one
  if (n1 >= 2 && n1 <= 4) return few
  return many
}

/** Подпись пункта в списке «количество периодов» (1 месяц / 1 год и т.д.) */
export function formatPayPeriodOptionLabel(
  n: number,
  period: "month" | "year",
  locale: "ru" | "en"
): string {
  if (locale === "en") {
    if (period === "month") {
      return n === 1 ? "1 month" : `${n} months`
    }
    return n === 1 ? "1 year" : `${n} years`
  }
  if (period === "month") {
    return `${n} ${ruPlural(n, "месяц", "месяца", "месяцев")}`
  }
  return `${n} ${ruPlural(n, "год", "года", "лет")}`
}

/** Подпись «N месяцев» в строке итога (× ...) */
export function formatMonthsCountLabel(totalMonths: number, locale: "ru" | "en"): string {
  if (locale === "en") {
    return totalMonths === 1 ? "1 month" : `${totalMonths} months`
  }
  return `${totalMonths} ${ruPlural(totalMonths, "месяц", "месяца", "месяцев")}`
}
