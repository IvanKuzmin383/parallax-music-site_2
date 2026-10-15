import { NextRequest, NextResponse } from "next/server"
import { getCabinetToken, getCabinetSession } from "@/lib/cabinet-auth"
import { getCabinetUserByEmail } from "@/lib/cabinet-users"
import { getServicePriceRub } from "@/lib/service-prices"
import { respondWithWalletPayment } from "@/lib/cabinet-wallet-pay"
import { createOrder } from "@/lib/orders"
import { getReleaseById } from "@/lib/releases"
import { getTrackById } from "@/lib/tracks"
import { getAlbumById } from "@/lib/albums"

const CONTACT_TYPE_VALUES = new Set(["telegram", "vk", "max"])

async function resolveOwnedCatalogItem(userId: string, catalogId: string) {
  const release = await getReleaseById(catalogId)
  if (release && release.userId.toLowerCase() === userId.toLowerCase()) {
    return {
      releaseId: release.id,
      trackTitle: release.title,
      artistName: release.artistName,
      source: "release" as const,
    }
  }

  const track = await getTrackById(catalogId)
  if (track && track.userId.toLowerCase() === userId.toLowerCase()) {
    return {
      releaseId: track.id,
      trackTitle: track.trackName,
      artistName: track.artistName ?? "",
      source: "track" as const,
    }
  }

  const album = await getAlbumById(catalogId)
  if (album && album.userId.toLowerCase() === userId.toLowerCase()) {
    return {
      releaseId: album.id,
      trackTitle: album.title,
      artistName: album.artistName,
      source: "album" as const,
    }
  }

  return null
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
    return NextResponse.json({ error: "Неверный JSON" }, { status: 400 })
  }

  const raw = body as Record<string, unknown>
  const releaseIdRaw = typeof raw.releaseId === "string" ? raw.releaseId.trim() : ""
  const comment = typeof raw.comment === "string" ? raw.comment.trim() : ""
  const contactType = typeof raw.contactType === "string" ? raw.contactType.trim().toLowerCase() : ""
  const contactValue = typeof raw.contactValue === "string" ? raw.contactValue.trim() : ""

  if (!releaseIdRaw) {
    return NextResponse.json(
      { error: "Выберите релиз из загруженных в кабинете" },
      { status: 400 }
    )
  }

  const owned = await resolveOwnedCatalogItem(user.id, releaseIdRaw)
  if (!owned) {
    return NextResponse.json(
      { error: "Релиз не найден или не принадлежит вашему аккаунту" },
      { status: 400 }
    )
  }

  if (comment.length < 2) {
    return NextResponse.json({ error: "Поле «Комментарий» обязательно" }, { status: 400 })
  }
  if (!CONTACT_TYPE_VALUES.has(contactType)) {
    return NextResponse.json({ error: "Выберите корректный контакт для связи" }, { status: 400 })
  }
  if (!contactValue || contactValue.length < 2) {
    return NextResponse.json({ error: "Укажите контакт для связи" }, { status: 400 })
  }

  const totalAmount = (await getServicePriceRub("business_music")).toFixed(2)
  const isTelegramContact = contactType === "telegram"
  const displayTitle = owned.artistName
    ? `${owned.artistName} - ${owned.trackTitle}`
    : owned.trackTitle

  const order = await createOrder({
    orderType: "business_music",
    userId: user.id,
    tracksCount: 1,
    totalAmount,
    contactEmail: isTelegramContact ? undefined : `${contactType}: ${contactValue}`,
    contactTelegram: isTelegramContact ? contactValue : undefined,
    serviceDetails: {
      trackTitle: displayTitle,
      releaseId: owned.releaseId,
      catalogSource: owned.source,
      comment,
      contactType,
      contactValue,
    },
  })

  return respondWithWalletPayment(order)
}
