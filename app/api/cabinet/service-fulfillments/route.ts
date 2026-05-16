import { NextRequest, NextResponse } from "next/server"
import { getCabinetSession, getCabinetToken } from "@/lib/cabinet-auth"
import { getCabinetUserByEmail } from "@/lib/cabinet-users"
import { listServiceFulfillmentsForUser, parseServiceFulfillmentFilter } from "@/lib/service-fulfillments"

export async function GET(request: NextRequest) {
  const token = getCabinetToken(request)
  const session = getCabinetSession(token)
  if (!session) {
    return NextResponse.json({ error: "Необходима авторизация" }, { status: 401 })
  }

  const user = await getCabinetUserByEmail(session.email)
  if (!user) {
    return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 })
  }

  const filter = parseServiceFulfillmentFilter(request.nextUrl.searchParams.get("filter"))
  const items = await listServiceFulfillmentsForUser(user.id, filter)

  return NextResponse.json({
    items: items.map((r) => ({
      orderId: r.orderId,
      orderType: r.orderType,
      paymentStatus: r.paymentStatus,
      fulfillmentStatus: r.fulfillmentStatus,
      totalAmount: r.totalAmount,
      createdAt: r.createdAt,
      paidAt: r.paidAt,
      paymentId: r.paymentId,
      draftId: r.draftId,
      tracksCount: r.tracksCount,
      contactEmail: r.contactEmail,
      contactTelegram: r.contactTelegram,
      aiMasteringAudioFiles: r.aiMasteringAudioFiles,
      uploadAddonBundleItems: r.uploadAddonBundleItems,
      uploadAddonAiCoverRequested: r.uploadAddonAiCoverRequested,
    })),
  })
}
