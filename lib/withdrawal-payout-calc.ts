/** Прогнозный расчёт выплаты роялти физлицу: взносы 30% и НДФЛ 13% из фонда выплаты. */

export const INDIVIDUAL_INSURANCE_RATE = 0.3
export const INDIVIDUAL_NDFL_RATE = 0.13
/** Ориентир НПД при выплате самозанятому от ИП / юрлица. */
export const SELF_EMPLOYED_NPD_RATE = 0.06

export const WITHDRAWAL_RECIPIENT_STATUSES = [
  "individual",
  "self_employed",
  "ie",
  "legal_entity",
] as const

export type WithdrawalRecipientStatus = (typeof WITHDRAWAL_RECIPIENT_STATUSES)[number]

export const WITHDRAWAL_RECIPIENT_STATUS_LABELS: Record<WithdrawalRecipientStatus, string> = {
  individual: "Физлицо",
  self_employed: "Самозанятый",
  ie: "ИП",
  legal_entity: "Юрлицо",
}

export function isWithdrawalRecipientStatus(value: string): value is WithdrawalRecipientStatus {
  return (WITHDRAWAL_RECIPIENT_STATUSES as readonly string[]).includes(value)
}

export type IndividualPayoutEstimate = {
  royalty: number
  gross: number
  ndfl: number
  insurance: number
  net: number
  withheld: number
}

export type SelfEmployedPayoutEstimate = {
  royalty: number
  netFromLabel: number
  npdEstimate: number
  afterOwnTax: number
}

export type WithdrawalPayoutSnapshot = {
  recipientStatus: WithdrawalRecipientStatus
  amount: number
  payoutGross: number
  payoutNdfl: number
  payoutInsurance: number
  payoutNet: number
}

function toKopecks(rub: number): number {
  return Math.round(rub * 100)
}

function fromKopecks(kop: number): number {
  return kop / 100
}

export function estimateIndividualPayout(royalty: number): IndividualPayoutEstimate {
  const royaltyKop = toKopecks(royalty)
  const grossKop = Math.round(royaltyKop / (1 + INDIVIDUAL_INSURANCE_RATE))
  const insuranceKop = royaltyKop - grossKop
  const ndflRub = Math.round((grossKop * INDIVIDUAL_NDFL_RATE) / 100)
  const ndflKop = ndflRub * 100
  const netKop = grossKop - ndflKop

  return {
    royalty: fromKopecks(royaltyKop),
    gross: fromKopecks(grossKop),
    ndfl: ndflRub,
    insurance: fromKopecks(insuranceKop),
    net: fromKopecks(netKop),
    withheld: fromKopecks(ndflKop + insuranceKop),
  }
}

export function estimateSelfEmployedPayout(royalty: number): SelfEmployedPayoutEstimate {
  const royaltyKop = toKopecks(royalty)
  const npdKop = Math.round(royaltyKop * SELF_EMPLOYED_NPD_RATE)
  return {
    royalty: fromKopecks(royaltyKop),
    netFromLabel: fromKopecks(royaltyKop),
    npdEstimate: fromKopecks(npdKop),
    afterOwnTax: fromKopecks(royaltyKop - npdKop),
  }
}

export function snapshotWithdrawalPayout(
  royalty: number,
  status: WithdrawalRecipientStatus
): WithdrawalPayoutSnapshot {
  const amount = fromKopecks(toKopecks(royalty))
  if (status === "individual") {
    const estimate = estimateIndividualPayout(amount)
    return {
      recipientStatus: status,
      amount: estimate.royalty,
      payoutGross: estimate.gross,
      payoutNdfl: estimate.ndfl,
      payoutInsurance: estimate.insurance,
      payoutNet: estimate.net,
    }
  }
  return {
    recipientStatus: status,
    amount,
    payoutGross: amount,
    payoutNdfl: 0,
    payoutInsurance: 0,
    payoutNet: amount,
  }
}

export function formatRub(amount: number): string {
  const fractionDigits = Number.isInteger(amount) ? 0 : 2
  return `${amount.toLocaleString("ru-RU", {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: 2,
  })} ₽`
}
