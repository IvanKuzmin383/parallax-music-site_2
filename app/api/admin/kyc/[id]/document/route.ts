import { NextRequest, NextResponse } from "next/server"
import fs from "fs/promises"
import { getAdminToken, verifySession } from "@/lib/auth"
import {
  getKycApplicationById,
  logKycDocumentView,
  resolveKycDocumentAbsolutePath,
} from "@/lib/cabinet-kyc"

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
  if (!app.documentStorageKey || app.documentDeletedAt) {
    return NextResponse.json({ error: "Документ уже удалён" }, { status: 404 })
  }

  try {
    const absolute = await resolveKycDocumentAbsolutePath(app.documentStorageKey)
    const buffer = await fs.readFile(absolute)
    await logKycDocumentView({ applicationId: app.id, adminLabel: "admin" })

    const mime = app.documentMime || "application/octet-stream"
    const ext =
      mime === "application/pdf" ? "pdf" : mime === "image/png" ? "png" : mime === "image/jpeg" ? "jpg" : "bin"

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": mime,
        "Content-Disposition": `inline; filename="kyc-${app.id}.${ext}"`,
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    })
  } catch (error) {
    console.error("[admin/kyc/document] error", error)
    return NextResponse.json({ error: "Не удалось открыть документ" }, { status: 500 })
  }
}
