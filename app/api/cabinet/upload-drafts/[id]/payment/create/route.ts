import { NextRequest, NextResponse } from "next/server"
import { getCabinetToken, getCabinetSession } from "@/lib/cabinet-auth"
import { getCabinetUserByEmail } from "@/lib/cabinet-users"
import { uploadDraftRequiredPaymentRub } from "@/lib/cabinet-upload-draft-addons"
import { respondWithWalletPayment } from "@/lib/cabinet-wallet-pay"
import { createOrder } from "@/lib/orders"
import { getUploadDraftById, updateUploadDraft } from "@/lib/upload-drafts"

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


  const user = await getCabinetUserByEmail(session.email)
  if (!user) return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 })

  const totalRub = await uploadDraftRequiredPaymentRub(draft.payload)
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

  return respondWithWalletPayment(order)
}
