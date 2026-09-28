export type ModerationNoteHistoryEntry = {
  /** Когда комментарий убрали / заархивировали (ISO). */
  at: string
  note: string
  /** Статус, в котором комментарий был актуален для артиста. */
  fromStatus?: string
}

/** Показывать текущий комментарий артисту только пока релиз на доработке / отклонён / отложен. */
export function shouldShowModerationNoteToArtist(status: string | null | undefined): boolean {
  return status === "upload_pending" || status === "rejected" || status === "postponed"
}

export function parseModerationNotesHistory(raw: unknown): ModerationNoteHistoryEntry[] {
  if (raw == null) return []
  let parsed: unknown = raw
  if (typeof raw === "string") {
    const trimmed = raw.trim()
    if (!trimmed) return []
    try {
      parsed = JSON.parse(trimmed)
    } catch {
      return []
    }
  }
  if (!Array.isArray(parsed)) return []
  const out: ModerationNoteHistoryEntry[] = []
  for (const item of parsed) {
    if (!item || typeof item !== "object") continue
    const rec = item as Record<string, unknown>
    const note = typeof rec.note === "string" ? rec.note.trim() : ""
    if (!note) continue
    const at =
      typeof rec.at === "string" && rec.at.trim()
        ? rec.at.trim()
        : new Date().toISOString()
    const fromStatus =
      typeof rec.fromStatus === "string" && rec.fromStatus.trim()
        ? rec.fromStatus.trim()
        : undefined
    out.push({ at, note, ...(fromStatus ? { fromStatus } : {}) })
  }
  return out
}

export function serializeModerationNotesHistory(
  entries: ModerationNoteHistoryEntry[]
): string | null {
  if (!entries.length) return null
  return JSON.stringify(entries)
}

/** Добавляет текущий комментарий в историю (если непустой). */
export function archiveModerationNote(
  history: ModerationNoteHistoryEntry[] | null | undefined,
  note: string | null | undefined,
  fromStatus?: string | null
): ModerationNoteHistoryEntry[] {
  const trimmed = (note ?? "").trim()
  if (!trimmed) return history ? [...history] : []
  const next = history ? [...history] : []
  next.push({
    at: new Date().toISOString(),
    note: trimmed,
    ...(fromStatus?.trim() ? { fromStatus: fromStatus.trim() } : {}),
  })
  return next
}
