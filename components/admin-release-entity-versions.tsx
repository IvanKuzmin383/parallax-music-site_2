"use client"

import { useCallback, useEffect, useState } from "react"
import { format } from "date-fns"
import { ru } from "date-fns/locale"
import { ChevronDown, ChevronUp, History, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

type VersionPreview = {
  id: string
  versionNo: number
  reason: string
  reasonLabel: string
  actor: string | null
  note: string | null
  createdAt: string
  preview: {
    title: string
    artistName: string
    status: string
    releaseDate: string | null
    trackCount: number
    tracks: Array<{
      id: string
      trackName: string
      trackVersion: string
      status: string
      isrc: string | null
      upc: string | null
      audioPath: string
      coverPath: string
    }>
    coverPath: string
    upc: string | null
  }
}

type Props = {
  /** Предпочтительный способ — через трек (резолвит releaseId на сервере). */
  trackId: string | null | undefined
}

const STATUS_LABELS: Record<string, string> = {
  draft: "Черновик",
  awaiting_payment: "Ожидает оплаты",
  upload_pending: "Требуется доработка",
  on_moderation: "На модерации",
  sent_to_platforms: "Отправлен агрегатору",
  approved_by_platforms: "Отправлен на площадки",
  released: "Выпущен",
  rejected: "Отклонено",
  postponed: "Отозван",
}

function statusLabel(raw: string | null | undefined): string {
  if (!raw) return "—"
  return STATUS_LABELS[raw] ?? raw
}

function formatVersionDate(raw: string): string {
  try {
    return format(new Date(raw), "d MMM yyyy, HH:mm", { locale: ru })
  } catch {
    return raw
  }
}

function formatReleaseDate(raw: string | null): string | null {
  if (!raw?.trim()) return null
  try {
    const d = new Date(raw.includes("T") ? raw : `${raw}T12:00:00`)
    if (Number.isNaN(d.getTime())) return raw
    return format(d, "d MMMM yyyy", { locale: ru })
  } catch {
    return raw
  }
}

/** Разбор служебной заметки вида `status→x; note: …`. */
function parseVersionNote(note: string | null): {
  statusChange?: string
  moderationNote?: string | null
  clearedNote?: boolean
  leftover: string | null
} {
  if (!note?.trim()) return { leftover: null }
  const parts = note
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean)
  let statusChange: string | undefined
  let moderationNote: string | null | undefined
  let clearedNote = false
  const leftover: string[] = []

  for (const part of parts) {
    const statusMatch = /^status\s*→\s*(.+)$/i.exec(part)
    if (statusMatch) {
      statusChange = statusMatch[1].trim()
      continue
    }
    if (/^note:\s*cleared$/i.test(part)) {
      clearedNote = true
      moderationNote = null
      continue
    }
    const noteMatch = /^note:\s*(.+)$/i.exec(part)
    if (noteMatch) {
      moderationNote = noteMatch[1].trim()
      continue
    }
    leftover.push(part)
  }

  return {
    statusChange,
    moderationNote,
    clearedNote,
    leftover: leftover.length ? leftover.join("; ") : null,
  }
}

function FieldRow({
  label,
  value,
  multiline,
}: {
  label: string
  value?: string | number | null
  multiline?: boolean
}) {
  if (value === undefined || value === null || value === "") return null
  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-0.5 text-sm sm:grid-cols-[7.5rem_1fr] sm:gap-x-3",
        multiline && "sm:items-start",
      )}
    >
      <dt className="text-xs text-muted-foreground sm:pt-0.5">{label}</dt>
      <dd
        className={cn(
          "min-w-0 break-words text-foreground",
          multiline && "whitespace-pre-wrap leading-relaxed",
        )}
      >
        {value}
      </dd>
    </div>
  )
}

export function AdminReleaseEntityVersions({ trackId }: Props) {
  const [expanded, setExpanded] = useState(false)
  const [loading, setLoading] = useState(false)
  const [versions, setVersions] = useState<VersionPreview[]>([])
  const [error, setError] = useState<string | null>(null)
  const [openVersionId, setOpenVersionId] = useState<string | null>(null)
  const [resolvedReleaseId, setResolvedReleaseId] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!trackId) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(
        `/api/admin/tracks/${encodeURIComponent(trackId)}/release-versions`,
        { credentials: "include" },
      )
      if (!res.ok) {
        setError("Не удалось загрузить версии")
        setVersions([])
        return
      }
      const data = (await res.json()) as {
        releaseId?: string | null
        versions?: VersionPreview[]
      }
      setResolvedReleaseId(data.releaseId ?? null)
      setVersions(data.versions ?? [])
    } catch {
      setError("Ошибка загрузки версий")
      setVersions([])
    } finally {
      setLoading(false)
    }
  }, [trackId])

  useEffect(() => {
    setExpanded(false)
    setOpenVersionId(null)
    setVersions([])
    setError(null)
    setResolvedReleaseId(null)
    if (trackId) {
      void load()
    }
  }, [trackId, load])

  if (!trackId) return null
  if (!loading && !resolvedReleaseId && versions.length === 0 && !error) return null

  return (
    <div className="md:col-span-2 space-y-2 rounded-md bg-muted/30 px-3 py-2">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-2 text-left"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
      >
        <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <History className="h-3.5 w-3.5" />
          История версий релиза
          {loading ? (
            <Loader2 className="ml-1 h-3.5 w-3.5 animate-spin" />
          ) : (
            <span className="ml-1 tabular-nums text-muted-foreground/70">
              ({versions.length})
            </span>
          )}
        </p>
        {expanded ? (
          <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        )}
      </button>

      {expanded ? (
        <div className="space-y-2.5">
          {error ? <p className="text-xs text-destructive">{error}</p> : null}
          {!loading && versions.length === 0 && !error ? (
            <p className="text-xs text-muted-foreground">
              Версий пока нет. Снимки создаются при отправке на модерацию и при
              правках админа.
            </p>
          ) : null}
          <ul className="space-y-2.5">
            {versions.map((v) => {
              const isOpen = openVersionId === v.id
              const parsed = parseVersionNote(v.note)
              const statusShown = parsed.statusChange || v.preview.status
              const modNote =
                parsed.clearedNote
                  ? "очищен"
                  : parsed.moderationNote !== undefined
                    ? parsed.moderationNote
                    : null

              return (
                <li
                  key={v.id}
                  className="rounded-lg border border-border/60 bg-background/50 px-3 py-2.5"
                >
                  {/* Шапка: версия · дата · редактор */}
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                    <span className="rounded bg-muted px-1.5 py-0.5 text-xs font-semibold tabular-nums text-foreground">
                      v{v.versionNo}
                    </span>
                    <span className="text-xs font-medium text-amber-700 dark:text-amber-400">
                      {formatVersionDate(v.createdAt)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      Редактор:{" "}
                      <span className="font-medium text-foreground/90">
                        {v.actor?.trim() || "—"}
                      </span>
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{v.reasonLabel}</p>

                  {/* Поля снимка */}
                  <dl className="mt-2.5 space-y-1.5 border-t border-border/50 pt-2.5">
                    <FieldRow label="Статус" value={statusLabel(statusShown)} />
                    <FieldRow
                      label="Название"
                      value={v.preview.title || null}
                    />
                    <FieldRow
                      label="Артист"
                      value={v.preview.artistName || null}
                    />
                    <FieldRow
                      label="Дата релиза"
                      value={formatReleaseDate(v.preview.releaseDate)}
                    />
                    <FieldRow label="UPC" value={v.preview.upc} />
                    <FieldRow
                      label="Обложка"
                      value={v.preview.coverPath || null}
                    />
                    <FieldRow
                      label="Комментарий"
                      value={modNote}
                      multiline
                    />
                    {parsed.leftover ? (
                      <FieldRow label="Заметка" value={parsed.leftover} multiline />
                    ) : null}
                    <FieldRow label="Треков" value={v.preview.trackCount} />
                  </dl>

                  {v.preview.tracks.length > 0 ? (
                    <div className="mt-2">
                      <button
                        type="button"
                        className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
                        onClick={() => setOpenVersionId(isOpen ? null : v.id)}
                        aria-expanded={isOpen}
                      >
                        {isOpen ? (
                          <ChevronUp className="h-3.5 w-3.5" />
                        ) : (
                          <ChevronDown className="h-3.5 w-3.5" />
                        )}
                        Треки в снимке
                      </button>
                      {isOpen ? (
                        <ul className="mt-1.5 space-y-2 rounded-md border border-border/40 bg-muted/20 px-2.5 py-2">
                          {v.preview.tracks.map((t, i) => (
                            <li key={t.id} className="text-xs">
                              <p className="font-medium text-foreground">
                                {i + 1}. {t.trackName || "Без названия"}
                                {t.trackVersion ? (
                                  <span className="font-normal text-muted-foreground">
                                    {" "}
                                    · {t.trackVersion}
                                  </span>
                                ) : null}
                              </p>
                              <dl className="mt-1 space-y-1 pl-4 text-muted-foreground">
                                <FieldRow label="Статус" value={statusLabel(t.status)} />
                                <FieldRow label="ISRC" value={t.isrc} />
                                <FieldRow label="UPC" value={t.upc} />
                                <FieldRow label="Аудио" value={t.audioPath || null} />
                                <FieldRow label="Обложка" value={t.coverPath || null} />
                              </dl>
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </div>
                  ) : null}
                </li>
              )
            })}
          </ul>
        </div>
      ) : null}
    </div>
  )
}
