import path from "path"
import crypto from "crypto"
import os from "os"
import { promises as fs } from "fs"
import { NextRequest, NextResponse } from "next/server"
import { getCabinetToken, getCabinetSession } from "@/lib/cabinet-auth"
import { getCabinetUserByEmail } from "@/lib/cabinet-users"
import { checkProfileCompleteForUpload } from "@/lib/cabinet-upload-profile-gate"
import { checkKycVerifiedForDistribution } from "@/lib/cabinet-kyc-gate"
import { getUploadArtistPolicyViolationWithSlots } from "@/lib/cabinet-upload-artist-policy"
import {
  MAX_CABINET_COVER_BYTES,
  validateCabinetCoverImageFromFilePath,
} from "@/lib/cabinet-cover-validation"
import { copyFileToPathAtomic } from "@/lib/node-atomic-upload"
import { getCoversDir } from "@/lib/tracks"
import { createRelease, listReleasesByUserId } from "@/lib/releases"
import { getEffectiveReleaseLabelName } from "@/lib/release-label"
import { parseCoverAiLevel } from "@/lib/cover-ai-level"

function coverExtFromUpload(file: File): string | undefined {
  const fromName = (file.name ?? "").toLowerCase().split(".").pop()
  if (fromName && ["jpg", "jpeg", "png"].includes(fromName)) return fromName
  if (file.type === "image/png") return "png"
  if (file.type === "image/jpeg") return "jpg"
  return fromName || undefined
}

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
  const kycGate = checkKycVerifiedForDistribution(user)
  if (kycGate) return NextResponse.json(kycGate.body, { status: kycGate.status })

  let tempCoverPath: string | null = null
  try {
    // formData надёжнее busboy-stream для обложек <20MB (создание черновика с cover).
    const form = await request.formData()
    const kindRaw = String(form.get("kind") ?? "").trim()
    const kind = kindRaw === "album" ? "album" : "single"
    const title = String(form.get("title") ?? "").trim()
    const artistName = String(form.get("artistName") ?? "").trim()
    const releaseDateRaw = String(form.get("releaseDate") ?? "").trim()
    const releaseDate = releaseDateRaw || undefined
    const upcRaw = String(form.get("upc") ?? "").trim()
    const upc = upcRaw || undefined
    const requestAiCover = String(form.get("requestAiCover") ?? "") === "true"
    const coverCreatedWithAi = parseCoverAiLevel(String(form.get("coverCreatedWithAi") ?? "").trim())
    const acceptShortReleaseDate = String(form.get("acceptShortReleaseDate") ?? "") === "true"
    const labelName = getEffectiveReleaseLabelName(
      String(form.get("labelName") ?? "").trim() || undefined,
      user.subscriptionName
    )

    if (artistName) {
      const artistPolicyError = await getUploadArtistPolicyViolationWithSlots(user, artistName)
      if (artistPolicyError) return NextResponse.json({ error: artistPolicyError }, { status: 400 })
    }

    const coverEntry = form.get("cover")
    let coverPath = ""

    if (coverEntry instanceof File && coverEntry.size > 0) {
      if (coverEntry.size > MAX_CABINET_COVER_BYTES) {
        return NextResponse.json({ error: "Размер обложки не должен превышать 20 MB" }, { status: 400 })
      }
      const coverExt = coverExtFromUpload(coverEntry)
      const tmpDir = path.join(os.tmpdir(), "parallax-multipart")
      await fs.mkdir(tmpDir, { recursive: true })
      tempCoverPath = path.join(tmpDir, `${crypto.randomUUID()}.part`)
      await fs.writeFile(tempCoverPath, Buffer.from(await coverEntry.arrayBuffer()))

      const coverError = await validateCabinetCoverImageFromFilePath(
        tempCoverPath,
        coverExt,
        coverEntry.size
      )
      if (coverError) return NextResponse.json({ error: coverError }, { status: 400 })

      const coverId = crypto.randomUUID()
      const coversDir = await getCoversDir()
      coverPath = path.join(coversDir, `release-${coverId}.${coverExt}`)
      await copyFileToPathAtomic(tempCoverPath, coverPath)
    } else if (coverEntry != null && !(coverEntry instanceof File)) {
      console.error("[releases/POST] cover field is not a File", typeof coverEntry)
    }

    if (!coverPath && !requestAiCover) {
      console.error("[releases/POST] cover missing", {
        hasCoverEntry: coverEntry != null,
        isFile: coverEntry instanceof File,
        size: coverEntry instanceof File ? coverEntry.size : null,
        name: coverEntry instanceof File ? coverEntry.name : null,
        type: coverEntry instanceof File ? coverEntry.type : null,
      })
      return NextResponse.json(
        { error: "Загрузите обложку или отметьте заказ AI-обложки" },
        { status: 400 }
      )
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
      requestAiCover,
      coverCreatedWithAi,
      acceptShortReleaseDate,
    })
    return NextResponse.json({ release }, { status: 201 })
  } catch (error) {
    console.error("[releases/POST]", error)
    return NextResponse.json({ error: "Не удалось создать релиз" }, { status: 500 })
  } finally {
    if (tempCoverPath) {
      await fs.unlink(tempCoverPath).catch(() => {})
    }
  }
}
