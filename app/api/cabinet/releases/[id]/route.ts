import { NextRequest, NextResponse } from "next/server"
import { getCabinetToken, getCabinetSession } from "@/lib/cabinet-auth"
import { getCabinetUserByEmail } from "@/lib/cabinet-users"
import { getUploadArtistPolicyViolationWithSlots } from "@/lib/cabinet-upload-artist-policy"
import { getReleaseById, updateRelease } from "@/lib/releases"
import { getTracksByReleaseId } from "@/lib/tracks"

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = getCabinetToken(_request)
  const session = getCabinetSession(token)
  if (!session) return NextResponse.json({ error: "Необходима авторизация" }, { status: 401 })

  const { id } = await params
  const release = await getReleaseById(id)
  if (!release || release.userId.toLowerCase() !== session.email.toLowerCase()) {
    return NextResponse.json({ error: "Релиз не найден" }, { status: 404 })
  }

  const tracks = await getTracksByReleaseId(id)
  return NextResponse.json({ release, tracks })
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = getCabinetToken(request)
  const session = getCabinetSession(token)
  if (!session) return NextResponse.json({ error: "Необходима авторизация" }, { status: 401 })

  const { id } = await params
  const release = await getReleaseById(id)
  if (!release || release.userId.toLowerCase() !== session.email.toLowerCase()) {
    return NextResponse.json({ error: "Релиз не найден" }, { status: 404 })
  }

  if (!["draft", "awaiting_payment"].includes(release.status)) {
    return NextResponse.json({ error: "Релиз нельзя редактировать" }, { status: 400 })
  }

  try {
    const body = (await request.json()) as Record<string, unknown>
    const artistName = typeof body.artistName === "string" ? body.artistName.trim() : undefined

    if (artistName) {
      const user = await getCabinetUserByEmail(session.email)
      if (user) {
        const artistPolicyError = await getUploadArtistPolicyViolationWithSlots(user, artistName)
        if (artistPolicyError) return NextResponse.json({ error: artistPolicyError }, { status: 400 })
      }
    }

    const updated = await updateRelease(id, {
      kind: body.kind === "album" ? "album" : body.kind === "single" ? "single" : undefined,
      title: typeof body.title === "string" ? body.title : undefined,
      artistName,
      labelName: typeof body.labelName === "string" ? body.labelName : undefined,
      releaseDate: typeof body.releaseDate === "string" ? body.releaseDate : body.releaseDate === null ? null : undefined,
      upc: typeof body.upc === "string" ? body.upc : body.upc === null ? null : undefined,
      wizardStep: typeof body.wizardStep === "number" ? body.wizardStep : undefined,
      addons: body.addons && typeof body.addons === "object" ? (body.addons as typeof release.addons) : undefined,
      requestAiCover: typeof body.requestAiCover === "boolean" ? body.requestAiCover : undefined,
    })

    return NextResponse.json({ release: updated })
  } catch (error) {
    console.error("[releases/PATCH]", error)
    return NextResponse.json({ error: "Не удалось сохранить релиз" }, { status: 500 })
  }
}
