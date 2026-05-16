import { randomUUID } from "node:crypto"
import { createWriteStream } from "node:fs"
import { mkdir, open, unlink } from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import { Readable } from "node:stream"
import type { ReadableStream as NodeReadableStream } from "node:stream/web"
import Busboy from "busboy"
import type { NextRequest } from "next/server"

export class MultipartRequestError extends Error {
  status: number

  constructor(message: string, status = 400) {
    super(message)
    this.name = "MultipartRequestError"
    this.status = status
  }
}

export type ParsedMultipartFile = {
  fieldName: string
  originalFilename: string
  mimeType: string
  size: number
  tempFilePath: string
}

export type ParsedMultipartBody = {
  fields: Record<string, string[]>
  files: ParsedMultipartFile[]
  getField: (name: string) => string | undefined
  getFile: (name: string) => ParsedMultipartFile | undefined
  getFiles: (name: string) => ParsedMultipartFile[]
  cleanup: () => Promise<void>
}

type MultipartParseOptions = {
  uploadDir?: string
  maxFiles?: number
  maxFields?: number
  maxFileSizeBytes?: number
  maxFieldSizeBytes?: number
}

export async function parseMultipartRequestStream(
  request: NextRequest,
  options?: MultipartParseOptions
): Promise<ParsedMultipartBody> {
  const contentType = request.headers.get("content-type") ?? ""
  if (!contentType.includes("multipart/form-data")) {
    throw new MultipartRequestError("Ожидается multipart/form-data", 400)
  }
  if (!request.body) {
    throw new MultipartRequestError("Пустое тело запроса", 400)
  }

  const uploadDir = options?.uploadDir ?? path.join(os.tmpdir(), "parallax-multipart")
  await mkdir(uploadDir, { recursive: true })

  const fields: Record<string, string[]> = {}
  const files: ParsedMultipartFile[] = []
  const tempFilePaths: string[] = []
  const fileWrites: Promise<void>[] = []

  const busboy = Busboy({
    headers: { "content-type": contentType },
    limits: {
      files: options?.maxFiles,
      fields: options?.maxFields,
      fileSize: options?.maxFileSizeBytes,
      fieldSize: options?.maxFieldSizeBytes,
    },
  })

  busboy.on("field", (name, value) => {
    if (!fields[name]) fields[name] = []
    fields[name].push(value)
  })

  busboy.on("file", (fieldName, file, info) => {
    const tempFilePath = path.join(uploadDir, `${randomUUID()}.part`)
    tempFilePaths.push(tempFilePath)
    const target = createWriteStream(tempFilePath, { flags: "wx" })
    const item: ParsedMultipartFile = {
      fieldName,
      originalFilename: info.filename ?? "",
      mimeType: info.mimeType ?? "",
      size: 0,
      tempFilePath,
    }
    files.push(item)

    const writePromise = new Promise<void>((resolve, reject) => {
      let settled = false
      const fail = (err: Error) => {
        if (settled) return
        settled = true
        reject(err)
      }
      const ok = () => {
        if (settled) return
        settled = true
        resolve()
      }

      file.on("data", (chunk: Buffer) => {
        item.size += chunk.length
      })
      file.on("limit", () => {
        fail(new MultipartRequestError(`Файл поля "${fieldName}" превышает допустимый размер`, 413))
      })
      file.on("error", (err) => fail(err instanceof Error ? err : new Error(String(err))))
      target.on("error", (err) => fail(err instanceof Error ? err : new Error(String(err))))
      target.on("finish", ok)
      file.pipe(target)
    })

    fileWrites.push(writePromise)
  })

  const nodeBody = Readable.fromWeb(request.body as unknown as NodeReadableStream)

  try {
    await new Promise<void>((resolve, reject) => {
      nodeBody.on("error", (err) => reject(err instanceof Error ? err : new Error(String(err))))
      busboy.on("error", (err) => reject(err instanceof Error ? err : new Error(String(err))))
      busboy.on("finish", resolve)
      nodeBody.pipe(busboy)
    })
    await Promise.all(fileWrites)
  } catch (error) {
    await Promise.all(tempFilePaths.map((p) => unlink(p).catch(() => {})))
    if (error instanceof MultipartRequestError) throw error
    throw new MultipartRequestError("Не удалось обработать multipart-данные", 400)
  }

  return {
    fields,
    files,
    getField(name: string) {
      return fields[name]?.[0]
    },
    getFile(name: string) {
      return files.find((file) => file.fieldName === name)
    },
    getFiles(name: string) {
      return files.filter((file) => file.fieldName === name)
    },
    async cleanup() {
      await Promise.all(tempFilePaths.map((p) => unlink(p).catch(() => {})))
    },
  }
}

export async function readFilePrefix(filePath: string, maxBytes: number): Promise<Buffer> {
  const handle = await open(filePath, "r")
  try {
    const buf = Buffer.alloc(maxBytes)
    const { bytesRead } = await handle.read(buf, 0, maxBytes, 0)
    return buf.subarray(0, bytesRead)
  } finally {
    await handle.close().catch(() => {})
  }
}
