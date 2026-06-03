import crypto from "crypto"
import { NextRequest, NextResponse } from "next/server"
import { cancelTbankPayment, getTbankConfig, initTbankPayment } from "@/lib/tbank-acquiring"
import { buildTbankTestReceipt } from "@/lib/tbank-receipt"
import {
  getTbankReceiptTestState,
  resetTbankReceiptTestPayment,
  setTbankReceiptTestRefundError,
  TBANK_RECEIPT_TEST_AMOUNT_KOPECKS,
} from "@/lib/tbank-receipt-test-store"
import {
  isTbankRecurrentTestEnabled,
  verifyTbankRecurrentTestAccess,
} from "@/lib/tbank-recurrent-test-auth"

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function disabledResponse() {
  return NextResponse.json({ error: "Not found" }, { status: 404 })
}

function unauthorizedResponse() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
}

function siteBase(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || "https://parallaxmusic.ru").replace(/\/$/, "")
}

function notificationUrl(): string {
  return process.env.TBANK_NOTIFICATION_URL?.trim() || `${siteBase()}/api/payments/tbank/webhook`
}

export async function GET(request: NextRequest) {
  if (!isTbankRecurrentTestEnabled()) return disabledResponse()
  if (!verifyTbankRecurrentTestAccess(request)) return unauthorizedResponse()

  const state = getTbankReceiptTestState()

  return NextResponse.json({
    enabled: true,
    state,
    amountRub: TBANK_RECEIPT_TEST_AMOUNT_KOPECKS / 100,
    checklist: {
      test7InitWithReceipt: Boolean(state?.paymentId),
      test7PaymentConfirmed: state?.paymentStatus === "CONFIRMED",
      test8RefundRequested: state?.refundStatus != null && state.refundStatus !== "",
      test8RefundCompleted:
        state?.refundStatus === "REFUNDED" ||
        state?.refundStatus === "CANCELED" ||
        state?.refundStatus === "REVERSED",
    },
    testCard: {
      pan: "4000 0000 0000 0101",
      exp: "12/30",
      cvc: "111",
    },
  })
}

export async function POST(request: NextRequest) {
  if (!isTbankRecurrentTestEnabled()) return disabledResponse()
  if (!verifyTbankRecurrentTestAccess(request)) return unauthorizedResponse()
  if (!getTbankConfig()) {
    return NextResponse.json({ error: "T-Bank not configured" }, { status: 500 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    body = {}
  }

  const emailRaw =
    typeof body === "object" && body && "email" in body && typeof (body as { email?: unknown }).email === "string"
      ? (body as { email: string }).email.trim()
      : process.env.TBANK_RECEIPT_TEST_EMAIL?.trim() || "receipt-test@parallaxmusic.ru"

  if (!EMAIL_REGEX.test(emailRaw)) {
    return NextResponse.json({ error: "Некорректный email для чека" }, { status: 400 })
  }

  const orderId = crypto.randomUUID()
  const base = siteBase()
  const returnUrl = `${base}/admin26081993/tbank-receipt-test?payment=return`
  const failUrl = `${base}/admin26081993/tbank-receipt-test?payment=fail`

  const receipt = buildTbankTestReceipt({
    email: emailRaw,
    amountKopecks: TBANK_RECEIPT_TEST_AMOUNT_KOPECKS,
    itemName: "T-Bank receipt test",
  })

  const pay = await initTbankPayment({
    amountKopecks: TBANK_RECEIPT_TEST_AMOUNT_KOPECKS,
    orderId,
    description: "T-Bank receipt test payment",
    successUrl: returnUrl,
    failUrl,
    notificationUrl: notificationUrl(),
    receipt,
    data: {
      testKind: "receipt",
      testStep: "payment",
    },
  })

  if (!pay.ok) {
    console.error("[tbank/receipt-test] Init error:", pay.body)
    return NextResponse.json(
      { error: pay.message || "Init failed", details: pay.body },
      { status: 500 }
    )
  }

  const state = resetTbankReceiptTestPayment({
    orderId,
    paymentId: pay.paymentId,
    receiptEmail: emailRaw,
  })

  return NextResponse.json({
    ok: true,
    paymentUrl: pay.paymentUrl,
    paymentId: pay.paymentId,
    orderId,
    receiptEmail: emailRaw,
    state,
  })
}

export async function PUT(request: NextRequest) {
  if (!isTbankRecurrentTestEnabled()) return disabledResponse()
  if (!verifyTbankRecurrentTestAccess(request)) return unauthorizedResponse()
  if (!getTbankConfig()) {
    return NextResponse.json({ error: "T-Bank not configured" }, { status: 500 })
  }

  const state = getTbankReceiptTestState()
  if (!state?.paymentId) {
    return NextResponse.json(
      { error: "Сначала выполните тест №7 (оплата с Receipt)." },
      { status: 400 }
    )
  }

  if (state.paymentStatus !== "CONFIRMED") {
    return NextResponse.json(
      {
        error: "Платёж ещё не CONFIRMED. Дождитесь webhook или повторите оплату.",
        state,
      },
      { status: 400 }
    )
  }

  const cancel = await cancelTbankPayment({ paymentId: state.paymentId })

  if (!cancel.ok) {
    const message = cancel.message || "Cancel failed"
    setTbankReceiptTestRefundError(message)
    return NextResponse.json({ error: message, details: cancel.body }, { status: 500 })
  }

  return NextResponse.json({
    ok: true,
    paymentId: state.paymentId,
    state: getTbankReceiptTestState(),
    message:
      "Запрос Cancel отправлен. Дождитесь refund_status в статусе (REFUNDED/CANCELED), затем «Проверить» в ЛК для теста №8.",
  })
}
