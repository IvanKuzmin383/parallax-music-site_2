import path from "path"
import { promises as fs } from "fs"
import { getCoversDir } from "@/lib/tracks"

/** Имена обложек в корне uploads/covers - без каталогов и служебных файлов */
export function isAllowedAdminCoverFileName(name: string): boolean {
  if (!name || name.length > 220) return false
  if (name.includes("..") || name.includes("/") || name.includes("\\")) return false
  if (name.startsWith(".")) return false
  return /^[a-zA-Z0-9._-]+$/.test(name) && /\.(jpe?g|png)$/i.test(name)
}

export async function listAdminCoverFilenames(): Promise<string[]> {
  const coversDir = await getCoversDir()
  const entries = await fs.readdir(coversDir, { withFileTypes: true })
  const names: string[] = []
  for (const e of entries) {
    if (!e.isFile()) continue
    if (!isAllowedAdminCoverFileName(e.name)) continue
    names.push(e.name)
  }
  names.sort((a, b) => a.localeCompare(b, "ru"))
  return names
}

/** Абсолютный путь к файлу только если он внутри coversDir */
export async function resolveAdminCoverFilePath(fileName: string): Promise<string | null> {
  if (!isAllowedAdminCoverFileName(fileName)) return null
  const coversDirResolved = path.resolve(await getCoversDir())
  const abs = path.resolve(coversDirResolved, fileName)
  const rel = path.relative(coversDirResolved, abs)
  if (rel.startsWith("..") || path.isAbsolute(rel)) return null
  return abs
}
