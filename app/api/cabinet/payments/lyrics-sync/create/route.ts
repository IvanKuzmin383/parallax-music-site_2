import { NextRequest, NextResponse } from "next/server"
import { getCabinetToken, getCabinetSession } from "@/lib/cabinet-auth"
import { getCabinetUserByEmail } from "@/lib/cabinet-users"
import { respondWithWalletPayment } from "@/lib/cabinet-wallet-pay"
import { getServicePriceRub } from "@/lib/service-prices"
import { createOrder } from "@/lib/orders"

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return url.protocol === "http:" || url.protocol === "https:"
  } catch {
    return false
  }
}

/**
 * Оплата «Синхронизации текста» с баланса кабинета.
 * Цена берётся только с сервера (LYRICS_SYNC_PRICE_RUB).
 */
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
    return NextResponse.json({ error: "Неверный JSON" }, { status: 400 })
  }

  const raw = body as Record<string, unknown>
  const trackLink = typeof raw.trackLink === "string" ? raw.trackLink.trim() : ""
  const fileUrlRaw = typeof raw.fileUrl === "string" ? raw.fileUrl.trim() : ""
  const audioUrl = trackLink || fileUrlRaw
  const lyricsText =
    typeof raw.lyricsText === "string" ? raw.lyricsText.replace(/\r\n/g, "\n").trim() : ""
  const comment =
    typeof raw.comment === "string" ? raw.comment.replace(/\r\n/g, "\n").trim() : ""

  if (!audioUrl) {
    return NextResponse.json(
      { error: "Укажите ссылку на финальную версию трека" },
      { status: 400 }
    )
  }
  if (!isHttpUrl(audioUrl)) {
    return NextResponse.json(
      { error: "Укажите корректную ссылку на трек (http или https)" },
      { status: 400 }
    )
  }
  if (!lyricsText) {
    return NextResponse.json(
      { error: "Укажите полный текст песни в порядке исполнения" },
      { status: 400 }
    )
  }

  const totalAmount = (await getServicePriceRub("lyrics_sync")).toFixed(2)
  const order = await createOrder({
    orderType: "lyrics_sync",
    userId: user.id,
    tracksCount: 1,
    totalAmount,
    contactEmail: user.email,
    serviceDetails: {
      fileUrl: audioUrl,
      lyricsText,
      comment: comment || undefined,
    },
  })

  return respondWithWalletPayment(order)
}
