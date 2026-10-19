import { NextRequest, NextResponse } from "next/server"
import { getCabinetToken, getCabinetSession } from "@/lib/cabinet-auth"
import { getCabinetUserByEmail } from "@/lib/cabinet-users"
import {
  assertUploadDraftBundlePayment,
  uploadDraftRequiredPaymentRub,
} from "@/lib/cabinet-upload-draft-addons"
import { respondWithWalletPayment } from "@/lib/cabinet-wallet-pay"
import { createOrder, getOrderById } from "@/lib/orders"
import {
  getReleaseById,
  markReleaseAwaitingPayment,
  releasePayloadForPricing,
} from "@/lib/releases"
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


  const user = await getCabinetUserByEmail(session.email)
  if (!user) return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 })

  const payload = releasePayloadForPricing(release)
  const totalRub = await uploadDraftRequiredPaymentRub(payload)
  if (totalRub <= 0) {
    return NextResponse.json({ ok: true, skippedPayment: true })
  }

  // Идемпотентность: повторный клик "Оплатить" не должен создавать второй заказ.
  const alreadyPaid = await assertUploadDraftBundlePayment(payload, release.bundleOrderId)
  if (alreadyPaid.ok && release.bundleOrderId) {
    const existing = await getOrderById(release.bundleOrderId)
    return NextResponse.json({
      paid: true,
      orderId: release.bundleOrderId,
      paymentId: existing?.paymentId ?? `wallet:existing:${release.bundleOrderId}`,
      walletBalance: user.walletBalance ?? 0,
    })
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

  return respondWithWalletPayment(order)
}
