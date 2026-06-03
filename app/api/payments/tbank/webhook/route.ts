import { promises as fs } from "fs"
import path from "path"
import { NextRequest, NextResponse } from "next/server"
import { getCabinetUserById } from "@/lib/cabinet-users"
import { getOrderById, updateOrderStatus } from "@/lib/orders"
import { isStaffNotificationConfigured, notifyStaffInBackground } from "@/lib/form-notifications"
import { escapeHtml } from "@/lib/telegram"
import { getTbankConfig, verifyTbankNotification } from "@/lib/tbank-acquiring"
import { isServiceOrderType, upsertNewFulfillmentIfMissing } from "@/lib/service-fulfillments"
import { getUploadsBasePath } from "@/lib/tracks"

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

async function listAiMasteringFilenames(orderId: string): Promise<string[]> {
  try {
    const base = await getUploadsBasePath()
    const dir = path.join(base, "ai-mastering-orders", orderId)
    const names = await fs.readdir(dir)
    return names
      .filter((name) => /^track-\d+\.wav$/i.test(name))
      .sort((a, b) => {
        const ai = parseInt(a.replace(/[^\d]/g, ""), 10)
        const bi = parseInt(b.replace(/[^\d]/g, ""), 10)
        return ai - bi
      })
  } catch {
    return []
  }
}

function notifyAiMasteringPaid(params: {
  orderId: string
  paymentId: string
  amountRub: string
  order: {
    userId: string
    tracksCount: number
    contactEmail?: string
    contactTelegram?: string
  }
  trackTitles: string
}): void {
  if (!isStaffNotificationConfigured()) return

  void (async () => {
    try {
      const user = await getCabinetUserById(params.order.userId)
      const accountEmail = user?.email ?? `userId=${params.order.userId}`
      const filesPath = `ai-mastering-orders/${params.orderId}`

      const contactLines: string[] = []
      if (params.order.contactEmail) {
        contactLines.push(`<b>Контакт (email):</b> ${escapeHtml(params.order.contactEmail)}`)
      }
      if (params.order.contactTelegram) {
        contactLines.push(`<b>Контакт (Telegram):</b> ${escapeHtml(params.order.contactTelegram)}`)
      }

      const messageLines = [
        "<b>Оплата: AI мастеринг (T-Bank)</b>",
        "",
        `<b>Аккаунт:</b> ${escapeHtml(accountEmail)}`,
        ...contactLines,
        `<b>Файлы (каталог):</b> ${escapeHtml(filesPath)}`,
        `<b>Имена файлов:</b> ${escapeHtml(params.trackTitles)}`,
        `<b>Количество треков:</b> ${params.order.tracksCount}`,
        `<b>Сумма:</b> ${escapeHtml(params.amountRub)} RUB`,
        `<b>ID заказа:</b> ${escapeHtml(params.orderId)}`,
        `<b>ID платежа:</b> ${escapeHtml(params.paymentId)}`,
        "",
        "#ai_mastering #оплата #tbank",
      ]

      notifyStaffInBackground({
        telegramMessage: messageLines.join("\n"),
        emailSubject: `[Parallax] Оплата AI мастеринг: ${accountEmail}`,
        logContext: "payments/tbank/webhook ai_mastering",
      })
    } catch (err) {
      console.error("[payments/tbank/webhook] Notification error for ai_mastering", err)
    }
  })()
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
  if (status !== "CONFIRMED") {
    return new NextResponse("OK", { status: 200 })
  }

  const orderId = typeof body.OrderId === "string" ? body.OrderId.trim() : ""
  if (!orderId) {
    console.error("[payments/tbank/webhook] Missing OrderId")
    return new NextResponse("OK", { status: 200 })
  }

  const order = await getOrderById(orderId)
  if (!order) {
    console.error("[payments/tbank/webhook] Order not found:", orderId)
    return new NextResponse("OK", { status: 200 })
  }

  if (order.orderType !== "ai_mastering") {
    console.error("[payments/tbank/webhook] Unexpected order type for T-Bank pilot:", order.orderType, orderId)
    return new NextResponse("OK", { status: 200 })
  }

  if (order.status === "paid") {
    return new NextResponse("OK", { status: 200 })
  }

  const amountKopecks = typeof body.Amount === "number" ? body.Amount : parseInt(String(body.Amount ?? ""), 10)
  const expectedKopecks = Math.round(parseFloat(order.totalAmount) * 100)
  if (!Number.isFinite(amountKopecks) || amountKopecks !== expectedKopecks) {
    console.error("[payments/tbank/webhook] Amount mismatch", {
      orderId,
      expectedKopecks,
      received: amountKopecks,
    })
    return NextResponse.json({ error: "Amount mismatch" }, { status: 400 })
  }

  const paymentId = body.PaymentId != null ? String(body.PaymentId) : ""
  const paidAt = new Date().toISOString()

  await updateOrderStatus(orderId, "paid", { paidAt, paymentId: paymentId || undefined })

  if (isServiceOrderType(order.orderType)) {
    try {
      upsertNewFulfillmentIfMissing(orderId)
    } catch (e) {
      console.error("[payments/tbank/webhook] service_fulfillments insert failed", { orderId, e })
    }
  }

  const filenames = await listAiMasteringFilenames(orderId)
  const trackTitles = filenames.length > 0 ? filenames.join(" | ") : "-"

  notifyAiMasteringPaid({
    orderId,
    paymentId,
    amountRub: order.totalAmount,
    order: {
      userId: order.userId,
      tracksCount: order.tracksCount,
      contactEmail: order.contactEmail,
      contactTelegram: order.contactTelegram,
    },
    trackTitles,
  })

  return new NextResponse("OK", { status: 200 })
}
