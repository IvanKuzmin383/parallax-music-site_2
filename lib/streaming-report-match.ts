import { query } from "@/lib/database"
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

async function listArtistUserCandidates(): Promise<ArtistUserCandidate[]> {
  const candidates: ArtistUserCandidate[] = []

  const users = await query<{ id: string; email: string; artist_name: string | null }>(
    `SELECT id, email, artist_name FROM cabinet_users WHERE COALESCE(is_disabled, false) = false`
  )

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

  const slots = await query<{ user_id: string; artist_name: string; email: string }>(
    `SELECT s.user_id, s.artist_name, u.email
     FROM cabinet_user_artist_subscriptions s
     JOIN cabinet_users u ON u.id = s.user_id
     WHERE COALESCE(u.is_disabled, false) = false
       AND s.artist_name IS NOT NULL
       AND TRIM(s.artist_name) != ''`
  )

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

export async function matchStreamingReportFileName(
  fileName: string
): Promise<StreamingReportMatchResult> {
  const artistFromFile = extractArtistNameFromReportFileName(fileName)
  const warnings: string[] = []

  if (isCollabReportFileName(fileName)) {
    return {
      artistFromFile,
      requiresManual: true,
      suggestedUserId: null,
      matchConfidence: "manual",
      candidateUserIds: [],
      warnings: ["Коллаборация - выберите пользователя вручную"],
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

  const candidates = await listArtistUserCandidates()
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
    warnings.push("Несколько пользователей с таким именем артиста - выберите вручную")
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
