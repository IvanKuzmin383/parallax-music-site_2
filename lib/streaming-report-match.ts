import { getDb } from "@/lib/db"
import {
  extractArtistNameFromReportFileName,
  isCollabReportFileName,
  normalizeArtistKey,
} from "@/lib/streaming-report-parse"

export type ArtistUserCandidate = {
  userId: string
  email: string
  artistName: string
  source: "profile" | "subscription"
}

export type StreamingReportMatchResult = {
  artistFromFile: string
  requiresManual: boolean
  suggestedUserId: string | null
  matchConfidence: "exact" | "none" | "manual"
  candidateUserIds: string[]
  warnings: string[]
}

function listArtistUserCandidates(): ArtistUserCandidate[] {
  const db = getDb()
  const candidates: ArtistUserCandidate[] = []

  const users = db
    .prepare(
      `SELECT id, email, artist_name FROM cabinet_users WHERE COALESCE(is_disabled, 0) = 0`,
    )
    .all() as { id: string; email: string; artist_name: string | null }[]

  for (const user of users) {
    const name = user.artist_name?.trim()
    if (name) {
      candidates.push({
        userId: user.id,
        email: user.email,
        artistName: name,
        source: "profile",
      })
    }
  }

  const slots = db
    .prepare(
      `SELECT s.user_id, s.artist_name, u.email
       FROM cabinet_user_artist_subscriptions s
       JOIN cabinet_users u ON u.id = s.user_id
       WHERE COALESCE(u.is_disabled, 0) = 0
         AND s.artist_name IS NOT NULL
         AND TRIM(s.artist_name) != ''`,
    )
    .all() as { user_id: string; artist_name: string; email: string }[]

  for (const slot of slots) {
    candidates.push({
      userId: slot.user_id,
      email: slot.email,
      artistName: slot.artist_name.trim(),
      source: "subscription",
    })
  }

  return candidates
}

export function matchStreamingReportFileName(fileName: string): StreamingReportMatchResult {
  const artistFromFile = extractArtistNameFromReportFileName(fileName)
  const warnings: string[] = []

  if (isCollabReportFileName(fileName)) {
    return {
      artistFromFile,
      requiresManual: true,
      suggestedUserId: null,
      matchConfidence: "manual",
      candidateUserIds: [],
      warnings: ["Коллаборация — выберите пользователя вручную"],
    }
  }

  const key = normalizeArtistKey(artistFromFile)
  if (!key) {
    warnings.push("Не удалось определить имя артиста из имени файла")
    return {
      artistFromFile,
      requiresManual: true,
      suggestedUserId: null,
      matchConfidence: "none",
      candidateUserIds: [],
      warnings,
    }
  }

  const candidates = listArtistUserCandidates()
  const matches = candidates.filter((c) => normalizeArtistKey(c.artistName) === key)
  const uniqueUserIds = [...new Set(matches.map((m) => m.userId))]

  if (uniqueUserIds.length === 1) {
    return {
      artistFromFile,
      requiresManual: false,
      suggestedUserId: uniqueUserIds[0],
      matchConfidence: "exact",
      candidateUserIds: uniqueUserIds,
      warnings,
    }
  }

  if (uniqueUserIds.length > 1) {
    warnings.push("Несколько пользователей с таким именем артиста — выберите вручную")
    return {
      artistFromFile,
      requiresManual: true,
      suggestedUserId: null,
      matchConfidence: "none",
      candidateUserIds: uniqueUserIds,
      warnings,
    }
  }

  warnings.push("Пользователь с таким именем артиста не найден")
  return {
    artistFromFile,
    requiresManual: true,
    suggestedUserId: null,
    matchConfidence: "none",
    candidateUserIds: [],
    warnings,
  }
}
