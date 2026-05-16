import { NextRequest, NextResponse } from "next/server"
import { getCabinetToken, getCabinetSession } from "@/lib/cabinet-auth"
import { getCabinetUserByEmail } from "@/lib/cabinet-users"
import { cabinetProfileCompleteForUpload } from "@/lib/cabinet-upload-profile-gate"
import { listCabinetArtistSubscriptionsByUserId } from "@/lib/cabinet-artist-subscriptions"

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

    const artistSubscriptions = await listCabinetArtistSubscriptionsByUserId(user.id)

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        createdAt: user.createdAt,
        artistName: user.artistName,
        subscriptionName: user.subscriptionName,
        subscriptionExpiresAt: user.subscriptionExpiresAt,
        subscriptionTrackLimit: user.subscriptionTrackLimit,
        purchasedTracksBalance: user.purchasedTracksBalance ?? 0,
        streamingBalance: user.streamingBalance || 0,
        profileCompleteForUpload: cabinetProfileCompleteForUpload(user),
        artistSubscriptions,
      },
    })
  } catch (error) {
    console.error("Error fetching cabinet user:", error)
    return NextResponse.json(
      { error: "Не удалось загрузить информацию о пользователе" },
      { status: 500 }
    )
  }
}
