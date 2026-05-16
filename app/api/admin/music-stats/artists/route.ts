import { NextRequest, NextResponse } from "next/server"
import { getAdminToken, verifySession } from "@/lib/auth"
import { getDb } from "@/lib/db"
import { MUSIC_PLATFORM_LABELS, type MusicPlatformKey } from "@/lib/music-platform"

function parsePlatformParam(v: string | null): { mode: "all" } | { mode: "some"; keys: MusicPlatformKey[] } | null {
  if (!v) return null
  const raw = v.trim()
  if (raw === "all") return { mode: "all" }

  const parts = raw
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean)

  const keys = parts.filter((p): p is MusicPlatformKey => p in MUSIC_PLATFORM_LABELS)

  if (keys.length === 0) return null
  return { mode: "some", keys }
}

export async function GET(request: NextRequest) {
  const token = getAdminToken(request)
  if (!verifySession(token)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const url = new URL(request.url)
  const platformParam = parsePlatformParam(url.searchParams.get("platform"))
  if (!platformParam) {
    return NextResponse.json({ error: "platform param is required" }, { status: 400 })
  }

  const prefixRaw = url.searchParams.get("prefix") ?? ""
  const prefix = prefixRaw.trim().toLowerCase()

  const limitRaw = url.searchParams.get("limit")
  const limit = (() => {
    const n = limitRaw ? Number(limitRaw) : 20
    if (!Number.isFinite(n) || n <= 0) return 20
    return Math.min(Math.floor(n), 50)
  })()

  const db = getDb()

  if (platformParam.mode === "all") {
    const allKeys = Object.keys(MUSIC_PLATFORM_LABELS) as MusicPlatformKey[]
    const placeholders = allKeys.map(() => "?").join(",")
    const rows = db
      .prepare(
        `
          SELECT DISTINCT author
          FROM music_platform_tracks
          WHERE platform_key IN (${placeholders})
            AND author IS NOT NULL
            AND TRIM(author) != ''
            AND unicode_lower(author) LIKE ?
          ORDER BY author COLLATE NOCASE
          LIMIT ?
        `,
      )
      .all(...allKeys, `${prefix}%`, limit) as Array<{ author: string }>

    return NextResponse.json({ artists: rows.map((r) => r.author) })
  }

  const someKeys = platformParam.keys
  const placeholders = someKeys.map(() => "?").join(",")
  const rows = db
    .prepare(
      `
        SELECT DISTINCT author
        FROM music_platform_tracks
        WHERE platform_key IN (${placeholders})
          AND author IS NOT NULL
          AND TRIM(author) != ''
          AND unicode_lower(author) LIKE ?
        ORDER BY author COLLATE NOCASE
        LIMIT ?
      `,
    )
    .all(...someKeys, `${prefix}%`, limit) as Array<{ author: string }>

  return NextResponse.json({ artists: rows.map((r) => r.author) })
}

