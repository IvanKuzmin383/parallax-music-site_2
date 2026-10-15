import { NextRequest, NextResponse } from "next/server"
import { getCabinetSession, getCabinetToken } from "@/lib/cabinet-auth"
import { getCabinetUserByEmail } from "@/lib/cabinet-users"
import { checkProfileCompleteForUpload } from "@/lib/cabinet-upload-profile-gate"
import { checkKycVerifiedForDistribution } from "@/lib/cabinet-kyc-gate"
import { createReleaseFromAiTracksResult } from "@/lib/ai-tracks-to-release"

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const token = getCabinetToken(request)
  const session = getCabinetSession(token)
  if (!session) {
    return NextResponse.json({ error: "Необходима авторизация" }, { status: 401 })
  }

  const user = await getCabinetUserByEmail(session.email)
  if (!user) {
    return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 })
  }

  const profileGate = checkProfileCompleteForUpload(user)
  if (profileGate) {
    return NextResponse.json(profileGate.body, { status: profileGate.status })
  }
  const kycGate = checkKycVerifiedForDistribution(user)
  if (kycGate) {
    return NextResponse.json(kycGate.body, { status: kycGate.status })
  }

  const { id: resultId } = await context.params
  if (!resultId?.trim()) {
    return NextResponse.json({ error: "Не указан результат" }, { status: 400 })
  }

  let titleOverride: string | undefined
  try {
    const body = (await request.json()) as { title?: string }
    if (typeof body?.title === "string" && body.title.trim()) {
      titleOverride = body.title.trim()
    }
  } catch {
    /* empty body ok */
  }

  const result = await createReleaseFromAiTracksResult({
    cabinetUser: user,
    resultId: resultId.trim(),
    titleOverride,
  })

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }

  return NextResponse.json({
    releaseId: result.release.id,
    uploadPath: result.uploadPath,
    alreadyExisted: result.alreadyExisted,
    audioAttached: result.audioAttached,
    warning: result.warning ?? null,
  })
}
