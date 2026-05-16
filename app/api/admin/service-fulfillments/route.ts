import { NextRequest, NextResponse } from "next/server"
import { getAdminToken, verifySession } from "@/lib/auth"
import { listServiceFulfillmentsAdmin, parseServiceFulfillmentFilter } from "@/lib/service-fulfillments"

export async function GET(request: NextRequest) {
  const token = getAdminToken(request)
  if (!verifySession(token)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const filter = parseServiceFulfillmentFilter(request.nextUrl.searchParams.get("filter"))
  const items = await listServiceFulfillmentsAdmin(filter)

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
      userId: r.userId,
      userEmail: r.userEmail,
      contactEmail: r.contactEmail,
      contactTelegram: r.contactTelegram,
      aiMasteringAudioFiles: r.aiMasteringAudioFiles,
      uploadAddonBundleItems: r.uploadAddonBundleItems,
      uploadAddonAiCoverRequested: r.uploadAddonAiCoverRequested,
    })),
  })
}
