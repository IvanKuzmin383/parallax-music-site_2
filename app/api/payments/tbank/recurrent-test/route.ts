import crypto from "crypto"
import { NextRequest, NextResponse } from "next/server"
import {
  getTbankConfig,
  initTbankPayment,
  initTbankRecurrentChildPayment,
  chargeTbankRecurrentPayment,
} from "@/lib/tbank-acquiring"
import {
  isTbankRecurrentTestEnabled,
  verifyTbankRecurrentTestAccess,
} from "@/lib/tbank-recurrent-test-auth"
import {
  resetTbankRecurrentTestParent,
  setTbankRecurrentTestChildInit,
  setTbankRecurrentTestChargeError,
  getTbankRecurrentTestState,
  TBANK_RECURRENT_TEST_AMOUNT_KOPECKS,
  TBANK_RECURRENT_TEST_CUSTOMER_KEY,
} from "@/lib/tbank-recurrent-test-store"

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

  const state = await getTbankRecurrentTestState()

  return NextResponse.json({
    enabled: true,
    state,
    checklist: {
      test5InitWithRecurrentY: Boolean(state?.parentPaymentId),
      test5RebillIdSaved: Boolean(state?.rebillId),
      test5ParentConfirmed: state?.parentStatus === "CONFIRMED",
      test6ChildInit: Boolean(state?.childPaymentId),
      test6ChildConfirmed: state?.childStatus === "CONFIRMED",
    },
    instructions: {
      test5: [
        "POST /api/payments/tbank/recurrent-test - создать родительский платёж (Recurrent=Y).",
        "Оплатить картой 4000 0000 0000 0333, 12/30, 111.",
        "Webhook сохранит RebillId из уведомления.",
        "В ЛК Т-Бизнес нажать «Проверить» для теста №5.",
      ],
      test6: [
        "PUT /api/payments/tbank/recurrent-test - Init child + Charge по RebillId.",
        "Дождаться child_status = CONFIRMED в статусе ниже.",
        "В ЛК Т-Бизнес нажать «Проверить» для теста №6.",
      ],
    },
  })
}

export async function POST(request: NextRequest) {
  if (!isTbankRecurrentTestEnabled()) return disabledResponse()
  if (!verifyTbankRecurrentTestAccess(request)) return unauthorizedResponse()
  if (!getTbankConfig()) {
    return NextResponse.json({ error: "T-Bank not configured" }, { status: 500 })
  }

  const orderId = crypto.randomUUID()
  const base = siteBase()
  const returnUrl = `${base}/admin26081993/tbank-recurrent-test?step=parent&payment=return`
  const failUrl = `${base}/admin26081993/tbank-recurrent-test?step=parent&payment=fail`

  const pay = await initTbankPayment({
    amountKopecks: TBANK_RECURRENT_TEST_AMOUNT_KOPECKS,
    orderId,
    description: "T-Bank recurrent test parent",
    successUrl: returnUrl,
    failUrl,
    notificationUrl: notificationUrl(),
    recurrent: true,
    customerKey: TBANK_RECURRENT_TEST_CUSTOMER_KEY,
    operationInitiatorType: "1",
    data: {
      testKind: "recurrent",
      testStep: "parent",
    },
  })

  if (!pay.ok) {
    console.error("[tbank/recurrent-test/init] Init error:", pay.body)
    return NextResponse.json(
      { error: pay.message || "Init failed", details: pay.body },
      { status: 500 }
    )
  }

  const state = await resetTbankRecurrentTestParent({
    parentOrderId: orderId,
    parentPaymentId: pay.paymentId,
  })

  return NextResponse.json({
    ok: true,
    paymentUrl: pay.paymentUrl,
    paymentId: pay.paymentId,
    orderId,
    state,
    testCard: {
      pan: "4000 0000 0000 0333",
      exp: "12/30",
      cvc: "111",
    },
  })
}

export async function PUT(request: NextRequest) {
  if (!isTbankRecurrentTestEnabled()) return disabledResponse()
  if (!verifyTbankRecurrentTestAccess(request)) return unauthorizedResponse()
  if (!getTbankConfig()) {
    return NextResponse.json({ error: "T-Bank not configured" }, { status: 500 })
  }

  const state = await getTbankRecurrentTestState()
  if (!state?.rebillId) {
    return NextResponse.json(
      {
        error: "RebillId ещё не сохранён. Сначала выполните тест №5 и дождитесь webhook AUTHORIZED/CONFIRMED.",
        state,
      },
      { status: 400 }
    )
  }

  const childOrderId = crypto.randomUUID()
  const childInit = await initTbankRecurrentChildPayment({
    amountKopecks: TBANK_RECURRENT_TEST_AMOUNT_KOPECKS,
    orderId: childOrderId,
    description: "T-Bank recurrent test child charge",
    customerKey: TBANK_RECURRENT_TEST_CUSTOMER_KEY,
    notificationUrl: notificationUrl(),
    data: {
      testKind: "recurrent",
      testStep: "child",
    },
  })

  if (!childInit.ok) {
    const message = childInit.message || "Child Init failed"
    await setTbankRecurrentTestChargeError(message)
    return NextResponse.json({ error: message, details: childInit.body }, { status: 500 })
  }

  await setTbankRecurrentTestChildInit({
    childOrderId,
    childPaymentId: childInit.paymentId,
  })

  const charge = await chargeTbankRecurrentPayment({
    paymentId: childInit.paymentId,
    rebillId: state.rebillId,
  })

  if (!charge.ok) {
    const message = charge.message || "Charge failed"
    await setTbankRecurrentTestChargeError(message)
    return NextResponse.json(
      {
        error: message,
        details: charge.body,
        childOrderId,
        childPaymentId: childInit.paymentId,
      },
      { status: 500 }
    )
  }

  return NextResponse.json({
    ok: true,
    childOrderId,
    childPaymentId: childInit.paymentId,
    rebillId: state.rebillId,
    state: await getTbankRecurrentTestState(),
    message: "Charge отправлен. Дождитесь webhook CONFIRMED для child-платежа, затем нажмите «Проверить» в ЛК Т-Бизнес.",
  })
}
