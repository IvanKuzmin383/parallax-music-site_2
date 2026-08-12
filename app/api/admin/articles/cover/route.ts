import { NextRequest, NextResponse } from "next/server"
import crypto from "crypto"
import path from "path"
import { getAdminToken, verifySession } from "@/lib/auth"
import {
  blogCoverPublicPath,
  getBlogCoversDir,
  MAX_BLOG_COVER_BYTES,
} from "@/lib/blog-covers"
import { copyFileToPathAtomic } from "@/lib/node-atomic-upload"
import {
  MultipartRequestError,
  parseMultipartRequestStream,
} from "@/lib/node-streaming-multipart"

export async function POST(request: NextRequest) {
  const token = getAdminToken(request)
  if (!verifySession(token)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const multipart = await parseMultipartRequestStream(request, {
      maxFiles: 1,
      maxFields: 4,
      maxFileSizeBytes: MAX_BLOG_COVER_BYTES,
      maxFieldSizeBytes: 8 * 1024,
    })
    try {
      const coverFile = multipart.getFile("cover")
      if (!coverFile) {
        return NextResponse.json({ error: "Файл обложки не предоставлен" }, { status: 400 })
      }

      const coverExt = (coverFile.originalFilename.toLowerCase().split(".").pop() ?? "").replace(
        "jpeg",
        "jpg"
      )
      if (!["jpg", "png"].includes(coverExt)) {
        return NextResponse.json(
          { error: "Обложка должна быть в формате JPEG или PNG" },
          { status: 400 }
        )
      }

      if (coverFile.size > MAX_BLOG_COVER_BYTES) {
        return NextResponse.json(
          { error: "Размер обложки не должен превышать 10 MB" },
          { status: 400 }
        )
      }

      const coversDir = await getBlogCoversDir()
      const fileName = `${crypto.randomUUID()}.${coverExt}`
      const absPath = path.join(coversDir, fileName)
      await copyFileToPathAtomic(coverFile.tempFilePath, absPath)

      const ogImage = blogCoverPublicPath(fileName)
      return NextResponse.json({ ok: true, ogImage, fileName })
    } finally {
      await multipart.cleanup()
    }
  } catch (error) {
    if (error instanceof MultipartRequestError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error("[admin/articles/cover] upload error:", error)
    return NextResponse.json({ error: "Не удалось загрузить обложку" }, { status: 500 })
  }
}
