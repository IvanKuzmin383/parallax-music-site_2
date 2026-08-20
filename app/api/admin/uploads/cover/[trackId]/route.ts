import { NextRequest, NextResponse } from "next/server"
import { getAdminToken, verifySession } from "@/lib/auth"
import { validateCabinetCoverImageFromFilePath } from "@/lib/cabinet-cover-validation"
import { getTrackById, updateTrack, getCoversDir } from "@/lib/tracks"
import { applySharedAlbumCover, buildAlbumCoverAbsolutePath } from "@/lib/album-cover-sync"
import { createReadStream } from "node:fs"
import { stat, unlink } from "fs/promises"
import { Readable } from "node:stream"
import { copyFileToPathAtomic } from "@/lib/node-atomic-upload"
import {
  MultipartRequestError,
  parseMultipartRequestStream,
} from "@/lib/node-streaming-multipart"
import path from "path"

const MAX_COVER_SIZE = 20 * 1024 * 1024 // 20 MB

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ trackId: string }> }
) {
  const token = getAdminToken(request)
  if (!verifySession(token)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { trackId } = await params
  const track = await getTrackById(trackId)
  if (!track) {
    return NextResponse.json({ error: "Трек не найден" }, { status: 404 })
  }

  if (!track.coverPath.trim()) {
    return NextResponse.json({ error: "Обложка ещё не загружена" }, { status: 404 })
  }

  try {
    const info = await stat(track.coverPath)
    const stream = createReadStream(track.coverPath)
    const body = Readable.toWeb(stream) as ReadableStream
    const ext = path.extname(track.coverPath).toLowerCase()
    const contentType =
      ext === ".png" ? "image/png" : ext === ".jpg" || ext === ".jpeg" ? "image/jpeg" : "image/jpeg"

    return new NextResponse(body, {
      headers: {
        "Content-Type": contentType,
        "Content-Length": String(info.size),
      },
    })
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return NextResponse.json({ error: "Файл обложки не найден" }, { status: 404 })
    }
    console.error("Error serving admin cover:", error)
    return NextResponse.json(
      { error: "Не удалось загрузить обложку" },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ trackId: string }> }
) {
  const token = getAdminToken(request)
  if (!verifySession(token)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { trackId } = await params
  const track = await getTrackById(trackId)
  if (!track) {
    return NextResponse.json({ error: "Трек не найден" }, { status: 404 })
  }

  try {
    const multipart = await parseMultipartRequestStream(request, {
      maxFiles: 1,
      maxFields: 4,
      maxFileSizeBytes: MAX_COVER_SIZE,
      maxFieldSizeBytes: 8 * 1024,
    })
    try {
      const coverFile = multipart.getFile("cover")

      if (!coverFile) {
        return NextResponse.json(
          { error: "Файл обложки не предоставлен" },
          { status: 400 }
        )
      }

      const coverExt = coverFile.originalFilename.toLowerCase().split(".").pop()
      if (!["jpg", "jpeg", "png"].includes(coverExt ?? "")) {
        return NextResponse.json(
          { error: "Обложка должна быть в формате JPEG или PNG" },
          { status: 400 }
        )
      }

      if (coverFile.size > MAX_COVER_SIZE) {
        return NextResponse.json(
          { error: "Размер обложки не должен превышать 20 MB" },
          { status: 400 }
        )
      }

      const coversDir = await getCoversDir()
      const coverExtNormalized = coverExt === "jpeg" ? "jpg" : (coverExt as string)

      const coverValidationError = await validateCabinetCoverImageFromFilePath(
        coverFile.tempFilePath,
        coverExt,
        coverFile.size
      )
      if (coverValidationError) {
        return NextResponse.json({ error: coverValidationError }, { status: 400 })
      }

      if (track.albumId) {
        const newCoverPath = buildAlbumCoverAbsolutePath(coversDir, track.albumId, coverExtNormalized)
        await copyFileToPathAtomic(coverFile.tempFilePath, newCoverPath)
        try {
          await applySharedAlbumCover({
            albumId: track.albumId,
            newCoverPath,
          })
        } catch (error) {
          console.error("Error syncing album cover:", error)
          try {
            await unlink(newCoverPath)
          } catch {
            // ignore
          }
          return NextResponse.json(
            { error: "Не удалось обновить обложку альбома у всех треков" },
            { status: 500 }
          )
        }
        const updated = await getTrackById(trackId)
        if (!updated) {
          return NextResponse.json({ error: "Не удалось обновить трек" }, { status: 500 })
        }
        return NextResponse.json({ track: updated, success: true, albumCoverSynced: true })
      }

      const oldCoverPath = track.coverPath
      const newCoverPath = path.join(coversDir, `${trackId}.${coverExtNormalized}`)

      await copyFileToPathAtomic(coverFile.tempFilePath, newCoverPath)

      if (oldCoverPath && oldCoverPath !== newCoverPath) {
        try {
          await unlink(oldCoverPath)
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
            console.error("Error deleting old cover:", error)
          }
        }
      }

      const updated = await updateTrack(trackId, { coverPath: newCoverPath, needsAiCover: false })
      if (!updated) {
        try {
          await unlink(newCoverPath)
        } catch {
          // ignore
        }
        return NextResponse.json(
          { error: "Не удалось обновить трек" },
          { status: 500 }
        )
      }

      return NextResponse.json({ track: updated, success: true })
    } finally {
      await multipart.cleanup()
    }
  } catch (error) {
    if (error instanceof MultipartRequestError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error("Error uploading cover:", error)
    return NextResponse.json(
      { error: "Не удалось загрузить обложку" },
      { status: 500 }
    )
  }
}
