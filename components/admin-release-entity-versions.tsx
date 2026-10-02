"use client"

import { useCallback, useEffect, useState } from "react"
import { format } from "date-fns"
import { ru } from "date-fns/locale"
import { ChevronDown, ChevronUp, History, Loader2 } from "lucide-react"

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
        <div className="space-y-2">
          {error ? <p className="text-xs text-destructive">{error}</p> : null}
          {!loading && versions.length === 0 && !error ? (
            <p className="text-xs text-muted-foreground">
              Версий пока нет. Снимки создаются при отправке на модерацию и при
              правках админа.
            </p>
          ) : null}
          <ul className="space-y-2">
            {versions.map((v) => {
              const isOpen = openVersionId === v.id
              return (
                <li key={v.id} className="border-l-2 border-border/60 pl-3 text-sm">
                  <button
                    type="button"
                    className="w-full text-left"
                    onClick={() => setOpenVersionId(isOpen ? null : v.id)}
                  >
                    <p className="text-xs text-muted-foreground">
                      <span className="font-medium text-foreground/80">
                        v{v.versionNo}
                      </span>
                      {" · "}
                      {(() => {
                        try {
                          return format(new Date(v.createdAt), "d MMM yyyy, HH:mm", {
                            locale: ru,
                          })
                        } catch {
                          return v.createdAt
                        }
                      })()}
                      {" · "}
                      {v.reasonLabel}
                      {v.actor ? ` · ${v.actor}` : null}
                    </p>
                    <p className="text-sm text-foreground/90">
                      {v.preview.artistName} — {v.preview.title}
                      {v.preview.status ? (
                        <span className="text-muted-foreground">
                          {" "}
                          ({v.preview.status})
                        </span>
                      ) : null}
                    </p>
                    {v.note ? (
                      <p className="mt-0.5 text-xs text-muted-foreground/90 line-clamp-2">
                        {v.note}
                      </p>
                    ) : null}
                  </button>
                  {isOpen ? (
                    <div className="mt-2 space-y-1.5 rounded bg-background/60 px-2 py-2 text-xs text-muted-foreground">
                      <p>
                        Дата релиза: {v.preview.releaseDate || "—"}
                        {v.preview.upc ? ` · UPC ${v.preview.upc}` : null}
                        {v.preview.coverPath ? ` · обложка: ${v.preview.coverPath}` : null}
                      </p>
                      <p className="font-medium text-foreground/70">
                        Треки ({v.preview.trackCount})
                      </p>
                      <ul className="space-y-1">
                        {v.preview.tracks.map((t, i) => (
                          <li key={t.id}>
                            {i + 1}. {t.trackName}
                            {t.trackVersion ? ` (${t.trackVersion})` : null}
                            {t.status ? ` · ${t.status}` : null}
                            {t.isrc ? ` · ISRC ${t.isrc}` : null}
                            {t.audioPath ? ` · ${t.audioPath}` : null}
                          </li>
                        ))}
                      </ul>
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
