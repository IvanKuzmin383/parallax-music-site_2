import path from "path"
import crypto from "crypto"
import { NextRequest, NextResponse } from "next/server"
import { getCabinetToken, getCabinetSession } from "@/lib/cabinet-auth"
import { getCabinetUserByEmail } from "@/lib/cabinet-users"
import { checkProfileCompleteForUpload } from "@/lib/cabinet-upload-profile-gate"
import { getUploadArtistPolicyViolationWithSlots } from "@/lib/cabinet-upload-artist-policy"
import { getUploadDraftsDir, createUploadDraft, listUploadDrafts, type UploadDraftPayload } from "@/lib/upload-drafts"
import { uploadDraftAddonBundleTotalRub } from "@/lib/cabinet-upload-draft-addons"
import {
  MAX_CABINET_COVER_BYTES,
  validateCabinetCoverImageFromFilePath,
} from "@/lib/cabinet-cover-validation"
import { copyFileToPathAtomic } from "@/lib/node-atomic-upload"
import {
  MultipartRequestError,
  parseMultipartRequestStream,
} from "@/lib/node-streaming-multipart"
import { validateWavFormatFromFilePath } from "@/lib/node-wav-validation"

const MAX_AUDIO_SIZE = 80 * 1024 * 1024

export async function GET(request: NextRequest) {
  const token = getCabinetToken(request)
  const session = getCabinetSession(token)
  if (!session) return NextResponse.json({ error: "Необходима авторизация" }, { status: 401 })
  const drafts = await listUploadDrafts({ userId: session.email, limit: 100 })
  return NextResponse.json({ drafts })
}

export async function POST(request: NextRequest) {
  const token = getCabinetToken(request)
  const session = getCabinetSession(token)
  if (!session) return NextResponse.json({ error: "Необходима авторизация" }, { status: 401 })

  const user = await getCabinetUserByEmail(session.email)
  if (!user) return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 })
  const profileGate = checkProfileCompleteForUpload(user)
  if (profileGate) return NextResponse.json(profileGate.body, { status: profileGate.status })

  try {
    const multipart = await parseMultipartRequestStream(request, {
      maxFiles: 2,
      maxFields: 40,
      maxFileSizeBytes: MAX_AUDIO_SIZE,
      maxFieldSizeBytes: 128 * 1024,
    })
    try {
      const kindRaw = multipart.getField("kind")?.trim()
      const kind = kindRaw === "album" ? "album" : "single"
      const payloadRaw = multipart.getField("payload")
      if (!payloadRaw) return NextResponse.json({ error: "payload обязателен" }, { status: 400 })

      let payload: UploadDraftPayload
      try {
        payload = JSON.parse(payloadRaw) as UploadDraftPayload
      } catch {
        return NextResponse.json({ error: "Некорректный payload JSON" }, { status: 400 })
      }

      const audio = multipart.getFile("audio")
      if (audio && audio.size === 0) {
        return NextResponse.json({ error: "Аудиофайл пустой. Загрузите WAV повторно" }, { status: 400 })
      }
      const hasIncomingAudio = Boolean(audio && audio.size > 0)

  if (kind === "single") {
    const artistName = `${payload.artistName ?? ""}`.trim()
    if (!hasIncomingAudio && !artistName) {
      return NextResponse.json({ error: "Укажите исполнителя" }, { status: 400 })
    }
    if (artistName) {
      const artistPolicyError = await getUploadArtistPolicyViolationWithSlots(user, artistName)
      if (artistPolicyError) return NextResponse.json({ error: artistPolicyError }, { status: 400 })
    }
  }

      const cover = multipart.getFile("cover")
      let draftsDir: string | null = null
      const ensureDraftsDir = async (): Promise<string> => {
        if (!draftsDir) draftsDir = await getUploadDraftsDir()
        return draftsDir
      }
      let audioRelPath: string | undefined
      if (hasIncomingAudio && audio) {
        if (audio.size > MAX_AUDIO_SIZE) {
          return NextResponse.json({ error: "Размер аудиофайла не должен превышать 80 MB" }, { status: 400 })
        }
        const wavError = await validateWavFormatFromFilePath(audio.tempFilePath)
        if (wavError) return NextResponse.json({ error: wavError }, { status: 400 })
        audioRelPath = `${crypto.randomUUID()}.wav`
        await copyFileToPathAtomic(audio.tempFilePath, path.join(await ensureDraftsDir(), audioRelPath))
      }

      let coverRelPath: string | undefined
      if (cover && cover.size > 0) {
        if (cover.size > MAX_CABINET_COVER_BYTES) {
          return NextResponse.json({ error: "Размер обложки не должен превышать 20 MB" }, { status: 400 })
        }
        const coverExt = cover.originalFilename.toLowerCase().split(".").pop()
        const coverError = await validateCabinetCoverImageFromFilePath(
          cover.tempFilePath,
          coverExt,
          cover.size
        )
        if (coverError) return NextResponse.json({ error: coverError }, { status: 400 })
        coverRelPath = `${crypto.randomUUID()}.${coverExt}`
        await copyFileToPathAtomic(cover.tempFilePath, path.join(await ensureDraftsDir(), coverRelPath))
      }

      const totalRub = uploadDraftAddonBundleTotalRub(payload)

      const draft = await createUploadDraft({
        userId: session.email,
        kind,
        status: totalRub > 0 ? "awaiting_payment" : "collecting",
        payload,
        audioRelPath,
        coverRelPath,
      })
      return NextResponse.json({ draft, requiresPayment: totalRub > 0, amountRub: totalRub }, { status: 201 })
    } finally {
      await multipart.cleanup()
    }
  } catch (error) {
    if (error instanceof MultipartRequestError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error("Error creating upload draft:", error)
    return NextResponse.json({ error: "Не удалось создать черновик" }, { status: 500 })
  }
}
