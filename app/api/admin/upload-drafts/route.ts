import { NextRequest, NextResponse } from "next/server"
import { getAdminToken, verifySession } from "@/lib/auth"
import { listUploadDrafts, type UploadDraftStatus } from "@/lib/upload-drafts"

export async function GET(request: NextRequest) {
  const token = getAdminToken(request)
  if (!verifySession(token)) {
    return NextResponse.json({ error: "Необходима авторизация" }, { status: 401 })
  }
  const status = request.nextUrl.searchParams.get("status") ?? undefined
  const userId = request.nextUrl.searchParams.get("userId") ?? undefined
  const drafts = await listUploadDrafts({
    status: status as UploadDraftStatus | undefined,
    userId,
    limit: 300,
  })
  return NextResponse.json({ drafts })
}
