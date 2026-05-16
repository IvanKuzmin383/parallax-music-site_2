import { randomUUID } from "node:crypto"
import { mkdir, readFile, rename, stat, writeFile } from "node:fs/promises"
import path from "node:path"

export function buildCoverDerivativeCachePath(args: {
  coversDir: string
  trackId: string
  width: number
  quality: number
  format: "webp" | "jpeg"
  sourceMtimeMs: number
}): string {
  const safeM = Number.isFinite(args.sourceMtimeMs) ? Math.round(args.sourceMtimeMs) : 0
  const ext = args.format === "webp" ? "webp" : "jpg"
  const fname = `w${args.width}_q${args.quality}_f${args.format}_m${safeM}.${ext}`
  return path.join(args.coversDir, ".derivatives", args.trackId, fname)
}

export async function readCoverDerivativeCache(cachePath: string): Promise<Buffer | null> {
  try {
    const s = await stat(cachePath)
    if (!s.isFile() || s.size === 0) return null
    return readFile(cachePath)
  } catch {
    return null
  }
}

export async function writeCoverDerivativeCacheAtomically(cachePath: string, data: Buffer): Promise<void> {
  await mkdir(path.dirname(cachePath), { recursive: true })
  const temp = `${cachePath}.tmp-${randomUUID()}`
  await writeFile(temp, data)
  await rename(temp, cachePath)
}
