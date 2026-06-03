import { NextRequest, NextResponse } from "next/server"
import { getOrderById, updateOrderStatus, type OrderSubscription } from "@/lib/orders"
import { getTbankConfig, verifyTbankNotification } from "@/lib/tbank-acquiring"
import { fulfillPaidOrder } from "@/lib/fulfill-paid-order"
import { fulfillSubscriptionOrder } from "@/lib/fulfill-subscription-order"
import {
  findTbankRecurrentTestByOrderId,
  saveTbankRecurrentTestRebillId,
  updateTbankRecurrentTestStatus,
} from "@/lib/tbank-recurrent-test-store"
import {
  findTbankReceiptTestByOrderId,
  updateTbankReceiptTestPaymentStatus,
  updateTbankReceiptTestRefundStatus,
} from "@/lib/tbank-receipt-test-store"

function getClientIp(request: NextRequest): string | null {
  const forwarded = request.headers.get("x-forwarded-for")
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() || null
  }
  return request.headers.get("x-real-ip")
}

function isIpAllowed(ip: string | null): boolean {
  const whitelist = process.env.TBANK_WEBHOOK_IP_WHITELIST
  if (!whitelist || !ip) return true
  const allowed = whitelist
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean)
  return allowed.includes(ip)
}

function parseDataMetadata(body: Record<string, unknown>): Record<string, string> {
  const data = body.DATA
  if (!data || typeof data !== "object" || Array.isArray(data)) return {}
  const out: Record<string, string> = {}
  for (const [k, v] of Object.entries(data as Record<string, unknown>)) {
    if (v != null && typeof v !== "object") out[k] = String(v)
  }
  return out
}

export async function POST(request: NextRequest) {
  const config = getTbankConfig()
  if (!config) {
    console.error("[payments/tbank/webhook] Missing TBANK env")
    return new NextResponse("OK", { status: 200 })
  }

  const clientIp = getClientIp(request)
  if (!isIpAllowed(clientIp)) {
    console.error("[payments/tbank/webhook] Forbidden IP", clientIp)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  let body: Record<string, unknown>
  try {
    body = (await request.json()) as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  if (!verifyTbankNotification(body, config.password)) {
    console.error("[payments/tbank/webhook] Invalid Token", {
      orderId: body.OrderId,
      paymentId: body.PaymentId,
      status: body.Status,
    })
    return NextResponse.json({ error: "Invalid token" }, { status: 403 })
  }

  const status = typeof body.Status === "string" ? body.Status : ""
  const orderIdRaw = typeof body.OrderId === "string" ? body.OrderId.trim() : ""

  const receiptTest = orderIdRaw ? findTbankReceiptTestByOrderId(orderIdRaw) : null
  if (receiptTest) {
    if (status) {
      updateTbankReceiptTestPaymentStatus(status)
      if (status === "REFUNDED" || status === "CANCELED" || status === "REVERSED" || status === "PARTIAL_REFUNDED") {
        updateTbankReceiptTestRefundStatus(status)
      }
    }
    return new NextResponse("OK", { status: 200 })
  }

  const recurrentMatch = orderIdRaw ? findTbankRecurrentTestByOrderId(orderIdRaw) : null
  if (recurrentMatch) {
    const rebillRaw = body.RebillId
    const rebillId = rebillRaw != null && `${rebillRaw}`.trim() ? String(rebillRaw) : ""
    if (rebillId) saveTbankRecurrentTestRebillId(rebillId)
    if (status) updateTbankRecurrentTestStatus(orderIdRaw, status)
    return new NextResponse("OK", { status: 200 })
  }

  const failedStatuses = new Set(["REJECTED", "CANCELED", "REVERSED", "DEADLINE_EXPIRED"])
  if (failedStatuses.has(status) && orderIdRaw) {
    const order = await getOrderById(orderIdRaw)
    if (
      order &&
      order.orderType === "subscription" &&
      order.isRecurringRenewal &&
      order.status === "pending"
    ) {
      await updateOrderStatus(order.id, "failed")
    }
    return new NextResponse("OK", { status: 200 })
  }

  if (status !== "CONFIRMED") {
    return new NextResponse("OK", { status: 200 })
  }

  if (!orderIdRaw) {
    return new NextResponse("OK", { status: 200 })
  }

  const order = await getOrderById(orderIdRaw)
  if (!order) {
    console.error("[payments/tbank/webhook] Order not found:", orderIdRaw)
    return new NextResponse("OK", { status: 200 })
  }

  if (order.status === "paid") {
    return new NextResponse("OK", { status: 200 })
  }

  const amountKopecks = typeof body.Amount === "number" ? body.Amount : parseInt(String(body.Amount ?? ""), 10)
  const expectedKopecks = Math.round(parseFloat(order.totalAmount) * 100)
  if (!Number.isFinite(amountKopecks) || amountKopecks !== expectedKopecks) {
    console.error("[payments/tbank/webhook] Amount mismatch", {
      orderId: orderIdRaw,
      expectedKopecks,
      received: amountKopecks,
    })
    return NextResponse.json({ error: "Amount mismatch" }, { status: 400 })
  }

  const paymentId = body.PaymentId != null ? String(body.PaymentId) : ""
  const paidAt = new Date().toISOString()
  const amountRub = (amountKopecks / 100).toFixed(2)
  const rebillRaw = body.RebillId
  const tbankRebillId = rebillRaw != null && `${rebillRaw}`.trim() ? String(rebillRaw) : null

  if (order.orderType === "subscription") {
    await fulfillSubscriptionOrder({
      order: order as OrderSubscription,
      paymentId,
      paidAt,
      amountRub,
      tbankRebillId,
      provider: "tbank",
    })
    return new NextResponse("OK", { status: 200 })
  }

  await fulfillPaidOrder({
    order,
    paymentId,
    paidAt,
    amountRub,
    metadata: parseDataMetadata(body),
    provider: "tbank",
  })

  return new NextResponse("OK", { status: 200 })
}
