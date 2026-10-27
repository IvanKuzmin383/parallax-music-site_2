import { NextRequest, NextResponse } from "next/server"
import { getCabinetToken, getCabinetSession } from "@/lib/cabinet-auth"
import { getCabinetUserByEmail } from "@/lib/cabinet-users"
import { checkKycVerifiedForDistribution } from "@/lib/cabinet-kyc-gate"
import { uploadDraftRequiredPaymentRub } from "@/lib/cabinet-upload-draft-addons"
import { getReleaseById, findUserReleaseOccupyingDate, releasePayloadForPricing, updateRelease } from "@/lib/releases"
import { submitReleaseToModeration } from "@/lib/release-submit"
import { RELEASE_DATE_OCCUPIED_MESSAGE } from "@/lib/release-date-validation"

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

  const user = await getCabinetUserByEmail(session.email)
  if (!user) return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 })
  const kycGate = checkKycVerifiedForDistribution(user)
  if (kycGate) return NextResponse.json(kycGate.body, { status: kycGate.status })

  const { id } = await params
  const release = await getReleaseById(id)
  if (!release || release.userId.toLowerCase() !== session.email.toLowerCase()) {
    return NextResponse.json({ error: "Релиз не найден" }, { status: 404 })
  }

  const body = (await request.json().catch(() => ({}))) as { action?: string }
  const requiredRub = await uploadDraftRequiredPaymentRub(releasePayloadForPricing(release))

  if (release.releaseDate) {
    const occupying = await findUserReleaseOccupyingDate(
      release.userId,
      release.releaseDate,
      release.id,
      release.artistName
    )
    if (occupying) {
      return NextResponse.json({ error: RELEASE_DATE_OCCUPIED_MESSAGE }, { status: 400 })
    }
  }

  if (body.action === "prepare_payment") {
    if (requiredRub <= 0) {
      return NextResponse.json({ error: "Оплата не требуется" }, { status: 400 })
    }
    await updateRelease(id, { status: "awaiting_payment" })
    return NextResponse.json({ requiresPayment: true, amountRub: requiredRub })
  }

  // Проверка оплаты - внутри submitReleaseToModeration (assertUploadDraftBundlePayment).
  // Здесь нельзя отклонять только по requiredRub > 0: после оплаты с баланса
  // клиент сразу вызывает finalize, и оплаченный bundleOrderId должен пропускать дальше.
  const result = await submitReleaseToModeration(id, {
    clientIp: clientIp(request),
    userAgent: request.headers.get("user-agent"),
  })

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }

  return NextResponse.json({ release: result.release, tracks: result.tracks })
}
