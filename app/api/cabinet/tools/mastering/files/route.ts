import { promises as fs } from "node:fs"
import { randomUUID } from "node:crypto"
import { NextRequest, NextResponse } from "next/server"
import { getCabinetSession, getCabinetToken } from "@/lib/cabinet-auth"
import { getCabinetUserByEmail } from "@/lib/cabinet-users"
import { MAX_CABINET_WAV_BYTES, cabinetWavMaxSizeError } from "@/lib/cabinet-wav-upload-limits"
import { execute } from "@/lib/database"
import {
  consumeToolsMasteringDownload,
  getToolsMasteringEntitlement,
} from "@/lib/tools-mastering-entitlement"
import {
  TOOLS_MASTERING_FILE_TTL_DAYS,
  createToolsMasteringFile,
  deleteToolsMasteringFileRecord,
  getToolsMasteringFilesDir,
  listToolsMasteringFilesForUser,
  sanitizeMasteringDownloadName,
  toolsMasteringFileAbsolutePath,
} from "@/lib/tools-mastering-files"

export const runtime = "nodejs"

function toClientItem(file: Awaited<ReturnType<typeof listToolsMasteringFilesForUser>>[number]) {
  return {
    id: file.id,
    fileName: file.fileName,
    sizeBytes: file.sizeBytes,
    used: file.used,
    createdAt: file.createdAt,
    expiresAt: file.expiresAt,
    downloadPath: `/api/cabinet/tools/mastering/files/${encodeURIComponent(file.id)}/download`,
    ttlDays: TOOLS_MASTERING_FILE_TTL_DAYS,
  }
}

export async function GET(request: NextRequest) {
  const token = getCabinetToken(request)
  const session = getCabinetSession(token)
  if (!session) return NextResponse.json({ error: "Необходима авторизация" }, { status: 401 })

  const user = await getCabinetUserByEmail(session.email)
  if (!user) return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 })

  const items = await listToolsMasteringFilesForUser(user.id)
  return NextResponse.json({
    ttlDays: TOOLS_MASTERING_FILE_TTL_DAYS,
    items: items.map(toClientItem),
  })
}

/**
 * Сохранить отрендеренный WAV, затем списать free/credit.
 * Если списание не удалось - файл удаляется (кредит не теряется впустую).
 */
export async function POST(request: NextRequest) {
  const token = getCabinetToken(request)
  const session = getCabinetSession(token)
  if (!session) return NextResponse.json({ error: "Необходима авторизация" }, { status: 401 })

  const user = await getCabinetUserByEmail(session.email)
  if (!user) return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 })

  const entitlement = await getToolsMasteringEntitlement(user.id)
  if (!entitlement?.canDownload) {
    return NextResponse.json(
      {
        error: "Нужна оплата скачивания",
        code: "payment_required",
        entitlement,
      },
      { status: 402 },
    )
  }

  let form: FormData
  try {
    form = await request.formData()
  } catch {
    return NextResponse.json({ error: "Некорректные данные" }, { status: 400 })
  }

  const blob = form.get("file")
  if (!(blob instanceof File) && !(blob instanceof Blob)) {
    return NextResponse.json({ error: "Нужен файл WAV" }, { status: 400 })
  }

  const size = blob.size
  if (!Number.isFinite(size) || size <= 0) {
    return NextResponse.json({ error: "Пустой файл" }, { status: 400 })
  }
  if (size > MAX_CABINET_WAV_BYTES) {
    return NextResponse.json({ error: cabinetWavMaxSizeError() }, { status: 400 })
  }

  const rawName =
    (typeof form.get("fileName") === "string" ? String(form.get("fileName")) : "") ||
    (blob instanceof File ? blob.name : "") ||
    "master.wav"
  const fileName = sanitizeMasteringDownloadName(rawName)
  const storageName = `${randomUUID()}.wav`

  const dir = await getToolsMasteringFilesDir(user.id)
  const fullPath = toolsMasteringFileAbsolutePath(user.id, storageName, dir)

  const buffer = Buffer.from(await blob.arrayBuffer())
  await fs.writeFile(fullPath, buffer)

  let createdId: string | null = null
  try {
    // Сначала запись о файле (used временно free), потом списание - при ошибке списания чистим всё.
    const saved = await createToolsMasteringFile({
      userId: user.id,
      fileName,
      storageName,
      sizeBytes: size,
      used: "free",
    })
    createdId = saved.id

    const consume = await consumeToolsMasteringDownload(user.id)
    if (!consume.ok) {
      await deleteToolsMasteringFileRecord(saved.id, user.id)
      if (consume.error === "payment_required") {
        return NextResponse.json(
          {
            error: "Нужна оплата скачивания",
            code: "payment_required",
            entitlement: consume.entitlement,
          },
          { status: 402 },
        )
      }
      return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 })
    }

    if (consume.used !== "free") {
      await execute(`UPDATE tools_mastering_files SET used = ? WHERE id = ? AND user_id = ?`, [
        consume.used,
        saved.id,
        user.id,
      ])
    }

    return NextResponse.json(
      {
        ok: true,
        used: consume.used,
        entitlement: consume.entitlement,
        ttlDays: TOOLS_MASTERING_FILE_TTL_DAYS,
        file: {
          ...toClientItem(saved),
          used: consume.used,
        },
      },
      { status: 201 },
    )
  } catch (error) {
    console.error("[tools-mastering-files] save failed:", error)
    if (createdId) {
      await deleteToolsMasteringFileRecord(createdId, user.id).catch(() => undefined)
    } else {
      await fs.unlink(fullPath).catch(() => undefined)
    }
    return NextResponse.json({ error: "Не удалось сохранить файл" }, { status: 500 })
  }
}
