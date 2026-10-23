import { NextRequest, NextResponse } from "next/server"
import { getCabinetToken, getCabinetSession } from "@/lib/cabinet-auth"
import { resolveCabinetSmartlinkContext } from "@/lib/cabinet-smartlink"
import {
  listSmartlinkEventsForExport,
  parseAnalyticsRange,
  smartlinkEventsToCsv,
  smartlinkKeyForTrack,
} from "@/lib/smartlink-analytics"

type RouteCtx = { params: Promise<{ id: string }> }

export async function GET(request: NextRequest, context: RouteCtx) {
  const token = getCabinetToken(request)
  const session = getCabinetSession(token)
  if (!session) return NextResponse.json({ error: "Необходима авторизация" }, { status: 401 })

  const { id: releaseKey } = await context.params
  const ctx = await resolveCabinetSmartlinkContext(releaseKey, session.email)
  if (!ctx) return NextResponse.json({ error: "Релиз не найден" }, { status: 404 })

  const sp = request.nextUrl.searchParams
  const range = parseAnalyticsRange(sp.get("from"), sp.get("to"))
  if (!range) {
    return NextResponse.json({ error: "Некорректный период (макс. 90 дней)" }, { status: 400 })
  }

  const rows = await listSmartlinkEventsForExport(
    smartlinkKeyForTrack(ctx.track.id),
    range.from,
    range.to,
  )
  const csv = smartlinkEventsToCsv(rows)
  const slug = ctx.track.smartlinkSlug?.trim() || ctx.track.id
  const filename = `smartlink-${slug}-events.csv`
  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  })
}
