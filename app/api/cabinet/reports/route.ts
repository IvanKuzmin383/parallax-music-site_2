import { NextRequest, NextResponse } from "next/server"
import { getCabinetToken, getCabinetSession } from "@/lib/cabinet-auth"
import { getCabinetUserByEmail } from "@/lib/cabinet-users"
import { getReportsByUserId } from "@/lib/streaming-reports"

export async function GET(request: NextRequest) {
  const token = getCabinetToken(request)
  const session = getCabinetSession(token)
  if (!session) {
    return NextResponse.json({ error: "Необходима авторизация" }, { status: 401 })
  }

  try {
    const user = await getCabinetUserByEmail(session.email)
    if (!user) {
      return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 })
    }

    const reports = await getReportsByUserId(user.id)
    
    // Возвращаем только безопасные данные (без filePath)
    const safeReports = reports.map((report) => ({
      id: report.id,
      amount: report.amount,
      fileName: report.fileName,
      createdAt: report.createdAt,
      updatedAt: report.updatedAt,
    }))
    
    return NextResponse.json({ reports: safeReports })
  } catch (error) {
    console.error("Error fetching cabinet reports:", error)
    return NextResponse.json(
      { error: "Не удалось загрузить отчеты" },
      { status: 500 }
    )
  }
}
