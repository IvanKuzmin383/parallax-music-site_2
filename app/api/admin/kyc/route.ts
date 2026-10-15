import { NextRequest, NextResponse } from "next/server"
import { getAdminToken, verifySession } from "@/lib/auth"
import { listKycApplications, toAdminKycApplication, type KycApplicationStatus } from "@/lib/cabinet-kyc"
import { getCabinetUserById } from "@/lib/cabinet-users"

export async function GET(request: NextRequest) {
  const token = getAdminToken(request)
  if (!verifySession(token)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const statusParam = request.nextUrl.searchParams.get("status") || "pending"
  const status =
    statusParam === "all" ||
    statusParam === "pending" ||
    statusParam === "approved" ||
    statusParam === "rejected" ||
    statusParam === "expired"
      ? (statusParam as KycApplicationStatus | "all")
      : "pending"

  try {
    const apps = await listKycApplications({ status, limit: 200 })
    const enriched = await Promise.all(
      apps.map(async (app) => {
        const user = await getCabinetUserById(app.userId)
        return {
          ...toAdminKycApplication(app),
          userEmail: user?.email ?? null,
          userArtistName: user?.artistName ?? null,
          userKycStatus: user?.kycStatus ?? "unverified",
        }
      })
    )
    return NextResponse.json({ applications: enriched })
  } catch (error) {
    console.error("[admin/kyc] GET error", error)
    return NextResponse.json({ error: "Не удалось загрузить заявки KYC" }, { status: 500 })
  }
}
