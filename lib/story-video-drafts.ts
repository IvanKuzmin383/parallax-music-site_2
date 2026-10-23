import crypto from "crypto"
import { execute, query, queryOne, normalizePgTimestamptz } from "@/lib/database"
import {
  parseStoryVideoProject,
  serializeStoryVideoProject,
  STORY_VIDEO_TEMPLATE_META,
  type StoryVideoProject,
} from "@/lib/story-video-theme"

export const STORY_VIDEO_DRAFTS_MAX_PER_USER = 30
export const STORY_VIDEO_DRAFT_NAME_MAX = 80

export type StoryVideoDraft = {
  id: string
  userId: string
  name: string
  trackId: string | null
  project: StoryVideoProject
  createdAt: string
  updatedAt: string
}

export type StoryVideoDraftListItem = {
  id: string
  name: string
  trackId: string | null
  template: StoryVideoProject["template"]
  templateLabel: string
  title: string
  artist: string
  createdAt: string
  updatedAt: string
}

type DraftRow = {
  id: string
  user_id: string
  name: string
  track_id: string | null
  settings_json: string
  created_at: string
  updated_at: string
}

function rowToDraft(row: DraftRow): StoryVideoDraft {
  let parsed: unknown = null
  try {
    parsed = JSON.parse(row.settings_json)
  } catch {
    parsed = null
  }
  return {
    id: row.id,
    userId: row.user_id,
    name: (row.name || "").trim(),
    trackId: row.track_id?.trim() || null,
    project: parseStoryVideoProject(parsed),
    createdAt: normalizePgTimestamptz(row.created_at),
    updatedAt: normalizePgTimestamptz(row.updated_at),
  }
}

function toListItem(draft: StoryVideoDraft): StoryVideoDraftListItem {
  return {
    id: draft.id,
    name: draft.name,
    trackId: draft.trackId,
    template: draft.project.template,
    templateLabel: STORY_VIDEO_TEMPLATE_META[draft.project.template].label,
    title: draft.project.title,
    artist: draft.project.artist,
    createdAt: draft.createdAt,
    updatedAt: draft.updatedAt,
  }
}

export function normalizeStoryVideoDraftName(
  raw: unknown,
  fallbackProject?: StoryVideoProject
): string {
  const fromRaw = typeof raw === "string" ? raw.trim().slice(0, STORY_VIDEO_DRAFT_NAME_MAX) : ""
  if (fromRaw) return fromRaw
  if (fallbackProject) {
    const title = fallbackProject.title?.trim()
    const artist = fallbackProject.artist?.trim()
    if (title && artist) return `${artist} - ${title}`.slice(0, STORY_VIDEO_DRAFT_NAME_MAX)
    if (title) return title.slice(0, STORY_VIDEO_DRAFT_NAME_MAX)
    return STORY_VIDEO_TEMPLATE_META[fallbackProject.template].label
  }
  return "Сниппет"
}

export async function countStoryVideoDraftsByUserId(userId: string): Promise<number> {
  const row = await queryOne<{ c: string | number }>(
    `SELECT COUNT(*)::text AS c FROM cabinet_story_video_drafts WHERE user_id = ?`,
    [userId]
  )
  const n = Number(row?.c ?? 0)
  return Number.isFinite(n) ? n : 0
}

export async function listStoryVideoDraftsByUserId(
  userId: string
): Promise<StoryVideoDraftListItem[]> {
  const rows = await query<DraftRow>(
    `SELECT * FROM cabinet_story_video_drafts WHERE user_id = ? ORDER BY updated_at DESC`,
    [userId]
  )
  return rows.map((r) => toListItem(rowToDraft(r)))
}

export async function getStoryVideoDraftById(
  id: string,
  userId?: string
): Promise<StoryVideoDraft | null> {
  const row = userId
    ? await queryOne<DraftRow>(
        `SELECT * FROM cabinet_story_video_drafts WHERE id = ? AND user_id = ?`,
        [id, userId]
      )
    : await queryOne<DraftRow>(`SELECT * FROM cabinet_story_video_drafts WHERE id = ?`, [id])
  return row ? rowToDraft(row) : null
}

export async function createStoryVideoDraft(input: {
  userId: string
  name?: string
  trackId?: string | null
  project: StoryVideoProject
}): Promise<StoryVideoDraft> {
  const count = await countStoryVideoDraftsByUserId(input.userId)
  if (count >= STORY_VIDEO_DRAFTS_MAX_PER_USER) {
    throw new Error(`LIMIT:${STORY_VIDEO_DRAFTS_MAX_PER_USER}`)
  }
  const project = parseStoryVideoProject(input.project)
  const id = crypto.randomUUID()
  const now = new Date().toISOString()
  const name = normalizeStoryVideoDraftName(input.name, project)
  await execute(
    `
    INSERT INTO cabinet_story_video_drafts
      (id, user_id, name, track_id, settings_json, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
    [
      id,
      input.userId,
      name,
      input.trackId?.trim() || null,
      serializeStoryVideoProject(project),
      now,
      now,
    ]
  )
  const created = await getStoryVideoDraftById(id, input.userId)
  if (!created) throw new Error("Failed to create story video draft")
  return created
}

export async function updateStoryVideoDraft(
  id: string,
  userId: string,
  patch: {
    name?: string
    trackId?: string | null
    project?: StoryVideoProject
  }
): Promise<StoryVideoDraft | null> {
  const current = await getStoryVideoDraftById(id, userId)
  if (!current) return null

  const project = patch.project ? parseStoryVideoProject(patch.project) : current.project
  const name =
    patch.name !== undefined
      ? normalizeStoryVideoDraftName(patch.name, project)
      : current.name || normalizeStoryVideoDraftName(undefined, project)
  const trackId =
    patch.trackId !== undefined
      ? patch.trackId?.trim() || null
      : current.trackId
  const now = new Date().toISOString()

  await execute(
    `
    UPDATE cabinet_story_video_drafts
    SET name = ?, track_id = ?, settings_json = ?, updated_at = ?
    WHERE id = ? AND user_id = ?
    `,
    [name, trackId, serializeStoryVideoProject(project), now, id, userId]
  )
  return getStoryVideoDraftById(id, userId)
}

export async function deleteStoryVideoDraft(id: string, userId: string): Promise<boolean> {
  const n = await execute(
    `DELETE FROM cabinet_story_video_drafts WHERE id = ? AND user_id = ?`,
    [id, userId]
  )
  return n > 0
}

export function draftToApiPayload(draft: StoryVideoDraft) {
  return {
    id: draft.id,
    name: draft.name,
    trackId: draft.trackId,
    project: draft.project,
    createdAt: draft.createdAt,
    updatedAt: draft.updatedAt,
  }
}
