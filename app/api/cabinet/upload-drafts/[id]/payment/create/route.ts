import crypto from "crypto"
import { NextRequest, NextResponse } from "next/server"
import { getCabinetToken, getCabinetSession } from "@/lib/cabinet-auth"
import { getCabinetUserByEmail } from "@/lib/cabinet-users"
import { uploadDraftAddonBundleTotalRub } from "@/lib/cabinet-upload-draft-addons"
import { createOrder, updateOrderStatus } from "@/lib/orders"
import { AI_COVER_REQUEST_PRICE_RUB } from "@/lib/track-constants"
import { getUploadDraftById, updateUploadDraft } from "@/lib/upload-drafts"

const YOOKASSA_API = "https://api.yookassa.ru/v3/payments"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = getCabinetToken(request)
  const session = getCabinetSession(token)
  if (!session) return NextResponse.json({ error: "Необходима авторизация" }, { status: 401 })
  const { id } = await params
  const draft = await getUploadDraftById(id)
  if (!draft || draft.userId.toLowerCase() !== session.email.toLowerCase()) {
    return NextResponse.json({ error: "Черновик не найден" }, { status: 404 })
  }
  const shopId = process.env.YOOKASSA_SHOP_ID
  const secretKey = process.env.YOOKASSA_SECRET_KEY
  if (!shopId || !secretKey) return NextResponse.json({ error: "Оплата временно недоступна" }, { status: 500 })
  const user = await getCabinetUserByEmail(session.email)
  if (!user) return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 })

  const aiCoverRub = Boolean(draft.payload.requestAiCover) ? AI_COVER_REQUEST_PRICE_RUB : 0
  const totalRub = uploadDraftAddonBundleTotalRub(draft.payload) + aiCoverRub
  if (totalRub <= 0) {
    await updateUploadDraft(draft.id, { status: "paid", bundleOrderId: null })
    return NextResponse.json({ ok: true, skippedPayment: true })
  }

  const order = await createOrder({
    orderType: "upload_addon_bundle",
    userId: user.id,
    tracksCount: 1,
    totalAmount: totalRub.toFixed(2),
    draftId: draft.id,
    uploadAddonBundlePayloadJson: JSON.stringify(draft.payload),
  })
  await updateUploadDraft(draft.id, { bundleOrderId: order.id, status: "awaiting_payment" })

  const siteBase = (process.env.NEXT_PUBLIC_SITE_URL || "https://parallaxmusic.ru").replace(/\/$/, "")
  const returnPath = draft.kind === "album" ? "/cabinet/upload/album" : "/cabinet/upload"
  const returnUrl = `${siteBase}${returnPath}?draftId=${encodeURIComponent(draft.id)}&payment=return`
  const auth = Buffer.from(`${shopId}:${secretKey}`).toString("base64")
  const idempotenceKey = crypto.randomUUID()
  const yookassaBody = {
    amount: { value: order.totalAmount, currency: "RUB" },
    capture: true,
    confirmation: { type: "redirect" as const, return_url: returnUrl },
    description: "Пакет услуг",
    metadata: {
      orderId: order.id,
      orderType: "upload_addon_bundle",
      draftId: draft.id,
      userId: user.id,
      accountEmail: user.email,
    },
  }
  const res = await fetch(YOOKASSA_API, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${auth}`,
      "Idempotence-Key": idempotenceKey,
    },
    body: JSON.stringify(yookassaBody),
  })
  const data = (await res.json()) as { id?: string; confirmation?: { confirmation_url?: string } }
  if (!res.ok || !data.id || !data.confirmation?.confirmation_url) {
    await updateOrderStatus(order.id, "failed")
    return NextResponse.json({ error: "Не удалось создать платёж" }, { status: 500 })
  }
  await updateOrderStatus(order.id, "pending", { paymentId: data.id })
  return NextResponse.json({ paymentUrl: data.confirmation.confirmation_url })
}
