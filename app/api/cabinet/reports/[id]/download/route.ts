import { NextRequest, NextResponse } from "next/server"
import { getCabinetToken, getCabinetSession } from "@/lib/cabinet-auth"
import { getCabinetUserByEmail } from "@/lib/cabinet-users"
import { getReportById } from "@/lib/streaming-reports"
import { readFile } from "fs/promises"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = getCabinetToken(request)
  const session = getCabinetSession(token)
  if (!session) {
    return NextResponse.json({ error: "Необходима авторизация" }, { status: 401 })
  }

  try {
    const { id } = await params
    const user = await getCabinetUserByEmail(session.email)
    if (!user) {
      return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 })
    }

    const report = await getReportById(id)
    if (!report) {
      return NextResponse.json({ error: "Отчет не найден" }, { status: 404 })
    }

    // Проверяем, что отчет принадлежит пользователю
    if (report.userId !== user.id) {
      return NextResponse.json({ error: "Нет доступа к этому отчету" }, { status: 403 })
    }

    try {
      const fileBuffer = await readFile(report.filePath)
      
      return new NextResponse(fileBuffer, {
        headers: {
          "Content-Type": "application/octet-stream",
          "Content-Disposition": `attachment; filename="${encodeURIComponent(report.fileName)}"`,
        },
      })
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return NextResponse.json({ error: "Файл отчета не найден" }, { status: 404 })
      }
      console.error("Error serving report file:", error)
      return NextResponse.json(
        { error: "Не удалось загрузить файл отчета" },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error("Error downloading report:", error)
    return NextResponse.json(
      { error: "Не удалось скачать отчет" },
      { status: 500 }
    )
  }
}
