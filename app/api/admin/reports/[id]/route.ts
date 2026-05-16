import { NextRequest, NextResponse } from "next/server"
import { getAdminToken, verifySession } from "@/lib/auth"
import { getReportById, updateReport, deleteReport } from "@/lib/streaming-reports"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = getAdminToken(request)
  if (!verifySession(token)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { id } = await params
    const report = await getReportById(id)
    
    if (!report) {
      return NextResponse.json({ error: "Отчет не найден" }, { status: 404 })
    }
    
    return NextResponse.json({ report })
  } catch (error) {
    console.error("Error fetching report:", error)
    return NextResponse.json(
      { error: "Не удалось загрузить отчет" },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = getAdminToken(request)
  if (!verifySession(token)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { id } = await params
    const body = await request.json()
    
    const updateData: { amount?: number; fileName?: string } = {}
    if (body.amount !== undefined) {
      const amount = parseFloat(body.amount)
      if (isNaN(amount) || amount < 0) {
        return NextResponse.json(
          { error: "Сумма должна быть положительным числом" },
          { status: 400 }
        )
      }
      updateData.amount = amount
    }
    if (body.fileName !== undefined) {
      updateData.fileName = body.fileName
    }
    
    const report = await updateReport(id, updateData)
    
    if (!report) {
      return NextResponse.json({ error: "Отчет не найден" }, { status: 404 })
    }
    
    return NextResponse.json({ report })
  } catch (error) {
    console.error("Error updating report:", error)
    return NextResponse.json(
      { error: "Не удалось обновить отчет" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = getAdminToken(request)
  if (!verifySession(token)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { id } = await params
    const deleted = await deleteReport(id)
    
    if (!deleted) {
      return NextResponse.json({ error: "Отчет не найден" }, { status: 404 })
    }
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting report:", error)
    return NextResponse.json(
      { error: "Не удалось удалить отчет" },
      { status: 500 }
    )
  }
}
