import { NextRequest, NextResponse } from "next/server"
import { getAdminToken, verifySession } from "@/lib/auth"
import {
  approveKycApplication,
  getKycApplicationById,
  rejectKycApplication,
  toAdminKycApplication,
} from "@/lib/cabinet-kyc"
import { getCabinetUserById } from "@/lib/cabinet-users"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = getAdminToken(request)
  if (!verifySession(token)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params
  const app = await getKycApplicationById(id)
  if (!app) {
    return NextResponse.json({ error: "Заявка не найдена" }, { status: 404 })
  }

  const user = await getCabinetUserById(app.userId)
  return NextResponse.json({
    application: {
      ...toAdminKycApplication(app),
      userEmail: user?.email ?? null,
      userArtistName: user?.artistName ?? null,
      userKycStatus: user?.kycStatus ?? "unverified",
    },
  })
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = getAdminToken(request)
  if (!verifySession(token)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Неверный JSON" }, { status: 400 })
  }

  const raw = body as { action?: string; reason?: string }
  const action = raw.action === "reject" ? "reject" : raw.action === "approve" ? "approve" : null
  if (!action) {
    return NextResponse.json({ error: "Укажите action: approve | reject" }, { status: 400 })
  }

  const adminLabel = "admin"

  if (action === "approve") {
    const result = await approveKycApplication({ applicationId: id, adminLabel })
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status })
    }
    return NextResponse.json({ application: toAdminKycApplication(result.application) })
  }

  const result = await rejectKycApplication({
    applicationId: id,
    adminLabel,
    reason: typeof raw.reason === "string" ? raw.reason : "",
  })
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }
  return NextResponse.json({ application: toAdminKycApplication(result.application) })
}
