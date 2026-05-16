import path from "path"
import crypto from "crypto"
import { NextRequest, NextResponse } from "next/server"
import { getCabinetToken, getCabinetSession } from "@/lib/cabinet-auth"
import { getCabinetUserByEmail } from "@/lib/cabinet-users"
import { getUploadArtistPolicyViolationWithSlots } from "@/lib/cabinet-upload-artist-policy"
import {
  deleteUploadDraft,
  getUploadDraftById,
  getUploadDraftsDir,
  updateUploadDraft,
  unlinkUploadDraftMediaFile,
  type UploadDraft,
  type UploadDraftPayload,
} from "@/lib/upload-drafts"
import { uploadDraftAddonBundleTotalRub } from "@/lib/cabinet-upload-draft-addons"
import { getOrderById } from "@/lib/orders"
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

function draftIsEditable(d: UploadDraft): boolean {
  return d.status === "collecting" || d.status === "awaiting_payment" || d.status === "paid"
}

async function resolveDraftStatusAfterChange(
  draft: UploadDraft,
  totalRub: number,
  bundleOrderIdForStatus: string | null | undefined = undefined
): Promise<UploadDraft["status"]> {
  if (draft.status === "finalized" || draft.status === "expired" || draft.status === "cancelled") {
    return draft.status
  }
  const bundleId =
    bundleOrderIdForStatus !== undefined ? bundleOrderIdForStatus : draft.bundleOrderId ?? null
  if (bundleId) {
    const order = await getOrderById(bundleId)
    if (order?.status === "paid") return "paid"
  }
  if (totalRub > 0) return "awaiting_payment"
  return "collecting"
}

async function assertArtistPolicyIfNeeded(
  draft: UploadDraft,
  user: NonNullable<Awaited<ReturnType<typeof getCabinetUserByEmail>>>,
  payload: UploadDraftPayload
): Promise<NextResponse | null> {
  if (draft.kind !== "single") return null
  const artistName = `${payload.artistName ?? ""}`.trim()
  if (!artistName) return null
  const err = await getUploadArtistPolicyViolationWithSlots(user, artistName)
  if (err) return NextResponse.json({ error: err }, { status: 400 })
  return null
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = getCabinetToken(request)
  const session = getCabinetSession(token)
  if (!session) return NextResponse.json({ error: "Необходима авторизация" }, { status: 401 })
  const { id } = await params
  const draft = await getUploadDraftById(id)
  if (!draft || draft.userId.toLowerCase() !== session.email.toLowerCase()) {
    return NextResponse.json({ error: "Черновик не найден" }, { status: 404 })
  }
  return NextResponse.json({ draft })
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = getCabinetToken(request)
  const session = getCabinetSession(token)
  if (!session) return NextResponse.json({ error: "Необходима авторизация" }, { status: 401 })
  const { id } = await params
  const draft = await getUploadDraftById(id)
  if (!draft || draft.userId.toLowerCase() !== session.email.toLowerCase()) {
    return NextResponse.json({ error: "Черновик не найден" }, { status: 404 })
  }
  if (!draftIsEditable(draft)) {
    return NextResponse.json({ error: "Этот черновик больше нельзя редактировать" }, { status: 400 })
  }

  const user = await getCabinetUserByEmail(session.email)
  if (!user) return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 })

  const contentType = request.headers.get("content-type") ?? ""

  if (contentType.includes("multipart/form-data")) {
    try {
      const multipart = await parseMultipartRequestStream(request, {
        maxFiles: 2,
        maxFields: 40,
        maxFileSizeBytes: MAX_AUDIO_SIZE,
        maxFieldSizeBytes: 128 * 1024,
      })
      try {
        const payloadRaw = multipart.getField("payload")
        let nextPayload: UploadDraftPayload
        if (payloadRaw) {
          try {
            nextPayload = JSON.parse(payloadRaw) as UploadDraftPayload
          } catch {
            return NextResponse.json({ error: "Некорректный payload JSON" }, { status: 400 })
          }
        } else {
          nextPayload = draft.payload
        }

        const policyErr = await assertArtistPolicyIfNeeded(draft, user, nextPayload)
        if (policyErr) return policyErr

        let draftsDir: string | null = null
        const ensureDraftsDir = async (): Promise<string> => {
          if (!draftsDir) draftsDir = await getUploadDraftsDir()
          return draftsDir
        }
        const partial: Parameters<typeof updateUploadDraft>[1] = { payload: nextPayload }

        const audio = multipart.getFile("audio")
        if (audio) {
          if (audio.size === 0) {
            return NextResponse.json({ error: "Аудиофайл пустой. Загрузите WAV повторно" }, { status: 400 })
          }
          if (audio.size > MAX_AUDIO_SIZE) {
            return NextResponse.json({ error: "Размер аудиофайла не должен превышать 80 MB" }, { status: 400 })
          }
          const wavError = await validateWavFormatFromFilePath(audio.tempFilePath)
          if (wavError) return NextResponse.json({ error: wavError }, { status: 400 })
          const newRel = `${crypto.randomUUID()}.wav`
          await copyFileToPathAtomic(audio.tempFilePath, path.join(await ensureDraftsDir(), newRel))
          if (draft.audioRelPath) await unlinkUploadDraftMediaFile(draft.audioRelPath)
          partial.audioRelPath = newRel
        }

        if (Boolean(nextPayload.requestAiCover)) {
          if (draft.coverRelPath) await unlinkUploadDraftMediaFile(draft.coverRelPath)
          partial.coverRelPath = null
        } else {
          const cover = multipart.getFile("cover")
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
            const newCoverRel = `${crypto.randomUUID()}.${coverExt}`
            await copyFileToPathAtomic(cover.tempFilePath, path.join(await ensureDraftsDir(), newCoverRel))
            if (draft.coverRelPath) await unlinkUploadDraftMediaFile(draft.coverRelPath)
            partial.coverRelPath = newCoverRel
          }
        }

        const totalRub = uploadDraftAddonBundleTotalRub(nextPayload)
        let bundleOrderIdForStatus: string | null | undefined = undefined
        if (totalRub === 0 && draft.bundleOrderId) {
          const order = await getOrderById(draft.bundleOrderId)
          if (!order || order.status !== "paid") {
            partial.bundleOrderId = null
            bundleOrderIdForStatus = null
          }
        }
        partial.status = await resolveDraftStatusAfterChange(draft, totalRub, bundleOrderIdForStatus)

        const updated = await updateUploadDraft(id, partial)
        return NextResponse.json({ draft: updated })
      } finally {
        await multipart.cleanup()
      }
    } catch (error) {
      if (error instanceof MultipartRequestError) {
        return NextResponse.json({ error: error.message }, { status: error.status })
      }
      throw error
    }
  }

  let body: Record<string, unknown>
  try {
    body = (await request.json()) as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: "Неверный JSON" }, { status: 400 })
  }

  const nextPayload = (body.payload as UploadDraftPayload) ?? draft.payload
  const policyErr = await assertArtistPolicyIfNeeded(draft, user, nextPayload)
  if (policyErr) return policyErr

  const partial: Parameters<typeof updateUploadDraft>[1] = {
    payload: nextPayload,
    albumId: typeof body.albumId === "string" ? body.albumId : draft.albumId,
  }

  if (Boolean(nextPayload.requestAiCover) && draft.coverRelPath) {
    await unlinkUploadDraftMediaFile(draft.coverRelPath)
    partial.coverRelPath = null
  }

  const totalRub = uploadDraftAddonBundleTotalRub(nextPayload)
  let bundleOrderIdForStatus: string | null | undefined = undefined
  if (totalRub === 0 && draft.bundleOrderId) {
    const order = await getOrderById(draft.bundleOrderId)
    if (!order || order.status !== "paid") {
      partial.bundleOrderId = null
      bundleOrderIdForStatus = null
    }
  }
  partial.status = await resolveDraftStatusAfterChange(draft, totalRub, bundleOrderIdForStatus)

  const updated = await updateUploadDraft(id, partial)
  return NextResponse.json({ draft: updated })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = getCabinetToken(request)
  const session = getCabinetSession(token)
  if (!session) return NextResponse.json({ error: "Необходима авторизация" }, { status: 401 })

  const { id } = await params
  const draft = await getUploadDraftById(id)
  if (!draft || draft.userId.toLowerCase() !== session.email.toLowerCase()) {
    return NextResponse.json({ error: "Черновик не найден" }, { status: 404 })
  }
  if (!draftIsEditable(draft)) {
    return NextResponse.json({ error: "Этот черновик больше нельзя удалить" }, { status: 400 })
  }

  const deleted = await deleteUploadDraft(id)
  if (!deleted) {
    return NextResponse.json({ error: "Не удалось удалить черновик" }, { status: 500 })
  }
  return NextResponse.json({ success: true })
}
