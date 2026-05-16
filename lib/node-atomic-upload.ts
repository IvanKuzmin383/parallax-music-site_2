import { randomUUID } from "node:crypto"
import { createReadStream, createWriteStream } from "node:fs"
import { rename, stat, unlink } from "node:fs/promises"
import { Readable } from "node:stream"
import type { ReadableStream as NodeReadableStream } from "node:stream/web"
import { pipeline } from "node:stream/promises"

export async function writeMultipartFileToPathAtomic(
  file: File,
  absolutePath: string,
  options?: { replaceExisting?: boolean }
): Promise<void> {
  const replaceExisting = options?.replaceExisting ?? true
  const tempPath = `${absolutePath}.uploading-${randomUUID()}`
  const webStream = file.stream() as unknown as NodeReadableStream
  const readable = Readable.fromWeb(webStream)
  try {
    await pipeline(readable, createWriteStream(tempPath, { flags: "wx" }))
    const written = await stat(tempPath)
    if (written.size !== file.size) {
      throw new Error(`multipart write size mismatch: expected=${file.size} actual=${written.size}`)
    }
    try {
      await rename(tempPath, absolutePath)
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code
      if (replaceExisting && (code === "EEXIST" || code === "EPERM")) {
        await unlink(absolutePath).catch(() => {})
        await rename(tempPath, absolutePath)
      } else {
        throw error
      }
    }
  } catch (error) {
    await unlink(tempPath).catch(() => {})
    throw error
  }
}

export async function copyFileToPathAtomic(
  sourcePath: string,
  absolutePath: string,
  options?: { replaceExisting?: boolean }
): Promise<void> {
  const replaceExisting = options?.replaceExisting ?? true
  const tempPath = `${absolutePath}.uploading-${randomUUID()}`
  try {
    await pipeline(createReadStream(sourcePath), createWriteStream(tempPath, { flags: "wx" }))
    try {
      await rename(tempPath, absolutePath)
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code
      if (replaceExisting && (code === "EEXIST" || code === "EPERM")) {
        await unlink(absolutePath).catch(() => {})
        await rename(tempPath, absolutePath)
      } else {
        throw error
      }
    }
  } catch (error) {
    await unlink(tempPath).catch(() => {})
    throw error
  }
}
