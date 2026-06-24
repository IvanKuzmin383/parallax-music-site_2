import path from "path"
import crypto from "crypto"
import { NextRequest, NextResponse } from "next/server"
import { getCabinetToken, getCabinetSession } from "@/lib/cabinet-auth"
import { getCabinetUserByEmail } from "@/lib/cabinet-users"
import { checkProfileCompleteForUpload } from "@/lib/cabinet-upload-profile-gate"
import { getUploadArtistPolicyViolationWithSlots } from "@/lib/cabinet-upload-artist-policy"
import {
  MAX_CABINET_COVER_BYTES,
  validateCabinetCoverImageFromFilePath,
} from "@/lib/cabinet-cover-validation"
import { copyFileToPathAtomic } from "@/lib/node-atomic-upload"
import {
  MultipartRequestError,
  parseMultipartRequestStream,
} from "@/lib/node-streaming-multipart"
import { getCoversDir } from "@/lib/tracks"
import { createRelease, listReleasesByUserId } from "@/lib/releases"
import { getEffectiveReleaseLabelName } from "@/lib/release-label"

export async function GET(request: NextRequest) {
  const token = getCabinetToken(request)
  const session = getCabinetSession(token)
  if (!session) return NextResponse.json({ error: "Необходима авторизация" }, { status: 401 })

  const releases = await listReleasesByUserId(session.email)
  return NextResponse.json({ releases })
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
      maxFiles: 1,
      maxFields: 20,
      maxFileSizeBytes: MAX_CABINET_COVER_BYTES,
      maxFieldSizeBytes: 64 * 1024,
    })

    try {
      const kindRaw = multipart.getField("kind")?.trim()
      const kind = kindRaw === "album" ? "album" : "single"
      const title = multipart.getField("title")?.trim() ?? ""
      const artistName = multipart.getField("artistName")?.trim() ?? ""
      const releaseDate = multipart.getField("releaseDate")?.trim() || undefined
      const upc = multipart.getField("upc")?.trim() || undefined
      const labelName = getEffectiveReleaseLabelName(
        multipart.getField("labelName")?.trim(),
        user.subscriptionName
      )

      if (artistName) {
        const artistPolicyError = await getUploadArtistPolicyViolationWithSlots(user, artistName)
        if (artistPolicyError) return NextResponse.json({ error: artistPolicyError }, { status: 400 })
      }

      const cover = multipart.getFile("cover")
      let coverPath = ""

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

        const coverId = crypto.randomUUID()
        const coversDir = await getCoversDir()
        coverPath = path.join(coversDir, `release-${coverId}.${coverExt}`)
        await copyFileToPathAtomic(cover.tempFilePath, coverPath)
      }

      const release = await createRelease({
        userId: session.email,
        kind,
        title,
        artistName,
        labelName,
        coverPath,
        releaseDate,
        upc,
        wizardStep: 1,
      })
      return NextResponse.json({ release }, { status: 201 })
    } finally {
      await multipart.cleanup()
    }
  } catch (error) {
    if (error instanceof MultipartRequestError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error("[releases/POST]", error)
    return NextResponse.json({ error: "Не удалось создать релиз" }, { status: 500 })
  }
}
