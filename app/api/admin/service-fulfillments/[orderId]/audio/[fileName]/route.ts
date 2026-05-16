import { NextRequest, NextResponse } from "next/server"
import { createReadStream } from "node:fs"
import { stat } from "fs/promises"
import path from "path"
import { Readable } from "node:stream"
import { getAdminToken, verifySession } from "@/lib/auth"
import { getOrderById } from "@/lib/orders"
import { getUploadsBasePath } from "@/lib/tracks"

function isAllowedAiMasteringFileName(fileName: string): boolean {
  return /^track-\d+\.wav$/i.test(fileName)
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string; fileName: string }> }
) {
  const token = getAdminToken(request)
  if (!verifySession(token)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { orderId, fileName } = await params
  if (!isAllowedAiMasteringFileName(fileName)) {
    return NextResponse.json({ error: "Invalid file name" }, { status: 400 })
  }

  const order = await getOrderById(orderId)
  if (!order || order.orderType !== "ai_mastering" || order.status !== "paid") {
    return NextResponse.json({ error: "Заказ не найден" }, { status: 404 })
  }

  const base = await getUploadsBasePath()
  const filePath = path.join(base, "ai-mastering-orders", orderId, fileName)

  try {
    const info = await stat(filePath)
    const stream = createReadStream(filePath)
    const body = Readable.toWeb(stream) as ReadableStream
    return new NextResponse(body, {
      headers: {
        "Content-Type": "audio/wav",
        "Content-Length": String(info.size),
        "Content-Disposition": `attachment; filename="${encodeURIComponent(fileName)}"`,
      },
    })
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return NextResponse.json({ error: "Файл не найден" }, { status: 404 })
    }
    console.error("Error serving AI mastering file for admin:", error)
    return NextResponse.json({ error: "Не удалось скачать файл" }, { status: 500 })
  }
}
