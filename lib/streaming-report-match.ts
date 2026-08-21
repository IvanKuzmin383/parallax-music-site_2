import { query } from "@/lib/database"
import {
  extractArtistNameFromReportFileName,
  isCollabArtistName,
  looksLikeMojibake,
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
    `SELECT id, email, artist_name FROM cabinet_users WHERE COALESCE(is_disabled, false) = false`,
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

  const slots = await query<{ user_id: string; email: string; artist_name: string }>(
    `SELECT s.user_id, s.artist_name, u.email
     FROM cabinet_user_artist_subscriptions s
     JOIN cabinet_users u ON u.id = s.user_id
     WHERE COALESCE(u.is_disabled, false) = false
       AND s.artist_name IS NOT NULL
       AND TRIM(s.artist_name) != ''`,
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

function usersForArtist(
  artistName: string,
  candidates: ArtistUserCandidate[],
): string[] {
  const key = normalizeArtistKey(artistName)
  if (!key) return []
  return [
    ...new Set(
      candidates
        .filter((c) => normalizeArtistKey(c.artistName) === key)
        .map((c) => c.userId),
    ),
  ]
}

function exactResult(
  artistFromFile: string,
  userId: string,
  warnings: string[] = [],
): StreamingReportMatchResult {
  return {
    artistFromFile,
    requiresManual: false,
    suggestedUserId: userId,
    matchConfidence: "exact",
    candidateUserIds: [userId],
    warnings,
  }
}

function manualResult(
  artistFromFile: string,
  warnings: string[],
  candidateUserIds: string[] = [],
  matchConfidence: "none" | "manual" = "none",
): StreamingReportMatchResult {
  return {
    artistFromFile,
    requiresManual: true,
    suggestedUserId: null,
    matchConfidence,
    candidateUserIds,
    warnings,
  }
}

/**
 * Match report to cabinet user.
 * Prefer filename artist when valid; fall back to «Исполнитель» from file content
 * (needed when multipart mangled Cyrillic filenames).
 */
export async function matchStreamingReport(params: {
  fileName: string
  artistsFromContent?: string[]
  primaryArtistFromContent?: string | null
}): Promise<StreamingReportMatchResult> {
  const artistFromFileName = extractArtistNameFromReportFileName(params.fileName)
  const contentArtists = [...new Set((params.artistsFromContent ?? []).map((a) => a.trim()).filter(Boolean))]
  const primaryContent = params.primaryArtistFromContent?.trim() || contentArtists[0] || ""
  const displayFallback = primaryContent || artistFromFileName

  const candidates = await listArtistUserCandidates()
  const warnings: string[] = []

  const fileNameUsable =
    Boolean(artistFromFileName.trim()) && !looksLikeMojibake(artistFromFileName)

  if (fileNameUsable) {
    if (isCollabArtistName(artistFromFileName)) {
      return manualResult(
        artistFromFileName,
        ["Коллаборация - выберите пользователя вручную"],
        [],
        "manual",
      )
    }

    const fromName = usersForArtist(artistFromFileName, candidates)
    if (fromName.length === 1) {
      return exactResult(artistFromFileName, fromName[0])
    }
    if (fromName.length > 1) {
      return manualResult(
        artistFromFileName,
        ["Несколько пользователей с таким именем артиста - выберите вручную"],
        fromName,
      )
    }
    // filename artist unknown — try content below
    warnings.push("Артист из имени файла не найден — ищем по содержимому файла")
  } else if (looksLikeMojibake(artistFromFileName)) {
    warnings.push("Имя артиста в имени файла повреждено (кодировка) — ищем по содержимому")
  }

  if (contentArtists.length === 0) {
    warnings.push("Пользователь с таким именем артиста не найден")
    return manualResult(displayFallback, warnings)
  }

  const nonCollab = contentArtists.filter((a) => !isCollabArtistName(a))
  if (nonCollab.length === 0) {
    return manualResult(
      displayFallback,
      [...warnings, "Коллаборация - выберите пользователя вручную"],
      [],
      "manual",
    )
  }

  const perArtistUsers = nonCollab.map((artist) => ({
    artist,
    users: usersForArtist(artist, candidates),
  }))

  const unresolved = perArtistUsers.filter((x) => x.users.length === 0)
  const ambiguous = perArtistUsers.filter((x) => x.users.length > 1)
  const resolved = perArtistUsers.filter((x) => x.users.length === 1)

  if (ambiguous.length > 0) {
    const ids = [...new Set(ambiguous.flatMap((x) => x.users))]
    return manualResult(
      displayFallback,
      [
        ...warnings,
        `Несколько пользователей для артиста «${ambiguous[0].artist}» — выберите вручную`,
      ],
      ids,
    )
  }

  if (resolved.length === 0) {
    for (const u of unresolved) {
      warnings.push(`Артист из файла «${u.artist}» не найден в базе`)
    }
    warnings.push("Пользователь с таким именем артиста не найден")
    return manualResult(displayFallback, warnings)
  }

  const uniqueUsers = [...new Set(resolved.map((x) => x.users[0]))]
  if (uniqueUsers.length > 1) {
    return manualResult(
      displayFallback,
      [...warnings, "В файле артисты разных пользователей — выберите вручную"],
      uniqueUsers,
    )
  }

  if (unresolved.length > 0) {
    for (const u of unresolved) {
      warnings.push(`Артист из файла «${u.artist}» не найден в базе`)
    }
    return manualResult(
      displayFallback,
      [...warnings, "Не все артисты файла сопоставлены — выберите пользователя вручную"],
      uniqueUsers,
    )
  }

  return exactResult(primaryContent || displayFallback, uniqueUsers[0], warnings)
}

/** @deprecated Prefer matchStreamingReport — kept for callers that only have a filename. */
export async function matchStreamingReportFileName(
  fileName: string,
): Promise<StreamingReportMatchResult> {
  return matchStreamingReport({ fileName })
}
