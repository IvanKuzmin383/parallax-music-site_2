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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { buildStoryVideoPeaks } from "@/lib/story-video-canvas"
import { exportStoryVideo } from "@/lib/story-video-export"
import {
  applyStoryVideoTemplate,
  clampStoryVideoMotionSpeed,
  clampStoryVideoStartSec,
  DEFAULT_STORY_VIDEO_PROJECT,
  normalizeAccentHex,
  STORY_VIDEO_ACCENT_SWATCHES,
  STORY_VIDEO_DURATION_SEC,
  STORY_VIDEO_FILTER_META,
  STORY_VIDEO_FILTERS,
  STORY_VIDEO_MOTION_META,
  STORY_VIDEO_MOTIONS,
  STORY_VIDEO_TEMPLATE_BASE,
  STORY_VIDEO_TEMPLATE_META,
  STORY_VIDEO_TEMPLATE_SIGNATURE,
  STORY_VIDEO_TEXT_LAYOUT_META,
  STORY_VIDEO_TEXT_LAYOUTS,
  type StoryVideoFilter,
  type StoryVideoMotion,
  type StoryVideoProject,
  type StoryVideoTemplate,
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

function Section({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold tracking-tight text-foreground">{title}</h2>
      {children}
    </section>
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
      className={cn(
        "rounded-lg border px-3 py-2 text-left transition",
        active
          ? "border-primary bg-primary/15 text-foreground"
          : "border-border bg-card/40 text-muted-foreground hover:border-primary/40 hover:text-foreground"
      )}
    >
      <div className="text-sm font-medium">{label}</div>
      {description ? <div className="mt-0.5 text-[11px] opacity-80">{description}</div> : null}
    </button>
  )
}

export function StoryVideoClient() {
  const [project, setProject] = useState<StoryVideoProject>(DEFAULT_STORY_VIDEO_PROJECT)
  const [tracks, setTracks] = useState<CabinetTrackOption[]>([])
  const [tracksLoading, setTracksLoading] = useState(true)
  const [selectedTrackId, setSelectedTrackId] = useState("")

  const [coverUrl, setCoverUrl] = useState<string | null>(null)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [coverImage, setCoverImage] = useState<HTMLImageElement | null>(null)
  const [peaks, setPeaks] = useState<Float32Array | null>(null)
  const [audioDuration, setAudioDuration] = useState(0)

  const [playing, setPlaying] = useState(false)
  const [timeSec, setTimeSec] = useState(0)
  const [exporting, setExporting] = useState(false)
  const [exportProgress, setExportProgress] = useState(0)
  const [exportMessage, setExportMessage] = useState("")

  const audioRef = useRef<HTMLAudioElement | null>(null)
  const rafRef = useRef<number | null>(null)
  const localCoverObjectUrl = useRef<string | null>(null)
  const localAudioObjectUrl = useRef<string | null>(null)
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
      return
    }
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch(audioUrl, { credentials: "include" })
        if (!res.ok) throw new Error("audio")
        const buf = await res.arrayBuffer()
        const ctx = new AudioContext()
        const decoded = await ctx.decodeAudioData(buf.slice(0))
        await ctx.close()
        if (cancelled) return
        setAudioDuration(decoded.duration)
        setPeaks(buildStoryVideoPeaks(decoded))
      } catch {
        if (!cancelled) {
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
    if (local >= STORY_VIDEO_DURATION_SEC) {
      audio.pause()
      audio.currentTime = project.startSec
      setTimeSec(0)
      setPlaying(false)
      return
    }
    setTimeSec(local)
    rafRef.current = requestAnimationFrame(tick)
  }, [project.startSec])

  const togglePlay = async () => {
    if (!audioUrl) {
      toast.error("Сначала выберите трек или загрузите аудио")
      return
    }
    let audio = audioRef.current
    if (!audio) {
      audio = new Audio()
      audio.crossOrigin = "anonymous"
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
  }

  useEffect(() => {
    // При смене старта - сброс превью-таймлайна
    setTimeSec(0)
    setPlaying(false)
    audioRef.current?.pause()
  }, [project.startSec, audioUrl])

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
    const hasCover = Boolean(track.coverPath && String(track.coverPath).trim())
    setCoverUrl(hasCover ? `/api/cabinet/uploads/cover/${track.id}` : null)
    setAudioUrl(`/api/cabinet/tracks/${track.id}/audio`)
    if (!hasCover) {
      toast.message("У трека нет обложки - загрузите свою")
    }
    patch({
      title: track.trackName || project.title,
      artist: track.artistName || project.artist,
      startSec: clampStoryVideoStartSec(track.tiktokSoundStartSec ?? 0),
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
    if (localCoverObjectUrl.current) URL.revokeObjectURL(localCoverObjectUrl.current)
    const url = URL.createObjectURL(file)
    localCoverObjectUrl.current = url
    setCoverUrl(url)
    setSelectedTrackId("")
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
    const url = URL.createObjectURL(file)
    localAudioObjectUrl.current = url
    setAudioUrl(url)
    setSelectedTrackId("")
    patch({ startSec: 0 })
  }

  const onTemplate = (template: StoryVideoTemplate) => {
    setProject((prev) => applyStoryVideoTemplate(prev, template))
  }

  const maxStart = useMemo(() => {
    if (!audioDuration) return 600
    return Math.max(0, Math.floor(audioDuration - STORY_VIDEO_DURATION_SEC))
  }, [audioDuration])

  const canExport = Boolean(coverUrl && audioUrl && !exporting)

  const onExport = async () => {
    if (!coverUrl || !audioUrl) return
    setExporting(true)
    setExportProgress(0)
    setExportMessage("Подготовка…")
    setPlaying(false)
    audioRef.current?.pause()
    const ac = new AbortController()
    abortRef.current = ac
    try {
      const result = await exportStoryVideo({
        project,
        coverUrl,
        audioUrl,
        signal: ac.signal,
        onProgress: (p) => {
          setExportProgress(p.progress)
          setExportMessage(p.message)
        },
      })
      const href = URL.createObjectURL(result.blob)
      const a = document.createElement("a")
      a.href = href
      a.download = result.filename
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(href)
      toast.success(
        result.filename.endsWith(".mp4")
          ? "Видео скачано (MP4)"
          : "Видео скачано (WebM - Chrome/Edge). Для Instagram можно конвертировать в MP4"
      )
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Не удалось экспортировать"
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

      <PageHeader
        title="Сторис из трека"
        description="Соберите 15-секундный вертикальный ролик из обложки и хука: шаблоны, движение, фильтры. Экспорт прямо в браузере (720p)."
      />

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px] xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-8">
          <Section title="Источник">
            <div className="space-y-3">
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
              <div className="flex flex-wrap gap-2">
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-border px-3 py-2 text-sm hover:border-primary/40">
                  <Upload className="h-4 w-4" />
                  Своя обложка
                  <input type="file" accept="image/*" className="hidden" onChange={onLocalCover} />
                </label>
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-border px-3 py-2 text-sm hover:border-primary/40">
                  <Upload className="h-4 w-4" />
                  Своё аудио
                  <input
                    type="file"
                    accept="audio/*,.wav"
                    className="hidden"
                    onChange={onLocalAudio}
                  />
                </label>
              </div>
            </div>
          </Section>

          <Section title="Хук (старт аудио)">
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>С {project.startSec} сек · длина ролика {STORY_VIDEO_DURATION_SEC} сек</span>
                {audioDuration > 0 ? (
                  <span>Трек ~{Math.floor(audioDuration)} сек</span>
                ) : null}
              </div>
              <Slider
                value={[project.startSec]}
                min={0}
                max={Math.max(0, maxStart)}
                step={1}
                onValueChange={(v) => patch({ startSec: clampStoryVideoStartSec(v[0] ?? 0) })}
                disabled={!audioUrl}
              />
            </div>
          </Section>

          <Section title="Шаблон">
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">Базовые</p>
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
              <p className="text-xs text-muted-foreground">Signature</p>
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
          </Section>

          <Section title="Движение">
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
            <div className="space-y-2 pt-2">
              <div className="flex justify-between text-sm">
                <span>Скорость</span>
                <span className="text-muted-foreground">{project.motionSpeed}%</span>
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
          </Section>

          <Section title="Фильтр">
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
          </Section>

          <Section title="Текст">
            <div className="grid gap-2 sm:grid-cols-2">
              {STORY_VIDEO_TEXT_LAYOUTS.map((id) => (
                <ChipButton
                  key={id}
                  active={project.textLayout === id}
                  label={STORY_VIDEO_TEXT_LAYOUT_META[id].label}
                  description={STORY_VIDEO_TEXT_LAYOUT_META[id].description}
                  onClick={() => patch({ textLayout: id as StoryVideoTextLayout })}
                />
              ))}
            </div>
            <div className="grid gap-3 pt-2 sm:grid-cols-2">
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
            <div className="space-y-1.5 pt-1">
              <Label htmlFor="sv-hook">Фраза (Big Hook)</Label>
              <Input
                id="sv-hook"
                value={project.hookText}
                onChange={(e) => patch({ hookText: e.target.value.slice(0, 60) })}
                placeholder="Слушай сейчас"
              />
            </div>
          </Section>

          <Section title="Акцент и waveform">
            <div className="flex flex-wrap gap-2">
              {STORY_VIDEO_ACCENT_SWATCHES.map((hex) => (
                <button
                  key={hex}
                  type="button"
                  aria-label={`Акцент ${hex}`}
                  onClick={() => patch({ accent: hex })}
                  className={cn(
                    "h-8 w-8 rounded-full border-2",
                    project.accent.toUpperCase() === hex
                      ? "border-white"
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
            <label className="mt-3 flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={project.showWaveform}
                onChange={(e) => patch({ showWaveform: e.target.checked })}
                className="h-4 w-4 rounded border-border"
              />
              Показать waveform
            </label>
          </Section>
        </div>

        <aside className="lg:sticky lg:top-4 lg:self-start">
          <div className="space-y-4">
            <StoryVideoPreview
              project={project}
              cover={coverImage}
              peaks={peaks}
              timeSec={timeSec}
              className="mx-auto w-full max-w-[320px]"
            />

            <div className="flex flex-wrap items-center justify-center gap-2">
              <Button type="button" variant="secondary" onClick={() => void togglePlay()} disabled={!audioUrl}>
                {playing ? (
                  <>
                    <Pause className="mr-1.5 h-4 w-4" />
                    Пауза
                  </>
                ) : (
                  <>
                    <Play className="mr-1.5 h-4 w-4" />
                    Превью
                  </>
                )}
              </Button>
              <Button type="button" onClick={() => void onExport()} disabled={!canExport}>
                {exporting ? (
                  <>
                    <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                    {Math.round(exportProgress * 100)}%
                  </>
                ) : (
                  <>
                    <Download className="mr-1.5 h-4 w-4" />
                    Скачать 720p
                  </>
                )}
              </Button>
            </div>

            {exporting ? (
              <div className="space-y-1 text-center text-xs text-muted-foreground">
                <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full bg-primary transition-[width]"
                    style={{ width: `${Math.round(exportProgress * 100)}%` }}
                  />
                </div>
                <p>{exportMessage}</p>
                <p>Не сворачивайте вкладку до конца экспорта</p>
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
              <p className="text-center text-xs text-muted-foreground">
                9:16 · 15 сек · рендер на вашем устройстве. В Chrome чаще WebM, в Safari - MP4.
              </p>
            )}
          </div>
        </aside>
      </div>
    </div>
  )
}
