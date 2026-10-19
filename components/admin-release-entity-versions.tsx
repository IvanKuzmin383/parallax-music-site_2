"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { format } from "date-fns"
import { ru } from "date-fns/locale"
import { ChevronDown, ChevronUp, GitCompareArrows, History, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { cn } from "@/lib/utils"
import type { ReleaseEntitySnapshot } from "@/lib/release-entity-versions"

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

type FullVersion = {
  id: string
  versionNo: number
  reasonLabel?: string
  actor: string | null
  note: string | null
  createdAt: string
  snapshot: ReleaseEntitySnapshot
}

type DiffChange = {
  path: string
  before: string
  after: string
}

type Props = {
  /** Предпочтительный способ - через трек (резолвит releaseId на сервере). */
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
  if (!raw) return "-"
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

function pathBasename(p: string | null | undefined): string {
  if (!p?.trim()) return ""
  const parts = p.replace(/\\/g, "/").split("/")
  return parts[parts.length - 1] || p
}

function displayValue(value: unknown): string {
  if (value === undefined || value === null || value === "") return "—"
  if (typeof value === "boolean") return value ? "да" : "нет"
  if (typeof value === "object") {
    try {
      return JSON.stringify(value)
    } catch {
      return String(value)
    }
  }
  const s = String(value)
  if (STATUS_LABELS[s]) return STATUS_LABELS[s]
  return s
}

function pushIfChanged(
  out: DiffChange[],
  path: string,
  before: unknown,
  after: unknown,
  transform?: (v: unknown) => unknown
) {
  const b = transform ? transform(before) : before
  const a = transform ? transform(after) : after
  const beforeText = displayValue(b)
  const afterText = displayValue(a)
  if (beforeText === afterText) return
  out.push({ path, before: beforeText, after: afterText })
}

function compareSnapshots(
  older: ReleaseEntitySnapshot,
  newer: ReleaseEntitySnapshot
): DiffChange[] {
  const changes: DiffChange[] = []
  const r0 = older.release
  const r1 = newer.release

  pushIfChanged(changes, "Релиз / Название", r0?.title, r1?.title)
  pushIfChanged(changes, "Релиз / Артист", r0?.artistName, r1?.artistName)
  pushIfChanged(changes, "Релиз / Лейбл", r0?.labelName, r1?.labelName)
  pushIfChanged(changes, "Релиз / Статус", r0?.status, r1?.status)
  pushIfChanged(changes, "Релиз / Дата релиза", r0?.releaseDate, r1?.releaseDate)
  pushIfChanged(changes, "Релиз / UPC", r0?.upc, r1?.upc)
  pushIfChanged(changes, "Релиз / Обложка", r0?.coverPath, r1?.coverPath, (v) =>
    pathBasename(typeof v === "string" ? v : "")
  )
  pushIfChanged(changes, "Релиз / AI-обложка (заявка)", r0?.requestAiCover, r1?.requestAiCover)
  pushIfChanged(
    changes,
    "Релиз / Обложка создана AI",
    r0?.coverCreatedWithAi,
    r1?.coverCreatedWithAi
  )
  pushIfChanged(
    changes,
    "Релиз / Короткая дата",
    r0?.acceptShortReleaseDate,
    r1?.acceptShortReleaseDate
  )
  pushIfChanged(changes, "Релиз / Допуслуги", r0?.addons, r1?.addons)

  const tracks0 = older.tracks ?? []
  const tracks1 = newer.tracks ?? []
  const map0 = new Map(tracks0.map((t) => [t.id, t]))
  const map1 = new Map(tracks1.map((t) => [t.id, t]))

  for (const t of tracks1) {
    if (!map0.has(t.id)) {
      changes.push({
        path: `Трек добавлен / ${t.trackName || t.id}`,
        before: "—",
        after: [t.trackName, t.trackVersion, statusLabel(t.status)].filter(Boolean).join(" · "),
      })
    }
  }
  for (const t of tracks0) {
    if (!map1.has(t.id)) {
      changes.push({
        path: `Трек удалён / ${t.trackName || t.id}`,
        before: [t.trackName, t.trackVersion, statusLabel(t.status)].filter(Boolean).join(" · "),
        after: "—",
      })
    }
  }

  for (const [id, t0] of map0) {
    const t1 = map1.get(id)
    if (!t1) continue
    const label = t1.trackName || t0.trackName || id.slice(0, 8)
    const p = (field: string) => `Трек "${label}" / ${field}`
    pushIfChanged(changes, p("Название"), t0.trackName, t1.trackName)
    pushIfChanged(changes, p("Версия"), t0.trackVersion, t1.trackVersion)
    pushIfChanged(changes, p("Артист"), t0.artistName, t1.artistName)
    pushIfChanged(changes, p("Лейбл"), t0.labelName, t1.labelName)
    pushIfChanged(changes, p("Статус"), t0.status, t1.status)
    pushIfChanged(changes, p("Жанр"), t0.genre, t1.genre)
    pushIfChanged(changes, p("Настроение"), t0.mood, t1.mood)
    pushIfChanged(changes, p("Описание"), t0.shortDescription, t1.shortDescription)
    pushIfChanged(changes, p("Текст"), t0.lyricsText, t1.lyricsText)
    pushIfChanged(changes, p("Язык текста"), t0.lyricsLanguage, t1.lyricsLanguage)
    pushIfChanged(changes, p("Автор музыки"), t0.musicAuthor, t1.musicAuthor)
    pushIfChanged(changes, p("Автор текста"), t0.lyricsAuthor, t1.lyricsAuthor)
    pushIfChanged(changes, p("Права на музыку"), t0.musicRights, t1.musicRights)
    pushIfChanged(changes, p("Права на текст"), t0.lyricsRights, t1.lyricsRights)
    pushIfChanged(changes, p("Права на исполнение"), t0.performanceRights, t1.performanceRights)
    pushIfChanged(changes, p("Инструментал"), t0.isInstrumental, t1.isInstrumental)
    pushIfChanged(changes, p("Explicit"), t0.hasExplicitLanguage, t1.hasExplicitLanguage)
    pushIfChanged(changes, p("Автор бита"), t0.backingAuthor, t1.backingAuthor)
    pushIfChanged(changes, p("Дата релиза"), t0.releaseDate, t1.releaseDate)
    pushIfChanged(changes, p("Комментарий модерации"), t0.moderationNote, t1.moderationNote)
    pushIfChanged(changes, p("Артикул"), t0.catalogNumber, t1.catalogNumber)
    pushIfChanged(changes, p("ISRC"), t0.isrc, t1.isrc)
    pushIfChanged(changes, p("UPC"), t0.upc, t1.upc)
    pushIfChanged(changes, p("Аудио"), t0.audioPath, t1.audioPath, (v) =>
      pathBasename(typeof v === "string" ? v : "")
    )
    pushIfChanged(changes, p("Обложка"), t0.coverPath, t1.coverPath, (v) =>
      pathBasename(typeof v === "string" ? v : "")
    )
    pushIfChanged(changes, p("Стриминг"), t0.streamingScope, t1.streamingScope)
    pushIfChanged(changes, p("Смартлинк"), t0.smartlinkSlug, t1.smartlinkSlug)
    pushIfChanged(changes, p("Площадки"), t0.platformLinks, t1.platformLinks)
  }

  return changes
}

export function AdminReleaseEntityVersions({ trackId }: Props) {
  const [expanded, setExpanded] = useState(false)
  const [loading, setLoading] = useState(false)
  const [versions, setVersions] = useState<VersionPreview[]>([])
  const [error, setError] = useState<string | null>(null)
  const [openVersionId, setOpenVersionId] = useState<string | null>(null)
  const [resolvedReleaseId, setResolvedReleaseId] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [comparing, setComparing] = useState(false)
  const [compareError, setCompareError] = useState<string | null>(null)
  const [diffChanges, setDiffChanges] = useState<DiffChange[] | null>(null)
  const [diffMeta, setDiffMeta] = useState<{
    fromNo: number
    toNo: number
  } | null>(null)

  const load = useCallback(async () => {
    if (!trackId) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(
        `/api/admin/tracks/${encodeURIComponent(trackId)}/release-versions`,
        { credentials: "include" }
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
    setSelectedIds([])
    setDiffChanges(null)
    setDiffMeta(null)
    setCompareError(null)
    if (trackId) {
      void load()
    }
  }, [trackId, load])

  const selectedVersions = useMemo(
    () =>
      selectedIds
        .map((id) => versions.find((v) => v.id === id))
        .filter((v): v is VersionPreview => Boolean(v))
        .sort((a, b) => a.versionNo - b.versionNo),
    [selectedIds, versions]
  )

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id)
      if (prev.length >= 2) return [prev[1], id]
      return [...prev, id]
    })
    setDiffChanges(null)
    setDiffMeta(null)
    setCompareError(null)
  }

  const runCompare = async () => {
    if (!resolvedReleaseId || selectedVersions.length !== 2) return
    setComparing(true)
    setCompareError(null)
    setDiffChanges(null)
    try {
      const [a, b] = selectedVersions
      const fetchFull = async (versionId: string) => {
        const res = await fetch(
          `/api/admin/releases/${encodeURIComponent(resolvedReleaseId)}/versions?versionId=${encodeURIComponent(versionId)}`,
          { credentials: "include" }
        )
        if (!res.ok) throw new Error("load failed")
        const data = (await res.json()) as { version?: FullVersion }
        if (!data.version?.snapshot) throw new Error("empty")
        return data.version
      }
      const [fullA, fullB] = await Promise.all([fetchFull(a.id), fetchFull(b.id)])
      const older = fullA.versionNo <= fullB.versionNo ? fullA : fullB
      const newer = fullA.versionNo <= fullB.versionNo ? fullB : fullA
      setDiffMeta({ fromNo: older.versionNo, toNo: newer.versionNo })
      setDiffChanges(compareSnapshots(older.snapshot, newer.snapshot))
    } catch {
      setCompareError("Не удалось сравнить версии")
    } finally {
      setComparing(false)
    }
  }

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
              Версий пока нет. Снимки создаются при отправке на модерацию и при правках админа.
            </p>
          ) : null}

          {versions.length >= 2 ? (
            <div className="flex flex-wrap items-center gap-2 rounded-md border border-border/50 bg-background/40 px-2.5 py-2">
              <p className="text-xs text-muted-foreground">
                Выберите 2 версии для сравнения
                {selectedVersions.length > 0
                  ? `: ${selectedVersions.map((v) => `v${v.versionNo}`).join(" и ")}`
                  : ""}
              </p>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                className="h-7 text-xs"
                disabled={selectedVersions.length !== 2 || comparing || !resolvedReleaseId}
                onClick={() => void runCompare()}
              >
                {comparing ? (
                  <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <GitCompareArrows className="mr-1 h-3.5 w-3.5" />
                )}
                Сравнить
              </Button>
              {diffChanges ? (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs"
                  onClick={() => {
                    setDiffChanges(null)
                    setDiffMeta(null)
                    setSelectedIds([])
                  }}
                >
                  Сбросить
                </Button>
              ) : null}
            </div>
          ) : null}

          {compareError ? <p className="text-xs text-destructive">{compareError}</p> : null}

          {diffChanges && diffMeta ? (
            <div className="space-y-2 rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2.5">
              <p className="text-xs font-medium text-foreground">
                Отчёт сравнения: v{diffMeta.fromNo} → v{diffMeta.toNo}
                <span className="ml-2 font-normal text-muted-foreground">
                  {diffChanges.length === 0
                    ? "изменений нет"
                    : `изменений: ${diffChanges.length}`}
                </span>
              </p>
              {diffChanges.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  Снимки совпадают по сравниваемым полям.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[480px] text-left text-xs">
                    <thead>
                      <tr className="border-b border-border/60 text-muted-foreground">
                        <th className="py-1.5 pr-2 font-medium">Поле</th>
                        <th className="py-1.5 pr-2 font-medium">v{diffMeta.fromNo}</th>
                        <th className="py-1.5 font-medium">v{diffMeta.toNo}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {diffChanges.map((row) => (
                        <tr
                          key={row.path}
                          className="border-b border-border/30 align-top last:border-0"
                        >
                          <td className="py-1.5 pr-2 font-medium text-foreground/90">
                            {row.path}
                          </td>
                          <td className="max-w-[220px] whitespace-pre-wrap break-words py-1.5 pr-2 text-red-700/90 dark:text-red-300/90">
                            {row.before}
                          </td>
                          <td className="max-w-[220px] whitespace-pre-wrap break-words py-1.5 text-emerald-700/90 dark:text-emerald-300/90">
                            {row.after}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : null}

          <ul className="space-y-2.5">
            {versions.map((v) => {
              const isOpen = openVersionId === v.id
              const parsed = parseVersionNote(v.note)
              const statusShown = parsed.statusChange || v.preview.status
              const modNote = parsed.clearedNote
                ? "очищен"
                : parsed.moderationNote !== undefined
                  ? parsed.moderationNote
                  : null
              const checked = selectedIds.includes(v.id)

              return (
                <li
                  key={v.id}
                  className={cn(
                    "rounded-lg border bg-background/50 px-3 py-2.5",
                    checked ? "border-primary/50" : "border-border/60"
                  )}
                >
                  <div className="flex flex-wrap items-start gap-x-2 gap-y-1">
                    {versions.length >= 2 ? (
                      <label className="mt-0.5 flex cursor-pointer items-center gap-1.5">
                        <Checkbox
                          checked={checked}
                          onCheckedChange={() => toggleSelect(v.id)}
                          aria-label={`Выбрать v${v.versionNo} для сравнения`}
                        />
                      </label>
                    ) : null}
                    <div className="min-w-0 flex-1">
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
                            {v.actor?.trim() || "-"}
                          </span>
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">{v.reasonLabel}</p>
                    </div>
                  </div>

                  <dl className="mt-2.5 space-y-1.5 border-t border-border/50 pt-2.5">
                    <FieldRow label="Статус" value={statusLabel(statusShown)} />
                    <FieldRow label="Название" value={v.preview.title || null} />
                    <FieldRow label="Артист" value={v.preview.artistName || null} />
                    <FieldRow
                      label="Дата релиза"
                      value={formatReleaseDate(v.preview.releaseDate)}
                    />
                    <FieldRow label="UPC" value={v.preview.upc} />
                    <FieldRow label="Обложка" value={v.preview.coverPath || null} />
                    <FieldRow label="Комментарий" value={modNote} multiline />
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
