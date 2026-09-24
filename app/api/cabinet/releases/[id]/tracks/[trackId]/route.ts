import { NextRequest, NextResponse } from "next/server"
import { getCabinetToken, getCabinetSession } from "@/lib/cabinet-auth"
import { getReleaseById } from "@/lib/releases"
import { getTrackById, updateTrack } from "@/lib/tracks"
import { GENRES, TRACK_MOODS, normalizeStreamingScope, STREAMING_SCOPES } from "@/lib/track-constants"
import { parseTiktokSoundStartSec } from "@/lib/tiktok-sound-start"
import { parseTrackAiLabeling } from "@/lib/track-ai-labeling"

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; trackId: string }> }
) {
  const token = getCabinetToken(request)
  const session = getCabinetSession(token)
  if (!session) return NextResponse.json({ error: "Необходима авторизация" }, { status: 401 })

  const { id: releaseId, trackId } = await params
  const release = await getReleaseById(releaseId)
  if (!release || release.userId.toLowerCase() !== session.email.toLowerCase()) {
    return NextResponse.json({ error: "Релиз не найден" }, { status: 404 })
  }

  const track = await getTrackById(trackId)
  if (!track || track.releaseId !== releaseId) {
    return NextResponse.json({ error: "Трек не найден" }, { status: 404 })
  }

  if (!["draft", "awaiting_payment"].includes(release.status)) {
    return NextResponse.json({ error: "Релиз нельзя редактировать" }, { status: 400 })
  }

  try {
    const body = (await request.json()) as Record<string, unknown>

    const genre =
      typeof body.genre === "string" && GENRES.includes(body.genre as (typeof GENRES)[number])
        ? (body.genre as (typeof GENRES)[number])
        : undefined
    const mood =
      typeof body.mood === "string" && TRACK_MOODS.includes(body.mood as (typeof TRACK_MOODS)[number])
        ? (body.mood as (typeof TRACK_MOODS)[number])
        : body.mood === ""
          ? ("" as const)
          : undefined

    const updated = await updateTrack(trackId, {
      trackName: typeof body.trackName === "string" ? body.trackName : undefined,
      trackVersion: typeof body.trackVersion === "string" ? body.trackVersion : undefined,
      genre,
      mood,
      shortDescription: typeof body.shortDescription === "string" ? body.shortDescription : undefined,
      lyricsText: typeof body.lyricsText === "string" ? body.lyricsText : undefined,
      lyricsLanguage: typeof body.lyricsLanguage === "string" ? body.lyricsLanguage : undefined,
      lyricsAuthor: typeof body.lyricsAuthor === "string" ? body.lyricsAuthor : undefined,
      musicAuthor: typeof body.musicAuthor === "string" ? body.musicAuthor : undefined,
      musicRights: typeof body.musicRights === "string" ? body.musicRights : undefined,
      musicAiService: typeof body.musicAiService === "string" ? body.musicAiService : undefined,
      lyricsRights: typeof body.lyricsRights === "string" ? body.lyricsRights : undefined,
      performanceRights: typeof body.performanceRights === "string" ? body.performanceRights : undefined,
      isInstrumental: typeof body.isInstrumental === "boolean" ? body.isInstrumental : undefined,
      hasExplicitLanguage:
        typeof body.hasExplicitLanguage === "boolean"
          ? body.hasExplicitLanguage
          : body.hasExplicitLanguage === null
            ? null
            : undefined,
      backingAuthor: typeof body.backingAuthor === "string" ? body.backingAuthor : undefined,
      isrc: typeof body.isrc === "string" ? body.isrc : body.isrc === null ? null : undefined,
      transferFromOtherDistributor:
        typeof body.transferFromOtherDistributor === "boolean"
          ? body.transferFromOtherDistributor
          : undefined,
      previousDistributor:
        typeof body.previousDistributor === "string"
          ? body.previousDistributor
          : body.previousDistributor === null
            ? null
            : undefined,
      aiLabeling:
        body.aiLabeling === null
          ? null
          : body.aiLabeling && typeof body.aiLabeling === "object"
            ? parseTrackAiLabeling(body.aiLabeling)
            : undefined,
      streamingScope:
        typeof body.streamingScope === "string" &&
        STREAMING_SCOPES.includes(body.streamingScope as (typeof STREAMING_SCOPES)[number])
          ? normalizeStreamingScope(body.streamingScope)
          : undefined,
      tiktokSoundStartSec:
        body.tiktokSoundStartSec === null
          ? null
          : body.tiktokSoundStartSec !== undefined
            ? parseTiktokSoundStartSec(body.tiktokSoundStartSec)
            : undefined,
    })

    return NextResponse.json({ track: updated })
  } catch (error) {
    console.error("[releases/tracks PATCH]", error)
    return NextResponse.json({ error: "Не удалось сохранить трек" }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; trackId: string }> }
) {
  const token = getCabinetToken(_request)
  const session = getCabinetSession(token)
  if (!session) return NextResponse.json({ error: "Необходима авторизация" }, { status: 401 })

  const { id: releaseId, trackId } = await params
  const release = await getReleaseById(releaseId)
  if (!release || release.userId.toLowerCase() !== session.email.toLowerCase()) {
    return NextResponse.json({ error: "Релиз не найден" }, { status: 404 })
  }

  const track = await getTrackById(trackId)
  if (!track || track.releaseId !== releaseId || track.status !== "draft") {
    return NextResponse.json({ error: "Трек не найден" }, { status: 404 })
  }

  const { deleteTrack } = await import("@/lib/tracks")
  await deleteTrack(trackId)
  return NextResponse.json({ ok: true })
}
