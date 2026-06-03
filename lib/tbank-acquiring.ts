import crypto from "crypto"
import type { TbankReceiptPayload } from "./tbank-receipt"

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
  recurrent?: boolean
  customerKey?: string
  operationInitiatorType?: string
  receipt?: TbankReceiptPayload
}

export type TbankApiResult =
  | { ok: true; paymentId: string; paymentUrl?: string; body: unknown }
  | { ok: false; status: number; errorCode?: string; message?: string; body: unknown }

async function postTbank<T extends Record<string, unknown>>(
  endpoint: string,
  requestBody: Record<string, unknown>,
  tokenParams: Record<string, unknown>
): Promise<TbankApiResult> {
  const config = getTbankConfig()
  if (!config) {
    return { ok: false, status: 500, message: "T-Bank not configured", body: { error: "no_config" } }
  }

  requestBody.Token = buildTbankToken(tokenParams, config.password)

  let res: Response
  try {
    res = await fetch(`${TBANK_API_BASE}/${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    })
  } catch (err) {
    console.error(`[tbank] ${endpoint} request failed:`, err)
    return { ok: false, status: 500, message: "network_error", body: { error: String(err) } }
  }

  const data = (await res.json().catch(() => ({}))) as T & {
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
  if (!paymentId) {
    return { ok: false, status: 500, message: "invalid_response", body: data }
  }

  return {
    ok: true,
    paymentId,
    paymentUrl: data.PaymentURL,
    body: data,
  }
}

function buildInitPayload(params: TbankInitPaymentParams): {
  requestBody: Record<string, unknown>
  tokenParams: Record<string, unknown>
} {
  const requestBody: Record<string, unknown> = {
    TerminalKey: getTbankConfig()!.terminalKey,
    Amount: params.amountKopecks,
    OrderId: params.orderId,
    Description: params.description,
    PayType: "O",
    SuccessURL: params.successUrl,
    FailURL: params.failUrl,
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
    requestBody.NotificationURL = params.notificationUrl
    tokenParams.NotificationURL = params.notificationUrl
  }

  if (params.data && Object.keys(params.data).length > 0) {
    requestBody.DATA = params.data
  }

  if (params.recurrent && params.customerKey) {
    requestBody.Recurrent = "Y"
    requestBody.CustomerKey = params.customerKey
    tokenParams.Recurrent = "Y"
    tokenParams.CustomerKey = params.customerKey
  } else if (params.customerKey) {
    requestBody.CustomerKey = params.customerKey
    tokenParams.CustomerKey = params.customerKey
  }

  if (params.operationInitiatorType) {
    requestBody.OperationInitiatorType = params.operationInitiatorType
    tokenParams.OperationInitiatorType = params.operationInitiatorType
  }

  if (params.receipt) {
    requestBody.Receipt = params.receipt
  }

  return { requestBody, tokenParams }
}

export type TbankInitPaymentResult =
  | { ok: true; paymentId: string; paymentUrl: string }
  | { ok: false; status: number; errorCode?: string; message?: string; body: unknown }

export async function initTbankPayment(params: TbankInitPaymentParams): Promise<TbankInitPaymentResult> {
  if (!getTbankConfig()) {
    return { ok: false, status: 500, message: "T-Bank not configured", body: { error: "no_config" } }
  }

  const { requestBody, tokenParams } = buildInitPayload(params)
  const result = await postTbank("Init", requestBody, tokenParams)
  if (!result.ok) {
    return {
      ok: false,
      status: result.status,
      errorCode: result.errorCode,
      message: result.message,
      body: result.body,
    }
  }

  const paymentUrl = result.paymentUrl ?? ""
  if (!paymentUrl) {
    return { ok: false, status: 500, message: "invalid_response", body: result.body }
  }

  return { ok: true, paymentId: result.paymentId, paymentUrl }
}

export type TbankChargeResult =
  | { ok: true; paymentId: string; body: unknown }
  | { ok: false; status: number; errorCode?: string; message?: string; body: unknown }

export async function chargeTbankRecurrentPayment(params: {
  paymentId: string
  rebillId: string
}): Promise<TbankChargeResult> {
  const config = getTbankConfig()
  if (!config) {
    return { ok: false, status: 500, message: "T-Bank not configured", body: { error: "no_config" } }
  }

  const requestBody: Record<string, unknown> = {
    TerminalKey: config.terminalKey,
    PaymentId: params.paymentId,
    RebillId: params.rebillId,
  }

  const tokenParams: Record<string, unknown> = {
    TerminalKey: config.terminalKey,
    PaymentId: params.paymentId,
    RebillId: params.rebillId,
  }

  const result = await postTbank("Charge", requestBody, tokenParams)
  if (!result.ok) {
    return {
      ok: false,
      status: result.status,
      errorCode: result.errorCode,
      message: result.message,
      body: result.body,
    }
  }

  return { ok: true, paymentId: result.paymentId, body: result.body }
}

/** Init для дочернего COF-платежа (без редиректа на форму). */
export async function initTbankRecurrentChildPayment(params: {
  amountKopecks: number
  orderId: string
  description: string
  customerKey: string
  notificationUrl?: string
  data?: Record<string, string>
}): Promise<TbankInitPaymentResult> {
  if (!getTbankConfig()) {
    return { ok: false, status: 500, message: "T-Bank not configured", body: { error: "no_config" } }
  }

  const initParams: TbankInitPaymentParams = {
    amountKopecks: params.amountKopecks,
    orderId: params.orderId,
    description: params.description,
    successUrl: "https://example.com/tbank-recurrent-test-success",
    failUrl: "https://example.com/tbank-recurrent-test-fail",
    notificationUrl: params.notificationUrl,
    data: params.data,
    customerKey: params.customerKey,
    operationInitiatorType: "R",
  }

  const { requestBody, tokenParams } = buildInitPayload(initParams)
  const result = await postTbank("Init", requestBody, tokenParams)
  if (!result.ok) {
    return {
      ok: false,
      status: result.status,
      errorCode: result.errorCode,
      message: result.message,
      body: result.body,
    }
  }

  return { ok: true, paymentId: result.paymentId, paymentUrl: result.paymentUrl ?? "" }
}

export type TbankCancelResult =
  | { ok: true; paymentId: string; body: unknown }
  | { ok: false; status: number; errorCode?: string; message?: string; body: unknown }

/** Полная или частичная отмена / возврат (тест №8). При полной отмене Receipt не передаётся. */
export async function cancelTbankPayment(params: {
  paymentId: string
  amountKopecks?: number
}): Promise<TbankCancelResult> {
  const config = getTbankConfig()
  if (!config) {
    return { ok: false, status: 500, message: "T-Bank not configured", body: { error: "no_config" } }
  }

  const requestBody: Record<string, unknown> = {
    TerminalKey: config.terminalKey,
    PaymentId: params.paymentId,
  }

  const tokenParams: Record<string, unknown> = {
    TerminalKey: config.terminalKey,
    PaymentId: params.paymentId,
  }

  if (params.amountKopecks != null) {
    requestBody.Amount = params.amountKopecks
    tokenParams.Amount = String(params.amountKopecks)
  }

  const result = await postTbank("Cancel", requestBody, tokenParams)
  if (!result.ok) {
    return {
      ok: false,
      status: result.status,
      errorCode: result.errorCode,
      message: result.message,
      body: result.body,
    }
  }

  return { ok: true, paymentId: result.paymentId, body: result.body }
}

export function rublesToKopecks(amountRub: string | number): number {
  const n = typeof amountRub === "number" ? amountRub : parseFloat(amountRub)
  if (!Number.isFinite(n) || n <= 0) return 0
  return Math.round(n * 100)
}
