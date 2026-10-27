import { randomUUID } from "node:crypto"
import { promises as fs } from "node:fs"
import path from "node:path"
import { execute, query, queryOne } from "@/lib/database"
import { TOOLS_MASTERING_FILE_TTL_DAYS } from "@/lib/tools-mastering-pricing"
import { getUploadsBasePath } from "@/lib/tracks"

export { TOOLS_MASTERING_FILE_TTL_DAYS }

export type ToolsMasteringFileUsed = "free" | "credit"

export type ToolsMasteringFile = {
  id: string
  userId: string
  fileName: string
  storageName: string
  sizeBytes: number
  used: ToolsMasteringFileUsed
  createdAt: string
  expiresAt: string
}

type FileRow = {
  id: string
  user_id: string
  file_name: string
  storage_name: string
  size_bytes: string | number
  used: string
  created_at: string
  expires_at: string
}

function rowToFile(row: FileRow): ToolsMasteringFile {
  return {
    id: row.id,
    userId: row.user_id,
    fileName: row.file_name,
    storageName: row.storage_name,
    sizeBytes: Number(row.size_bytes) || 0,
    used: row.used === "credit" ? "credit" : "free",
    createdAt: row.created_at,
    expiresAt: row.expires_at,
  }
}

export function sanitizeMasteringDownloadName(raw: string): string {
  const base = raw
    .replace(/\.wav$/i, "")
    .replace(/[^\w\-а-яА-ЯёЁ .]+/gi, "_")
    .trim()
    .slice(0, 80)
  return `${base || "master"}.wav`
}

export async function getToolsMasteringFilesDir(userId: string): Promise<string> {
  const base = await getUploadsBasePath()
  const dir = path.join(base, "tools-mastering", userId)
  await fs.mkdir(dir, { recursive: true })
  return dir
}

export function toolsMasteringFileAbsolutePath(userId: string, storageName: string, baseDir: string): string {
  const safe = path.basename(storageName)
  return path.join(baseDir, safe)
}

export async function createToolsMasteringFile(input: {
  userId: string
  fileName: string
  storageName: string
  sizeBytes: number
  used: ToolsMasteringFileUsed
}): Promise<ToolsMasteringFile> {
  const id = randomUUID()
  const expiresAt = new Date(
    Date.now() + TOOLS_MASTERING_FILE_TTL_DAYS * 24 * 60 * 60 * 1000,
  ).toISOString()
  const now = new Date().toISOString()
  await execute(
    `INSERT INTO tools_mastering_files (
       id, user_id, file_name, storage_name, size_bytes, used, created_at, expires_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      input.userId,
      input.fileName,
      input.storageName,
      input.sizeBytes,
      input.used,
      now,
      expiresAt,
    ],
  )
  const row = await queryOne<FileRow>(`SELECT * FROM tools_mastering_files WHERE id = ?`, [id])
  if (!row) throw new Error("Failed to create tools mastering file row")
  return rowToFile(row)
}

export async function getToolsMasteringFileForUser(
  id: string,
  userId: string,
): Promise<ToolsMasteringFile | null> {
  const row = await queryOne<FileRow>(
    `SELECT * FROM tools_mastering_files
     WHERE id = ? AND user_id = ? AND expires_at > NOW()`,
    [id, userId],
  )
  return row ? rowToFile(row) : null
}

export async function listToolsMasteringFilesForUser(userId: string): Promise<ToolsMasteringFile[]> {
  await purgeExpiredToolsMasteringFiles(userId)
  const rows = await query<FileRow>(
    `SELECT * FROM tools_mastering_files
     WHERE user_id = ? AND expires_at > NOW()
     ORDER BY created_at DESC
     LIMIT 50`,
    [userId],
  )
  return rows.map(rowToFile)
}

async function deleteFileRowAndDisk(row: FileRow): Promise<void> {
  try {
    const dir = await getToolsMasteringFilesDir(row.user_id)
    const full = toolsMasteringFileAbsolutePath(row.user_id, row.storage_name, dir)
    await fs.unlink(full).catch(() => undefined)
  } catch {
    // ignore disk errors
  }
  await execute(`DELETE FROM tools_mastering_files WHERE id = ?`, [row.id]).catch(() => 0)
}

/** Удаляет просроченные файлы пользователя (lazy TTL). */
export async function purgeExpiredToolsMasteringFiles(userId?: string): Promise<number> {
  const rows = userId
    ? await query<FileRow>(
        `SELECT * FROM tools_mastering_files WHERE user_id = ? AND expires_at <= NOW()`,
        [userId],
      )
    : await query<FileRow>(
        `SELECT * FROM tools_mastering_files WHERE expires_at <= NOW() LIMIT 200`,
      )

  for (const row of rows) {
    await deleteFileRowAndDisk(row)
  }
  return rows.length
}

export async function deleteToolsMasteringFileRecord(id: string, userId: string): Promise<void> {
  const row = await queryOne<FileRow>(
    `SELECT * FROM tools_mastering_files WHERE id = ? AND user_id = ?`,
    [id, userId],
  )
  if (!row) return
  await deleteFileRowAndDisk(row)
}
