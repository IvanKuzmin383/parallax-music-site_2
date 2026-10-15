"use client"

import {
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react"
import Link from "next/link"
import { ArrowLeft, Download, Loader2, Pause, Play, Upload } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Slider } from "@/components/ui/slider"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { PageHeader } from "@/components/cabinet/shared/page-header"
import { useCabinetSession } from "@/lib/cabinet/hooks/cabinet-session-provider"
import { MAX_CABINET_WAV_BYTES, cabinetWavMaxSizeError } from "@/lib/cabinet-wav-upload-limits"
import {
  applySlowedReverbPreset,
  DEFAULT_SLOWED_REVERB_PARAMS,
  SLOWED_REVERB_BASS_MAX,
  SLOWED_REVERB_BASS_MIN,
  SLOWED_REVERB_PRESETS,
  SLOWED_REVERB_REVERB_MAX,
  SLOWED_REVERB_REVERB_MIN,
  SLOWED_REVERB_SPEED_MAX,
  SLOWED_REVERB_SPEED_MIN,
  type SlowedReverbParams,
} from "@/lib/tools-slowed-reverb-params"
import {
  TOOLS_SLOWED_REVERB_DOWNLOAD_PRICE_RUB,
  type ToolsSlowedReverbEntitlement,
} from "@/lib/tools-slowed-reverb-pricing"
import { LiveSlowedReverbEngine } from "@/lib/tools-slowed-reverb-live"
import { renderSlowedReverbWav } from "@/lib/tools-slowed-reverb-render"
import { cn } from "@/lib/utils"

type EntitlementState = ToolsSlowedReverbEntitlement | null
type LoadState = "idle" | "loading" | "ready" | "error"

const AUDIO_ACCEPT =
  ".wav,.mp3,.m4a,.aac,.flac,.ogg,audio/wav,audio/x-wav,audio/mpeg,audio/mp4,audio/aac,audio/flac,audio/ogg"

function formatTime(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return "00:00"
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`
}

function isAllowedAudioFile(file: File): boolean {
  if (/\.(wav|mp3|m4a|aac|flac|ogg|aiff?)$/i.test(file.name)) return true
  return file.type.startsWith("audio/")
}

function WaveformCanvas({
  peaks,
  progress,
}: {
  peaks: number[]
  progress: number
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    const cssW = canvas.clientWidth || 640
    const cssH = canvas.clientHeight || 120
    canvas.width = Math.floor(cssW * dpr)
    canvas.height = Math.floor(cssH * dpr)
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, cssW, cssH)

    const mid = cssH / 2
    const n = peaks.length || 1
    const gap = 1.5
    const barW = Math.max(1.5, (cssW - gap * (n - 1)) / n)
    const t = Math.max(0, Math.min(1, progress))

    for (let i = 0; i < n; i++) {
      const h = Math.max(2, (peaks[i] ?? 0) * (cssH * 0.88))
      const x = i * (barW + gap)
      const y = mid - h / 2
      const filled = i / n <= t
      ctx.fillStyle = filled
        ? "color-mix(in oklab, var(--primary) 85%, #67e8f9)"
        : "color-mix(in oklab, var(--primary) 35%, transparent)"
      ctx.fillRect(x, y, barW, h)
    }
  }, [peaks, progress])

  return (
    <canvas
      ref={canvasRef}
      className="h-[120px] w-full rounded-lg bg-background/50"
      aria-hidden
    />
  )
}

function ParamCard({
  title,
  valueLabel,
  children,
}: {
  title: string
  valueLabel: string
  children: ReactNode
}) {
  return (
    <div className="rounded-xl border border-border/70 bg-card/40 p-4">
      <div className="mb-3 flex items-baseline justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          {title}
        </p>
        <span className="tabular-nums text-sm font-semibold text-primary">{valueLabel}</span>
      </div>
      {children}
    </div>
  )
}

function ToolsSlowedReverbInner() {
  const { user, refresh: refreshSession } = useCabinetSession()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const engineRef = useRef<LiveSlowedReverbEngine | null>(null)
  const scrubbingRef = useRef(false)

  const [file, setFile] = useState<File | null>(null)
  const [params, setParams] = useState<SlowedReverbParams>(DEFAULT_SLOWED_REVERB_PARAMS)
  const [entitlement, setEntitlement] = useState<EntitlementState>(null)
  const [busy, setBusy] = useState(false)
  const [paying, setPaying] = useState(false)
  const [payDialogOpen, setPayDialogOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [loadState, setLoadState] = useState<LoadState>("idle")
  const [loadPercent, setLoadPercent] = useState(0)
  const [loadPhase, setLoadPhase] = useState("")
  const [playing, setPlaying] = useState(false)
  const [playhead, setPlayhead] = useState(0)
  const [duration, setDuration] = useState(0)
  const [peaks, setPeaks] = useState<number[]>([])

  const walletBalance = user?.walletBalance ?? 0

  const refreshEntitlement = useCallback(async () => {
    try {
      const res = await fetch("/api/cabinet/tools/slowed-reverb/entitlement", {
        credentials: "include",
      })
      const data = (await res.json().catch(() => ({}))) as ToolsSlowedReverbEntitlement & {
        error?: string
      }
      if (!res.ok) {
        setError(data.error || "Не удалось загрузить лимиты")
        return
      }
      setEntitlement(data)
      setError(null)
    } catch {
      setError("Не удалось загрузить лимиты")
    }
  }, [])

  useEffect(() => {
    void refreshEntitlement()
  }, [refreshEntitlement])

  useEffect(() => {
    const engine = new LiveSlowedReverbEngine()
    engineRef.current = engine
    return () => {
      void engine.dispose()
      engineRef.current = null
    }
  }, [])

  useEffect(() => {
    engineRef.current?.applyParams(params)
    const eng = engineRef.current
    if (eng && loadState === "ready") {
      setDuration(eng.duration)
    }
  }, [params, loadState])

  useEffect(() => {
    if (!playing) return
    let raf = 0
    const tick = () => {
      const eng = engineRef.current
      if (eng) {
        if (!scrubbingRef.current) setPlayhead(eng.currentTime)
        if (!eng.isPlaying) setPlaying(false)
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [playing])

  const onPickFile = async (picked: File | null) => {
    if (!picked) return
    if (!isAllowedAudioFile(picked)) {
      toast.error("Нужен аудиофайл (WAV, MP3, M4A, FLAC, OGG)")
      return
    }
    if (picked.size > MAX_CABINET_WAV_BYTES) {
      toast.error(cabinetWavMaxSizeError("Аудиофайл"))
      return
    }

    setFile(picked)
    setError(null)
    setPlaying(false)
    setPlayhead(0)
    setDuration(0)
    setPeaks([])
    setLoadState("loading")
    setLoadPercent(0)
    setLoadPhase("Чтение файла…")

    try {
      const eng = engineRef.current
      if (!eng) throw new Error("Аудиодвижок не готов")
      eng.stop()
      await eng.loadFile(picked, (p) => {
        setLoadPercent(p.percent)
        if (p.phase === "reading") setLoadPhase("Чтение файла…")
        else if (p.phase === "decoding") setLoadPhase("Декодирование…")
        else setLoadPhase("Готово")
      })
      eng.applyParams(params)
      setPeaks(eng.peaksData)
      setDuration(eng.duration)
      setLoadState("ready")
      setLoadPercent(100)
      setLoadPhase("Готово")
      toast.success("Аудио загружено")
    } catch (e) {
      const message = e instanceof Error ? e.message : "Не удалось загрузить файл"
      setLoadState("error")
      setError(message)
      toast.error(message)
    }
  }

  const patchParams = (patch: Partial<SlowedReverbParams>) => {
    setParams((prev) => ({ ...prev, presetId: "custom", ...patch }))
  }

  const selectPreset = (presetId: string) => {
    setParams((prev) => applySlowedReverbPreset(presetId, prev))
  }

  const togglePlay = async () => {
    const eng = engineRef.current
    if (!eng || loadState !== "ready") return
    try {
      if (eng.isPlaying) {
        eng.pause()
        setPlaying(false)
        setPlayhead(eng.currentTime)
      } else {
        eng.applyParams(params)
        await eng.play()
        setPlaying(true)
      }
    } catch {
      toast.error("Не удалось запустить воспроизведение")
    }
  }

  const seekTo = async (seconds: number) => {
    const eng = engineRef.current
    if (!eng || loadState !== "ready" || duration <= 0) return
    try {
      await eng.seek(seconds)
      setPlayhead(eng.currentTime)
      setPlaying(eng.isPlaying)
    } catch {
      toast.error("Не удалось перемотать")
    }
  }

  const triggerBlobDownload = (blob: Blob, fileName: string) => {
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = fileName
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  const startPaymentFromBalance = async () => {
    setPaying(true)
    try {
      const res = await fetch("/api/cabinet/payments/tools-slowed-reverb/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ payFromBalance: true }),
      })
      const data = (await res.json().catch(() => ({}))) as {
        paid?: boolean
        error?: string
        walletBalance?: number
      }
      if (!res.ok || !data.paid) {
        toast.error(data.error || "Не удалось оплатить с баланса")
        return
      }
      toast.success("Оплата с баланса прошла - можно скачать")
      setPayDialogOpen(false)
      await refreshEntitlement()
      await refreshSession({ silent: true })
    } catch {
      toast.error("Не удалось оплатить с баланса")
    } finally {
      setPaying(false)
    }
  }

  const handleDownload = async () => {
    if (!file || loadState !== "ready") {
      toast.error("Сначала загрузите аудио")
      return
    }
    if (entitlement && !entitlement.canDownload) {
      setPayDialogOpen(true)
      return
    }

    setBusy(true)
    setError(null)
    try {
      const rendered = await renderSlowedReverbWav(file, params)

      const consumeRes = await fetch("/api/cabinet/tools/slowed-reverb/consume", {
        method: "POST",
        credentials: "include",
      })
      const consumeData = (await consumeRes.json().catch(() => ({}))) as {
        error?: string
        code?: string
        entitlement?: ToolsSlowedReverbEntitlement
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

      triggerBlobDownload(rendered.blob, rendered.fileName)
      toast.success(
        consumeData.used === "free"
          ? "Скачано (бесплатное скачивание использовано)"
          : "Файл скачан"
      )
    } catch (e) {
      const message = e instanceof Error ? e.message : "Ошибка обработки"
      setError(message)
      toast.error(message)
    } finally {
      setBusy(false)
    }
  }

  const needsPurchase = Boolean(entitlement && !entitlement.canDownload)
  const downloadPriceRub = entitlement?.priceRub ?? TOOLS_SLOWED_REVERB_DOWNLOAD_PRICE_RUB
  const downloadLabel = (() => {
    if (!entitlement) return "Скачать WAV"
    if (entitlement.freeAvailable) return "Скачать WAV бесплатно"
    if (needsPurchase) {
      return `Купить скачивание за ${downloadPriceRub} ₽ с баланса`
    }
    return "Скачать WAV"
  })()

  const progress = duration > 0 ? playhead / duration : 0

  return (
    <div className="flex w-full min-w-0 max-w-none flex-col gap-6">
      <div className="space-y-3">
        <Link
          href="/cabinet/tools"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          К инструментам
        </Link>
        <PageHeader
          title="Slowed / Reverb / Nightcore"
          className="[&_p]:max-w-none"
          description="Обработка в браузере: скорость, басы и реверб. Превью бесплатно, 1 скачивание бесплатно, дальше с баланса"
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_220px]">
        <div className="min-w-0 space-y-4">
          <section className="space-y-3 rounded-lg border border-border bg-card/30 p-4">
            <input
              ref={fileInputRef}
              type="file"
              accept={AUDIO_ACCEPT}
              className="hidden"
              onChange={(e) => void onPickFile(e.target.files?.[0] ?? null)}
            />

            {loadState === "idle" || loadState === "error" ? (
              <div className="flex flex-col items-center gap-3 py-8 text-center">
                <p className="text-sm text-muted-foreground">
                  Загрузите WAV, MP3, M4A, FLAC или OGG
                </p>
                <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}>
                  <Upload className="mr-2 h-4 w-4" />
                  Выбрать файл
                </Button>
              </div>
            ) : null}

            {loadState === "loading" ? (
              <div className="space-y-2 py-6">
                <div className="flex items-center justify-between gap-2 text-sm">
                  <span className="text-muted-foreground">{loadPhase}</span>
                  <span className="tabular-nums text-muted-foreground">{loadPercent}%</span>
                </div>
                <Progress value={loadPercent} className="h-2" />
              </div>
            ) : null}

            {loadState === "ready" ? (
              <div className="space-y-4">
                <div className="text-center">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-400">
                    Аудио загружено
                  </p>
                  <p className="mt-1 truncate text-base font-medium">
                    {file?.name.replace(/\.[^.]+$/, "") || "Трек"}
                  </p>
                  <p className="text-xs text-muted-foreground">Локальный файл</p>
                </div>

                <div className="relative rounded-xl border border-border/60 bg-background/40 p-3">
                  <div className="mb-3 flex items-center gap-3">
                    <Button
                      type="button"
                      variant="secondary"
                      size="icon"
                      className="h-11 w-11 shrink-0 rounded-full"
                      aria-label={playing ? "Пауза" : "Воспроизвести"}
                      onClick={() => void togglePlay()}
                    >
                      {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                    </Button>
                    <div className="min-w-0 flex-1">
                      <WaveformCanvas peaks={peaks} progress={progress} />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs tabular-nums text-muted-foreground">
                      <span>{formatTime(playhead)}</span>
                      <span>{formatTime(duration)}</span>
                    </div>
                    <Slider
                      value={[Math.min(playhead, duration || 0)]}
                      min={0}
                      max={duration > 0 ? duration : 1}
                      step={0.01}
                      disabled={duration <= 0}
                      aria-label="Позиция воспроизведения"
                      onValueChange={(value) => {
                        scrubbingRef.current = true
                        setPlayhead(value[0] ?? 0)
                      }}
                      onValueCommit={(value) => {
                        scrubbingRef.current = false
                        void seekTo(value[0] ?? 0)
                      }}
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="mr-2 h-3.5 w-3.5" />
                    Другой файл
                  </Button>
                </div>
              </div>
            ) : null}
          </section>

          {loadState === "ready" ? (
            <div className="grid gap-3 sm:grid-cols-3">
              <ParamCard title="Скорость" valueLabel={`${params.speed.toFixed(2)}x`}>
                <Slider
                  value={[params.speed]}
                  min={SLOWED_REVERB_SPEED_MIN}
                  max={SLOWED_REVERB_SPEED_MAX}
                  step={0.01}
                  onValueChange={(v) => patchParams({ speed: v[0] ?? 1 })}
                  aria-label="Скорость"
                />
              </ParamCard>
              <ParamCard title="Усиление басов" valueLabel={`${Math.round(params.bassBoost)}%`}>
                <Slider
                  value={[params.bassBoost]}
                  min={SLOWED_REVERB_BASS_MIN}
                  max={SLOWED_REVERB_BASS_MAX}
                  step={1}
                  onValueChange={(v) => patchParams({ bassBoost: v[0] ?? 0 })}
                  aria-label="Усиление басов"
                />
              </ParamCard>
              <ParamCard title="Реверберация" valueLabel={params.reverb.toFixed(1)}>
                <Slider
                  value={[params.reverb]}
                  min={SLOWED_REVERB_REVERB_MIN}
                  max={SLOWED_REVERB_REVERB_MAX}
                  step={0.1}
                  onValueChange={(v) => patchParams({ reverb: v[0] ?? 0 })}
                  aria-label="Реверберация"
                />
              </ParamCard>
            </div>
          ) : null}

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          {loadState === "ready" ? (
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                type="button"
                onClick={() => {
                  if (needsPurchase) {
                    setPayDialogOpen(true)
                    return
                  }
                  void handleDownload()
                }}
                disabled={needsPurchase ? paying : busy}
                className="sm:flex-1"
              >
                {busy || paying ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : needsPurchase ? null : (
                  <Download className="mr-2 h-4 w-4" />
                )}
                {downloadLabel}
              </Button>
            </div>
          ) : null}
        </div>

        <aside className="min-w-0">
          <div className="sticky top-16 space-y-2 rounded-lg border border-border bg-card/30 p-3">
            <p className="px-1 pb-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Пресеты
            </p>
            {SLOWED_REVERB_PRESETS.map((preset) => {
              const active = params.presetId === preset.id
              return (
                <button
                  key={preset.id}
                  type="button"
                  title={preset.hint}
                  onClick={() => selectPreset(preset.id)}
                  className={cn(
                    "w-full rounded-lg border px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide transition-all",
                    active
                      ? "border-primary bg-primary/15 text-foreground shadow-[0_0_0_1px_color-mix(in_oklab,var(--primary)_40%,transparent)]"
                      : "border-border/70 bg-background/30 text-muted-foreground hover:border-primary/40 hover:text-foreground"
                  )}
                >
                  {preset.label}
                </button>
              )
            })}
          </div>
        </aside>
      </div>

      <Dialog open={payDialogOpen} onOpenChange={setPayDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Скачивание файла</DialogTitle>
            <DialogDescription>
              Бесплатное скачивание уже использовано. Оплатите {downloadPriceRub} ₽ с баланса
              кабинета за одно дополнительное скачивание.
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

export function ToolsSlowedReverbClient() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Загрузка…
        </div>
      }
    >
      <ToolsSlowedReverbInner />
    </Suspense>
  )
}
