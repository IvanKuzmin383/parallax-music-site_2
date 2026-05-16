import { NextRequest, NextResponse } from "next/server"
import { getCabinetToken, getCabinetSession } from "@/lib/cabinet-auth"
import {
  cabinetProfileCompleteForUpload,
  parseCabinetProfilePatchBody,
  sanitizeCabinetUserForClient,
} from "@/lib/cabinet-counterparty"
import { getCabinetUserByEmail, updateCabinetUserProfile } from "@/lib/cabinet-users"
import { getTracksByUserId } from "@/lib/tracks"

function resolveCounterpartyType(
  user: NonNullable<Awaited<ReturnType<typeof getCabinetUserByEmail>>>
) {
  return user.counterpartyType ?? "individual"
}

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

    const uploadedTracksCount = (await getTracksByUserId(session.email)).length
    const publicUser = sanitizeCabinetUserForClient(user)

    return NextResponse.json(
      {
        user: publicUser,
        uploadedTracksCount,
        profileCompleteForUpload: cabinetProfileCompleteForUpload(user),
      },
      { status: 200 }
    )
  } catch (error) {
    console.error("[cabinet/profile] GET error:", error)
    return NextResponse.json({ error: "Не удалось загрузить профиль" }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  const token = getCabinetToken(request)
  const session = getCabinetSession(token)
  if (!session) {
    return NextResponse.json({ error: "Необходима авторизация" }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Неверный JSON" }, { status: 400 })
  }

  const u = await getCabinetUserByEmail(session.email)
  if (!u) {
    return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 })
  }

  const counterpartyType = resolveCounterpartyType(u)
  const parsed = parseCabinetProfilePatchBody(body, counterpartyType)
  if (!parsed.success) {
    const first = parsed.error.errors[0]
    return NextResponse.json(
      {
        error: first?.message ?? "Ошибка валидации",
        errors: parsed.error.flatten(),
      },
      { status: 400 }
    )
  }

  try {
    const updated = await updateCabinetUserProfile(u.id, parsed.data)
    if (!updated) {
      return NextResponse.json({ error: "Не удалось сохранить профиль" }, { status: 500 })
    }

    return NextResponse.json(
      {
        user: sanitizeCabinetUserForClient(updated),
        profileCompleteForUpload: cabinetProfileCompleteForUpload(updated),
      },
      { status: 200 }
    )
  } catch (error) {
    console.error("[cabinet/profile] PATCH error:", error)
    return NextResponse.json({ error: "Не удалось сохранить профиль" }, { status: 500 })
  }
}
