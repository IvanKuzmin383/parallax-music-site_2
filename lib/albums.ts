import { promises as fs } from "fs"
import path from "path"
import crypto from "crypto"
import { getCoversDir } from "./tracks"
import { query, queryOne, execute } from "./database"
import type { PlatformLinks } from "./smartlink-platforms"
import { generateUniqueSmartlinkSlug } from "./smartlink-slug"

export interface Album {
  id: string
  userId: string
  title: string
  artistName: string
  labelName: string
  coverPath: string
  releaseDate?: string
  smartlinkSlug?: string
  platformLinks?: PlatformLinks
  createdAt: string
  updatedAt: string
}

interface AlbumRow {
  id: string
  user_id: string
  title: string
  artist_name: string
  label_name: string | null
  cover_path: string
  release_date: string | null
  smartlink_slug?: string | null
  platform_links?: string | null
  created_at: string
  updated_at: string
}

function parsePlatformLinks(raw: string | null | undefined): PlatformLinks | undefined {
  if (!raw || !raw.trim()) return undefined
  try {
    return JSON.parse(raw) as PlatformLinks
  } catch {
    return undefined
  }
}

function hasAnyPlatformLink(links?: PlatformLinks): boolean {
  if (!links) return false
  return Object.values(links).some((v) => typeof v === "string" && v.trim().length > 0)
}

function rowToAlbum(row: AlbumRow): Album {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    artistName: row.artist_name,
    labelName: row.label_name ?? "Parallax Music",
    coverPath: row.cover_path,
    releaseDate: row.release_date ?? undefined,
    smartlinkSlug: row.smartlink_slug ?? undefined,
    platformLinks: parsePlatformLinks(row.platform_links),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export async function getAllAlbums(): Promise<Album[]> {
  const rows = await query<AlbumRow>("SELECT * FROM albums")
  return rows.map(rowToAlbum)
}

export async function getAlbumById(id: string): Promise<Album | null> {
  const row = await queryOne<AlbumRow>("SELECT * FROM albums WHERE id = ?", [id])
  return row ? rowToAlbum(row) : null
}

export async function getAlbumBySmartlinkSlug(slug: string): Promise<Album | null> {
  const row = await queryOne<AlbumRow>("SELECT * FROM albums WHERE smartlink_slug = ?", [slug])
  return row ? rowToAlbum(row) : null
}

export async function getAlbumsByUserId(userId: string): Promise<Album[]> {
  const rows = await query<AlbumRow>("SELECT * FROM albums WHERE LOWER(user_id) = LOWER(?)", [userId])
  return rows.map(rowToAlbum)
}

export async function createAlbum(
  data: Omit<Album, "id" | "createdAt" | "updatedAt">
): Promise<Album> {
  const now = new Date().toISOString()
  const album: Album = {
    ...data,
    id: crypto.randomUUID(),
    createdAt: now,
    updatedAt: now,
  }

  await execute(
    `
    INSERT INTO albums (id, user_id, title, artist_name, label_name, cover_path, release_date, smartlink_slug, platform_links, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `,
    [
      album.id,
      album.userId,
      album.title,
      album.artistName,
      album.labelName,
      album.coverPath,
      album.releaseDate ?? null,
      album.smartlinkSlug ?? null,
      album.platformLinks ? JSON.stringify(album.platformLinks) : null,
      album.createdAt,
      album.updatedAt,
    ]
  )

  if (process.env.NODE_ENV === "development") {
    console.log("[albums] Created album", { id: album.id, userId: album.userId, title: album.title })
  }

  return album
}

export async function updateAlbum(
  id: string,
  partial: Partial<Omit<Album, "id" | "userId" | "createdAt">>
): Promise<Album | null> {
  const current = await getAlbumById(id)
  if (!current) return null

  const hasIncomingSmartlinkSlug = Object.prototype.hasOwnProperty.call(partial, "smartlinkSlug")
  const incomingSmartlinkSlug = hasIncomingSmartlinkSlug
    ? typeof partial.smartlinkSlug === "string"
      ? partial.smartlinkSlug.trim()
      : ""
    : undefined

  let smartlinkSlug =
    hasIncomingSmartlinkSlug && incomingSmartlinkSlug !== undefined
      ? incomingSmartlinkSlug || undefined
      : current.smartlinkSlug

  const nextPlatformLinks = partial.platformLinks ?? current.platformLinks
  const shouldAutoGenerateSmartlink =
    !smartlinkSlug && hasAnyPlatformLink(nextPlatformLinks)

  if (shouldAutoGenerateSmartlink) {
    smartlinkSlug = await generateUniqueSmartlinkSlug()
  }

  const updated: Album = {
    ...current,
    ...partial,
    smartlinkSlug,
    updatedAt: new Date().toISOString(),
  }

  await execute(
    `
    UPDATE albums SET title = ?, artist_name = ?, label_name = ?, cover_path = ?, release_date = ?, smartlink_slug = ?, platform_links = ?, updated_at = ?
    WHERE id = ?
  `,
    [
      updated.title,
      updated.artistName,
      updated.labelName,
      updated.coverPath,
      updated.releaseDate ?? null,
      updated.smartlinkSlug ?? null,
      updated.platformLinks ? JSON.stringify(updated.platformLinks) : null,
      updated.updatedAt,
      id,
    ]
  )

  if (process.env.NODE_ENV === "development") {
    console.log("[albums] Updated album", { id: updated.id, title: updated.title })
  }

  return getAlbumById(id)
}

export async function deleteAlbum(id: string): Promise<boolean> {
  const album = await getAlbumById(id)
  if (!album) return false

  try {
    try {
      await fs.unlink(album.coverPath)
      if (process.env.NODE_ENV === "development") {
        console.log("[albums] Deleted cover file:", album.coverPath)
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        console.error("[albums] Error deleting cover file:", error)
      }
    }
  } catch (error) {
    console.error("[albums] Error deleting album files:", error)
  }

  const changes = await execute("DELETE FROM albums WHERE id = ?", [id])

  if (process.env.NODE_ENV === "development" && changes > 0) {
    console.log("[albums] Deleted album", { id: album.id, title: album.title })
  }

  return changes > 0
}

export async function createAlbumCoverPathFromUpload(
  coverFile: File,
  albumId?: string
): Promise<string> {
  const coversDir = await getCoversDir()
  const { writeFile } = await import("fs/promises")
  const coverExt = coverFile.name.toLowerCase().split(".").pop() || "jpg"
  const targetAlbumId = albumId ?? crypto.randomUUID()
  const coverPath = path.join(coversDir, `album-${targetAlbumId}.${coverExt}`)
  const coverBuffer = Buffer.from(await coverFile.arrayBuffer())
  await writeFile(coverPath, coverBuffer)
  return coverPath
}
