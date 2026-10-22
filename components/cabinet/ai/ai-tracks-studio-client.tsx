"use client"

import { useCallback, useEffect, useId, useRef, useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  ArrowLeft,
  ChevronDown,
  CircleHelp,
  Disc3,
  Download,
  Heart,
  Loader2,
  Pause,
  Play,
  RotateCcw,
  Trash2,
} from "lucide-react"
import { toast } from "sonner"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import {
  AI_TRACKS_DIRECTIONS,
  AI_TRACKS_LIMITS,
  AI_TRACKS_MODELS,
  AI_TRACKS_MOODS,
  AI_TRACKS_PRICE_RUB,
  AI_TRACKS_VOCALS,
  isAiTracksModelId,
  rewriteAiTracksChipHint,
  type AiTracksDirectionId,
  type AiTracksMoodId,
  type AiTracksPublicConfig,
  type AiTracksVocalId,
} from "@/lib/ai-tracks-config"
import {
  getCabinetServiceHubBackLabel,
  getCabinetServiceHubHref,
} from "@/lib/cabinet/service-back"
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
import { getReleaseUploadStartBlockReason } from "@/lib/cabinet-upload-start-guard"
import {
  isUploadSubscriptionPaywallReason,
  UPLOAD_ACTIVE_SUBSCRIPTION_REQUIRED,
} from "@/lib/cabinet-upload-subscription-client"
import { useCabinetSubscription } from "@/components/cabinet/subscription/cabinet-subscription-provider"
import { cn } from "@/lib/utils"

type StudioStatus = AiTracksPublicConfig & {
  walletBalance: number
  activeJobs: AiTracksJobDto[]
}

function formatRub(value: number): string {
  return `${Math.round(value).toLocaleString("ru-RU")} ₽`
}

type HistoryFilter = "all" | "favorites"

const DRAFT_STORAGE_KEY = "parallax-ai-tracks-draft-v2"

/** Чипы направления/настроения не персистим: по умолчанию сняты, пока пользователь сам не отметит. */
function draftForStorage(draft: AiTracksDraft): AiTracksDraft {
  return {
    ...draft,
    direction: null,
    mood: null,
  }
}

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
      aria-pressed={Boolean(active)}
      onClick={onClick}
      className={cn(
        "relative min-h-8 rounded-full border px-3 py-1 text-xs font-medium transition-all",
        active
          ? "!border-primary !bg-primary !text-primary-foreground shadow-[0_0_0_2px_color-mix(in_srgb,var(--primary)_40%,transparent),0_0_16px_color-mix(in_srgb,var(--primary)_30%,transparent)]"
          : "border-border/80 bg-muted/30 text-muted-foreground hover:border-primary/45 hover:bg-muted/50 hover:text-foreground",
        disabled && "opacity-50",
      )}
    >
      {active ? <span className="mr-1 font-bold">✓</span> : null}
      {children}
    </button>
  )
}

function finiteDuration(value: number | null | undefined, fallback = 0): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) return fallback
  return value
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
  const scrubbingRef = useRef(false)
  const [current, setCurrent] = useState(0)
  const [duration, setDuration] = useState(() => finiteDuration(result.durationSec))
  const isPlaying = playingId === result.id
  const seekMax = Math.max(duration, finiteDuration(result.durationSec), 0.1)

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    if (isPlaying) {
      void audio.play().catch(() => onPlayToggle(result.id, null))
    } else {
      audio.pause()
    }
  }, [isPlaying, onPlayToggle, result.id])

  const seekTo = (raw: number) => {
    const audio = audioRef.current
    if (!audio) return
    const next = Math.min(Math.max(0, raw), seekMax)
    setCurrent(next)
    try {
      audio.currentTime = next
    } catch {
      /* ignore until media is seekable */
    }
  }

  if (!result.audioUrl) {
    return (
      <p className="text-sm text-muted-foreground">Аудиофайл пока недоступен.</p>
    )
  }

  return (
    <div>
      <audio
        ref={audioRef}
        src={result.audioUrl}
        preload="auto"
        onLoadedMetadata={(e) => {
          const d = finiteDuration(e.currentTarget.duration, finiteDuration(result.durationSec))
          setDuration(d)
        }}
        onDurationChange={(e) => {
          const d = finiteDuration(e.currentTarget.duration, finiteDuration(result.durationSec))
          if (d > 0) setDuration(d)
        }}
        onTimeUpdate={(e) => {
          if (!scrubbingRef.current) setCurrent(e.currentTarget.currentTime)
        }}
        onEnded={() => onPlayToggle(result.id, null)}
      />
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          aria-label={isPlaying ? "Пауза" : "Воспроизвести"}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground"
          onClick={() => onPlayToggle(result.id, audioRef.current)}
        >
          {isPlaying ? (
            <Pause className="h-3 w-3" />
          ) : (
            <Play className="h-3 w-3 translate-x-px" />
          )}
        </button>
        <div className="min-w-0 flex-1">
          <input
            type="range"
            min={0}
            max={seekMax}
            step={0.05}
            value={Math.min(current, seekMax)}
            aria-label="Перемотка"
            className="h-1.5 w-full cursor-pointer accent-[var(--primary)]"
            onPointerDown={() => {
              scrubbingRef.current = true
            }}
            onPointerUp={() => {
              scrubbingRef.current = false
            }}
            onPointerCancel={() => {
              scrubbingRef.current = false
            }}
            onInput={(e) => seekTo(Number(e.currentTarget.value))}
            onChange={(e) => seekTo(Number(e.currentTarget.value))}
          />
          <div className="flex justify-between text-[10px] tabular-nums leading-none text-muted-foreground">
            <span>{formatTime(current)}</span>
            <span>{formatTime(seekMax > 0.1 ? seekMax : 0)}</span>
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
  onReuseRequest,
  onToRelease,
  busyFavorite,
  busyToRelease,
}: {
  result: AiTracksResultDto
  settings: AiTracksSettingsSnapshot
  playingId: string | null
  onPlayToggle: (id: string, audio: HTMLAudioElement | null) => void
  onFavorite: (id: string, next: boolean) => void
  onReuseRequest: (settings: AiTracksSettingsSnapshot) => void
  onToRelease: (result: AiTracksResultDto) => void
  busyFavorite: boolean
  busyToRelease: boolean
}) {
  return (
    <article className="rounded-lg border border-border bg-[color:var(--background)] px-2.5 py-2">
      <div className="flex items-center gap-2">
        <div
          className="h-8 w-8 shrink-0 rounded-md bg-gradient-to-br from-primary/25 via-muted to-background"
          aria-hidden
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h3 className="min-w-0 truncate text-sm font-medium text-foreground">{result.title}</h3>
            <button
              type="button"
              aria-label={result.isFavorite ? "Убрать из избранного" : "В избранное"}
              aria-pressed={result.isFavorite}
              disabled={busyFavorite}
              className="ml-auto flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted"
              onClick={() => onFavorite(result.id, !result.isFavorite)}
            >
              <Heart
                className={cn(
                  "h-3.5 w-3.5",
                  result.isFavorite ? "fill-primary text-primary" : ""
                )}
              />
            </button>
          </div>
          <p className="truncate text-[11px] text-muted-foreground">
            {result.variantLabel}
            {result.directionLabel ? ` · ${result.directionLabel}` : ""}
            {` · ${result.modelLabel}`}
          </p>
        </div>
      </div>

      <div className="mt-1.5">
        <ResultPlayer result={result} playingId={playingId} onPlayToggle={onPlayToggle} />
      </div>

      <div className="mt-1.5 flex gap-1">
        <Button
          type="button"
          size="sm"
          className="h-7 flex-1 px-2 text-xs"
          disabled={!result.audioUrl || busyToRelease}
          onClick={() => onToRelease(result)}
        >
          {busyToRelease ? (
            <Loader2 className="mr-1 h-3 w-3 animate-spin" />
          ) : (
            <Disc3 className="mr-1 h-3 w-3" />
          )}
          В дистрибуцию
        </Button>
        {result.audioUrl ? (
          <Button variant="outline" size="sm" className="h-7 px-2 text-xs" asChild>
            <a href={`${result.audioUrl}?download=1`} download={`${result.title || "track"}.wav`}>
              <Download className="mr-1 h-3 w-3" />
              Скачать WAV
            </a>
          </Button>
        ) : null}
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 px-2 text-xs"
          title="Повторить настройки"
          onClick={() => onReuseRequest(settings)}
        >
          <RotateCcw className="mr-1 h-3 w-3" />
          Ещё раз
        </Button>
      </div>
    </article>
  )
}

export function AiTracksStudioClient() {
  const router = useRouter()
  const pathname = usePathname()
  const { handleUploadBlock } = useCabinetSubscription()
  const backHref = getCabinetServiceHubHref(pathname)
  const backLabel = getCabinetServiceHubBackLabel(backHref, "Назад к услугам")
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
  const [lyricsOpen, setLyricsOpen] = useState(true)
  const [styleOpen, setStyleOpen] = useState(true)
  const [favoriteBusy, setFavoriteBusy] = useState<string | null>(null)
  const [toReleaseTarget, setToReleaseTarget] = useState<AiTracksResultDto | null>(null)
  const [toReleaseTitle, setToReleaseTitle] = useState("")
  const [toReleaseBusy, setToReleaseBusy] = useState(false)
  const [reusePending, setReusePending] = useState<AiTracksSettingsSnapshot | null>(null)

  const activeJob =
    status?.activeJobs?.[0] ??
    jobs.find((j) =>
      ["QUEUED", "RUNNING", "RECONCILING", "TRANSFERRING"].includes(j.status)
    ) ??
    null

  const patchDraft = useCallback((patch: Partial<AiTracksDraft>) => {
    setDraft((prev) => ({ ...prev, ...patch }))
  }, [])

  /** Чип пишет подсказку в видимое поле: стиль (расширенный) или идея (простой). */
  const applyChipToPromptField = useCallback(
    (
      group: "mood" | "direction" | "vocal",
      nextId: AiTracksMoodId | AiTracksDirectionId | AiTracksVocalId | null,
    ) => {
      let openStyle = false
      setDraft((prev) => {
        const catalog =
          group === "mood"
            ? AI_TRACKS_MOODS
            : group === "direction"
              ? AI_TRACKS_DIRECTIONS
              : AI_TRACKS_VOCALS
        const nextHint =
          nextId == null
            ? null
            : catalog.find((item) => item.id === nextId)?.promptHint ?? null
        const fieldKey = prev.mode === "advanced" ? "style" : "idea"
        openStyle = fieldKey === "style"
        const maxLen =
          fieldKey === "style"
            ? (status?.limits.styleMax ?? AI_TRACKS_LIMITS.styleMax)
            : (status?.limits.ideaMax ?? AI_TRACKS_LIMITS.ideaMax)
        const rewritten = rewriteAiTracksChipHint(prev[fieldKey], catalog, nextHint, maxLen)
        if (group === "mood") {
          return { ...prev, mood: nextId as AiTracksMoodId | null, [fieldKey]: rewritten }
        }
        if (group === "direction") {
          return {
            ...prev,
            direction: nextId as AiTracksDirectionId | null,
            [fieldKey]: rewritten,
          }
        }
        return {
          ...prev,
          vocal: (nextId as AiTracksVocalId | null) ?? "auto",
          [fieldKey]: rewritten,
        }
      })
      if (openStyle) setStyleOpen(true)
    },
    [status?.limits.ideaMax, status?.limits.styleMax],
  )

  useEffect(() => {
    try {
      const raw =
        localStorage.getItem(DRAFT_STORAGE_KEY) ??
        localStorage.getItem("parallax-ai-tracks-draft-v1")
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<AiTracksDraft>
        setDraft(
          draftForStorage({
            ...DEFAULT_AI_TRACKS_DRAFT,
            ...parsed,
            direction: null,
            mood: null,
          })
        )
      }
      try {
        localStorage.removeItem("parallax-ai-tracks-draft-v1")
      } catch {
        /* ignore */
      }
    } catch {
      /* ignore */
    }
    setDraftReady(true)
  }, [])

  useEffect(() => {
    if (!draftReady) return
    try {
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draftForStorage(draft)))
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

  const reuseSettings = useCallback((settings: AiTracksSettingsSnapshot) => {
    setDraft({ ...DEFAULT_AI_TRACKS_DRAFT, ...settings })
    setFieldError(null)
    setReusePending(null)
    toast.message("Настройки восстановлены. Запуск не начат.")
    if (typeof window !== "undefined" && window.matchMedia("(max-width: 1023px)").matches) {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
    }
  }, [])

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

  const openToRelease = useCallback(
    async (result: AiTracksResultDto) => {
      const block = await getReleaseUploadStartBlockReason()
      if (block) {
        handleUploadBlock(block)
        return
      }
      setToReleaseTarget(result)
      setToReleaseTitle(result.title || "")
    },
    [handleUploadBlock]
  )

  const confirmToRelease = async () => {
    if (!toReleaseTarget) return
    setToReleaseBusy(true)
    try {
      const gate = await getReleaseUploadStartBlockReason()
      if (gate) {
        handleUploadBlock(gate)
        setToReleaseTarget(null)
        return
      }
      const res = await fetch(
        `/api/cabinet/ai-tracks/results/${encodeURIComponent(toReleaseTarget.id)}/to-release`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: toReleaseTitle.trim() || toReleaseTarget.title }),
        }
      )
      const data = (await res.json().catch(() => ({}))) as {
        error?: string
        errorCode?: string
        uploadPath?: string
        alreadyExisted?: boolean
        audioAttached?: boolean
        warning?: string | null
      }
      if (!res.ok) {
        if (data.errorCode === "profile_incomplete") {
          toast.error(data.error || "Заполните профиль, чтобы создать релиз")
          setToReleaseTarget(null)
          router.push("/cabinet/settings?tab=profile")
          return
        }
        const err = data.error?.trim() || UPLOAD_ACTIVE_SUBSCRIPTION_REQUIRED
        if (res.status === 403 && isUploadSubscriptionPaywallReason(err)) {
          handleUploadBlock(err)
          setToReleaseTarget(null)
          return
        }
        toast.error(data.error || "Не удалось создать релиз")
        return
      }
      if (data.alreadyExisted) {
        toast.message("Черновик уже есть - открываем его")
      } else if (data.warning) {
        toast.warning(data.warning)
      } else {
        toast.success(
          data.audioAttached
            ? "Черновик релиза создан с аудио и текстом"
            : "Черновик релиза создан"
        )
      }
      setToReleaseTarget(null)
      if (data.uploadPath) {
        router.push(data.uploadPath)
      }
    } catch {
      toast.error("Не удалось создать релиз")
    } finally {
      setToReleaseBusy(false)
    }
  }

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
    const priceRub = status?.priceRub ?? AI_TRACKS_PRICE_RUB
    if ((status?.walletBalance ?? 0) < priceRub) {
      toast.error(AI_TRACKS_STATUS_MESSAGES.insufficient_balance)
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
        walletBalance?: number
        job?: AiTracksJobDto
      }

      if (!res.ok) {
        const msg = data.fieldErrors?.[0]?.message || data.error || "Не удалось запустить"
        setFieldError(msg)
        if (typeof data.walletBalance === "number") {
          setStatus((prev) => (prev ? { ...prev, walletBalance: data.walletBalance! } : prev))
        }
        toast.error(msg)
        return
      }

      if (typeof data.walletBalance === "number") {
        setStatus((prev) => (prev ? { ...prev, walletBalance: data.walletBalance! } : prev))
      }
      await Promise.all([loadStatus(), loadHistory(filter)])
      toast.success("Генерация запущена")
    } catch {
      toast.error("Сеть недоступна. Повторный запуск не требуется, если задача уже принята.")
    } finally {
      setSubmitting(false)
    }
  }

  const priceRub = status?.priceRub ?? AI_TRACKS_PRICE_RUB
  const walletBalance = status?.walletBalance ?? 0
  const generationEnabled = status?.generationEnabled === true
  const canAfford = walletBalance >= priceRub
  const submitDisabled = submitting || Boolean(activeJob) || !generationEnabled
  const ctaLabel = draft.instrumental
    ? `Создать музыку · ${formatRub(priceRub)}`
    : `Создать песню · ${formatRub(priceRub)}`
  const modelOptions = status?.models?.length ? status.models : AI_TRACKS_MODELS
  const selectedModelHint = modelOptions.find((m) => m.id === draft.modelId)?.hint ?? null

  const flatResults: Array<{ result: AiTracksResultDto; settings: AiTracksSettingsSnapshot }> = []
  for (const job of jobs) {
    for (const result of job.results) {
      flatResults.push({ result, settings: job.settings })
    }
  }

  const liveMsg = statusLiveMessage(activeJob?.status ?? null)

  return (
    <div className="w-full max-w-none space-y-10 pb-16 pt-2">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="ghost" size="sm" className="-ml-2 gap-1.5 text-foreground" asChild>
          <Link href={backHref}>
            <ArrowLeft className="h-4 w-4" />
            {backLabel}
          </Link>
        </Button>
      </div>

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

          <div className="mb-5 flex flex-wrap items-center gap-3">
            <div
              className="inline-flex rounded-full border border-border p-0.5"
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
                    "min-h-7 rounded-full px-3 text-xs",
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

            <div className="min-w-[9.5rem] flex-1 sm:max-w-[12rem] sm:flex-none">
              <Label htmlFor="ai-tracks-model" className="sr-only">
                Модель
              </Label>
              <Select
                value={draft.modelId}
                onValueChange={(value) => {
                  if (isAiTracksModelId(value)) patchDraft({ modelId: value })
                }}
              >
                <SelectTrigger id="ai-tracks-model" size="sm" className="w-full">
                  <SelectValue placeholder="Модель" />
                </SelectTrigger>
                <SelectContent>
                  {modelOptions.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {selectedModelHint ? (
            <p className="-mt-3 mb-5 text-xs text-muted-foreground">{selectedModelHint}</p>
          ) : null}

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
                  <div className="rounded-2xl border border-border">
                    <div className="flex min-h-10 items-stretch gap-0.5 px-2 py-1">
                      <button
                        type="button"
                        className="flex min-w-0 flex-1 items-center justify-between gap-2 rounded-xl px-2 py-1.5 text-left hover:bg-muted/40"
                        onClick={() => setLyricsOpen((v) => !v)}
                        aria-expanded={lyricsOpen}
                      >
                        <span className="min-w-0">
                          <span className="block text-sm font-medium">Текст песни</span>
                          {!lyricsOpen ? (
                            <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                              {draft.lyrics.trim()
                                ? draft.lyrics.trim().replace(/\s+/g, " ").slice(0, 80)
                                : "Пусто - нажмите, чтобы добавить"}
                            </span>
                          ) : null}
                        </span>
                        <span className="flex shrink-0 items-center gap-1.5 text-xs tabular-nums text-muted-foreground">
                          {draft.lyrics.length}/{status?.limits.lyricsMax ?? AI_TRACKS_LIMITS.lyricsMax}
                          <ChevronDown
                            className={cn(
                              "h-4 w-4 transition-transform",
                              lyricsOpen && "rotate-180"
                            )}
                          />
                        </span>
                      </button>
                      <button
                        type="button"
                        aria-label="Очистить текст песни"
                        title="Очистить"
                        disabled={!draft.lyrics.trim()}
                        className={cn(
                          "inline-flex h-9 w-9 shrink-0 self-center items-center justify-center rounded-lg transition-colors",
                          draft.lyrics.trim()
                            ? "text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                            : "opacity-35",
                        )}
                        onClick={() => patchDraft({ lyrics: "" })}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    {lyricsOpen ? (
                      <div className="space-y-2 border-t border-border px-4 py-3">
                        <div className="flex flex-wrap items-center justify-end gap-2">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-8"
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
                        <p className="text-xs text-muted-foreground">
                          Разделите текст на куплеты и припевы.
                        </p>
                      </div>
                    ) : null}
                  </div>
                ) : null}

                <div className="rounded-2xl border border-border">
                  <div className="flex min-h-10 items-stretch gap-0.5 px-2 py-1">
                    <button
                      type="button"
                      className="flex min-w-0 flex-1 items-center justify-between gap-2 rounded-xl px-2 py-1.5 text-left hover:bg-muted/40"
                      onClick={() => setStyleOpen((v) => !v)}
                      aria-expanded={styleOpen}
                    >
                      <span className="min-w-0">
                        <span className="block text-sm font-medium">Стиль звучания</span>
                        {!styleOpen ? (
                          <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                            {draft.style.trim()
                              ? draft.style.trim().replace(/\s+/g, " ").slice(0, 80)
                              : "Пусто - нажмите, чтобы описать"}
                          </span>
                        ) : null}
                      </span>
                      <span className="flex shrink-0 items-center gap-1.5 text-xs tabular-nums text-muted-foreground">
                        {draft.style.length}/{status?.limits.styleMax ?? AI_TRACKS_LIMITS.styleMax}
                        <ChevronDown
                          className={cn(
                            "h-4 w-4 transition-transform",
                            styleOpen && "rotate-180"
                          )}
                        />
                      </span>
                    </button>
                    <button
                      type="button"
                      aria-label="Очистить стиль звучания"
                      title="Очистить"
                      disabled={!draft.style.trim()}
                      className={cn(
                        "inline-flex h-9 w-9 shrink-0 self-center items-center justify-center rounded-lg transition-colors",
                        draft.style.trim()
                          ? "text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                          : "opacity-35",
                      )}
                      onClick={() => patchDraft({ style: "" })}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  {styleOpen ? (
                    <div className="space-y-2 border-t border-border px-4 py-3">
                      <Label htmlFor={styleId} className="sr-only">
                        Как должна звучать музыка?
                      </Label>
                      <Textarea
                        id={styleId}
                        value={draft.style}
                        maxLength={status?.limits.styleMax ?? AI_TRACKS_LIMITS.styleMax}
                        placeholder="Жанр, инструменты, темп, характер вокала"
                        className="min-h-24 bg-[color:var(--background)] text-base md:text-base"
                        onChange={(e) => patchDraft({ style: e.target.value })}
                      />
                    </div>
                  ) : null}
                </div>
              </>
            )}

            {draft.mode === "simple" ? (
              <div className="space-y-2">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-sm font-medium">Быстрые направления</p>
                  <span className="text-xs font-medium text-primary">
                    {AI_TRACKS_DIRECTIONS.find((d) => d.id === draft.direction)?.label ?? "Не выбрано"}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {AI_TRACKS_DIRECTIONS.map((d) => (
                    <Chip
                      key={d.id}
                      active={draft.direction === d.id}
                      onClick={() =>
                        applyChipToPromptField(
                          "direction",
                          draft.direction === d.id ? null : d.id,
                        )
                      }
                    >
                      {d.label}
                    </Chip>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="space-y-2">
              <div className="flex items-baseline justify-between gap-2">
                <p className="text-sm font-medium">Настроение</p>
                <span className="text-xs font-medium text-primary">
                  {AI_TRACKS_MOODS.find((m) => m.id === draft.mood)?.label ?? "Не выбрано"}
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {AI_TRACKS_MOODS.map((m) => (
                  <Chip
                    key={m.id}
                    active={draft.mood === m.id}
                    onClick={() =>
                      applyChipToPromptField("mood", draft.mood === m.id ? null : m.id)
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
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-sm font-medium">Вокал</p>
                  <span className="text-xs font-medium text-primary">
                    {AI_TRACKS_VOCALS.find((v) => v.id === draft.vocal)?.label ?? "-"}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Пожелание, не гарантия точного исполнения.
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {AI_TRACKS_VOCALS.map((v) => (
                    <Chip
                      key={v.id}
                      active={draft.vocal === v.id}
                      onClick={() => applyChipToPromptField("vocal", v.id)}
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
                      <div className="flex justify-between gap-2 text-sm">
                        <span className="inline-flex items-center">
                          Экспериментальность
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                type="button"
                                className="ml-1.5 inline-flex text-muted-foreground hover:text-foreground"
                                aria-label="Подсказка: Экспериментальность"
                              >
                                <CircleHelp className="h-3.5 w-3.5" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-xs text-balance">
                              Насколько модель может отойти от привычного звучания. Низкие значения -
                              более предсказуемый результат, высокие - смелее и неожиданнее
                              аранжировка и вокал.
                            </TooltipContent>
                          </Tooltip>
                        </span>
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
                      <div className="flex justify-between gap-2 text-sm">
                        <span className="inline-flex items-center">
                          Следовать описанию стиля
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                type="button"
                                className="ml-1.5 inline-flex text-muted-foreground hover:text-foreground"
                                aria-label="Подсказка: Следовать описанию стиля"
                              >
                                <CircleHelp className="h-3.5 w-3.5" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-xs text-balance">
                              Насколько строго держаться вашего текста стиля. Выше - ближе к
                              описанному жанру и характеру, ниже - модель свободнее интерпретирует
                              запрос.
                            </TooltipContent>
                          </Tooltip>
                        </span>
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
                      Параметр "следовать стилю" недоступен для текущей модели.
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

            {generationEnabled && !canAfford ? (
              <div className="space-y-2 text-sm">
                <p role="status">{AI_TRACKS_STATUS_MESSAGES.insufficient_balance}</p>
                <Button type="button" variant="outline" className="min-h-11" asChild>
                  <Link href="/cabinet/finance/balance">Пополнить баланс</Link>
                </Button>
              </div>
            ) : null}

            <p className="text-xs text-muted-foreground">
              Списание {formatRub(priceRub)} с баланса при запуске. Технический сбой - средства
              возвращаются.
            </p>

            <Button
              type="button"
              className="min-h-12 w-full text-base"
              disabled={submitDisabled || (generationEnabled && !canAfford)}
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

        <section className="rounded-xl border border-border bg-card p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                02 / Результат
              </p>
              <h2 className="text-base font-semibold text-foreground">Ваши треки</h2>
            </div>
            <div
              className="inline-flex rounded-lg border border-border p-0.5"
              role="tablist"
              aria-label="Фильтр треков"
            >
              <button
                type="button"
                role="tab"
                aria-selected={filter === "all"}
                className={cn(
                  "h-7 rounded-md px-2.5 text-xs",
                  filter === "all" ? "bg-primary/15 text-foreground" : "text-muted-foreground"
                )}
                onClick={() => setFilter("all")}
              >
                Все ({totalResults})
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={filter === "favorites"}
                className={cn(
                  "h-7 rounded-md px-2.5 text-xs",
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
            <div className="mb-2 flex items-center gap-2 rounded-lg border border-border bg-[color:var(--background)] px-3 py-2 text-xs">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-primary motion-reduce:animate-none" />
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
            <div className="space-y-2">
              {flatResults.map(({ result, settings }) => (
                <ResultCard
                  key={result.id}
                  result={result}
                  settings={settings}
                  playingId={playingId}
                  onPlayToggle={onPlayToggle}
                  onFavorite={onFavorite}
                  onReuseRequest={setReusePending}
                  onToRelease={openToRelease}
                  busyFavorite={favoriteBusy === result.id}
                  busyToRelease={toReleaseBusy && toReleaseTarget?.id === result.id}
                />
              ))}
            </div>
          )}
        </section>
      </div>

      <Dialog
        open={Boolean(reusePending)}
        onOpenChange={(open) => {
          if (!open) setReusePending(null)
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Повторить настройки?</DialogTitle>
            <DialogDescription>
              Подставим в форму параметры этой генерации. Текущие поля (текст, стиль, модель и
              остальное) будут заменены. Генерация сама не запустится - нужно нажать создание
              отдельно.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setReusePending(null)}>
              Отмена
            </Button>
            <Button
              type="button"
              onClick={() => {
                if (reusePending) reuseSettings(reusePending)
              }}
            >
              Да, подставить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(toReleaseTarget)}
        onOpenChange={(open) => {
          if (!open && !toReleaseBusy) setToReleaseTarget(null)
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>В дистрибуцию</DialogTitle>
            <DialogDescription>
              Создадим черновик сингла с этим аудио и текстом (если он был в генерации). Обложку и
              остальные поля дозаполните в мастере загрузки.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="ai-to-release-title">Название релиза</Label>
            <Input
              id="ai-to-release-title"
              value={toReleaseTitle}
              maxLength={120}
              disabled={toReleaseBusy}
              onChange={(e) => setToReleaseTitle(e.target.value)}
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              disabled={toReleaseBusy}
              onClick={() => setToReleaseTarget(null)}
            >
              Отмена
            </Button>
            <Button type="button" disabled={toReleaseBusy} onClick={() => void confirmToRelease()}>
              {toReleaseBusy ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Создаём…
                </>
              ) : (
                "Создать черновик"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
              Да. Включите "Инструментальная музыка" и опишите желаемое звучание. Текст песни не
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
              Да - на карточке результата нажмите "В дистрибуцию": откроется черновик релиза с
              аудио и текстом. Дозаполните обложку и метаданные, затем отправьте как обычный релиз.
              {status?.commercialRightsNote
                ? ` ${status.commercialRightsNote}`
                : " Коммерческое использование зависит от условий модели и прав на исходные материалы."}
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </section>
    </div>
  )
}
