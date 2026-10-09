/** Пополнение баланса кабинета картой. */
export const WALLET_TOPUP_MIN_RUB = 100
export const WALLET_TOPUP_MAX_RUB = 300_000

export const WALLET_TOPUP_PRESETS_RUB = [500, 1000, 3000, 5000] as const

export function parseWalletTopupAmount(raw: unknown): number | null {
  const n =
    typeof raw === "number"
      ? raw
      : typeof raw === "string"
        ? Number(raw.replace(",", ".").replace(/\s/g, ""))
        : NaN
  if (!Number.isFinite(n)) return null
  const rounded = Math.round((n + Number.EPSILON) * 100) / 100
  if (rounded < WALLET_TOPUP_MIN_RUB || rounded > WALLET_TOPUP_MAX_RUB) return null
  return rounded
}
