"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Info, Pause, Play } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import type { Release } from "@/lib/releases"
import type { Track } from "@/lib/tracks"
import { COVER_AI_LEVEL_LABELS, type CoverAiLevel } from "@/lib/cover-ai-level"
import { streamingScopeShortLabel } from "@/components/streaming-services-field"
import {
  AI_LABELING_COMPOSITION_FIELDS,
  AI_LABELING_DETAIL_BINARY_LABELS,
  AI_LABELING_DETAIL_TERNARY_LABELS,
  AI_LABELING_RECORDING_FIELDS,
  aiLabelingModeLabel,
  type AiBinaryChoice,
  type AiTernaryChoice,
} from "@/lib/track-ai-labeling"
import { cn } from "@/lib/utils"

function formatAudioClock(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return "0:00"
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  return `${m}:${String(s).padStart(2, "0")}`
}

function MetaRow({
  label,
  value,
  scrollable,
}: {
  label: string
  value?: string | number | null | boolean
  /** Длинный текст — фиксированная высота со скроллом, без растягивания. */
  scrollable?: boolean
}) {
  if (value === undefined || value === null || value === "") return null
  const display =
    typeof value === "boolean" ? (value ? "Да" : "Нет") : String(value)
  return (
    <div className="grid grid-cols-[minmax(7rem,10rem)_1fr] gap-x-3 gap-y-1 text-sm py-1.5 border-b border-border/50 last:border-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd
        className={cn(
          "min-w-0 break-words",
          scrollable
            ? "max-h-28 overflow-y-auto whitespace-pre-wrap rounded-md border border-border/40 bg-muted/20 px-2.5 py-2"
            : "whitespace-pre-wrap",
        )}
      >
        {display}
      </dd>
    </div>
  )
}

function TrackMetaList({ track }: { track: Track }) {
  const ai = track.aiLabeling
  return (
    <dl className="space-y-0">
      <MetaRow label="Название" value={track.trackName} />
      <MetaRow label="Версия" value={track.trackVersion || null} />
      <MetaRow label="Артист" value={track.artistName} />
      <MetaRow label="Лейбл" value={track.labelName} />
      <MetaRow label="Жанр" value={track.genre} />
      <MetaRow label="Настроение" value={track.mood || null} />
      <MetaRow label="Описание" value={track.shortDescription || null} />
      <MetaRow label="Инструментал" value={track.isInstrumental} />
      {!track.isInstrumental ? (
        <>
          <MetaRow
            label="Ненормативная лексика"
            value={
              track.hasExplicitLanguage === null
                ? null
                : track.hasExplicitLanguage
                  ? "Да"
                  : "Нет"
            }
          />
          <MetaRow label="Язык текста" value={track.lyricsLanguage || null} />
          <MetaRow label="Текст песни" value={track.lyricsText || null} scrollable />
          <MetaRow label="Автор слов" value={track.lyricsAuthor || null} />
          <MetaRow label="Права на текст" value={track.lyricsRights || null} />
        </>
      ) : null}
      <MetaRow label="Автор музыки" value={track.musicAuthor || null} />
      <MetaRow label="Права на музыку" value={track.musicRights || null} />
      <MetaRow label="ИИ-сервис (музыка)" value={track.musicAiService || null} />
      <MetaRow label="Права на исполнение" value={track.performanceRights || null} />
      <MetaRow label="Автор минуса / бэка" value={track.backingAuthor || null} />
      <MetaRow
        label="Начало в ТикТок"
        value={
          track.tiktokSoundStartSec != null ? `${track.tiktokSoundStartSec} сек.` : null
        }
      />
      <MetaRow label="Стриминг-сервисы" value={streamingScopeShortLabel(track.streamingScope)} />
      <MetaRow label="ISRC" value={track.isrc || null} />
      <MetaRow label="UPC" value={track.upc || null} />
      <MetaRow
        label="Перенос с другого дистрибьютора"
        value={track.transferFromOtherDistributor ? "Да" : null}
      />
      <MetaRow label="Предыдущий дистрибьютор" value={track.previousDistributor || null} />
      <MetaRow label="AI-маркировка" value={aiLabelingModeLabel(ai?.mode)} />
      {ai?.mode === "partial" && ai.details
        ? [
            ...AI_LABELING_COMPOSITION_FIELDS.map((f) => (
              <MetaRow
                key={f.key}
                label={f.label}
                value={
                  ai.details?.[f.key]
                    ? AI_LABELING_DETAIL_BINARY_LABELS[ai.details[f.key] as AiBinaryChoice]
                    : null
                }
              />
            )),
            ...AI_LABELING_RECORDING_FIELDS.map((f) => (
              <MetaRow
                key={f.key}
                label={f.label}
                value={
                  ai.details?.[f.key]
                    ? AI_LABELING_DETAIL_TERNARY_LABELS[ai.details[f.key] as AiTernaryChoice]
                    : null
                }
              />
            )),
          ]
        : null}
    </dl>
  )
}

function ReleaseMetaList({
  release,
  tracks,
}: {
  release: Release | null
  tracks: Track[]
}) {
  const first = tracks[0]
  const coverAi = release?.coverCreatedWithAi as CoverAiLevel | null | undefined
  return (
    <dl className="space-y-0">
      <MetaRow label="Название" value={release?.title ?? first?.trackName} />
      <MetaRow label="Артист" value={release?.artistName ?? first?.artistName} />
      <MetaRow
        label="Тип"
        value={
          release?.kind === "album" || (tracks.length > 1 && Boolean(first?.albumId))
            ? "Альбом"
            : "Сингл"
        }
      />
      <MetaRow label="Дата релиза" value={release?.releaseDate ?? first?.releaseDate} />
      <MetaRow label="Лейбл" value={release?.labelName ?? first?.labelName} />
      <MetaRow label="UPC / EAN" value={release?.upc ?? first?.upc} />
      <MetaRow
        label="Обложка создана при помощи ИИ"
        value={coverAi ? COVER_AI_LEVEL_LABELS[coverAi] : null}
      />
      <MetaRow
        label="Заказана AI-обложка"
        value={release?.requestAiCover ? "Да" : null}
      />
      {first ? (
        <MetaRow
          label="Стриминг-сервисы"
          value={streamingScopeShortLabel(first.streamingScope)}
        />
      ) : null}
      <MetaRow label="Треков" value={tracks.length} />
    </dl>
  )
}

export function ReleaseTrackListPlayer({
  releaseId,
  tracks,
  isAlbum,
}: {
  /** Если есть сущность релиза — используем её audio URL. */
  releaseId?: string | null
  tracks: Track[]
  isAlbum: boolean
}) {
  const [playingTrackId, setPlayingTrackId] = useState<string | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [audioTime, setAudioTime] = useState(0)
  const [audioDuration, setAudioDuration] = useState(0)
  const [infoTrack, setInfoTrack] = useState<Track | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const seekingRef = useRef(false)

  const audioSrcFor = useCallback(
    (trackId: string) =>
      releaseId
        ? `/api/cabinet/releases/${releaseId}/audio/${trackId}`
        : `/api/cabinet/tracks/${trackId}/audio`,
    [releaseId],
  )

  const readDuration = (audio: HTMLAudioElement): number => {
    if (Number.isFinite(audio.duration) && audio.duration > 0) return audio.duration
    try {
      if (audio.seekable.length > 0) {
        const end = audio.seekable.end(audio.seekable.length - 1)
        if (Number.isFinite(end) && end > 0) return end
      }
    } catch {
      // ignore
    }
    return 0
  }

  const stopAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.src = ""
      audioRef.current = null
    }
    setPlayingTrackId(null)
    setIsPlaying(false)
    setAudioTime(0)
    setAudioDuration(0)
  }, [])

  useEffect(() => () => stopAudio(), [stopAudio])

  const togglePlay = (trackId: string) => {
    if (playingTrackId === trackId && audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause()
        setIsPlaying(false)
      } else {
        void audioRef.current.play().catch(() => undefined)
      }
      return
    }

    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.src = ""
    }

    const audio = new Audio(audioSrcFor(trackId))
    audio.preload = "auto"
    audioRef.current = audio
    seekingRef.current = false
    setPlayingTrackId(trackId)
    setAudioTime(0)
    setAudioDuration(0)

    const sync = () => {
      const next = readDuration(audio)
      if (next > 0) setAudioDuration(next)
    }

    audio.ontimeupdate = () => {
      if (!seekingRef.current) setAudioTime(audio.currentTime)
      sync()
    }
    audio.onloadedmetadata = sync
    audio.ondurationchange = sync
    audio.onloadeddata = sync
    audio.oncanplay = sync
    audio.onended = () => {
      setIsPlaying(false)
      setAudioTime(0)
    }
    audio.onplay = () => setIsPlaying(true)
    audio.onpause = () => setIsPlaying(false)

    void audio.play().catch(() => {
      stopAudio()
    })
  }

  const seekTo = (nextTime: number) => {
    const audio = audioRef.current
    if (!audio || !Number.isFinite(nextTime)) return
    const duration = readDuration(audio)
    const capped = duration > 0 ? Math.min(Math.max(0, nextTime), duration) : Math.max(0, nextTime)
    try {
      audio.currentTime = capped
      setAudioTime(capped)
    } catch {
      // ignore
    }
  }

  const ordered = useMemo(
    () => [...tracks].sort((a, b) => (a.trackOrder ?? 0) - (b.trackOrder ?? 0)),
    [tracks],
  )

  if (ordered.length === 0) return null

  return (
    <>
      <ol className="rounded-xl border border-border divide-y divide-border overflow-hidden">
        {ordered.map((track, i) => {
          const active = playingTrackId === track.id
          const title = track.trackName.trim() || "Без названия"
          const version = track.trackVersion?.trim()
          return (
            <li key={track.id} className="px-3 py-3 sm:px-4 space-y-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-6 shrink-0 text-muted-foreground tabular-nums text-sm">
                  {i + 1}
                </span>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="shrink-0 h-8 w-8"
                  onClick={() => togglePlay(track.id)}
                  aria-label={active && isPlaying ? "Пауза" : "Слушать"}
                >
                  {active && isPlaying ? (
                    <Pause className="h-4 w-4" />
                  ) : (
                    <Play className="h-4 w-4" />
                  )}
                </Button>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">
                    {title}
                    {version ? (
                      <span className="text-muted-foreground font-normal"> · {version}</span>
                    ) : null}
                  </p>
                </div>
                {isAlbum ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="shrink-0 gap-1.5"
                    onClick={() => setInfoTrack(track)}
                  >
                    <Info className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">О треке</span>
                  </Button>
                ) : null}
              </div>
              {active ? (
                <div className="flex items-center gap-2 pl-8 sm:pl-14">
                  <span className="text-[11px] tabular-nums text-muted-foreground w-9 shrink-0">
                    {formatAudioClock(audioTime)}
                  </span>
                  <Slider
                    className="flex-1"
                    min={0}
                    max={Math.max(audioDuration, audioTime, 0.1)}
                    step={0.1}
                    value={[Math.min(audioTime, Math.max(audioDuration, audioTime, 0.1))]}
                    onValueChange={(v) => {
                      seekingRef.current = true
                      setAudioTime(v[0] ?? 0)
                    }}
                    onValueCommit={(v) => {
                      seekingRef.current = false
                      seekTo(v[0] ?? 0)
                    }}
                  />
                  <span className="text-[11px] tabular-nums text-muted-foreground w-9 shrink-0 text-right">
                    {formatAudioClock(audioDuration)}
                  </span>
                </div>
              ) : null}
            </li>
          )
        })}
      </ol>

      <Dialog open={Boolean(infoTrack)} onOpenChange={(open) => !open && setInfoTrack(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {infoTrack?.trackName.trim() || "Информация о треке"}
            </DialogTitle>
          </DialogHeader>
          {infoTrack ? <TrackMetaList track={infoTrack} /> : null}
        </DialogContent>
      </Dialog>
    </>
  )
}

export function ReleaseInfoButton({
  release,
  tracks,
}: {
  release: Release | null
  tracks: Track[]
}) {
  const [open, setOpen] = useState(false)
  const isAlbum =
    release?.kind === "album" || tracks.length > 1 || Boolean(tracks[0]?.albumId)

  return (
    <>
      <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={() => setOpen(true)}>
        <Info className="h-4 w-4" />
        Информация о релизе
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Информация о релизе</DialogTitle>
          </DialogHeader>
          <ReleaseMetaList release={release} tracks={tracks} />
          {!isAlbum && tracks[0] ? (
            <div className="mt-4 pt-3 border-t border-border">
              <p className="text-sm font-medium mb-2">Данные трека</p>
              <TrackMetaList track={tracks[0]} />
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  )
}

export function ModerationNoteAside({
  note,
  maxHeight,
}: {
  note: string
  /** Не выше блока обложки; длинный текст — скролл и «Показать полностью» в модалке. */
  maxHeight?: number | null
}) {
  const [open, setOpen] = useState(false)
  const bodyRef = useRef<HTMLParagraphElement>(null)
  const [overflows, setOverflows] = useState(false)

  const LINE_EXTRA_PX = 46 // ≈ 2 строки text-sm leading-relaxed
  const cap = maxHeight && maxHeight > 0 ? maxHeight + LINE_EXTRA_PX : undefined

  useEffect(() => {
    const el = bodyRef.current
    if (!el) return
    const check = () => {
      setOverflows(el.scrollHeight > el.clientHeight + 2)
    }
    check()
    const ro = new ResizeObserver(check)
    ro.observe(el)
    return () => ro.disconnect()
  }, [note, cap])

  const showToggle = Boolean(cap) && overflows

  return (
    <>
      <aside
        className={cn(
          "flex w-full sm:max-w-sm shrink-0 flex-col rounded-lg border px-4 py-3",
          "border-[#C08240]/55 bg-[#D48C48]/15",
          "shadow-[0_0_24px_-8px_rgba(212,140,72,0.45)]",
        )}
        style={cap ? { maxHeight: cap } : undefined}
      >
        <p className="shrink-0 text-xs font-semibold uppercase tracking-wide text-[#E8B86D]">
          Комментарий модерации
        </p>
        <p
          ref={bodyRef}
          className={cn(
            "mt-1.5 min-h-0 flex-1 text-sm leading-relaxed whitespace-pre-wrap text-[#F8E6C8]",
            cap && "cabinet-sidebar-scroll overflow-y-auto",
          )}
        >
          {note}
        </p>
        {showToggle ? (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="mt-2 shrink-0 self-start text-xs font-medium text-[#E8B86D] underline-offset-2 hover:underline"
          >
            Показать полностью
          </button>
        ) : null}
      </aside>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Комментарий модерации</DialogTitle>
          </DialogHeader>
          <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground">{note}</p>
        </DialogContent>
      </Dialog>
    </>
  )
}
