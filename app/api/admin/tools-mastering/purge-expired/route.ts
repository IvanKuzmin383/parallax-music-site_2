import { NextRequest, NextResponse } from "next/server"
import { getAdminToken, verifySession } from "@/lib/auth"
import { purgeExpiredToolsMasteringFiles } from "@/lib/tools-mastering-files"

const MAX_ROUNDS = 50

/** Глобальная очистка просроченных WAV онлайн-мастеринга (диск + БД). */
export async function POST(request: NextRequest) {
  const token = getAdminToken(request)
  if (!verifySession(token)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    let deleted = 0
    for (let round = 0; round < MAX_ROUNDS; round += 1) {
      const n = await purgeExpiredToolsMasteringFiles()
      deleted += n
      if (n === 0) break
    }
    return NextResponse.json({ ok: true, deleted })
  } catch (error) {
    console.error("[admin/tools-mastering/purge-expired]", error)
    return NextResponse.json({ error: "Не удалось очистить просроченные файлы" }, { status: 500 })
  }
}
