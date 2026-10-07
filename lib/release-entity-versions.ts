import crypto from "crypto"
import { execute, query, queryOne } from "@/lib/database"
import { getReleaseById, type Release } from "@/lib/releases"
import { getTracksByReleaseId, type Track } from "@/lib/tracks"

/** Максимум хранимых версий на один релиз. */
export const RELEASE_ENTITY_VERSIONS_MAX = 20

export type ReleaseEntityVersionReason =
  | "submit_moderation"
  | "resubmit_after_revision"
  | "admin_status_change"
  | "admin_edit"
  | "user_recall_to_draft"
  | "manual"

export type ReleaseEntityVersion = {
  id: string
  releaseId: string
  versionNo: number
  reason: ReleaseEntityVersionReason | string
  actor: string | null
  note: string | null
  snapshot: ReleaseEntitySnapshot
  createdAt: string
}

export type ReleaseEntitySnapshot = {
  release: {
    id: string
    kind: string
    title: string
    artistName: string
    labelName: string
    coverPath: string
    releaseDate?: string
    upc?: string
    status: string
    wizardStep: number
    requestAiCover: boolean
    coverCreatedWithAi: Release["coverCreatedWithAi"]
    acceptShortReleaseDate: boolean
    addons: Release["addons"]
    albumId?: string
  }
  tracks: Array<{
    id: string
    trackOrder?: number
    trackName: string
    trackVersion: string
    artistName: string
    labelName: string
    genre: string
    mood: string
    shortDescription: string
    lyricsText: string
    lyricsLanguage: string
    musicAuthor: string
    lyricsAuthor: string
    musicRights: string
    musicAiService: string
    lyricsRights: string
    performanceRights: string
    isInstrumental: boolean
    hasExplicitLanguage: boolean | null
    backingAuthor: string
    tiktokSoundStartSec?: number | null
    aiLabeling?: Track["aiLabeling"]
    coverPath: string
    needsAiCover: boolean
    audioPath: string
    status: string
    releaseDate?: string
    moderationNote?: string | null
    catalogNumber?: string | null
    upc?: string | null
    isrc?: string | null
    transferFromOtherDistributor?: boolean
    previousDistributor?: string | null
    originalReleaseDate?: string | null
    streamingScope: string
    smartlinkSlug?: string
    platformLinks?: Track["platformLinks"]
  }>
}

type VersionRow = {
  id: string
  release_id: string
  version_no: number
  reason: string
  actor: string | null
  note: string | null
  snapshot_json: string
  created_at: string
}

export const RELEASE_ENTITY_VERSION_REASON_LABELS: Record<string, string> = {
  submit_moderation: "Отправка на модерацию",
  resubmit_after_revision: "Повторная отправка после доработки",
  admin_status_change: "Смена статуса (админ)",
  admin_edit: "Правка метаданных (админ)",
  user_recall_to_draft: "Возврат на редактирование (пользователь)",
  manual: "Ручной снимок",
}

function trackSnapshot(track: Track): ReleaseEntitySnapshot["tracks"][number] {
  return {
    id: track.id,
    trackOrder: track.trackOrder,
    trackName: track.trackName,
    trackVersion: track.trackVersion,
    artistName: track.artistName,
    labelName: track.labelName,
    genre: track.genre,
    mood: track.mood,
    shortDescription: track.shortDescription,
    lyricsText: track.lyricsText,
    lyricsLanguage: track.lyricsLanguage,
    musicAuthor: track.musicAuthor,
    lyricsAuthor: track.lyricsAuthor,
    musicRights: track.musicRights,
    musicAiService: track.musicAiService,
    lyricsRights: track.lyricsRights,
    performanceRights: track.performanceRights,
    isInstrumental: track.isInstrumental,
    hasExplicitLanguage: track.hasExplicitLanguage,
    backingAuthor: track.backingAuthor,
    tiktokSoundStartSec: track.tiktokSoundStartSec,
    aiLabeling: track.aiLabeling ?? null,
    coverPath: track.coverPath,
    needsAiCover: track.needsAiCover,
    audioPath: track.audioPath,
    status: track.status,
    releaseDate: track.releaseDate,
    moderationNote: track.moderationNote ?? null,
    catalogNumber: track.catalogNumber ?? null,
    upc: track.upc ?? null,
    isrc: track.isrc ?? null,
    transferFromOtherDistributor: track.transferFromOtherDistributor,
    previousDistributor: track.previousDistributor ?? null,
    originalReleaseDate: track.originalReleaseDate ?? null,
    streamingScope: track.streamingScope,
    smartlinkSlug: track.smartlinkSlug,
    platformLinks: track.platformLinks,
  }
}

export async function buildReleaseEntitySnapshot(
  releaseId: string
): Promise<ReleaseEntitySnapshot | null> {
  const release = await getReleaseById(releaseId)
  if (!release) return null
  const tracks = await getTracksByReleaseId(releaseId)
  return {
    release: {
      id: release.id,
      kind: release.kind,
      title: release.title,
      artistName: release.artistName,
      labelName: release.labelName,
      coverPath: release.coverPath,
      releaseDate: release.releaseDate,
      upc: release.upc,
      status: release.status,
      wizardStep: release.wizardStep,
      requestAiCover: release.requestAiCover,
      coverCreatedWithAi: release.coverCreatedWithAi,
      acceptShortReleaseDate: release.acceptShortReleaseDate,
      addons: release.addons,
      albumId: release.albumId,
    },
    tracks: tracks.map(trackSnapshot),
  }
}

function rowToVersion(row: VersionRow): ReleaseEntityVersion {
  let snapshot: ReleaseEntitySnapshot
  try {
    snapshot = JSON.parse(row.snapshot_json) as ReleaseEntitySnapshot
  } catch {
    snapshot = { release: { id: row.release_id } as ReleaseEntitySnapshot["release"], tracks: [] }
  }
  return {
    id: row.id,
    releaseId: row.release_id,
    versionNo: row.version_no,
    reason: row.reason,
    actor: row.actor,
    note: row.note,
    snapshot,
    createdAt: row.created_at,
  }
}

async function pruneOldVersions(releaseId: string): Promise<void> {
  await execute(
    `
    DELETE FROM release_entity_versions
    WHERE id IN (
      SELECT id FROM release_entity_versions
      WHERE release_id = ?
      ORDER BY version_no DESC
      OFFSET ?
    )
    `,
    [releaseId, RELEASE_ENTITY_VERSIONS_MAX]
  )
}

export async function deleteReleaseEntityVersions(releaseId: string): Promise<void> {
  await execute(`DELETE FROM release_entity_versions WHERE release_id = ?`, [releaseId])
}

/** Безопасная запись версии: ошибка не должна ломать основной поток. */
export async function tryCreateReleaseEntityVersion(params: {
  releaseId: string
  reason: ReleaseEntityVersionReason | string
  actor?: string | null
  note?: string | null
  snapshot?: ReleaseEntitySnapshot
}): Promise<ReleaseEntityVersion | null> {
  try {
    return await createReleaseEntityVersion(params)
  } catch (error) {
    console.error("[release-entity-versions] create failed:", error)
    return null
  }
}

export async function createReleaseEntityVersion(params: {
  releaseId: string
  reason: ReleaseEntityVersionReason | string
  actor?: string | null
  note?: string | null
  /** Если уже собран — не перечитывать БД. */
  snapshot?: ReleaseEntitySnapshot
}): Promise<ReleaseEntityVersion | null> {
  const snapshot = params.snapshot ?? (await buildReleaseEntitySnapshot(params.releaseId))
  if (!snapshot) return null

  const last = await queryOne<{ max_no: number | string | null }>(
    `SELECT MAX(version_no) AS max_no FROM release_entity_versions WHERE release_id = ?`,
    [params.releaseId]
  )
  const versionNo = Number(last?.max_no ?? 0) + 1
  const id = crypto.randomUUID()
  const createdAt = new Date().toISOString()
  const actor = params.actor?.trim() || null
  const note = params.note?.trim() || null

  await execute(
    `
    INSERT INTO release_entity_versions (
      id, release_id, version_no, reason, actor, note, snapshot_json, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      id,
      params.releaseId,
      versionNo,
      params.reason,
      actor,
      note,
      JSON.stringify(snapshot),
      createdAt,
    ]
  )

  await pruneOldVersions(params.releaseId)

  return {
    id,
    releaseId: params.releaseId,
    versionNo,
    reason: params.reason,
    actor,
    note,
    snapshot,
    createdAt,
  }
}

export async function listReleaseEntityVersions(
  releaseId: string,
  limit = RELEASE_ENTITY_VERSIONS_MAX
): Promise<ReleaseEntityVersion[]> {
  const rows = await query<VersionRow>(
    `
    SELECT * FROM release_entity_versions
    WHERE release_id = ?
    ORDER BY version_no DESC
    LIMIT ?
    `,
    [releaseId, Math.max(1, Math.min(limit, 100))]
  )
  return rows.map(rowToVersion)
}

export async function getReleaseEntityVersionById(
  id: string
): Promise<ReleaseEntityVersion | null> {
  const row = await queryOne<VersionRow>(
    `SELECT * FROM release_entity_versions WHERE id = ?`,
    [id]
  )
  return row ? rowToVersion(row) : null
}
