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

    const patch: Parameters<typeof updateRelease>[1] = {
      releaseDate: typeof body.releaseDate === "string" ? body.releaseDate : body.releaseDate === null ? null : undefined,
      upc: typeof body.upc === "string" ? body.upc : body.upc === null ? null : undefined,
    }
    if (body.kind === "album" || body.kind === "single") patch.kind = body.kind
    if (typeof body.title === "string") patch.title = body.title
    if (typeof body.artistName === "string") patch.artistName = body.artistName.trim()
    if (typeof body.labelName === "string") patch.labelName = body.labelName.trim()
    if (typeof body.wizardStep === "number") patch.wizardStep = body.wizardStep
    if (body.addons && typeof body.addons === "object") patch.addons = body.addons as typeof release.addons
    if (typeof body.requestAiCover === "boolean") patch.requestAiCover = body.requestAiCover

    const updated = await updateRelease(id, patch)

    return NextResponse.json({ release: updated })
  } catch (error) {
    console.error("[releases/PATCH]", error)
    return NextResponse.json({ error: "Не удалось сохранить релиз" }, { status: 500 })
  }
}
