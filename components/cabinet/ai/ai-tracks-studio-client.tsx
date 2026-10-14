"use client"

import { useCallback, useEffect, useId, useRef, useState } from "react"
import {
  ChevronDown,
  Download,
  Heart,
  Loader2,
  Pause,
  Play,
  RotateCcw,
} from "lucide-react"
import { toast } from "sonner"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import {
  AI_TRACKS_COST_ATTEMPTS,
  AI_TRACKS_DIRECTIONS,
  AI_TRACKS_LIMITS,
  AI_TRACKS_MOODS,
  AI_TRACKS_VOCALS,
  type AiTracksPublicConfig,
} from "@/lib/ai-tracks-config"
import {
  AI_TRACKS_EXAMPLE_LYRICS,
  AI_TRACKS_STATUS_MESSAGES,
  DEFAULT_AI_TRACKS_DRAFT,
  type AiTracksDraft,
  type AiTracksJobDto,
  type AiTracksJobStatus,
  type AiTracksResultDto,
  type AiTracksSettingsSnapshot,
} from "@/lib/ai-tracks-types"
import { cn } from "@/lib/utils"

type StudioStatus = AiTracksPublicConfig & {
  attempts: number
  activeJobs: AiTracksJobDto[]
}

type HistoryFilter = "all" | "favorites"

const DRAFT_STORAGE_KEY = "parallax-ai-tracks-draft-v1"

function formatTime(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return "0:00"
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  return `${m}:${s.toString().padStart(2, "0")}`
}

function statusLiveMessage(status: AiTracksJobStatus | null): string | null {
  if (!status) return null
  if (status === "QUEUED" || status === "RUNNING") return AI_TRACKS_STATUS_MESSAGES.generating
  if (status === "RECONCILING") return AI_TRACKS_STATUS_MESSAGES.reconciling
  if (status === "TRANSFERRING") return AI_TRACKS_STATUS_MESSAGES.transferring
  if (status === "FAILED") return AI_TRACKS_STATUS_MESSAGES.failed_refunded
  return null
}

function Chip({
  active,
  children,
  onClick,
  disabled,
}: {
  active?: boolean
  children: React.ReactNode
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "min-h-11 rounded-full border px-3.5 py-2 text-sm transition-colors",
        active
          ? "border-primary bg-primary/15 text-foreground"
          : "border-border bg-transparent text-muted-foreground hover:border-primary/40 hover:text-foreground",
        disabled && "opacity-50"
      )}
    >
      {children}
    </button>
  )
}

function ResultPlayer({
  result,
  playingId,
  onPlayToggle,
}: {
  result: AiTracksResultDto
  playingId: string | null
  onPlayToggle: (id: string, audio: HTMLAudioElement | null) => void
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [current, setCurrent] = useState(0)
  const [duration, setDuration] = useState(result.durationSec ?? 0)
  const isPlaying = playingId === result.id

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    if (isPlaying) {
      void audio.play().catch(() => onPlayToggle(result.id, null))
    } else {
      audio.pause()
    }
  }, [isPlaying, onPlayToggle, result.id])

  if (!result.audioUrl) {
    return (
      <p className="text-sm text-muted-foreground">Аудиофайл пока недоступен.</p>
    )
  }

  return (
    <div className="space-y-2">
      <audio
        ref={audioRef}
        src={result.audioUrl}
        preload="metadata"
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration || 0)}
        onTimeUpdate={(e) => setCurrent(e.currentTarget.currentTime)}
        onEnded={() => onPlayToggle(result.id, null)}
      />
      <div className="flex items-center gap-3">
        <button
          type="button"
          aria-label={isPlaying ? "Пауза" : "Воспроизвести"}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground"
          onClick={() => onPlayToggle(result.id, audioRef.current)}
        >
          {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 translate-x-0.5" />}
        </button>
        <div className="min-w-0 flex-1 space-y-1">
          <input
            type="range"
            min={0}
            max={duration || 0}
            step={0.1}
            value={Math.min(current, duration || 0)}
            aria-label="Прогресс воспроизведения"
            className="h-2 w-full cursor-pointer accent-[var(--primary)]"
            onChange={(e) => {
              const v = Number(e.target.value)
              setCurrent(v)
              if (audioRef.current) audioRef.current.currentTime = v
            }}
          />
          <div className="flex justify-between text-xs tabular-nums text-muted-foreground">
            <span>{formatTime(current)}</span>
            <span>{formatTime(duration || result.durationSec || 0)}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

function ResultCard({
  result,
  settings,
  playingId,
  onPlayToggle,
  onFavorite,
  onReuse,
  busyFavorite,
}: {
  result: AiTracksResultDto
  settings: AiTracksSettingsSnapshot
  playingId: string | null
  onPlayToggle: (id: string, audio: HTMLAudioElement | null) => void
  onFavorite: (id: string, next: boolean) => void
  onReuse: (settings: AiTracksSettingsSnapshot) => void
  busyFavorite: boolean
}) {
  return (
    <article className="rounded-[20px] border border-border bg-card p-5 sm:p-6">
      <div className="mb-4 flex gap-3">
        <div
          className="h-16 w-16 shrink-0 rounded-2xl bg-gradient-to-br from-primary/25 via-muted to-background"
          aria-hidden
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="truncate font-medium text-foreground">{result.title}</h3>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Вариант {result.variantLabel}
                {result.directionLabel ? ` · ${result.directionLabel}` : ""}
                {` · ${result.modelLabel}`}
              </p>
            </div>
            <button
              type="button"
              aria-label={result.isFavorite ? "Убрать из избранного" : "В избранное"}
              aria-pressed={result.isFavorite}
              disabled={busyFavorite}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-border"
              onClick={() => onFavorite(result.id, !result.isFavorite)}
            >
              <Heart
                className={cn(
                  "h-4 w-4",
                  result.isFavorite ? "fill-primary text-primary" : "text-muted-foreground"
                )}
              />
            </button>
          </div>
        </div>
      </div>

      <ResultPlayer result={result} playingId={playingId} onPlayToggle={onPlayToggle} />

      <div className="mt-4 flex flex-wrap gap-2">
        {result.audioUrl ? (
          <Button variant="outline" size="sm" className="min-h-11" asChild>
            <a href={result.audioUrl} download>
              <Download className="mr-1.5 h-4 w-4" />
              Скачать
            </a>
          </Button>
        ) : null}
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="min-h-11"
          onClick={() => onReuse(settings)}
        >
          <RotateCcw className="mr-1.5 h-4 w-4" />
          Повторить настройки
        </Button>
      </div>
    </article>
  )
}

export function AiTracksStudioClient() {
  const formRef = useRef<HTMLDivElement | null>(null)
  const ideaId = useId()
  const lyricsId = useId()
  const styleId = useId()
  const titleId = useId()

  const [draft, setDraft] = useState<AiTracksDraft>(DEFAULT_AI_TRACKS_DRAFT)
  const [draftReady, setDraftReady] = useState(false)
  const [status, setStatus] = useState<StudioStatus | null>(null)
  const [jobs, setJobs] = useState<AiTracksJobDto[]>([])
  const [filter, setFilter] = useState<HistoryFilter>("all")
  const [totalResults, setTotalResults] = useState(0)
  const [favoriteCount, setFavoriteCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [fieldError, setFieldError] = useState<string | null>(null)
  const [playingId, setPlayingId] = useState<string | null>(null)
  const [soundOpen, setSoundOpen] = useState(false)
  const [favoriteBusy, setFavoriteBusy] = useState<string | null>(null)

  const activeJob =
    status?.activeJobs?.[0] ??
    jobs.find((j) =>
      ["QUEUED", "RUNNING", "RECONCILING", "TRANSFERRING"].includes(j.status)
    ) ??
    null

  const patchDraft = useCallback((patch: Partial<AiTracksDraft>) => {
    setDraft((prev) => ({ ...prev, ...patch }))
  }, [])

  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<AiTracksDraft>
        setDraft({ ...DEFAULT_AI_TRACKS_DRAFT, ...parsed })
      }
    } catch {
      /* ignore */
    }
    setDraftReady(true)
  }, [])

  useEffect(() => {
    if (!draftReady) return
    try {
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft))
    } catch {
      /* ignore */
    }
  }, [draft, draftReady])

  const loadStatus = useCallback(async () => {
    const res = await fetch("/api/cabinet/ai-tracks/status", { cache: "no-store" })
    if (!res.ok) throw new Error("status")
    const data = (await res.json()) as StudioStatus
    setStatus(data)
    return data
  }, [])

  const loadHistory = useCallback(async (nextFilter: HistoryFilter) => {
    const q = nextFilter === "favorites" ? "?filter=favorites" : ""
    const res = await fetch(`/api/cabinet/ai-tracks/jobs${q}`, { cache: "no-store" })
    if (!res.ok) throw new Error("history")
    const data = (await res.json()) as {
      jobs: AiTracksJobDto[]
      totalResults: number
      favoriteCount: number
    }
    setJobs(data.jobs)
    setTotalResults(data.totalResults)
    setFavoriteCount(data.favoriteCount)
    return data
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        setLoading(true)
        await Promise.all([loadStatus(), loadHistory(filter)])
      } catch {
        if (!cancelled) toast.error("Не удалось загрузить студию")
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [filter, loadHistory, loadStatus])

  useEffect(() => {
    if (!activeJob) return
    const t = window.setInterval(() => {
      void loadStatus()
      void loadHistory(filter)
    }, 8000)
    return () => window.clearInterval(t)
  }, [activeJob, filter, loadHistory, loadStatus])

  const onPlayToggle = useCallback((id: string, audio: HTMLAudioElement | null) => {
    setPlayingId((prev) => {
      if (prev === id || !audio) return null
      return id
    })
  }, [])

  const reuseSettings = useCallback(
    (settings: AiTracksSettingsSnapshot) => {
      setDraft({ ...DEFAULT_AI_TRACKS_DRAFT, ...settings })
      setFieldError(null)
      toast.message("Настройки восстановлены. Запуск не начат.")
      if (typeof window !== "undefined" && window.matchMedia("(max-width: 1023px)").matches) {
        formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
      }
    },
    []
  )

  const onFavorite = useCallback(
    async (id: string, next: boolean) => {
      setFavoriteBusy(id)
      try {
        const res = await fetch(`/api/cabinet/ai-tracks/results/${encodeURIComponent(id)}/favorite`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ favorite: next }),
        })
        if (!res.ok) throw new Error("fav")
        await loadHistory(filter)
      } catch {
        toast.error("Не удалось обновить избранное")
      } finally {
        setFavoriteBusy(null)
      }
    },
    [filter, loadHistory]
  )

  const insertExampleLyrics = () => {
    if (draft.lyrics.trim()) {
      toast.message("Поле текста уже заполнено. Очистите его, чтобы вставить пример.")
      return
    }
    patchDraft({ lyrics: AI_TRACKS_EXAMPLE_LYRICS })
  }

  const submit = async () => {
    setFieldError(null)
    if (!status?.generationEnabled) {
      toast.error(AI_TRACKS_STATUS_MESSAGES.service_unavailable)
      return
    }
    if ((status?.attempts ?? 0) < (status?.costAttempts ?? AI_TRACKS_COST_ATTEMPTS)) {
      toast.error(AI_TRACKS_STATUS_MESSAGES.no_attempts)
      return
    }

    setSubmitting(true)
    const idempotencyKey =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `job-${Date.now()}`

    try {
      const res = await fetch("/api/cabinet/ai-tracks/jobs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": idempotencyKey,
        },
        body: JSON.stringify({ draft, idempotencyKey }),
      })
      const data = (await res.json()) as {
        error?: string
        code?: string
        fieldErrors?: Array<{ field: string; message: string }>
        attempts?: number
        job?: AiTracksJobDto
      }

      if (!res.ok) {
        const msg = data.fieldErrors?.[0]?.message || data.error || "Не удалось запустить"
        setFieldError(msg)
        if (typeof data.attempts === "number") {
          setStatus((prev) => (prev ? { ...prev, attempts: data.attempts! } : prev))
        }
        toast.error(msg)
        return
      }

      if (typeof data.attempts === "number") {
        setStatus((prev) => (prev ? { ...prev, attempts: data.attempts! } : prev))
      }
      await Promise.all([loadStatus(), loadHistory(filter)])
      toast.success("Генерация запущена")
    } catch {
      toast.error("Сеть недоступна. Повторный запуск не требуется, если задача уже принята.")
    } finally {
      setSubmitting(false)
    }
  }

  const cost = status?.costAttempts ?? AI_TRACKS_COST_ATTEMPTS
  const attempts = status?.attempts ?? 0
  const generationEnabled = status?.generationEnabled === true
  const packsAvailable = status?.packsAvailable === true
  const submitDisabled = submitting || Boolean(activeJob) || !generationEnabled
  const ctaLabel = draft.instrumental
    ? `Создать музыку · ${cost} попытк${cost === 1 ? "а" : "и"}`
    : `Создать песню · ${cost} попытк${cost === 1 ? "а" : "и"}`

  const flatResults: Array<{ result: AiTracksResultDto; settings: AiTracksSettingsSnapshot }> = []
  for (const job of jobs) {
    for (const result of job.results) {
      flatResults.push({ result, settings: job.settings })
    }
  }

  const liveMsg = statusLiveMessage(activeJob?.status ?? null)

  return (
    <div className="mx-auto w-full max-w-[1200px] space-y-10 pb-16 pt-2">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
            Генерация музыки
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Ваша идея.
            <br />
            Ваша новая песня.
          </h1>
          <p className="text-base text-muted-foreground sm:text-[15px]">
            Опишите, что хотите услышать, или добавьте свой текст. Создавайте песни с вокалом и
            инструментальную музыку прямо в Parallax.
          </p>
        </div>
        <div className="flex flex-col items-start gap-2 lg:items-end">
          <p className="hidden text-right text-sm text-muted-foreground lg:block">
            <span className="block font-medium text-foreground">От мысли до звучания</span>
            Для песен, демо и новых музыкальных идей
          </p>
          <div className="rounded-full border border-border bg-card px-4 py-2 text-sm">
            Попытки:{" "}
            <span className="font-semibold tabular-nums text-foreground">
              {loading ? "…" : attempts}
            </span>
          </div>
        </div>
      </header>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,55%)_minmax(0,45%)] lg:gap-6">
        <section
          ref={formRef}
          className="rounded-[22px] border border-border bg-card p-6 sm:p-7"
        >
          <div className="mb-5 flex items-end justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                01 / Идея
              </p>
              <h2 className="mt-1 text-lg font-semibold text-foreground">Создайте свою песню</h2>
            </div>
          </div>

          <div
            className="mb-5 inline-flex rounded-full border border-border p-1"
            role="tablist"
            aria-label="Режим создания"
          >
            {(["simple", "advanced"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                role="tab"
                aria-selected={draft.mode === mode}
                className={cn(
                  "min-h-11 rounded-full px-4 text-sm",
                  draft.mode === mode
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
                onClick={() => patchDraft({ mode })}
              >
                {mode === "simple" ? "Простой" : "Расширенный"}
              </button>
            ))}
          </div>

          <div className="space-y-5">
            {draft.mode === "simple" ? (
              <div className="space-y-2">
                <Label htmlFor={ideaId}>О чём ваша песня?</Label>
                <Textarea
                  id={ideaId}
                  value={draft.idea}
                  maxLength={status?.limits.ideaMax ?? AI_TRACKS_LIMITS.ideaMax}
                  placeholder="Например: ночная поездка по городу, упругий бас и припев, который хочется повторять"
                  className="min-h-28 bg-[color:var(--background)] text-base md:text-base"
                  onChange={(e) => patchDraft({ idea: e.target.value })}
                />
                <div className="flex justify-between gap-2 text-xs text-muted-foreground">
                  <span>Добавьте тему, настроение и характер звучания.</span>
                  <span className="tabular-nums">
                    {draft.idea.length}/{status?.limits.ideaMax ?? AI_TRACKS_LIMITS.ideaMax}
                  </span>
                </div>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor={titleId}>Название песни</Label>
                  <Input
                    id={titleId}
                    value={draft.title}
                    maxLength={status?.limits.titleMax ?? AI_TRACKS_LIMITS.titleMax}
                    placeholder="Необязательно"
                    className="h-11 bg-[color:var(--background)] text-base"
                    onChange={(e) => patchDraft({ title: e.target.value })}
                  />
                </div>

                {!draft.instrumental ? (
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <Label htmlFor={lyricsId}>Ваш текст песни</Label>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="min-h-11"
                        onClick={insertExampleLyrics}
                      >
                        Вставить пример
                      </Button>
                    </div>
                    <Textarea
                      id={lyricsId}
                      value={draft.lyrics}
                      maxLength={status?.limits.lyricsMax ?? AI_TRACKS_LIMITS.lyricsMax}
                      placeholder="Текст песни"
                      className="min-h-40 whitespace-pre-wrap bg-[color:var(--background)] text-base md:text-base"
                      onChange={(e) => patchDraft({ lyrics: e.target.value })}
                    />
                    <div className="flex justify-between gap-2 text-xs text-muted-foreground">
                      <span>Разделите текст на куплеты и припевы.</span>
                      <span className="tabular-nums">
                        {draft.lyrics.length}/{status?.limits.lyricsMax ?? AI_TRACKS_LIMITS.lyricsMax}
                      </span>
                    </div>
                  </div>
                ) : null}

                <div className="space-y-2">
                  <Label htmlFor={styleId}>Как должна звучать музыка?</Label>
                  <Textarea
                    id={styleId}
                    value={draft.style}
                    maxLength={status?.limits.styleMax ?? AI_TRACKS_LIMITS.styleMax}
                    placeholder="Жанр, инструменты, темп, характер вокала"
                    className="min-h-24 bg-[color:var(--background)] text-base md:text-base"
                    onChange={(e) => patchDraft({ style: e.target.value })}
                  />
                  <div className="flex justify-end text-xs tabular-nums text-muted-foreground">
                    {draft.style.length}/{status?.limits.styleMax ?? AI_TRACKS_LIMITS.styleMax}
                  </div>
                </div>
              </>
            )}

            {draft.mode === "simple" ? (
              <div className="space-y-2">
                <p className="text-sm font-medium">Быстрые направления</p>
                <div className="flex flex-wrap gap-2">
                  {AI_TRACKS_DIRECTIONS.map((d) => (
                    <Chip
                      key={d.id}
                      active={draft.direction === d.id}
                      onClick={() =>
                        patchDraft({
                          direction: draft.direction === d.id ? null : d.id,
                        })
                      }
                    >
                      {d.label}
                    </Chip>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="space-y-2">
              <p className="text-sm font-medium">Настроение</p>
              <div className="flex flex-wrap gap-2">
                {AI_TRACKS_MOODS.map((m) => (
                  <Chip
                    key={m.id}
                    active={draft.mood === m.id}
                    onClick={() =>
                      patchDraft({ mood: draft.mood === m.id ? null : m.id })
                    }
                  >
                    {m.label}
                  </Chip>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-[color:var(--background)] px-4 py-3">
              <div>
                <p className="text-sm font-medium">Инструментальная музыка</p>
                <p className="text-xs text-muted-foreground">Создать музыку без вокала</p>
              </div>
              <Switch
                checked={draft.instrumental}
                onCheckedChange={(v) => patchDraft({ instrumental: v })}
                aria-label="Инструментальная музыка"
              />
            </div>

            {!draft.instrumental ? (
              <div className="space-y-2">
                <p className="text-sm font-medium">Вокал</p>
                <p className="text-xs text-muted-foreground">
                  Пожелание, не гарантия точного исполнения.
                </p>
                <div className="flex flex-wrap gap-2">
                  {AI_TRACKS_VOCALS.map((v) => (
                    <Chip
                      key={v.id}
                      active={draft.vocal === v.id}
                      onClick={() => patchDraft({ vocal: v.id })}
                    >
                      {v.label}
                    </Chip>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="rounded-2xl border border-border">
              <button
                type="button"
                className="flex min-h-11 w-full items-center justify-between px-4 py-3 text-left text-sm font-medium"
                onClick={() => setSoundOpen((v) => !v)}
                aria-expanded={soundOpen}
              >
                Настройки звучания
                <ChevronDown
                  className={cn("h-4 w-4 transition-transform", soundOpen && "rotate-180")}
                />
              </button>
              {soundOpen ? (
                <div className="space-y-4 border-t border-border px-4 py-4">
                  {status?.capabilities.weirdness ? (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Экспериментальность</span>
                        <span className="tabular-nums text-muted-foreground">
                          {draft.weirdnessPct}%
                        </span>
                      </div>
                      <Slider
                        value={[draft.weirdnessPct]}
                        min={0}
                        max={100}
                        step={1}
                        onValueChange={(v) => patchDraft({ weirdnessPct: v[0] ?? 50 })}
                      />
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Экспериментальность недоступна для текущей модели.
                    </p>
                  )}
                  {status?.capabilities.styleWeight ? (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Следовать описанию стиля</span>
                        <span className="tabular-nums text-muted-foreground">
                          {draft.styleWeightPct}%
                        </span>
                      </div>
                      <Slider
                        value={[draft.styleWeightPct]}
                        min={0}
                        max={100}
                        step={1}
                        onValueChange={(v) => patchDraft({ styleWeightPct: v[0] ?? 65 })}
                      />
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Параметр «следовать стилю» недоступен для текущей модели.
                    </p>
                  )}
                </div>
              ) : null}
            </div>

            {fieldError ? (
              <p className="text-sm text-destructive" role="alert">
                {fieldError}
              </p>
            ) : null}

            {!generationEnabled ? (
              <p className="text-sm text-muted-foreground" role="status">
                {status?.unavailableReason ?? AI_TRACKS_STATUS_MESSAGES.service_unavailable}
              </p>
            ) : null}

            {generationEnabled && attempts < cost ? (
              <div className="space-y-2 text-sm">
                <p role="status">{AI_TRACKS_STATUS_MESSAGES.no_attempts}</p>
                {packsAvailable ? (
                  <Button type="button" variant="outline" className="min-h-11" disabled>
                    Пополнить попытки
                  </Button>
                ) : (
                  <p className="text-muted-foreground">
                    Пополнение пока недоступно: тарифы не настроены.
                  </p>
                )}
              </div>
            ) : null}

            <p className="text-xs text-muted-foreground">
              Неудачный по вкусу результат не возвращает попытку. Технический сбой - возвращает.
            </p>

            <Button
              type="button"
              className="min-h-12 w-full text-base"
              disabled={submitDisabled || (generationEnabled && attempts < cost)}
              onClick={() => void submit()}
            >
              {submitting || activeJob ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Создаём…
                </>
              ) : (
                ctaLabel
              )}
            </Button>
          </div>
        </section>

        <section className="rounded-[22px] border border-border bg-card p-6 sm:p-7">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                02 / Результат
              </p>
              <h2 className="mt-1 text-lg font-semibold text-foreground">Ваши треки</h2>
            </div>
            <div
              className="inline-flex rounded-full border border-border p-1"
              role="tablist"
              aria-label="Фильтр треков"
            >
              <button
                type="button"
                role="tab"
                aria-selected={filter === "all"}
                className={cn(
                  "min-h-11 rounded-full px-3 text-sm",
                  filter === "all" ? "bg-primary/15 text-foreground" : "text-muted-foreground"
                )}
                onClick={() => setFilter("all")}
              >
                Все треки ({totalResults})
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={filter === "favorites"}
                className={cn(
                  "min-h-11 rounded-full px-3 text-sm",
                  filter === "favorites"
                    ? "bg-primary/15 text-foreground"
                    : "text-muted-foreground"
                )}
                onClick={() => setFilter("favorites")}
              >
                Избранное ({favoriteCount})
              </button>
            </div>
          </div>

          <div aria-live="polite" className="sr-only">
            {liveMsg ?? ""}
          </div>

          {liveMsg ? (
            <div className="mb-4 flex items-center gap-2 rounded-2xl border border-border bg-[color:var(--background)] px-4 py-3 text-sm">
              <Loader2 className="h-4 w-4 animate-spin text-primary motion-reduce:animate-none" />
              {liveMsg}
            </div>
          ) : null}

          {loading ? (
            <p className="text-sm text-muted-foreground">Загрузка…</p>
          ) : flatResults.length === 0 ? (
            <p className="text-sm leading-relaxed text-muted-foreground">
              {filter === "favorites"
                ? AI_TRACKS_STATUS_MESSAGES.empty_favorites
                : AI_TRACKS_STATUS_MESSAGES.empty_results}
            </p>
          ) : (
            <div className="space-y-4">
              {flatResults.map(({ result, settings }) => (
                <ResultCard
                  key={result.id}
                  result={result}
                  settings={settings}
                  playingId={playingId}
                  onPlayToggle={onPlayToggle}
                  onFavorite={onFavorite}
                  onReuse={reuseSettings}
                  busyFavorite={favoriteBusy === result.id}
                />
              ))}
            </div>
          )}
        </section>
      </div>

      <section className="space-y-6">
        <h2 className="text-2xl font-semibold tracking-tight">Дайте идее зазвучать.</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {[
            {
              n: "01",
              t: "Задайте направление",
              d: "Опишите идею или вставьте свой текст. Добавьте жанр, настроение и характер вокала.",
            },
            {
              n: "02",
              t: "Создайте варианты",
              d: "Запустите генерацию. Сравните результаты и сохраните те, в которых слышите свою идею.",
            },
            {
              n: "03",
              t: "Развивайте песню",
              d: "Используйте результат как демо, основу для дальнейшей работы или новую творческую идею.",
            },
          ].map((step) => (
            <div
              key={step.n}
              className="rounded-[20px] border border-border bg-card p-5 sm:p-6"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">
                {step.n}
              </p>
              <h3 className="mt-2 font-semibold">{step.t}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{step.d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-[22px] border border-border bg-card p-6 sm:p-7">
        <h2 className="mb-2 text-xl font-semibold">Перед первым запуском</h2>
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="modes">
            <AccordionTrigger>Чем отличаются два режима?</AccordionTrigger>
            <AccordionContent>
              В простом режиме вы описываете идею песни. В расширенном добавляете собственный текст
              и подробнее задаёте звучание.
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="instrumental">
            <AccordionTrigger>Можно создать музыку без вокала?</AccordionTrigger>
            <AccordionContent>
              Да. Включите «Инструментальная музыка» и опишите желаемое звучание. Текст песни не
              нужен.
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="match">
            <AccordionTrigger>Результат точно совпадёт с описанием?</AccordionTrigger>
            <AccordionContent>
              Описание направляет генерацию, но не гарантирует точное исполнение всех пожеланий.
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="release">
            <AccordionTrigger>Можно выпустить полученную песню?</AccordionTrigger>
            <AccordionContent>
              {status?.commercialRightsNote ??
                "Возможность коммерческого использования зависит от условий выбранной модели и прав на исходные материалы."}
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </section>
    </div>
  )
}
