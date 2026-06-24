import crypto from "crypto"
import { promises as fs } from "fs"
import path from "path"
import { query, queryOne, execute } from "./database"
import { getUploadsBasePath } from "./tracks"
import type { UploadDraftPayload } from "./upload-drafts"

export type ReleaseKind = "single" | "album"

export type ReleaseStatus =
  | "draft"
  | "awaiting_payment"
  | "on_moderation"
  | "sent_to_platforms"
  | "approved_by_platforms"
  | "released"
  | "rejected"
  | "postponed"

export type ReleaseAddonsPayload = UploadDraftPayload["addons"]

export interface Release {
  id: string
  userId: string
  kind: ReleaseKind
  title: string
  artistName: string
  labelName: string
  coverPath: string
  releaseDate?: string
  upc?: string
  status: ReleaseStatus
  wizardStep: number
  addons: ReleaseAddonsPayload
  requestAiCover: boolean
  bundleOrderId?: string
  albumId?: string
  createdAt: string
  updatedAt: string
}

interface ReleaseRow {
  id: string
  user_id: string
  kind: ReleaseKind
  title: string
  artist_name: string
  label_name: string | null
  cover_path: string
  release_date: string | null
  upc: string | null
  status: string
  wizard_step: number
  addons_json: string
  request_ai_cover: boolean | null
  bundle_order_id: string | null
  album_id: string | null
  created_at: string
  updated_at: string
}

function parseAddons(json: string): ReleaseAddonsPayload {
  try {
    const parsed = JSON.parse(json) as ReleaseAddonsPayload
    return parsed && typeof parsed === "object" ? parsed : {}
  } catch {
    return {}
  }
}

export function rowToRelease(row: ReleaseRow): Release {
  return {
    id: row.id,
    userId: row.user_id,
    kind: row.kind,
    title: row.title,
    artistName: row.artist_name,
    labelName: row.label_name ?? "Parallax Music",
    coverPath: row.cover_path,
    releaseDate: row.release_date ?? undefined,
    upc: row.upc ?? undefined,
    status: row.status as ReleaseStatus,
    wizardStep: row.wizard_step,
    addons: parseAddons(row.addons_json),
    requestAiCover: row.request_ai_cover === true,
    bundleOrderId: row.bundle_order_id ?? undefined,
    albumId: row.album_id ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export async function getReleasesDir(): Promise<string> {
  const base = await getUploadsBasePath()
  const dir = path.join(base, "releases")
  try {
    await fs.access(dir)
  } catch {
    await fs.mkdir(dir, { recursive: true })
  }
  return dir
}

export async function getReleaseMediaDir(releaseId: string): Promise<string> {
  const dir = path.join(await getReleasesDir(), releaseId)
  try {
    await fs.access(dir)
  } catch {
    await fs.mkdir(dir, { recursive: true })
  }
  return dir
}

export async function getReleaseById(id: string): Promise<Release | null> {
  const row = await queryOne<ReleaseRow>("SELECT * FROM releases WHERE id = ?", [id])
  return row ? rowToRelease(row) : null
}

export async function listReleasesByUserId(userId: string, limit = 100): Promise<Release[]> {
  const rows = await query<ReleaseRow>(
    `SELECT * FROM releases WHERE LOWER(user_id) = LOWER(?) ORDER BY updated_at DESC LIMIT ?`,
    [userId, limit]
  )
  return rows.map(rowToRelease)
}

export async function listActiveReleasesByUserId(userId: string): Promise<Release[]> {
  const rows = await query<ReleaseRow>(
    `SELECT * FROM releases WHERE LOWER(user_id) = LOWER(?)
     AND status IN ('draft', 'awaiting_payment')
     ORDER BY updated_at DESC`,
    [userId]
  )
  return rows.map(rowToRelease)
}

export type CreateReleaseInput = {
  userId: string
  kind?: ReleaseKind
  title?: string
  artistName?: string
  labelName?: string
  coverPath?: string
  releaseDate?: string
  upc?: string
  wizardStep?: number
}

export async function createRelease(data: CreateReleaseInput): Promise<Release> {
  const now = new Date().toISOString()
  const release: Release = {
    id: crypto.randomUUID(),
    userId: data.userId,
    kind: data.kind ?? "single",
    title: data.title ?? "",
    artistName: data.artistName ?? "",
    labelName: data.labelName ?? "Parallax Music",
    coverPath: data.coverPath ?? "",
    releaseDate: data.releaseDate,
    upc: data.upc,
    status: "draft",
    wizardStep: data.wizardStep ?? 1,
    addons: {},
    requestAiCover: false,
    createdAt: now,
    updatedAt: now,
  }

  await execute(
    `INSERT INTO releases (
      id, user_id, kind, title, artist_name, label_name, cover_path, release_date, upc,
      status, wizard_step, addons_json, request_ai_cover, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      release.id,
      release.userId,
      release.kind,
      release.title,
      release.artistName,
      release.labelName,
      release.coverPath,
      release.releaseDate ?? null,
      release.upc ?? null,
      release.status,
      release.wizardStep,
      JSON.stringify(release.addons),
      release.requestAiCover,
      release.createdAt,
      release.updatedAt,
    ]
  )

  return release
}

export type UpdateReleaseInput = Partial<{
  kind: ReleaseKind
  title: string
  artistName: string
  labelName: string
  coverPath: string
  releaseDate: string | null
  upc: string | null
  status: ReleaseStatus
  wizardStep: number
  addons: ReleaseAddonsPayload
  requestAiCover: boolean
  bundleOrderId: string | null
  albumId: string | null
}>

export async function updateRelease(id: string, partial: UpdateReleaseInput): Promise<Release | null> {
  const current = await getReleaseById(id)
  if (!current) return null

  const updated: Release = {
    ...current,
    kind: partial.kind ?? current.kind,
    title: partial.title ?? current.title,
    artistName: partial.artistName ?? current.artistName,
    labelName: partial.labelName ?? current.labelName,
    coverPath: partial.coverPath ?? current.coverPath,
    status: partial.status ?? current.status,
    wizardStep: partial.wizardStep ?? current.wizardStep,
    requestAiCover: partial.requestAiCover ?? current.requestAiCover,
    releaseDate: partial.releaseDate === null ? undefined : (partial.releaseDate ?? current.releaseDate),
    upc: partial.upc === null ? undefined : (partial.upc ?? current.upc),
    bundleOrderId: partial.bundleOrderId === null ? undefined : (partial.bundleOrderId ?? current.bundleOrderId),
    albumId: partial.albumId === null ? undefined : (partial.albumId ?? current.albumId),
    addons: partial.addons ?? current.addons,
    updatedAt: new Date().toISOString(),
  }

  await execute(
    `UPDATE releases SET
      kind = ?, title = ?, artist_name = ?, label_name = ?, cover_path = ?,
      release_date = ?, upc = ?, status = ?, wizard_step = ?, addons_json = ?,
      request_ai_cover = ?, bundle_order_id = ?, album_id = ?, updated_at = ?
    WHERE id = ?`,
    [
      updated.kind,
      updated.title,
      updated.artistName,
      updated.labelName,
      updated.coverPath,
      updated.releaseDate ?? null,
      updated.upc ?? null,
      updated.status,
      updated.wizardStep,
      JSON.stringify(updated.addons),
      updated.requestAiCover,
      updated.bundleOrderId ?? null,
      updated.albumId ?? null,
      updated.updatedAt,
      id,
    ]
  )

  return getReleaseById(id)
}

export async function markReleaseAwaitingPayment(id: string, orderId: string): Promise<Release | null> {
  return updateRelease(id, { status: "awaiting_payment", bundleOrderId: orderId })
}

export async function markReleasePaid(id: string, orderId: string): Promise<Release | null> {
  const release = await getReleaseById(id)
  if (!release) return null
  if (release.status === "awaiting_payment") {
    return updateRelease(id, { bundleOrderId: orderId })
  }
  return updateRelease(id, { bundleOrderId: orderId })
}

export async function deleteRelease(id: string): Promise<boolean> {
  const release = await getReleaseById(id)
  if (!release) return false
  if (release.status !== "draft") return false

  try {
    const mediaDir = path.join(await getReleasesDir(), id)
    await fs.rm(mediaDir, { recursive: true, force: true })
  } catch {
    // ignore
  }

  if (release.coverPath) {
    try {
      await fs.unlink(release.coverPath)
    } catch {
      // ignore
    }
  }

  const changes = await execute("DELETE FROM releases WHERE id = ?", [id])
  return changes > 0
}

export function releasePayloadForPricing(release: Release): UploadDraftPayload {
  return {
    addons: release.addons,
    requestAiCover: release.requestAiCover,
  }
}
