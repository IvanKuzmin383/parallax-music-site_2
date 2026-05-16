import crypto from "crypto"
import type { PlanId } from "./plan-pricing"
import { planIdToSubscriptionName } from "./plan-pricing"

const YOOKASSA_API = "https://api.yookassa.ru/v3/payments"

export function merchantCustomerIdFromEmail(email: string): string {
  return crypto.createHash("sha256").update(email.trim().toLowerCase()).digest("hex").slice(0, 64)
}

function parseVatCode(): number {
  const raw = process.env.YOOKASSA_RECEIPT_VAT_CODE
  const n = raw ? parseInt(raw, 10) : 1
  return Number.isFinite(n) && n >= 1 && n <= 6 ? n : 1
}

export type YooKassaReceiptPayload = {
  customer: { email: string }
  items: Array<{
    description: string
    quantity: string
    amount: { value: string; currency: "RUB" }
    vat_code: number
  }>
}

export function buildSubscriptionReceipt(params: {
  customerEmail: string
  planId: PlanId
  period: "month" | "year"
  periodsCount: number
  totalAmount: string
}): YooKassaReceiptPayload {
  const name = planIdToSubscriptionName(params.planId)
  const periodLabel = params.period === "month" ? "мес." : "год"
  const description = `Подписка ${name}, ${periodLabel} × ${params.periodsCount}`
  return {
    customer: { email: params.customerEmail.trim().toLowerCase() },
    items: [
      {
        description: description.slice(0, 128),
        quantity: "1",
        amount: { value: params.totalAmount, currency: "RUB" },
        vat_code: parseVatCode(),
      },
    ],
  }
}

export function shouldSendYooKassaReceipt(): boolean {
  if (process.env.YOOKASSA_SKIP_RECEIPT === "1" || process.env.YOOKASSA_SKIP_RECEIPT === "true") {
    return false
  }
  return true
}

export function getYooKassaAuthHeader(): string | null {
  const shopId = process.env.YOOKASSA_SHOP_ID
  const secretKey = process.env.YOOKASSA_SECRET_KEY
  if (!shopId || !secretKey) return null
  return `Basic ${Buffer.from(`${shopId}:${secretKey}`).toString("base64")}`
}

export type YooKassaPaymentObject = {
  id?: string
  status?: string
  amount?: { value?: string; currency?: string }
  metadata?: Record<string, string>
  payment_method?: {
    id?: string
    saved?: boolean
    type?: string
  }
}

export async function fetchYooKassaPayment(paymentId: string): Promise<YooKassaPaymentObject | null> {
  const auth = getYooKassaAuthHeader()
  if (!auth) return null
  let lastErr: unknown
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(`${YOOKASSA_API}/${paymentId}`, {
        headers: { Authorization: auth },
      })
      if (!res.ok) {
        lastErr = new Error(`GET payment ${res.status}`)
        if (res.status >= 500 && attempt < 2) {
          await new Promise((r) => setTimeout(r, 400 * (attempt + 1)))
          continue
        }
        return null
      }
      return (await res.json()) as YooKassaPaymentObject
    } catch (e) {
      lastErr = e
      if (attempt < 2) await new Promise((r) => setTimeout(r, 400 * (attempt + 1)))
    }
  }
  console.error("[yookassa] fetchYooKassaPayment failed", paymentId, lastErr)
  return null
}

export async function createYooKassaRecurrentPayment(params: {
  paymentMethodId: string
  amountValue: string
  description: string
  metadata: Record<string, string>
  idempotenceKey: string
  receipt?: YooKassaReceiptPayload
}): Promise<{ ok: true; paymentId: string } | { ok: false; status: number; body: unknown }> {
  const auth = getYooKassaAuthHeader()
  if (!auth) {
    return { ok: false, status: 500, body: { error: "no_auth" } }
  }

  const body: Record<string, unknown> = {
    amount: { value: params.amountValue, currency: "RUB" },
    payment_method_id: params.paymentMethodId,
    capture: true,
    description: params.description,
    metadata: params.metadata,
  }

  if (params.receipt && shouldSendYooKassaReceipt()) {
    body.receipt = params.receipt
  }

  const res = await fetch(YOOKASSA_API, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: auth,
      "Idempotence-Key": params.idempotenceKey,
    },
    body: JSON.stringify(body),
  })

  const data = (await res.json().catch(() => ({}))) as { id?: string }
  if (!res.ok || !data.id) {
    return { ok: false, status: res.status, body: data }
  }
  return { ok: true, paymentId: data.id }
}
