import path from "path"
import { promises as fs } from "fs"
import { NextRequest, NextResponse } from "next/server"
import { isAllowedAdminCoverFileName } from "@/lib/admin-covers-download"
import { getAdminToken, verifySession } from "@/lib/auth"
import { getUploadsBasePath } from "@/lib/tracks"

type DirectoryUsage = {
  files: number
  bytes: number
}

async function collectDirectoryUsage(dir: string, filterExt?: string): Promise<DirectoryUsage> {
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true })
    let files = 0
    let bytes = 0

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        const nested = await collectDirectoryUsage(fullPath, filterExt)
        files += nested.files
        bytes += nested.bytes
        continue
      }
      if (!entry.isFile()) continue
      if (filterExt && path.extname(entry.name).toLowerCase() !== filterExt) continue
      const stat = await fs.stat(fullPath)
      files += 1
      bytes += stat.size
    }

    return { files, bytes }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return { files: 0, bytes: 0 }
    }
    throw error
  }
}

/** Только оригиналы в корне uploads/covers (без .derivatives и служебных файлов). */
async function collectCoversOriginalUsage(coversDir: string): Promise<DirectoryUsage> {
  try {
    const entries = await fs.readdir(coversDir, { withFileTypes: true })
    let files = 0
    let bytes = 0
    for (const entry of entries) {
      if (!entry.isFile()) continue
      if (!isAllowedAdminCoverFileName(entry.name)) continue
      const fullPath = path.join(coversDir, entry.name)
      const stat = await fs.stat(fullPath)
      files += 1
      bytes += stat.size
    }
    return { files, bytes }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return { files: 0, bytes: 0 }
    }
    throw error
  }
}

export async function GET(request: NextRequest) {
  const token = getAdminToken(request)
  if (!verifySession(token)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const uploadsBase = await getUploadsBasePath()
    const audioDir = path.join(uploadsBase, "audio")
    const coversDir = path.join(uploadsBase, "covers")
    const draftsDir = path.join(uploadsBase, "upload-drafts")

    const [audio, covers, draftWav] = await Promise.all([
      collectDirectoryUsage(audioDir, ".wav"),
      collectCoversOriginalUsage(coversDir),
      collectDirectoryUsage(draftsDir, ".wav"),
    ])

    const totals = {
      files: audio.files + covers.files + draftWav.files,
      bytes: audio.bytes + covers.bytes + draftWav.bytes,
    }

    return NextResponse.json({
      uploadsBase,
      audio,
      covers,
      draftWav,
      totals,
      generatedAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Error calculating storage usage:", error)
    return NextResponse.json({ error: "Не удалось посчитать использование хранилища" }, { status: 500 })
  }
}
