import { NextRequest, NextResponse } from "next/server"
import { getCabinetToken, getCabinetSession } from "@/lib/cabinet-auth"
import { getCabinetUserByEmail } from "@/lib/cabinet-users"
import { checkProfileCompleteForUpload } from "@/lib/cabinet-upload-profile-gate"
import { getTracksByAlbumId } from "@/lib/tracks"
import { updateTrack } from "@/lib/tracks"
import { getAlbumById } from "@/lib/albums"
import { getUploadDraftByAlbumId, markUploadDraftFinalized, removeUploadDraftFiles } from "@/lib/upload-drafts"
import { getOrderById } from "@/lib/orders"
import { uploadDraftAddonBundleTotalRub } from "@/lib/cabinet-upload-draft-addons"
import { validateWavFormatFromFilePath } from "@/lib/node-wav-validation"

/**
 * Шаг 3: проверка WAV всех треков альбома и отправка уведомления в Telegram
 * (после пошаговой загрузки аудио на /track-audio).
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ albumId: string }> }
) {
  const token = getCabinetToken(request)
  const session = getCabinetSession(token)
  if (!session) {
    return NextResponse.json({ error: "Необходима авторизация" }, { status: 401 })
  }

  const { albumId } = await params

  try {
    const user = await getCabinetUserByEmail(session.email)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const isFixPlan = user?.subscriptionName === "Fix"
    const hasActiveSubscription =
      isFixPlan ||
      (user?.subscriptionExpiresAt && new Date(user.subscriptionExpiresAt) >= today)
    if (!hasActiveSubscription || !user) {
      return NextResponse.json(
        {
          error:
            "Для загрузки треков необходима активная подписка. Обратитесь к администратору для подключения тарифа.",
        },
        { status: 403 }
      )
    }

    const profileGate = checkProfileCompleteForUpload(user)
    if (profileGate) {
      return NextResponse.json(profileGate.body, { status: profileGate.status })
    }

    const album = await getAlbumById(albumId)
    if (!album || album.userId.toLowerCase() !== session.email.toLowerCase()) {
      return NextResponse.json({ error: "Альбом не найден" }, { status: 404 })
    }

    const tracks = (await getTracksByAlbumId(albumId)).sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    )
    const albumDraft = await getUploadDraftByAlbumId(albumId)
    const albumAddonTotalRub = albumDraft ? uploadDraftAddonBundleTotalRub(albumDraft.payload) : 0
    if (albumAddonTotalRub > 0 && albumDraft?.bundleOrderId) {
      const order = await getOrderById(albumDraft.bundleOrderId)
      if (!order || order.status !== "paid") {
        return NextResponse.json({ error: "Сначала оплатите выбранные услуги" }, { status: 400 })
      }
    }

    if (tracks.length === 0) {
      return NextResponse.json({ error: "У альбома нет треков" }, { status: 400 })
    }

    for (const t of tracks) {
      try {
        const wavError = await validateWavFormatFromFilePath(t.audioPath)
        if (wavError) {
          return NextResponse.json(
            {
              error: `Трек «${t.trackName}»: ${wavError} Загрузите корректный WAV.`,
            },
            { status: 400 }
          )
        }
      } catch {
        return NextResponse.json(
          { error: `Не удалось прочитать файл трека «${t.trackName}». Загрузите аудио ещё раз.` },
          { status: 400 }
        )
      }
    }

    for (const t of tracks) {
      if (t.status === "upload_pending") {
        await updateTrack(t.id, { status: "on_moderation" })
      }
    }
    if (albumDraft) {
      await removeUploadDraftFiles(albumDraft)
      await markUploadDraftFinalized(albumDraft.id)
    }

    return NextResponse.json({
      album,
      tracks,
    })
  } catch (error) {
    console.error("Error finalizing album upload:", error)
    return NextResponse.json(
      { error: "Не удалось завершить загрузку альбома" },
      { status: 500 }
    )
  }
}
