import { NextRequest, NextResponse } from "next/server"
import { getAdminToken, verifySession } from "@/lib/auth"
import { listAdminCoverFilenames } from "@/lib/admin-covers-download"

export async function GET(request: NextRequest) {
  const token = getAdminToken(request)
  if (!verifySession(token)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const files = await listAdminCoverFilenames()
    return NextResponse.json({ files })
  } catch (error) {
    console.error("admin covers list:", error)
    return NextResponse.json({ error: "Не удалось получить список обложек" }, { status: 500 })
  }
}
