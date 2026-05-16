import { NextRequest, NextResponse } from "next/server"
import { createReadStream } from "node:fs"
import { stat } from "fs/promises"
import path from "path"
import { Readable } from "node:stream"
import { getCabinetSession, getCabinetToken } from "@/lib/cabinet-auth"
import { getCabinetUserByEmail } from "@/lib/cabinet-users"
import { getOrderById } from "@/lib/orders"
import { getUploadsBasePath } from "@/lib/tracks"

function isAllowedAiMasteringFileName(fileName: string): boolean {
  return /^track-\d+\.wav$/i.test(fileName)
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string; fileName: string }> }
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

  const { orderId, fileName } = await params
  if (!isAllowedAiMasteringFileName(fileName)) {
    return NextResponse.json({ error: "Некорректное имя файла" }, { status: 400 })
  }

  const order = await getOrderById(orderId)
  if (!order || order.orderType !== "ai_mastering" || order.status !== "paid") {
    return NextResponse.json({ error: "Заказ не найден" }, { status: 404 })
  }

  if (order.userId !== user.id) {
    return NextResponse.json({ error: "Нет доступа к этому файлу" }, { status: 403 })
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
        "Content-Disposition": `inline; filename="${encodeURIComponent(fileName)}"`,
      },
    })
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return NextResponse.json({ error: "Файл не найден" }, { status: 404 })
    }
    console.error("Error serving AI mastering file for cabinet:", error)
    return NextResponse.json({ error: "Не удалось загрузить файл" }, { status: 500 })
  }
}
