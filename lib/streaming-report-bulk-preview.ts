import { randomUUID } from "node:crypto"
import { copyFile, mkdir, readFile, unlink, writeFile } from "node:fs/promises"
import os from "node:os"
import path from "path"

export type StreamingReportPreviewMeta = {
  tempFileId: string
  originalFileName: string
  tempFilePath: string
  createdAt: string
  amountRub: number | null
  amountUsd: number | null
  amountEur: number | null
  rowCount: number
  artistFromFile: string
  requiresManual: boolean
  suggestedUserId: string | null
  matchConfidence: "exact" | "none" | "manual"
  candidateUserIds: string[]
  warnings: string[]
}

const PREVIEW_TTL_MS = 60 * 60 * 1000

async function getPreviewDir(): Promise<string> {
  const dir = path.join(os.tmpdir(), "parallax-streaming-reports-preview")
  await mkdir(dir, { recursive: true })
  return dir
}

function metaPath(dir: string, tempFileId: string): string {
  return path.join(dir, `${tempFileId}.json`)
}

export async function saveStreamingReportPreview(
  sourcePath: string,
  originalFileName: string,
  meta: Omit<StreamingReportPreviewMeta, "tempFileId" | "originalFileName" | "tempFilePath" | "createdAt">,
): Promise<StreamingReportPreviewMeta> {
  const dir = await getPreviewDir()
  const tempFileId = randomUUID()
  const ext = path.extname(originalFileName) || ".bin"
  const tempFilePath = path.join(dir, `${tempFileId}${ext}`)

  await copyFile(sourcePath, tempFilePath)
  const fullMeta: StreamingReportPreviewMeta = {
    tempFileId,
    originalFileName,
    tempFilePath,
    createdAt: new Date().toISOString(),
    ...meta,
  }
  await writeFile(metaPath(dir, tempFileId), JSON.stringify(fullMeta), "utf8")
  return fullMeta
}

export async function getStreamingReportPreview(tempFileId: string): Promise<StreamingReportPreviewMeta | null> {
  const dir = await getPreviewDir()
  try {
    const raw = await readFile(metaPath(dir, tempFileId), "utf8")
    const meta = JSON.parse(raw) as StreamingReportPreviewMeta
    const age = Date.now() - new Date(meta.createdAt).getTime()
    if (age > PREVIEW_TTL_MS) {
      await deleteStreamingReportPreview(tempFileId)
      return null
    }
    return meta
  } catch {
    return null
  }
}

async function readPreviewMetaRaw(tempFileId: string): Promise<StreamingReportPreviewMeta | null> {
  const dir = await getPreviewDir()
  try {
    const raw = await readFile(metaPath(dir, tempFileId), "utf8")
    return JSON.parse(raw) as StreamingReportPreviewMeta
  } catch {
    return null
  }
}

export async function deleteStreamingReportPreview(tempFileId: string): Promise<void> {
  const dir = await getPreviewDir()
  const meta = await readPreviewMetaRaw(tempFileId)
  if (meta) {
    try {
      await unlink(meta.tempFilePath)
    } catch {
      /* ignore */
    }
  }
  try {
    await unlink(metaPath(dir, tempFileId))
  } catch {
    /* ignore */
  }
}

export async function cleanupStreamingReportPreview(tempFileId: string): Promise<void> {
  await deleteStreamingReportPreview(tempFileId)
}
