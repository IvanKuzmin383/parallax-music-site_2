import { NextRequest, NextResponse } from "next/server"
import { getCabinetToken, getCabinetSession } from "@/lib/cabinet-auth"
import { getCabinetUserByEmail } from "@/lib/cabinet-users"
import { getSmartlinkById } from "@/lib/cabinet-smartlinks"
import {
  listSmartlinkEventsForExport,
  parseAnalyticsRange,
  smartlinkEventsToCsv,
  smartlinkKeyForStandalone,
} from "@/lib/smartlink-analytics"

type RouteCtx = { params: Promise<{ id: string }> }

export async function GET(request: NextRequest, context: RouteCtx) {
  const token = getCabinetToken(request)
  const session = getCabinetSession(token)
  if (!session) return NextResponse.json({ error: "Необходима авторизация" }, { status: 401 })

  const user = await getCabinetUserByEmail(session.email)
  if (!user) return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 })

  const { id } = await context.params
  const link = await getSmartlinkById(id)
  if (!link || link.userId !== user.id) {
    return NextResponse.json({ error: "Смартлинк не найден" }, { status: 404 })
  }

  const sp = request.nextUrl.searchParams
  const range = parseAnalyticsRange(sp.get("from"), sp.get("to"))
  if (!range) {
    return NextResponse.json({ error: "Некорректный период (макс. 90 дней)" }, { status: 400 })
  }

  const rows = await listSmartlinkEventsForExport(
    smartlinkKeyForStandalone(link.id),
    range.from,
    range.to,
  )
  const csv = smartlinkEventsToCsv(rows)
  const filename = `smartlink-${link.slug}-events.csv`
  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  })
}
