export type TbankReceiptPayload = {
  Email: string
  Taxation: string
  Items: Array<{
    Name: string
    Price: number
    Quantity: number
    Amount: number
    Tax: string
    PaymentMethod: string
    PaymentObject: string
  }>
}

/** УСН «доходы» по умолчанию (ИП). Переопределение: TBANK_RECEIPT_TAXATION */
export function getTbankReceiptTaxation(): string {
  return process.env.TBANK_RECEIPT_TAXATION?.trim() || "usn_income"
}

export function getTbankReceiptTax(): string {
  return process.env.TBANK_RECEIPT_TAX?.trim() || "none"
}

export function shouldSendTbankReceipt(): boolean {
  if (process.env.TBANK_SKIP_RECEIPT === "1" || process.env.TBANK_SKIP_RECEIPT === "true") {
    return false
  }
  return process.env.TBANK_SEND_RECEIPT !== "false"
}

export function buildTbankTestReceipt(params: {
  email: string
  amountKopecks: number
  itemName?: string
}): TbankReceiptPayload {
  const name = (params.itemName || "T-Bank receipt test").slice(0, 128)
  return {
    Email: params.email.trim().toLowerCase(),
    Taxation: getTbankReceiptTaxation(),
    Items: [
      {
        Name: name,
        Price: params.amountKopecks,
        Quantity: 1,
        Amount: params.amountKopecks,
        Tax: getTbankReceiptTax(),
        PaymentMethod: "full_payment",
        PaymentObject: "service",
      },
    ],
  }
}
