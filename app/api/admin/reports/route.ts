import { NextRequest, NextResponse } from "next/server"
import { getAdminToken, verifySession } from "@/lib/auth"
import { getAllCabinetUsers } from "@/lib/cabinet-users"
import { getAllReports, createReportFromTempFile } from "@/lib/streaming-reports"
import {
  MultipartRequestError,
  parseMultipartRequestStream,
} from "@/lib/node-streaming-multipart"

export async function GET(request: NextRequest) {
  const token = getAdminToken(request)
  if (!verifySession(token)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const reports = await getAllReports()
    const users = await getAllCabinetUsers()
    
    // Добавляем email пользователя к каждому отчету
    const reportsWithUserEmail = reports.map((report) => {
      const user = users.find((u) => u.id === report.userId)
      return {
        ...report,
        userEmail: user?.email || "Неизвестный пользователь",
        artistName: user?.artistName ?? null,
      }
    })
    
    return NextResponse.json({ reports: reportsWithUserEmail })
  } catch (error) {
    console.error("Error fetching reports:", error)
    return NextResponse.json(
      { error: "Не удалось загрузить отчеты" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  const token = getAdminToken(request)
  if (!verifySession(token)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const multipart = await parseMultipartRequestStream(request, {
      maxFiles: 1,
      maxFields: 8,
      maxFileSizeBytes: 50 * 1024 * 1024,
      maxFieldSizeBytes: 8 * 1024,
    })
    try {
      const userId = multipart.getField("userId")
      const amountStr = multipart.getField("amount")
      const file = multipart.getFile("file")

      if (!userId || !amountStr || !file) {
        return NextResponse.json(
          { error: "Необходимы userId, amount и file" },
          { status: 400 }
        )
      }

      const amount = parseFloat(amountStr)
      if (isNaN(amount) || amount < 0) {
        return NextResponse.json(
          { error: "Сумма должна быть положительным числом" },
          { status: 400 }
        )
      }

      const report = await createReportFromTempFile(
        userId,
        amount,
        file.tempFilePath,
        file.originalFilename || "report"
      )

      return NextResponse.json({ report }, { status: 201 })
    } finally {
      await multipart.cleanup()
    }
  } catch (error) {
    if (error instanceof MultipartRequestError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error("Error creating report:", error)
    return NextResponse.json(
      { error: "Не удалось создать отчет" },
      { status: 500 }
    )
  }
}
