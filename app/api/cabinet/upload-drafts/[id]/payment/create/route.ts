import { NextRequest, NextResponse } from "next/server"
import { getCabinetToken, getCabinetSession } from "@/lib/cabinet-auth"
import { getCabinetUserByEmail } from "@/lib/cabinet-users"
import { uploadDraftRequiredPaymentRub } from "@/lib/cabinet-upload-draft-addons"
import { createOrder, updateOrderStatus } from "@/lib/orders"
import { getUploadDraftById, updateUploadDraft } from "@/lib/upload-drafts"
import {
  assertTbankConfigured,
  createCabinetTbankPayment,
  getSiteBaseUrl,
} from "@/lib/tbank-cabinet-payment"

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

  const tbankCfg = assertTbankConfigured()
  if (!tbankCfg.ok) {
    console.error("[upload-drafts/payment/create] Missing TBANK env")
    return NextResponse.json({ error: tbankCfg.error }, { status: 500 })
  }

  const user = await getCabinetUserByEmail(session.email)
  if (!user) return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 })

  const totalRub = uploadDraftRequiredPaymentRub(draft.payload)
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

  const siteBase = getSiteBaseUrl()
  const returnPath = draft.kind === "album" ? "/cabinet/upload/album" : "/cabinet/upload"
  const returnUrl = `${siteBase}${returnPath}?draftId=${encodeURIComponent(draft.id)}&payment=return`
  const failUrl = `${siteBase}${returnPath}?draftId=${encodeURIComponent(draft.id)}&payment=fail`

  const pay = await createCabinetTbankPayment({
    orderId: order.id,
    totalAmount: order.totalAmount,
    description: "Пакет услуг",
    successUrl: returnUrl,
    failUrl,
    orderType: "upload_addon_bundle",
    receiptEmail: user.email,
    receiptItemName: "Пакет услуг при загрузке",
    logPrefix: "upload-drafts/payment/create",
  })

  if (!pay.ok) {
    await updateOrderStatus(order.id, "failed")
    return NextResponse.json({ error: pay.error }, { status: 500 })
  }

  return NextResponse.json({ paymentUrl: pay.confirmationUrl })
}
