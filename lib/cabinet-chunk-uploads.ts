import { createReadStream, createWriteStream } from "node:fs"
import { mkdir, readFile, readdir, rename, rm, stat, unlink, writeFile } from "node:fs/promises"
import path from "node:path"
import { pipeline } from "node:stream/promises"
import { randomUUID } from "node:crypto"
import { Readable, Transform } from "node:stream"
import type { ReadableStream as NodeReadableStream } from "node:stream/web"
import type { NextRequest } from "next/server"
import { copyFileToPathAtomic } from "@/lib/node-atomic-upload"
import { getUploadDraftsDir } from "@/lib/upload-drafts"
import { validateWavFormatFromFilePath } from "@/lib/node-wav-validation"
import { MAX_CABINET_WAV_BYTES, cabinetWavMaxSizeError } from "@/lib/cabinet-wav-upload-limits"

export const CABINET_CHUNK_SIZE_BYTES = 1024 * 1024
const SESSION_TTL_MS = 48 * 60 * 60 * 1000
const UUID_WAV_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.wav$/i

export type ChunkUploadMeta = {
  uploadId: string
  userId: string
  fileName: string
  fileSize: number
  chunkSize: number
  totalChunks: number
  createdAt: string
}

function partName(index: number): string {
  return `part-${String(index).padStart(5, "0")}`
}

export async function getChunkSessionsDir(): Promise<string> {
  const draftsDir = await getUploadDraftsDir()
  const dir = path.join(path.dirname(draftsDir), "chunk-sessions")
  await mkdir(dir, { recursive: true })
  return dir
}

async function sessionDir(uploadId: string): Promise<string> {
  return path.join(await getChunkSessionsDir(), uploadId)
}

function isUuid(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
}

export function expectedChunkSize(meta: ChunkUploadMeta, index: number): number {
  if (index < 0 || index >= meta.totalChunks) return 0
  if (index === meta.totalChunks - 1) {
    const rem = meta.fileSize - index * meta.chunkSize
    return rem > 0 ? rem : 0
  }
  return meta.chunkSize
}

export async function readChunkMeta(uploadId: string): Promise<ChunkUploadMeta | null> {
  if (!isUuid(uploadId)) return null
  try {
    const raw = await readFile(path.join(await sessionDir(uploadId), "meta.json"), "utf8")
    const meta = JSON.parse(raw) as ChunkUploadMeta
    if (!meta?.uploadId || !meta.userId || !meta.fileSize) return null
    return meta
  } catch {
    return null
  }
}

export async function listReceivedChunkIndexes(uploadId: string): Promise<number[]> {
  const dir = await sessionDir(uploadId)
  let names: string[] = []
  try {
    names = await readdir(dir)
  } catch {
    return []
  }
  const indexes: number[] = []
  for (const name of names) {
    const m = name.match(/^part-(\d{5})$/)
    if (m) indexes.push(Number(m[1]))
  }
  return indexes.sort((a, b) => a - b)
}

async function cleanupStaleSessions(): Promise<void> {
  const root = await getChunkSessionsDir()
  let ids: string[] = []
  try {
    ids = await readdir(root)
  } catch {
    return
  }
  const now = Date.now()
  for (const id of ids) {
    const meta = await readChunkMeta(id)
    const created = meta ? Date.parse(meta.createdAt) : NaN
    if (!meta || !Number.isFinite(created) || now - created > SESSION_TTL_MS) {
      await rm(path.join(root, id), { recursive: true, force: true }).catch(() => {})
    }
  }
}

export async function createChunkUploadSession(params: {
  userId: string
  fileName: string
  fileSize: number
}): Promise<ChunkUploadMeta> {
  if (!Number.isInteger(params.fileSize) || params.fileSize < 44) {
    throw Object.assign(new Error("Некорректный размер файла"), { status: 400 })
  }
  if (params.fileSize > MAX_CABINET_WAV_BYTES) {
    throw Object.assign(new Error(cabinetWavMaxSizeError()), { status: 400 })
  }
  await cleanupStaleSessions()
  const uploadId = randomUUID()
  const totalChunks = Math.max(1, Math.ceil(params.fileSize / CABINET_CHUNK_SIZE_BYTES))
  const meta: ChunkUploadMeta = {
    uploadId,
    userId: params.userId.trim().toLowerCase(),
    fileName: params.fileName.trim() || "audio.wav",
    fileSize: params.fileSize,
    chunkSize: CABINET_CHUNK_SIZE_BYTES,
    totalChunks,
    createdAt: new Date().toISOString(),
  }
  const dir = await sessionDir(uploadId)
  await mkdir(dir, { recursive: true })
  await writeFile(path.join(dir, "meta.json"), JSON.stringify(meta), "utf8")
  return meta
}

export async function writeChunkFromRequest(params: {
  meta: ChunkUploadMeta
  index: number
  request: NextRequest
}): Promise<void> {
  const expected = expectedChunkSize(params.meta, params.index)
  if (expected <= 0) {
    throw Object.assign(new Error("Некорректный номер куска"), { status: 400 })
  }
  const contentLength = Number(params.request.headers.get("content-length") ?? "")
  if (Number.isFinite(contentLength) && contentLength > expected) {
    throw Object.assign(new Error("Размер куска не совпадает"), { status: 400 })
  }
  const dir = await sessionDir(params.meta.uploadId)
  const dest = path.join(dir, partName(params.index))
  const tmp = `${dest}.tmp`
  const body = params.request.body
  if (!body) {
    throw Object.assign(new Error("Пустое тело куска"), { status: 400 })
  }
  const readable = Readable.fromWeb(body as NodeReadableStream)
  let seen = 0
  const limiter = new Transform({
    transform(chunk, _enc, cb) {
      seen += chunk.length
      if (seen > expected) {
        cb(Object.assign(new Error("Размер куска не совпадает"), { status: 400 }))
        return
      }
      cb(null, chunk)
    },
  })
  try {
    await pipeline(readable, limiter, createWriteStream(tmp, { flags: "w" }))
    const written = await stat(tmp)
    if (written.size !== expected) {
      await unlink(tmp).catch(() => {})
      throw Object.assign(new Error("Размер куска не совпадает"), { status: 400 })
    }
    await rm(dest, { force: true }).catch(() => {})
    await rename(tmp, dest)
  } catch (error) {
    await unlink(tmp).catch(() => {})
    throw error
  }
}

export async function assembleChunkUpload(meta: ChunkUploadMeta): Promise<{ audioRelPath: string }> {
  const received = await listReceivedChunkIndexes(meta.uploadId)
  if (received.length !== meta.totalChunks) {
    throw Object.assign(new Error("Загружены не все куски файла"), { status: 400 })
  }
  for (let i = 0; i < meta.totalChunks; i++) {
    if (!received.includes(i)) {
      throw Object.assign(new Error("Загружены не все куски файла"), { status: 400 })
    }
  }

  const dir = await sessionDir(meta.uploadId)
  const assembled = path.join(dir, "assembled.wav")
  await rm(assembled, { force: true }).catch(() => {})
  await new Promise<void>((resolve, reject) => {
    const out = createWriteStream(assembled, { flags: "w" })
    let failed = false
    const fail = (error: unknown) => {
      if (failed) return
      failed = true
      out.destroy()
      reject(error instanceof Error ? error : new Error("Не удалось собрать файл"))
    }
    out.on("error", fail)
    let i = 0
    const next = () => {
      if (failed) return
      if (i >= meta.totalChunks) {
        out.end((err?: Error | null) => (err ? fail(err) : resolve()))
        return
      }
      const inp = createReadStream(path.join(dir, partName(i)))
      i += 1
      inp.on("error", fail)
      inp.on("end", next)
      inp.pipe(out, { end: false })
    }
    next()
  })

  const assembledStat = await stat(assembled)
  if (assembledStat.size !== meta.fileSize) {
    throw Object.assign(new Error("Собранный файл повреждён"), { status: 500 })
  }
  const wavError = await validateWavFormatFromFilePath(assembled)
  if (wavError) {
    throw Object.assign(new Error(wavError), { status: 400 })
  }

  const audioRelPath = `${randomUUID()}.wav`
  const draftsDir = await getUploadDraftsDir()
  await copyFileToPathAtomic(assembled, path.join(draftsDir, audioRelPath))
  await writeFile(path.join(draftsDir, `${audioRelPath}.owner`), meta.userId, "utf8")
  await rm(dir, { recursive: true, force: true }).catch(() => {})
  return { audioRelPath }
}

export async function claimDraftAudioRelPath(
  userId: string,
  relPathRaw: string
): Promise<{ ok: true; relPath: string } | { ok: false; error: string; status: number }> {
  const relPath = relPathRaw.trim()
  if (!UUID_WAV_RE.test(relPath)) {
    return { ok: false, error: "Некорректный файл аудио", status: 400 }
  }
  const draftsDir = await getUploadDraftsDir()
  const abs = path.join(draftsDir, relPath)
  const ownerPath = path.join(draftsDir, `${relPath}.owner`)
  if (path.dirname(abs) !== draftsDir) {
    return { ok: false, error: "Некорректный файл аудио", status: 400 }
  }
  try {
    await stat(abs)
  } catch {
    return { ok: false, error: "Аудиосессия не найдена. Загрузите WAV снова", status: 404 }
  }
  let owner = ""
  try {
    owner = (await readFile(ownerPath, "utf8")).trim().toLowerCase()
  } catch {
    return { ok: false, error: "Этот файл уже привязан к черновику", status: 409 }
  }
  if (owner !== userId.trim().toLowerCase()) {
    return { ok: false, error: "Нет доступа к загруженному файлу", status: 403 }
  }
  await unlink(ownerPath).catch(() => {})
  return { ok: true, relPath }
}
