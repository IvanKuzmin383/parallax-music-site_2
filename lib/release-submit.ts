import { getCabinetUserByEmail } from "@/lib/cabinet-users"
import {
  assertFixPackCreditsAvailable,
  deductFixPackCreditsOnUpload,
} from "@/lib/fix-pack-credits"
import { getUploadArtistPolicyViolationWithSlots } from "@/lib/cabinet-upload-artist-policy"
import {
  assertUploadDraftBundlePayment,
  uploadDraftRequiredPaymentRub,
} from "@/lib/cabinet-upload-draft-addons"
import { validateCabinetCoverImageFromFilePath } from "@/lib/cabinet-cover-validation"
import { createAlbum } from "@/lib/albums"
import { getEffectiveReleaseLabelName } from "@/lib/release-label"
import {
  getReleaseById,
  releasePayloadForPricing,
  updateRelease,
  type Release,
} from "@/lib/releases"
import { validateTrackMetadata } from "@/lib/track-meta-validation"
import {
  getTracksByReleaseId,
  updateTrack,
  type Track,
} from "@/lib/tracks"
import { withTransaction } from "@/lib/database"
import {
  backfillMissingTrackAcceptancesForUser,
  tryRecordLicenseAcceptanceForTrack,
} from "@/lib/legal-acceptance"
import { validateWavFormatFromFilePath } from "@/lib/node-wav-validation"
import { promises as fs } from "fs"
import path from "path"

export type SubmitReleaseContext = {
  clientIp?: string | null
  userAgent?: string | null
}

async function logLicenseAcceptances(
  tracks: Track[],
  ownerEmail: string,
  context?: SubmitReleaseContext
): Promise<void> {
  if (tracks.length === 0) return
  try {
    await withTransaction(async (client) => {
      for (const t of tracks) {
        await tryRecordLicenseAcceptanceForTrack(client, {
          userEmail: ownerEmail,
          trackId: t.id,
          occurredAtIso: new Date().toISOString(),
          clientIp: context?.clientIp ?? null,
          userAgent: context?.userAgent ?? null,
        })
      }
      await backfillMissingTrackAcceptancesForUser(client, ownerEmail)
    })
  } catch (legalErr) {
    console.error("[release-submit] legal acceptance log failed:", legalErr)
  }
}

export type SubmitReleaseResult =
  | { ok: true; release: Release; tracks: Track[] }
  | { ok: false; error: string; status: number }

export async function submitReleaseToModeration(
  releaseId: string,
  context?: SubmitReleaseContext,
  options?: { skipPaymentCheck?: boolean }
): Promise<SubmitReleaseResult> {
  const release = await getReleaseById(releaseId)
  if (!release) return { ok: false, error: "Релиз не найден", status: 404 }

  if (release.status === "on_moderation") {
    return { ok: true, release, tracks: await getTracksByReleaseId(releaseId) }
  }

  if (!["draft", "awaiting_payment"].includes(release.status)) {
    return { ok: false, error: "Релиз уже отправлен", status: 400 }
  }

  const title = release.title.trim()
  const artistName = release.artistName.trim()
  if (!title) return { ok: false, error: "Укажите название релиза", status: 400 }
  if (!artistName) return { ok: false, error: "Укажите имя артиста / название группы", status: 400 }
  if (!release.releaseDate) return { ok: false, error: "Укажите желаемую дату релиза", status: 400 }

  const hasCover = Boolean(release.coverPath)
  const hasAiCover = release.requestAiCover || Boolean(release.addons?.trackCover?.enabled)
  if (!hasCover && !hasAiCover) {
    return {
      ok: false,
      error: "Загрузите обложку или выберите услугу AI-обложки",
      status: 400,
    }
  }

  if (hasCover) {
    try {
      const stat = await fs.stat(release.coverPath)
      const ext = path.extname(release.coverPath).replace(".", "").toLowerCase() || "jpg"
      const coverError = await validateCabinetCoverImageFromFilePath(
        release.coverPath,
        ext,
        stat.size
      )
      if (coverError) return { ok: false, error: coverError, status: 400 }
    } catch {
      return { ok: false, error: "Файл обложки не найден", status: 400 }
    }
  }

  const tracks = await getTracksByReleaseId(releaseId)
  const minTracks = release.kind === "album" ? 2 : 1
  if (tracks.length < minTracks) {
    return {
      ok: false,
      error: release.kind === "album" ? "Альбом должен содержать минимум 2 трека" : "Загрузите аудиофайл",
      status: 400,
    }
  }

  for (const track of tracks) {
    const metaError = validateTrackMetadata(track)
    if (metaError) return { ok: false, error: metaError, status: 400 }
    try {
      await fs.access(track.audioPath)
    } catch {
      return { ok: false, error: `Файл аудио «${track.trackName}» не найден`, status: 400 }
    }
    const wavError = await validateWavFormatFromFilePath(track.audioPath)
    if (wavError) return { ok: false, error: `«${track.trackName}»: ${wavError}`, status: 400 }
  }

  const pricingPayload = releasePayloadForPricing(release)
  const requiredRub = uploadDraftRequiredPaymentRub(pricingPayload)

  if (requiredRub > 0 && !options?.skipPaymentCheck) {
    const paymentGate = await assertUploadDraftBundlePayment(pricingPayload, release.bundleOrderId)
    if (!paymentGate.ok) {
      return { ok: false, error: paymentGate.error, status: 400 }
    }
  }

  const user = await getCabinetUserByEmail(release.userId)
  if (!user) return { ok: false, error: "Пользователь не найден", status: 404 }

  const artistPolicyErr = await getUploadArtistPolicyViolationWithSlots(user, artistName)
  if (artistPolicyErr) return { ok: false, error: artistPolicyErr, status: 400 }

  const creditsGate = assertFixPackCreditsAvailable(user, tracks.length)
  if (!creditsGate.ok) return { ok: false, error: creditsGate.error, status: 403 }

  const releaseLabelName = getEffectiveReleaseLabelName(release.labelName, user.subscriptionName)
  const upc = release.upc?.trim() || undefined
  const needsAiCover = !hasCover && hasAiCover

  let albumId: string | undefined = release.albumId

  if (release.kind === "album" && !albumId) {
    const album = await createAlbum({
      userId: release.userId,
      title,
      artistName,
      labelName: releaseLabelName,
      coverPath: release.coverPath,
      releaseDate: release.releaseDate,
    })
    albumId = album.id
  }

  const updatedTracks: Track[] = []
  for (const track of tracks) {
    const updated = await updateTrack(track.id, {
      trackName: track.trackName.trim(),
      artistName,
      labelName: releaseLabelName,
      coverPath: release.coverPath,
      needsAiCover,
      status: "on_moderation",
      releaseDate: release.releaseDate,
      upc: upc ?? track.upc,
      albumId: albumId ?? track.albumId,
      releaseId: release.id,
    })
    if (!updated) return { ok: false, error: "Не удалось обновить трек", status: 500 }
    updatedTracks.push(updated)
  }

  const updatedRelease = await updateRelease(releaseId, {
    status: "on_moderation",
    albumId: albumId ?? null,
    labelName: releaseLabelName,
  })
  if (!updatedRelease) return { ok: false, error: "Не удалось обновить релиз", status: 500 }

  await logLicenseAcceptances(updatedTracks, release.userId, context)
  await deductFixPackCreditsOnUpload(user, tracks.length)

  return { ok: true, release: updatedRelease, tracks: updatedTracks }
}

export async function submitReleaseAfterPayment(
  releaseId: string,
  orderId: string,
  context?: SubmitReleaseContext
): Promise<SubmitReleaseResult> {
  await updateRelease(releaseId, { bundleOrderId: orderId })
  return submitReleaseToModeration(releaseId, context)
}
