import path from "path"
import { createReadStream } from "node:fs"
import { stat } from "fs/promises"
import { Readable } from "node:stream"
import { NextRequest, NextResponse } from "next/server"
import { getAdminToken, verifySession } from "@/lib/auth"
import { resolveAdminCoverFilePath } from "@/lib/admin-covers-download"

export async function GET(request: NextRequest) {
  const token = getAdminToken(request)
  if (!verifySession(token)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const nameRaw = request.nextUrl.searchParams.get("name")?.trim() ?? ""
  const absPath = await resolveAdminCoverFilePath(nameRaw)
  if (!absPath) {
    return NextResponse.json({ error: "Неверное имя файла" }, { status: 400 })
  }

  try {
    const info = await stat(absPath)
    if (!info.isFile()) {
      return NextResponse.json({ error: "Не найдено" }, { status: 404 })
    }

    const ext = path.extname(absPath).toLowerCase()
    const contentType =
      ext === ".png"
        ? "image/png"
        : ext === ".jpg" || ext === ".jpeg"
          ? "image/jpeg"
          : "application/octet-stream"

    const stream = createReadStream(absPath)
    const body = Readable.toWeb(stream) as ReadableStream

    const safeName = path.basename(absPath)

    return new NextResponse(body, {
      headers: {
        "Content-Type": contentType,
        "Content-Length": String(info.size),
        "Content-Disposition": `attachment; filename="${encodeURIComponent(safeName)}"`,
        "Cache-Control": "no-store",
      },
    })
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return NextResponse.json({ error: "Файл не найден" }, { status: 404 })
    }
    console.error("admin covers download:", error)
    return NextResponse.json({ error: "Не удалось отдать файл" }, { status: 500 })
  }
}
