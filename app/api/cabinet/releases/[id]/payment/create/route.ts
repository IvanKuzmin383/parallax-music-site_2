import { NextRequest, NextResponse } from "next/server"
import { getCabinetToken, getCabinetSession } from "@/lib/cabinet-auth"
import { getCabinetUserByEmail } from "@/lib/cabinet-users"
import { uploadDraftRequiredPaymentRub } from "@/lib/cabinet-upload-draft-addons"
import { createOrder, updateOrderStatus } from "@/lib/orders"
import {
  getReleaseById,
  markReleaseAwaitingPayment,
  releasePayloadForPricing,
} from "@/lib/releases"
import {
  assertTbankConfigured,
  createCabinetTbankPayment,
  getSiteBaseUrl,
} from "@/lib/tbank-cabinet-payment"
import { getTracksByReleaseId } from "@/lib/tracks"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = getCabinetToken(request)
  const session = getCabinetSession(token)
  if (!session) return NextResponse.json({ error: "Необходима авторизация" }, { status: 401 })

  const { id } = await params
  const release = await getReleaseById(id)
  if (!release || release.userId.toLowerCase() !== session.email.toLowerCase()) {
    return NextResponse.json({ error: "Релиз не найден" }, { status: 404 })
  }

  const tbankCfg = assertTbankConfigured()
  if (!tbankCfg.ok) {
    console.error("[releases/payment/create] Missing TBANK env")
    return NextResponse.json({ error: tbankCfg.error }, { status: 500 })
  }

  const user = await getCabinetUserByEmail(session.email)
  if (!user) return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 })

  const payload = releasePayloadForPricing(release)
  const totalRub = uploadDraftRequiredPaymentRub(payload)
  if (totalRub <= 0) {
    return NextResponse.json({ ok: true, skippedPayment: true })
  }

  const tracks = await getTracksByReleaseId(id)
  const order = await createOrder({
    orderType: "upload_addon_bundle",
    userId: user.id,
    tracksCount: tracks.length,
    totalAmount: totalRub.toFixed(2),
    releaseId: id,
    uploadAddonBundlePayloadJson: JSON.stringify(payload),
  })

  await markReleaseAwaitingPayment(id, order.id)

  const siteBase = getSiteBaseUrl()
  const returnUrl = `${siteBase}/cabinet/upload/${encodeURIComponent(id)}?step=5&payment=return`
  const failUrl = `${siteBase}/cabinet/upload/${encodeURIComponent(id)}?step=5&payment=fail`

  const pay = await createCabinetTbankPayment({
    orderId: order.id,
    totalAmount: order.totalAmount,
    description: "Пакет услуг",
    successUrl: returnUrl,
    failUrl,
    orderType: "upload_addon_bundle",
    receiptEmail: user.email,
    receiptItemName: "Пакет услуг при загрузке",
    logPrefix: "releases/payment/create",
  })

  if (!pay.ok) {
    await updateOrderStatus(order.id, "failed")
    return NextResponse.json({ error: pay.error }, { status: 500 })
  }

  return NextResponse.json({ paymentUrl: pay.confirmationUrl, amountRub: totalRub })
}
