import { NextRequest, NextResponse } from "next/server"
import { getCabinetToken, getCabinetSession } from "@/lib/cabinet-auth"
import { getCabinetUserByEmail } from "@/lib/cabinet-users"
import {
  getKycPublicStateForUser,
  parsePassportCombined,
  submitKycApplication,
  toPublicKycApplication,
} from "@/lib/cabinet-kyc"

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

  try {
    const state = await getKycPublicStateForUser(user)
    return NextResponse.json(state)
  } catch (error) {
    console.error("[cabinet/kyc] GET error", error)
    return NextResponse.json({ error: "Не удалось загрузить статус верификации" }, { status: 500 })
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

  let form: FormData
  try {
    form = await request.formData()
  } catch {
    return NextResponse.json({ error: "Ожидается multipart/form-data" }, { status: 400 })
  }

  const lastName = String(form.get("lastName") ?? "")
  const firstName = String(form.get("firstName") ?? "")
  const patronymic = String(form.get("patronymic") ?? "")
  const phone = String(form.get("phone") ?? "")
  const birthDate = String(form.get("birthDate") ?? "").trim()
  const passportRaw = String(form.get("passportNumber") ?? form.get("documentNumber") ?? "")
  const consentRaw = String(form.get("consentKyc") ?? "")
  const consentOk = consentRaw === "true" || consentRaw === "1" || consentRaw === "on"

  if (!consentOk) {
    return NextResponse.json(
      { error: "Необходимо согласие на обработку паспортных данных для верификации" },
      { status: 400 }
    )
  }

  const passport = parsePassportCombined(passportRaw)
  if (!passport) {
    return NextResponse.json(
      { error: "Номер документа: формат xxxx xxxxxx (10 цифр)" },
      { status: 400 }
    )
  }

  const file = form.get("document")
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Прикрепите скан документа" }, { status: 400 })
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  const result = await submitKycApplication({
    user,
    lastName,
    firstName,
    patronymic: patronymic || null,
    phone: phone || null,
    passportSeries: passport.series,
    passportNumber: passport.number,
    birthDate,
    documentBuffer: buffer,
  })

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }

  const state = await getKycPublicStateForUser({
    ...user,
    kycStatus: "pending",
  })

  return NextResponse.json(
    {
      ...state,
      application: toPublicKycApplication(result.application),
    },
    { status: 201 }
  )
}
