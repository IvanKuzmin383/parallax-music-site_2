import { NextRequest, NextResponse } from "next/server"
import { getAdminToken, verifySession } from "@/lib/auth"

export async function GET(request: NextRequest) {
  const token = getAdminToken(request)
  if (!verifySession(token)) {
    return NextResponse.json({ error: "Необходима авторизация" }, { status: 401 })
  }

  return NextResponse.json(
    {
      error: "ZIP-скачивание отключено. Скачивайте WAV по одному в разделе черновиков.",
      code: "ZIP_DOWNLOAD_DISABLED",
    },
    { status: 410 }
  )
}
