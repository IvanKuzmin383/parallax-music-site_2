"use client"

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type ReactNode,
} from "react"
import Link from "next/link"
import {
  ArrowLeft,
  Check,
  ChevronDown,
  Download,
  Loader2,
  Pause,
  Play,
  Upload,
} from "lucide-react"
import { toast } from "sonner"
import { StoryVideoPreview } from "@/components/cabinet/tools/story-video/story-video-preview"
import { PageHeader } from "@/components/cabinet/shared/page-header"
import { Button } from "@/components/ui/button"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
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
import { Slider } from "@/components/ui/slider"
import { useCabinetSession } from "@/lib/cabinet/hooks/cabinet-session-provider"
import { loadStoryVideoBadgeIcons } from "@/lib/story-video-badge-icon"
import { buildStoryVideoPeaks } from "@/lib/story-video-canvas"
import { exportStoryVideo } from "@/lib/story-video-export"
import {
  TOOLS_STORY_VIDEO_DOWNLOAD_PRICE_RUB,
  type ToolsStoryVideoEntitlement,
} from "@/lib/tools-story-video-pricing"
import {
  applyStoryVideoTemplate,
  clampStoryVideoMotionSpeed,
  clampStoryVideoStartSec,
  clampStoryVideoTextAxis,
  DEFAULT_STORY_VIDEO_PROJECT,
  normalizeAccentHex,
  normalizeStoryVideoRange,
  STORY_VIDEO_ACCENT_SWATCHES,
  STORY_VIDEO_BADGE_IDS,
  STORY_VIDEO_BADGE_META,
  STORY_VIDEO_DURATION_MAX_SEC,
  STORY_VIDEO_DURATION_MIN_SEC,
  STORY_VIDEO_DURATION_SEC,
  STORY_VIDEO_FILTER_META,
  STORY_VIDEO_FILTERS,
  STORY_VIDEO_MOTION_META,
  STORY_VIDEO_MOTIONS,
  STORY_VIDEO_TEMPLATE_BASE,
  STORY_VIDEO_TEMPLATE_META,
  STORY_VIDEO_TEMPLATE_SIGNATURE,
  STORY_VIDEO_TEXT_ALIGNS,
  STORY_VIDEO_TEXT_LAYOUT_META,
  STORY_VIDEO_TEXT_LAYOUTS,
  STORY_VIDEO_TEXT_POSITION_PRESETS,
  toggleStoryVideoBadge,
  type StoryVideoBadgeId,
  type StoryVideoFilter,
  type StoryVideoMotion,
  type StoryVideoProject,
  type StoryVideoTemplate,
  type StoryVideoTextAlign,
  type StoryVideoTextLayout,
} from "@/lib/story-video-theme"
import { cn } from "@/lib/utils"

type CabinetTrackOption = {
  id: string
  trackName: string
  artistName: string
  coverPath?: string | null
  tiktokSoundStartSec?: number | null
}

function CollapsibleSection({
  title,
  summary,
  open,
  onOpenChange,
  children,
}: {
  title: string
  summary?: string
  open: boolean
  onOpenChange: (open: boolean) => void
  children: ReactNode
}) {
  return (
    <Collapsible open={open} onOpenChange={onOpenChange}>
      <section className="rounded-lg border border-border bg-card/30">
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition hover:bg-muted/20"
            aria-expanded={open}
          >
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium text-foreground">{title}</span>
              {summary && !open ? (
                <span className="mt-0.5 block truncate text-xs text-muted-foreground">{summary}</span>
              ) : null}
            </span>
            <ChevronDown
              className={cn(
                "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
                open && "rotate-180"
              )}
              aria-hidden
            />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="space-y-3 border-t border-border px-4 py-4">{children}</div>
        </CollapsibleContent>
      </section>
    </Collapsible>
  )
}

function ChipButton({
  active,
  label,
  description,
  onClick,
}: {
  active: boolean
  label: string
  description?: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={description}
      className={cn(
        "relative rounded-md border px-3 py-2 text-left transition",
        active
          ? "border-primary bg-primary/15 text-foreground"
          : "border-border bg-background/40 text-muted-foreground hover:border-primary/40 hover:text-foreground"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-sm font-medium leading-tight">{label}</div>
          {description ? (
            <div className="mt-0.5 line-clamp-1 text-[11px] leading-snug opacity-75">{description}</div>
          ) : null}
        </div>
        {active ? <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" aria-hidden /> : null}
      </div>
    </button>
  )
}

type PanelKey =
  | "source"
  | "hook"
  | "template"
  | "motion"
  | "filter"
  | "text"
  | "badge"
  | "look"

export function StoryVideoClient() {
  const { user, refresh: refreshSession } = useCabinetSession()
  const walletBalance = user?.walletBalance ?? 0

  const [project, setProject] = useState<StoryVideoProject>(DEFAULT_STORY_VIDEO_PROJECT)
  const [tracks, setTracks] = useState<CabinetTrackOption[]>([])
  const [tracksLoading, setTracksLoading] = useState(true)
  const [selectedTrackId, setSelectedTrackId] = useState("")

  const [coverUrl, setCoverUrl] = useState<string | null>(null)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [coverImage, setCoverImage] = useState<HTMLImageElement | null>(null)
  const [badgeIcons, setBadgeIcons] = useState<Partial<
    Record<StoryVideoBadgeId, HTMLImageElement>
  > | null>(null)
  const [peaks, setPeaks] = useState<Float32Array | null>(null)
  const [audioDuration, setAudioDuration] = useState(0)

  const [playing, setPlaying] = useState(false)
  const [timeSec, setTimeSec] = useState(0)
  const [exporting, setExporting] = useState(false)
  const [exportProgress, setExportProgress] = useState(0)
  const [exportMessage, setExportMessage] = useState("")
  const [entitlement, setEntitlement] = useState<ToolsStoryVideoEntitlement | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [payDialogOpen, setPayDialogOpen] = useState(false)
  const [paying, setPaying] = useState(false)
  const [openPanels, setOpenPanels] = useState<Record<PanelKey, boolean>>({
    source: true,
    hook: true,
    template: true,
    motion: false,
    filter: false,
    text: false,
    badge: false,
    look: false,
  })

  const setPanel = useCallback((key: PanelKey, open: boolean) => {
    setOpenPanels((prev) => ({ ...prev, [key]: open }))
  }, [])

  const refreshEntitlement = useCallback(async () => {
    try {
      const res = await fetch("/api/cabinet/tools/story-video/entitlement", {
        credentials: "include",
      })
      if (!res.ok) return
      const json = (await res.json()) as ToolsStoryVideoEntitlement
      setEntitlement(json)
    } catch {
      // ignore
    }
  }, [])

  useEffect(() => {
    void refreshEntitlement()
  }, [refreshEntitlement])

  const audioRef = useRef<HTMLAudioElement | null>(null)
  const rafRef = useRef<number | null>(null)
  const localCoverObjectUrl = useRef<string | null>(null)
  const localAudioObjectUrl = useRef<string | null>(null)
  const localAudioFileRef = useRef<File | null>(null)
  const audioArrayBufferRef = useRef<ArrayBuffer | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const patch = useCallback((partial: Partial<StoryVideoProject>) => {
    setProject((prev) => ({ ...prev, ...partial }))
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setTracksLoading(true)
      try {
        const res = await fetch("/api/cabinet/tracks", { credentials: "include" })
        if (!res.ok) return
        const json = (await res.json()) as { tracks?: CabinetTrackOption[] }
        if (!cancelled) setTracks(json.tracks ?? [])
      } catch {
        if (!cancelled) setTracks([])
      } finally {
        if (!cancelled) setTracksLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    return () => {
      if (localCoverObjectUrl.current) URL.revokeObjectURL(localCoverObjectUrl.current)
      if (localAudioObjectUrl.current) URL.revokeObjectURL(localAudioObjectUrl.current)
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      abortRef.current?.abort()
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    void loadStoryVideoBadgeIcons(project.badges).then((icons) => {
      if (!cancelled) setBadgeIcons(icons)
    })
    return () => {
      cancelled = true
    }
  }, [project.badges])

  useEffect(() => {
    if (!coverUrl) {
      setCoverImage(null)
      return
    }
    let cancelled = false
    const img = new Image()
    if (/^https?:\/\//i.test(coverUrl)) {
      try {
        const u = new URL(coverUrl, window.location.href)
        if (u.origin !== window.location.origin) img.crossOrigin = "anonymous"
      } catch {
        // ignore
      }
    }
    img.onload = () => {
      if (!cancelled) setCoverImage(img)
    }
    img.onerror = () => {
      if (!cancelled) {
        setCoverImage(null)
        toast.error("Не удалось загрузить обложку")
      }
    }
    img.src = coverUrl
    return () => {
      cancelled = true
    }
  }, [coverUrl])

  useEffect(() => {
    if (!audioUrl) {
      setPeaks(null)
      setAudioDuration(0)
      audioArrayBufferRef.current = null
      return
    }
    let cancelled = false
    ;(async () => {
      try {
        let buf: ArrayBuffer
        if (localAudioFileRef.current) {
          buf = await localAudioFileRef.current.arrayBuffer()
        } else {
          const needsCreds = !/^(blob:|data:)/i.test(audioUrl)
          const res = await fetch(audioUrl, needsCreds ? { credentials: "include" } : undefined)
          if (!res.ok) throw new Error("audio")
          buf = await res.arrayBuffer()
        }
        if (cancelled) return
        audioArrayBufferRef.current = buf
        const ctx = new AudioContext()
        const decoded = await ctx.decodeAudioData(buf.slice(0))
        await ctx.close()
        if (cancelled) return
        setAudioDuration(decoded.duration)
        setPeaks(buildStoryVideoPeaks(decoded))
      } catch {
        if (!cancelled) {
          audioArrayBufferRef.current = null
          setPeaks(null)
          setAudioDuration(0)
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [audioUrl])

  const tick = useCallback(() => {
    const audio = audioRef.current
    if (!audio || audio.paused) {
      setPlaying(false)
      return
    }
    const local = Math.max(0, audio.currentTime - project.startSec)
    if (local >= project.durationSec) {
      audio.pause()
      audio.currentTime = project.startSec
      setTimeSec(0)
      setPlaying(false)
      return
    }
    setTimeSec(local)
    rafRef.current = requestAnimationFrame(tick)
  }, [project.startSec, project.durationSec])

  const togglePlay = useCallback(async () => {
    if (!audioUrl) {
      toast.error("Сначала выберите трек или загрузите аудио")
      return
    }
    let audio = audioRef.current
    if (!audio) {
      audio = new Audio()
      audioRef.current = audio
    }
    if (playing) {
      audio.pause()
      setPlaying(false)
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      return
    }
    audio.src = audioUrl
    audio.currentTime = project.startSec + timeSec
    try {
      await audio.play()
      setPlaying(true)
      rafRef.current = requestAnimationFrame(tick)
    } catch {
      toast.error("Не удалось начать воспроизведение")
    }
  }, [audioUrl, playing, project.startSec, timeSec, tick])

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code !== "Space" && e.key !== " ") return
      if (e.repeat) return
      if (exporting) return
      const target = e.target as HTMLElement | null
      const tag = target?.tagName?.toLowerCase()
      if (
        tag === "input" ||
        tag === "textarea" ||
        tag === "select" ||
        target?.isContentEditable
      ) {
        return
      }
      e.preventDefault()
      void togglePlay()
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [togglePlay, exporting])

  useEffect(() => {
    // При смене отрывка - сброс превью-таймлайна
    setTimeSec(0)
    setPlaying(false)
    audioRef.current?.pause()
  }, [project.startSec, project.durationSec, audioUrl])

  const selectTrack = (trackId: string) => {
    setSelectedTrackId(trackId)
    const track = tracks.find((t) => t.id === trackId)
    if (!track) return
    if (localCoverObjectUrl.current) {
      URL.revokeObjectURL(localCoverObjectUrl.current)
      localCoverObjectUrl.current = null
    }
    if (localAudioObjectUrl.current) {
      URL.revokeObjectURL(localAudioObjectUrl.current)
      localAudioObjectUrl.current = null
    }
    localAudioFileRef.current = null
    audioArrayBufferRef.current = null
    const hasCover = Boolean(track.coverPath && String(track.coverPath).trim())
    setCoverUrl(hasCover ? `/api/cabinet/uploads/cover/${track.id}` : null)
    setAudioUrl(`/api/cabinet/tracks/${track.id}/audio`)
    if (!hasCover) {
      toast.message("У трека нет обложки - загрузите свою")
    }
    const start = clampStoryVideoStartSec(track.tiktokSoundStartSec ?? 0)
    const range = normalizeStoryVideoRange(start, start + STORY_VIDEO_DURATION_SEC)
    patch({
      title: track.trackName || project.title,
      artist: track.artistName || project.artist,
      startSec: range.startSec,
      durationSec: range.durationSec,
    })
  }

  const onLocalCover = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file) return
    if (!file.type.startsWith("image/")) {
      toast.error("Нужен файл изображения")
      return
    }
    // data: уже разрешён CSP (img-src); blob: раньше блокировался → «Не удалось загрузить обложку»
    if (localCoverObjectUrl.current) {
      URL.revokeObjectURL(localCoverObjectUrl.current)
      localCoverObjectUrl.current = null
    }
    const reader = new FileReader()
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : null
      if (!result) {
        toast.error("Не удалось прочитать обложку")
        return
      }
      setCoverUrl(result)
      setSelectedTrackId("")
    }
    reader.onerror = () => toast.error("Не удалось прочитать обложку")
    reader.readAsDataURL(file)
  }

  const onLocalAudio = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file) return
    if (!file.type.startsWith("audio/") && !file.name.toLowerCase().endsWith(".wav")) {
      toast.error("Нужен аудиофайл (WAV / MP3)")
      return
    }
    if (localAudioObjectUrl.current) URL.revokeObjectURL(localAudioObjectUrl.current)
    localAudioFileRef.current = file
    audioArrayBufferRef.current = null
    const url = URL.createObjectURL(file)
    localAudioObjectUrl.current = url
    setAudioUrl(url)
    setSelectedTrackId("")
    patch({ startSec: 0, durationSec: STORY_VIDEO_DURATION_SEC })
  }

  const onTemplate = (template: StoryVideoTemplate) => {
    setProject((prev) => applyStoryVideoTemplate(prev, template))
  }

  const rangeSliderMax = useMemo(() => {
    if (!audioDuration) return Math.max(STORY_VIDEO_DURATION_MAX_SEC, 600)
    return Math.max(STORY_VIDEO_DURATION_MIN_SEC, Math.floor(audioDuration))
  }, [audioDuration])

  const clipEndSec = project.startSec + project.durationSec

  const onHookRangeChange = (values: number[]) => {
    const from = values[0] ?? project.startSec
    const to = values[1] ?? clipEndSec
    const prevStart = project.startSec
    const prevEnd = clipEndSec
    let a = Math.floor(from)
    let b = Math.floor(to)
    if (b < a) {
      const t = a
      a = b
      b = t
    }
    let dur = b - a
    if (dur > STORY_VIDEO_DURATION_MAX_SEC) {
      const startMoved = Math.abs(a - prevStart) >= Math.abs(b - prevEnd)
      if (startMoved) {
        a = b - STORY_VIDEO_DURATION_MAX_SEC
      } else {
        b = a + STORY_VIDEO_DURATION_MAX_SEC
      }
      dur = STORY_VIDEO_DURATION_MAX_SEC
    }
    if (dur < STORY_VIDEO_DURATION_MIN_SEC) {
      const endMoved = Math.abs(b - prevEnd) > Math.abs(a - prevStart)
      if (endMoved) {
        b = a + STORY_VIDEO_DURATION_MIN_SEC
      } else {
        a = Math.max(0, b - STORY_VIDEO_DURATION_MIN_SEC)
        b = a + STORY_VIDEO_DURATION_MIN_SEC
      }
      dur = STORY_VIDEO_DURATION_MIN_SEC
    }
    const range = normalizeStoryVideoRange(a, b, audioDuration || undefined)
    patch({ startSec: range.startSec, durationSec: range.durationSec })
  }

  const selectedTrack = useMemo(
    () => tracks.find((t) => t.id === selectedTrackId) ?? null,
    [tracks, selectedTrackId]
  )

  const sourceSummary = selectedTrack
    ? `${selectedTrack.artistName} - ${selectedTrack.trackName}`
    : coverUrl || audioUrl
      ? "Свои файлы"
      : "Выберите трек или загрузите файлы"

  const canExport = Boolean(coverUrl && audioUrl && !exporting)
  const needsPurchase = Boolean(entitlement && !entitlement.canDownload)
  const downloadPriceRub = entitlement?.priceRub ?? TOOLS_STORY_VIDEO_DOWNLOAD_PRICE_RUB
  const downloadLabel = (() => {
    if (!entitlement) return "Скачать"
    if (entitlement.freeAvailable) return "Скачать бесплатно"
    if (needsPurchase) return `Купить за ${downloadPriceRub} ₽`
    if (entitlement.credits > 0) return `Скачать (${entitlement.credits})`
    return "Скачать"
  })()

  const startPaymentFromBalance = async () => {
    setPaying(true)
    try {
      const res = await fetch("/api/cabinet/payments/tools-story-video/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ payFromBalance: true }),
      })
      const data = (await res.json().catch(() => ({}))) as {
        paid?: boolean
        error?: string
      }
      if (!res.ok || !data.paid) {
        toast.error(data.error || "Не удалось оплатить с баланса")
        return
      }
      toast.success("Оплата прошла - можно скачать видео")
      setPayDialogOpen(false)
      await refreshEntitlement()
      await refreshSession({ silent: true })
    } catch {
      toast.error("Не удалось оплатить с баланса")
    } finally {
      setPaying(false)
    }
  }

  const requestDownload = () => {
    if (!coverUrl || !audioUrl) {
      toast.error("Нужны обложка и аудио")
      return
    }
    if (entitlement && !entitlement.canDownload) {
      setPayDialogOpen(true)
      return
    }
    setConfirmOpen(true)
  }

  const onExportConfirmed = async () => {
    if (!coverUrl || !audioUrl) return
    setConfirmOpen(false)
    setExporting(true)
    setExportProgress(0)
    setExportMessage("Рендерим видео…")
    setPlaying(false)
    audioRef.current?.pause()
    const ac = new AbortController()
    abortRef.current = ac
    try {
      // Сначала рендер без водяного знака, списание - только перед выдачей файла
      const result = await exportStoryVideo({
        project,
        coverUrl,
        audioUrl,
        audioData: localAudioFileRef.current ?? audioArrayBufferRef.current,
        signal: ac.signal,
        onProgress: (p) => {
          setExportProgress(Math.min(0.92, p.progress))
          setExportMessage(p.message)
        },
      })

      setExportMessage("Подтверждаем скачивание…")
      let consumeRes: Response
      try {
        consumeRes = await fetch("/api/cabinet/tools/story-video/consume", {
          method: "POST",
          credentials: "include",
        })
      } catch {
        throw new Error(
          "Не удалось подтвердить скачивание (сеть). Видео собрано - обновите страницу и попробуйте снова."
        )
      }
      const consumeData = (await consumeRes.json().catch(() => ({}))) as {
        error?: string
        entitlement?: ToolsStoryVideoEntitlement
        used?: string
      }

      if (consumeRes.status === 402) {
        if (consumeData.entitlement) setEntitlement(consumeData.entitlement)
        setPayDialogOpen(true)
        return
      }
      if (!consumeRes.ok) {
        throw new Error(consumeData.error || "Не удалось подтвердить скачивание")
      }
      if (consumeData.entitlement) setEntitlement(consumeData.entitlement)

      const href = URL.createObjectURL(result.blob)
      const a = document.createElement("a")
      a.href = href
      a.download = result.filename
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(href)
      setExportProgress(1)
      toast.success(
        consumeData.used === "free"
          ? "Скачано (бесплатное скачивание использовано)"
          : result.filename.endsWith(".mp4")
            ? "Видео скачано (MP4)"
            : "Видео скачано (WebM)"
      )
    } catch (err) {
      const raw = err instanceof Error ? err.message : "Не удалось экспортировать"
      const msg = /Failed to fetch|NetworkError|Load failed/i.test(raw)
        ? "Не удалось скачать сниппет (сеть или доступ к аудио). Попробуйте ещё раз."
        : raw
      if (msg !== "Отменено") toast.error(msg)
    } finally {
      setExporting(false)
      abortRef.current = null
    }
  }

  return (
    <div className="w-full max-w-none space-y-6">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link href="/cabinet/tools">
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            К инструментам
          </Link>
        </Button>
      </div>

      <PageHeader title="Сниппет" />
      <p className="-mt-4 w-full text-sm text-muted-foreground md:text-[15px]">
        Отрывок 5-30 сек из обложки и хука для Reels / Shorts / TikTok. Превью с водяным знаком. 1
        скачивание бесплатно навсегда, далее {downloadPriceRub} ₽.
      </p>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-3">
          <CollapsibleSection
            title="1. Источник"
            summary={sourceSummary}
            open={openPanels.source}
            onOpenChange={(v) => setPanel("source", v)}
          >
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="story-track">Трек из кабинета</Label>
                <select
                  id="story-track"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={selectedTrackId}
                  disabled={tracksLoading}
                  onChange={(e) => selectTrack(e.target.value)}
                >
                  <option value="">
                    {tracksLoading ? "Загрузка…" : "Выберите трек"}
                  </option>
                  {tracks.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.artistName} - {t.trackName}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-wrap gap-2">
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-border bg-background/50 px-3 py-2 text-sm hover:border-primary/40">
                  <Upload className="h-4 w-4 shrink-0" />
                  {coverUrl ? "Сменить обложку" : "Своя обложка"}
                  <input type="file" accept="image/*" className="hidden" onChange={onLocalCover} />
                </label>
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-border bg-background/50 px-3 py-2 text-sm hover:border-primary/40">
                  <Upload className="h-4 w-4 shrink-0" />
                  {audioUrl && !selectedTrackId ? "Сменить аудио" : "Своё аудио"}
                  <input
                    type="file"
                    accept="audio/*,.wav"
                    className="hidden"
                    onChange={onLocalAudio}
                  />
                </label>
              </div>
              {(coverUrl || audioUrl) && (
                <p className="text-xs text-muted-foreground">
                  {coverUrl ? "Обложка загружена" : "Нет обложки"}
                  {" · "}
                  {audioUrl ? "Аудио готово" : "Нет аудио"}
                </p>
              )}
            </div>
          </CollapsibleSection>

          <CollapsibleSection
            title="2. Хук"
            summary={`${project.startSec}–${clipEndSec} сек · ${project.durationSec} сек`}
            open={openPanels.hook}
            onOpenChange={(v) => setPanel("hook", v)}
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>
                  От и до (макс. {STORY_VIDEO_DURATION_MAX_SEC} сек, мин.{" "}
                  {STORY_VIDEO_DURATION_MIN_SEC} сек)
                </span>
                {audioDuration > 0 ? <span>Трек ~{Math.floor(audioDuration)} сек</span> : null}
              </div>
              <Slider
                value={[project.startSec, clipEndSec]}
                min={0}
                max={rangeSliderMax}
                step={1}
                minStepsBetweenThumbs={STORY_VIDEO_DURATION_MIN_SEC}
                onValueChange={onHookRangeChange}
                disabled={!audioUrl}
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="sv-hook-from">От, сек</Label>
                  <Input
                    id="sv-hook-from"
                    type="number"
                    min={0}
                    max={rangeSliderMax}
                    value={project.startSec}
                    disabled={!audioUrl}
                    onChange={(e) => {
                      const from = Number(e.target.value)
                      const range = normalizeStoryVideoRange(
                        from,
                        from + project.durationSec,
                        audioDuration || undefined
                      )
                      patch({ startSec: range.startSec, durationSec: range.durationSec })
                    }}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="sv-hook-to">До, сек</Label>
                  <Input
                    id="sv-hook-to"
                    type="number"
                    min={0}
                    max={rangeSliderMax}
                    value={clipEndSec}
                    disabled={!audioUrl}
                    onChange={(e) => {
                      const to = Number(e.target.value)
                      const range = normalizeStoryVideoRange(
                        project.startSec,
                        to,
                        audioDuration || undefined
                      )
                      patch({ startSec: range.startSec, durationSec: range.durationSec })
                    }}
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Отрывок: {project.startSec} → {clipEndSec} сек ({project.durationSec} сек)
              </p>
            </div>
          </CollapsibleSection>

          <CollapsibleSection
            title="3. Шаблон"
            summary={STORY_VIDEO_TEMPLATE_META[project.template].label}
            open={openPanels.template}
            onOpenChange={(v) => setPanel("template", v)}
          >
            <div className="space-y-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Базовые
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                {STORY_VIDEO_TEMPLATE_BASE.map((id) => (
                  <ChipButton
                    key={id}
                    active={project.template === id}
                    label={STORY_VIDEO_TEMPLATE_META[id].label}
                    description={STORY_VIDEO_TEMPLATE_META[id].description}
                    onClick={() => onTemplate(id)}
                  />
                ))}
              </div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Signature
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                {STORY_VIDEO_TEMPLATE_SIGNATURE.map((id) => (
                  <ChipButton
                    key={id}
                    active={project.template === id}
                    label={STORY_VIDEO_TEMPLATE_META[id].label}
                    description={STORY_VIDEO_TEMPLATE_META[id].description}
                    onClick={() => onTemplate(id)}
                  />
                ))}
              </div>
            </div>
          </CollapsibleSection>

          <CollapsibleSection
            title="4. Движение"
            summary={`${STORY_VIDEO_MOTION_META[project.motion].label} · ${project.motionSpeed}%`}
            open={openPanels.motion}
            onOpenChange={(v) => setPanel("motion", v)}
          >
            <div className="grid gap-2 sm:grid-cols-2">
              {STORY_VIDEO_MOTIONS.map((id) => (
                <ChipButton
                  key={id}
                  active={project.motion === id}
                  label={STORY_VIDEO_MOTION_META[id].label}
                  description={STORY_VIDEO_MOTION_META[id].description}
                  onClick={() => patch({ motion: id as StoryVideoMotion })}
                />
              ))}
            </div>
            <div className="space-y-2 pt-1">
              <div className="flex justify-between text-sm">
                <span>Скорость анимации</span>
                <span className="tabular-nums text-muted-foreground">{project.motionSpeed}%</span>
              </div>
              <Slider
                value={[project.motionSpeed]}
                min={70}
                max={130}
                step={1}
                onValueChange={(v) =>
                  patch({ motionSpeed: clampStoryVideoMotionSpeed(v[0] ?? 100) })
                }
              />
            </div>
          </CollapsibleSection>

          <CollapsibleSection
            title="5. Фильтр"
            summary={STORY_VIDEO_FILTER_META[project.filter].label}
            open={openPanels.filter}
            onOpenChange={(v) => setPanel("filter", v)}
          >
            <div className="grid gap-2 sm:grid-cols-2">
              {STORY_VIDEO_FILTERS.map((id) => (
                <ChipButton
                  key={id}
                  active={project.filter === id}
                  label={STORY_VIDEO_FILTER_META[id].label}
                  description={STORY_VIDEO_FILTER_META[id].description}
                  onClick={() => patch({ filter: id as StoryVideoFilter })}
                />
              ))}
            </div>
          </CollapsibleSection>

          <CollapsibleSection
            title="6. Текст"
            summary={
              project.showText
                ? `${STORY_VIDEO_TEXT_LAYOUT_META[project.textLayout].label} · ${project.textX}% / ${project.textY}%`
                : "Текст выключен"
            }
            open={openPanels.text}
            onOpenChange={(v) => setPanel("text", v)}
          >
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={project.showText}
                  onChange={(e) => patch({ showText: e.target.checked })}
                  className="h-4 w-4 rounded border-border"
                />
                Показать текст
              </label>
              <label
                className={cn(
                  "flex cursor-pointer items-center gap-2 text-sm",
                  !project.showText && "opacity-50"
                )}
              >
                <input
                  type="checkbox"
                  checked={project.showTextLine}
                  disabled={!project.showText}
                  onChange={(e) => patch({ showTextLine: e.target.checked })}
                  className="h-4 w-4 rounded border-border"
                />
                Линия под текстом
              </label>
            </div>
            <div className={cn("grid gap-2 sm:grid-cols-2", !project.showText && "pointer-events-none opacity-45")}>
              {STORY_VIDEO_TEXT_LAYOUTS.map((id) => (
                <ChipButton
                  key={id}
                  active={project.textLayout === id}
                  label={STORY_VIDEO_TEXT_LAYOUT_META[id].label}
                  description={STORY_VIDEO_TEXT_LAYOUT_META[id].description}
                  onClick={() => {
                    if (id === "bigHook") {
                      patch({
                        textLayout: id,
                        textX: 50,
                        textY: 48,
                        textAlign: "center",
                      })
                    } else {
                      patch({
                        textLayout: id,
                        textX: 12,
                        textY: 82,
                        textAlign: "left",
                      })
                    }
                  }}
                />
              ))}
            </div>

            <div
              className={cn("space-y-2", !project.showText && "pointer-events-none opacity-45")}
            >
              <Label>Позиция на кадре</Label>
              <div className="grid w-36 grid-cols-3 gap-1.5">
                {STORY_VIDEO_TEXT_POSITION_PRESETS.map((preset) => {
                  const active =
                    Math.abs(project.textX - preset.textX) <= 3 &&
                    Math.abs(project.textY - preset.textY) <= 3 &&
                    project.textAlign === preset.textAlign
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      title={preset.label}
                      aria-label={`Позиция ${preset.id}`}
                      onClick={() =>
                        patch({
                          textX: preset.textX,
                          textY: preset.textY,
                          textAlign: preset.textAlign,
                        })
                      }
                      className={cn(
                        "flex h-9 items-center justify-center rounded-md border text-sm transition",
                        active
                          ? "border-primary bg-primary/20 text-foreground"
                          : "border-border bg-background/40 text-muted-foreground hover:border-primary/40"
                      )}
                    >
                      {preset.label}
                    </button>
                  )
                })}
              </div>
              <div className="space-y-2 pt-1">
                <div className="flex justify-between text-sm">
                  <span>Горизонталь</span>
                  <span className="tabular-nums text-muted-foreground">{project.textX}%</span>
                </div>
                <Slider
                  value={[project.textX]}
                  min={4}
                  max={96}
                  step={1}
                  onValueChange={(v) => patch({ textX: clampStoryVideoTextAxis(v[0] ?? 50) })}
                />
                <div className="flex justify-between text-sm">
                  <span>Вертикаль</span>
                  <span className="tabular-nums text-muted-foreground">{project.textY}%</span>
                </div>
                <Slider
                  value={[project.textY]}
                  min={4}
                  max={96}
                  step={1}
                  onValueChange={(v) => patch({ textY: clampStoryVideoTextAxis(v[0] ?? 50) })}
                />
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                {STORY_VIDEO_TEXT_ALIGNS.map((align) => (
                  <button
                    key={align}
                    type="button"
                    onClick={() => patch({ textAlign: align as StoryVideoTextAlign })}
                    className={cn(
                      "rounded-md border px-3 py-1.5 text-sm",
                      project.textAlign === align
                        ? "border-primary bg-primary/15 font-medium"
                        : "border-border text-muted-foreground hover:border-primary/40"
                    )}
                  >
                    {align === "left" ? "Слева" : align === "center" ? "По центру" : "Справа"}
                  </button>
                ))}
              </div>
            </div>

            <div
              className={cn(
                "grid gap-3 sm:grid-cols-2",
                !project.showText && "pointer-events-none opacity-45"
              )}
            >
              <div className="space-y-1.5">
                <Label htmlFor="sv-title">Название</Label>
                <Input
                  id="sv-title"
                  value={project.title}
                  onChange={(e) => patch({ title: e.target.value.slice(0, 80) })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sv-artist">Артист</Label>
                <Input
                  id="sv-artist"
                  value={project.artist}
                  onChange={(e) => patch({ artist: e.target.value.slice(0, 80) })}
                />
              </div>
            </div>
            <div
              className={cn("space-y-1.5", !project.showText && "pointer-events-none opacity-45")}
            >
              <Label htmlFor="sv-hook">Фраза (Big Hook / Lyric Card)</Label>
              <Input
                id="sv-hook"
                value={project.hookText}
                onChange={(e) => patch({ hookText: e.target.value.slice(0, 60) })}
                placeholder="Слушай сейчас"
              />
            </div>
          </CollapsibleSection>

          <CollapsibleSection
            title="7. Бейджи площадок"
            summary={
              project.badges.length === 0
                ? "Не выбраны"
                : `${project.badges.map((b) => STORY_VIDEO_BADGE_META[b].label).join(", ")} · ${project.badgeX}% / ${project.badgeY}%`
            }
            open={openPanels.badge}
            onOpenChange={(v) => setPanel("badge", v)}
          >
            <p className="text-xs text-muted-foreground">
              Можно выбрать несколько - по 2 в ряд, без наложений.
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {STORY_VIDEO_BADGE_IDS.map((id) => (
                <ChipButton
                  key={id}
                  active={project.badges.includes(id)}
                  label={STORY_VIDEO_BADGE_META[id].label}
                  description={`${STORY_VIDEO_BADGE_META[id].line1} ${STORY_VIDEO_BADGE_META[id].line2}`}
                  onClick={() => {
                    const next = toggleStoryVideoBadge(project.badges, id)
                    patch({
                      badges: next,
                      ...(project.badges.length === 0 && next.length > 0
                        ? { badgeX: 50, badgeY: 88 }
                        : {}),
                    })
                  }}
                />
              ))}
            </div>
            {project.badges.length > 0 ? (
              <div className="space-y-2">
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      patch({ badges: [...STORY_VIDEO_BADGE_IDS], badgeX: 50, badgeY: 88 })
                    }
                  >
                    Выбрать все
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => patch({ badges: [] })}
                  >
                    Снять все
                  </Button>
                </div>
                <Label>Позиция блока бейджей</Label>
                <div className="grid w-36 grid-cols-3 gap-1.5">
                  {STORY_VIDEO_TEXT_POSITION_PRESETS.map((preset) => {
                    const active =
                      Math.abs(project.badgeX - preset.textX) <= 3 &&
                      Math.abs(project.badgeY - preset.textY) <= 3
                    return (
                      <button
                        key={`badge-${preset.id}`}
                        type="button"
                        title={preset.label}
                        aria-label={`Позиция бейджей ${preset.id}`}
                        onClick={() =>
                          patch({ badgeX: preset.textX, badgeY: preset.textY })
                        }
                        className={cn(
                          "flex h-9 items-center justify-center rounded-md border text-sm transition",
                          active
                            ? "border-primary bg-primary/20 text-foreground"
                            : "border-border bg-background/40 text-muted-foreground hover:border-primary/40"
                        )}
                      >
                        {preset.label}
                      </button>
                    )
                  })}
                </div>
                <div className="space-y-2 pt-1">
                  <div className="flex justify-between text-sm">
                    <span>Горизонталь</span>
                    <span className="tabular-nums text-muted-foreground">{project.badgeX}%</span>
                  </div>
                  <Slider
                    value={[project.badgeX]}
                    min={4}
                    max={96}
                    step={1}
                    onValueChange={(v) =>
                      patch({ badgeX: clampStoryVideoTextAxis(v[0] ?? 50) })
                    }
                  />
                  <div className="flex justify-between text-sm">
                    <span>Вертикаль</span>
                    <span className="tabular-nums text-muted-foreground">{project.badgeY}%</span>
                  </div>
                  <Slider
                    value={[project.badgeY]}
                    min={4}
                    max={96}
                    step={1}
                    onValueChange={(v) =>
                      patch({ badgeY: clampStoryVideoTextAxis(v[0] ?? 88) })
                    }
                  />
                </div>
              </div>
            ) : null}
          </CollapsibleSection>

          <CollapsibleSection
            title="8. Цвет и waveform"
            summary={`${project.accent}${project.showWaveform ? " · waveform вкл." : ""}`}
            open={openPanels.look}
            onOpenChange={(v) => setPanel("look", v)}
          >
            <div className="flex flex-wrap items-center gap-2">
              {STORY_VIDEO_ACCENT_SWATCHES.map((hex) => (
                <button
                  key={hex}
                  type="button"
                  aria-label={`Акцент ${hex}`}
                  onClick={() => patch({ accent: hex })}
                  className={cn(
                    "h-8 w-8 rounded-full border-2 transition",
                    project.accent.toUpperCase() === hex
                      ? "border-white scale-110"
                      : "border-transparent opacity-80 hover:opacity-100"
                  )}
                  style={{ backgroundColor: hex }}
                />
              ))}
              <Input
                className="h-8 w-28"
                value={project.accent}
                onChange={(e) => patch({ accent: normalizeAccentHex(e.target.value) })}
              />
            </div>
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={project.showWaveform}
                onChange={(e) => patch({ showWaveform: e.target.checked })}
                className="h-4 w-4 rounded border-border"
              />
              Показать waveform внизу ролика
            </label>
          </CollapsibleSection>
        </div>

        <aside className="lg:sticky lg:top-4 lg:self-start">
          <div className="space-y-4 rounded-lg border border-border bg-card/30 p-4">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium">Превью</p>
              <p className="text-xs text-muted-foreground">
                9:16 · {project.durationSec} сек · WM
              </p>
            </div>
            <StoryVideoPreview
              project={project}
              cover={coverImage}
              peaks={peaks}
              timeSec={timeSec}
              badgeIcons={badgeIcons}
              className="mx-auto w-full max-w-[280px]"
            />

            {entitlement ? (
              <p className="text-center text-xs text-muted-foreground">
                {entitlement.freeAvailable
                  ? "Доступно 1 бесплатное скачивание"
                  : entitlement.credits > 0
                    ? `Кредитов скачивания: ${entitlement.credits}`
                    : `Следующее скачивание - ${downloadPriceRub} ₽`}
              </p>
            ) : null}

            <div className="flex flex-col gap-2">
              <Button
                type="button"
                variant="secondary"
                className="w-full"
                onClick={() => void togglePlay()}
                disabled={!audioUrl}
              >
                {playing ? (
                  <>
                    <Pause className="mr-1.5 h-4 w-4 shrink-0" />
                    Пауза
                  </>
                ) : (
                  <>
                    <Play className="mr-1.5 h-4 w-4 shrink-0" />
                    Смотреть
                  </>
                )}
              </Button>
              <Button
                type="button"
                className="h-auto min-h-10 w-full whitespace-normal px-3 py-2 text-center leading-snug"
                onClick={requestDownload}
                disabled={!canExport}
              >
                {exporting ? (
                  <>
                    <Loader2 className="mr-1.5 h-4 w-4 shrink-0 animate-spin" />
                    {Math.round(exportProgress * 100)}%
                  </>
                ) : (
                  <>
                    <Download className="mr-1.5 h-4 w-4 shrink-0" />
                    <span>{downloadLabel}</span>
                  </>
                )}
              </Button>
            </div>

            {exporting ? (
              <div className="space-y-2 text-center text-xs text-muted-foreground">
                <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full bg-primary transition-[width]"
                    style={{ width: `${Math.round(exportProgress * 100)}%` }}
                  />
                </div>
                <p>{exportMessage}</p>
                <p>Не сворачивайте вкладку</p>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => abortRef.current?.abort()}
                >
                  Отменить
                </Button>
              </div>
            ) : (
              <p className="text-center text-xs leading-relaxed text-muted-foreground">
                Пробел - play/pause. На превью водяной знак; чистое видео только после скачивания.
              </p>
            )}
          </div>
        </aside>
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Скачать видео?</DialogTitle>
            <DialogDescription>
              {entitlement?.freeAvailable
                ? "Будет использовано ваше единственное бесплатное скачивание навсегда. Продолжить?"
                : entitlement && entitlement.credits > 0
                  ? `Будет списан 1 кредит скачивания (останется ${entitlement.credits - 1}). Продолжить?`
                  : "Подтвердите скачивание ролика без водяного знака."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setConfirmOpen(false)}>
              Отмена
            </Button>
            <Button type="button" onClick={() => void onExportConfirmed()} disabled={exporting}>
              Да, скачать
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={payDialogOpen} onOpenChange={setPayDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Скачивание сторис</DialogTitle>
            <DialogDescription>
              Бесплатное скачивание уже использовано. Оплатите{" "}
              {downloadPriceRub} ₽ с баланса кабинета за одно дополнительное
              скачивание.
            </DialogDescription>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Баланс: {walletBalance.toLocaleString("ru-RU")} ₽
            {walletBalance < downloadPriceRub ? (
              <>
                {" "}
                ·{" "}
                <Link
                  href="/cabinet/finance/balance"
                  className="text-primary underline-offset-2 hover:underline"
                >
                  Пополнить
                </Link>
              </>
            ) : null}
          </p>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setPayDialogOpen(false)}>
              Отмена
            </Button>
            <Button
              type="button"
              onClick={() => void startPaymentFromBalance()}
              disabled={paying || walletBalance < downloadPriceRub}
            >
              {paying ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Оплатить {downloadPriceRub} ₽ с баланса
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
