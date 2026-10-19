import { NextRequest, NextResponse } from "next/server"
import { getCabinetSession, getCabinetToken } from "@/lib/cabinet-auth"
import { getCabinetUserByEmail } from "@/lib/cabinet-users"
import { createAiTracksJob, listAiTracksJobsForUser } from "@/lib/ai-tracks-jobs"

export async function GET(request: NextRequest) {
  const token = getCabinetToken(request)
  const session = getCabinetSession(token)
  if (!session) {
    return NextResponse.json({ error: "Необходима авторизация" }, { status: 401 })
  }

  const user = await getCabinetUserByEmail(session.email)
  if (!user) {
    return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 })
  }

  const { searchParams } = new URL(request.url)
  const favoritesOnly = searchParams.get("filter") === "favorites"
  const limit = Number(searchParams.get("limit") ?? 20)
  const offset = Number(searchParams.get("offset") ?? 0)

  try {
    const data = await listAiTracksJobsForUser({
      userId: user.id,
      favoritesOnly,
      limit,
      offset,
    })
    return NextResponse.json(data)
  } catch (e) {
    console.error("[ai-tracks/jobs GET]", e)
    return NextResponse.json({ jobs: [], totalResults: 0, favoriteCount: 0 })
  }
}

export async function POST(request: NextRequest) {
  const token = getCabinetToken(request)
  const session = getCabinetSession(token)
  if (!session) {
    return NextResponse.json({ error: "Необходима авторизация" }, { status: 401 })
  }

  const user = await getCabinetUserByEmail(session.email)
  if (!user) {
    return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Некорректный JSON" }, { status: 400 })
  }

  const raw = body && typeof body === "object" ? (body as Record<string, unknown>) : {}
  const idempotencyKey =
    typeof raw.idempotencyKey === "string"
      ? raw.idempotencyKey
      : request.headers.get("idempotency-key") || ""

  const result = await createAiTracksJob({
    userId: user.id,
    draft: raw.draft ?? raw,
    idempotencyKey,
  })

  if (!result.ok) {
    const status =
      result.error === "validation"
        ? 400
        : result.error === "insufficient"
          ? 402
          : result.error === "unavailable"
            ? 503
            : 404
    return NextResponse.json(
      {
        error: result.message,
        code: result.error,
        fieldErrors: result.fieldErrors,
        walletBalance: result.walletBalance,
      },
      { status }
    )
  }

  return NextResponse.json({
    job: result.job,
    walletBalance: result.walletBalance,
    reused: result.reused,
  })
}
