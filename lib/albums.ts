import { promises as fs } from "fs"
import path from "path"
import crypto from "crypto"
import { getCoversDir } from "./tracks"
import { getDb } from "./db"

export interface Album {
  id: string
  userId: string
  title: string
  artistName: string
  labelName: string
  coverPath: string
  releaseDate?: string
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
  created_at: string
  updated_at: string
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
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export async function getAllAlbums(): Promise<Album[]> {
  const db = getDb()
  const rows = db.prepare("SELECT * FROM albums").all() as AlbumRow[]
  return rows.map(rowToAlbum)
}

export async function getAlbumById(id: string): Promise<Album | null> {
  const db = getDb()
  const row = db.prepare("SELECT * FROM albums WHERE id = ?").get(id) as AlbumRow | undefined
  return row ? rowToAlbum(row) : null
}

export async function getAlbumsByUserId(userId: string): Promise<Album[]> {
  const db = getDb()
  const rows = db.prepare("SELECT * FROM albums WHERE LOWER(user_id) = LOWER(?)").all(userId) as AlbumRow[]
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

  const db = getDb()
  db.prepare(`
    INSERT INTO albums (id, user_id, title, artist_name, label_name, cover_path, release_date, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    album.id,
    album.userId,
    album.title,
    album.artistName,
    album.labelName,
    album.coverPath,
    album.releaseDate ?? null,
    album.createdAt,
    album.updatedAt
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

  const updated: Album = {
    ...current,
    ...partial,
    updatedAt: new Date().toISOString(),
  }

  const db = getDb()
  db.prepare(`
    UPDATE albums SET title = ?, artist_name = ?, label_name = ?, cover_path = ?, release_date = ?, updated_at = ?
    WHERE id = ?
  `).run(updated.title, updated.artistName, updated.labelName, updated.coverPath, updated.releaseDate ?? null, updated.updatedAt, id)

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

  const db = getDb()
  const result = db.prepare("DELETE FROM albums WHERE id = ?").run(id)

  if (process.env.NODE_ENV === "development" && result.changes > 0) {
    console.log("[albums] Deleted album", { id: album.id, title: album.title })
  }

  return result.changes > 0
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
