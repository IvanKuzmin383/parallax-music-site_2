import { NextRequest, NextResponse } from "next/server"
import { getCabinetToken, getCabinetSession } from "@/lib/cabinet-auth"
import { uploadDraftRequiredPaymentRub } from "@/lib/cabinet-upload-draft-addons"
import { getReleaseById, releasePayloadForPricing, updateRelease } from "@/lib/releases"
import { submitReleaseToModeration } from "@/lib/release-submit"

function clientIp(request: NextRequest): string | null {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null
}

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

  const body = (await request.json().catch(() => ({}))) as { action?: string }
  const requiredRub = uploadDraftRequiredPaymentRub(releasePayloadForPricing(release))

  if (body.action === "prepare_payment") {
    if (requiredRub <= 0) {
      return NextResponse.json({ error: "Оплата не требуется" }, { status: 400 })
    }
    await updateRelease(id, { status: "awaiting_payment" })
    return NextResponse.json({ requiresPayment: true, amountRub: requiredRub })
  }

  if (requiredRub > 0) {
    return NextResponse.json(
      { error: "Сначала оплатите выбранные услуги", requiresPayment: true, amountRub: requiredRub },
      { status: 400 }
    )
  }

  const result = await submitReleaseToModeration(id, {
    clientIp: clientIp(request),
    userAgent: request.headers.get("user-agent"),
  })

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }

  return NextResponse.json({ release: result.release, tracks: result.tracks })
}
