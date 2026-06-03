import crypto from "crypto"

const TBANK_API_BASE = (process.env.TBANK_API_URL || "https://securepay.tinkoff.ru/v2").replace(/\/$/, "")

export type TbankConfig = {
  terminalKey: string
  password: string
}

export function getTbankConfig(): TbankConfig | null {
  const terminalKey = process.env.TBANK_TERMINAL_KEY?.trim()
  const password = process.env.TBANK_PASSWORD?.trim()
  if (!terminalKey || !password) return null
  return { terminalKey, password }
}

/** Корневые поля запроса/уведомления → Token (SHA-256). Вложенные объекты не участвуют. */
export function buildTbankToken(params: Record<string, unknown>, password: string): string {
  const flat: Record<string, string> = { Password: password }

  for (const [key, value] of Object.entries(params)) {
    if (key === "Token") continue
    if (value === null || value === undefined) continue
    if (typeof value === "object") continue
    flat[key] = String(value)
  }

  const concat = Object.keys(flat)
    .sort()
    .map((key) => flat[key])
    .join("")

  return crypto.createHash("sha256").update(concat, "utf8").digest("hex")
}

export function verifyTbankNotification(body: Record<string, unknown>, password: string): boolean {
  const received = body.Token
  if (typeof received !== "string" || !received) return false
  const expected = buildTbankToken(body, password)
  return expected === received
}

export type TbankInitPaymentParams = {
  amountKopecks: number
  orderId: string
  description: string
  successUrl: string
  failUrl: string
  notificationUrl?: string
  data?: Record<string, string>
}

export type TbankInitPaymentResult =
  | { ok: true; paymentId: string; paymentUrl: string }
  | { ok: false; status: number; errorCode?: string; message?: string; body: unknown }

export async function initTbankPayment(params: TbankInitPaymentParams): Promise<TbankInitPaymentResult> {
  const config = getTbankConfig()
  if (!config) {
    return { ok: false, status: 500, message: "T-Bank not configured", body: { error: "no_config" } }
  }

  const requestBody: Record<string, unknown> = {
    TerminalKey: config.terminalKey,
    Amount: params.amountKopecks,
    OrderId: params.orderId,
    Description: params.description,
    PayType: "O",
    SuccessURL: params.successUrl,
    FailURL: params.failUrl,
  }

  if (params.notificationUrl) {
    requestBody.NotificationURL = params.notificationUrl
  }

  if (params.data && Object.keys(params.data).length > 0) {
    requestBody.DATA = params.data
  }

  const tokenParams: Record<string, unknown> = {
    TerminalKey: requestBody.TerminalKey,
    Amount: String(params.amountKopecks),
    OrderId: params.orderId,
    Description: params.description,
    PayType: "O",
    SuccessURL: params.successUrl,
    FailURL: params.failUrl,
  }
  if (params.notificationUrl) {
    tokenParams.NotificationURL = params.notificationUrl
  }

  requestBody.Token = buildTbankToken(tokenParams, config.password)

  let res: Response
  try {
    res = await fetch(`${TBANK_API_BASE}/Init`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    })
  } catch (err) {
    console.error("[tbank] Init request failed:", err)
    return { ok: false, status: 500, message: "network_error", body: { error: String(err) } }
  }

  const data = (await res.json().catch(() => ({}))) as {
    Success?: boolean
    ErrorCode?: string
    Message?: string
    Details?: string
    PaymentId?: number | string
    PaymentURL?: string
  }

  if (!res.ok || data.Success !== true || data.ErrorCode !== "0") {
    return {
      ok: false,
      status: res.status,
      errorCode: data.ErrorCode,
      message: data.Message || data.Details,
      body: data,
    }
  }

  const paymentId = data.PaymentId != null ? String(data.PaymentId) : ""
  const paymentUrl = data.PaymentURL ?? ""

  if (!paymentId || !paymentUrl) {
    return {
      ok: false,
      status: 500,
      message: "invalid_response",
      body: data,
    }
  }

  return { ok: true, paymentId, paymentUrl }
}

export function rublesToKopecks(amountRub: string | number): number {
  const n = typeof amountRub === "number" ? amountRub : parseFloat(amountRub)
  if (!Number.isFinite(n) || n <= 0) return 0
  return Math.round(n * 100)
}
