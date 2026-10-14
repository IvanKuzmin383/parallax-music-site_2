"use client"

import { Suspense, useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { ArrowLeft, Download, Loader2, Pause, Play, Upload } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
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
  applyPreset,
  DEFAULT_MASTERING_PARAMS,
  MASTERING_PRESETS,
  type DensityLevel,
  type LoudnessLevel,
  type MasteringParams,
} from "@/lib/tools-mastering-params"
import {
  TOOLS_MASTERING_DOWNLOAD_PRICE_RUB,
  type ToolsMasteringEntitlement,
} from "@/lib/tools-mastering-pricing"
import { LiveMasteringEngine, type AbMode } from "@/lib/tools-mastering-live"
import { renderMasteredWav } from "@/lib/tools-mastering-render"
import { cn } from "@/lib/utils"

type EntitlementState = ToolsMasteringEntitlement | null
type LoadState = "idle" | "loading" | "ready" | "error"

function LevelToggle<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: T
  options: Array<{ id: T; label: string }>
  onChange: (v: T) => void
}) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">{label}</p>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => (
          <button
            key={opt.id}
            type="button"
            onClick={() => onChange(opt.id)}
            className={
              value === opt.id
                ? "rounded-md border border-primary bg-primary/15 px-3 py-1.5 text-sm font-medium"
                : "rounded-md border border-border bg-card/40 px-3 py-1.5 text-sm text-muted-foreground hover:border-primary/40"
            }
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  )
}

function ParamSlider({
  label,
  value,
  min,
  max,
  step,
  unit,
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  step: number
  unit?: string
  onChange: (v: number) => void
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2 text-sm">
        <span className="font-medium">{label}</span>
        <span className="tabular-nums text-muted-foreground">
          {value}
          {unit ?? ""}
        </span>
      </div>
      <Slider
        value={[value]}
        min={min}
        max={max}
        step={step}
        onValueChange={(v) => onChange(v[0] ?? value)}
      />
    </div>
  )
}

function formatTime(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return "0:00"
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  return `${m}:${s.toString().padStart(2, "0")}`
}

function ToolsMasteringInner() {
  const { user, refresh: refreshSession } = useCabinetSession()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const engineRef = useRef<LiveMasteringEngine | null>(null)

  const [file, setFile] = useState<File | null>(null)
  const [params, setParams] = useState<MasteringParams>(DEFAULT_MASTERING_PARAMS)
  const [entitlement, setEntitlement] = useState<EntitlementState>(null)
  const [busy, setBusy] = useState(false)
  const [paying, setPaying] = useState(false)
  const [payDialogOpen, setPayDialogOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [loadState, setLoadState] = useState<LoadState>("idle")
  const [loadPercent, setLoadPercent] = useState(0)
  const [loadPhase, setLoadPhase] = useState("")
  const [playing, setPlaying] = useState(false)
  const [abMode, setAbMode] = useState<AbMode>("B")
  const [playhead, setPlayhead] = useState(0)
  const [duration, setDuration] = useState(0)

  const walletBalance = user?.walletBalance ?? 0

  const refreshEntitlement = useCallback(async () => {
    try {
      const res = await fetch("/api/cabinet/tools/mastering/entitlement", { credentials: "include" })
      const data = (await res.json().catch(() => ({}))) as ToolsMasteringEntitlement & { error?: string }
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
    const engine = new LiveMasteringEngine()
    engineRef.current = engine
    return () => {
      void engine.dispose()
      engineRef.current = null
    }
  }, [])

  useEffect(() => {
    engineRef.current?.applyParams(params)
  }, [params])

  useEffect(() => {
    if (!playing) return
    let raf = 0
    const tick = () => {
      const eng = engineRef.current
      if (eng) {
        setPlayhead(eng.currentTime)
        if (!eng.isPlaying) setPlaying(false)
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [playing])

  const onPickFile = async (picked: File | null) => {
    if (!picked) return
    if (!/\.wav$/i.test(picked.name) && picked.type !== "audio/wav" && picked.type !== "audio/x-wav") {
      toast.error("Нужен файл WAV")
      return
    }
    if (picked.size > MAX_CABINET_WAV_BYTES) {
      toast.error(cabinetWavMaxSizeError())
      return
    }

    setFile(picked)
    setError(null)
    setPlaying(false)
    setPlayhead(0)
    setDuration(0)
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
        else if (p.phase === "decoding") setLoadPhase("Декодирование WAV…")
        else setLoadPhase("Готово к мастерингу")
      })
      eng.applyParams(params)
      setDuration(eng.duration)
      setLoadState("ready")
      setLoadPercent(100)
      setLoadPhase("Готово к мастерингу")
      toast.success("Трек загружен и готов к мастерингу")
    } catch (e) {
      const message = e instanceof Error ? e.message : "Не удалось загрузить файл"
      setLoadState("error")
      setError(message)
      toast.error(message)
    }
  }

  const patchParams = (patch: Partial<MasteringParams>) => {
    setParams((prev) => ({ ...prev, ...patch }))
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
        eng.setAbMode(abMode)
        await eng.play()
        setPlaying(true)
      }
    } catch {
      toast.error("Не удалось запустить воспроизведение")
    }
  }

  const switchAb = (mode: AbMode) => {
    setAbMode(mode)
    engineRef.current?.setAbMode(mode)
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
      const res = await fetch("/api/cabinet/payments/tools-mastering/create", {
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
      toast.success("Оплата с баланса прошла - можно скачать мастер")
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
      toast.error("Сначала загрузите WAV")
      return
    }
    if (entitlement && !entitlement.canDownload) {
      setPayDialogOpen(true)
      return
    }

    setBusy(true)
    setError(null)
    try {
      const rendered = await renderMasteredWav(file, params)

      const consumeRes = await fetch("/api/cabinet/tools/mastering/consume", {
        method: "POST",
        credentials: "include",
      })
      const consumeData = (await consumeRes.json().catch(() => ({}))) as {
        error?: string
        code?: string
        entitlement?: ToolsMasteringEntitlement
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
          : "Мастер скачан"
      )
    } catch (e) {
      const message = e instanceof Error ? e.message : "Ошибка обработки"
      setError(message)
      toast.error(message)
    } finally {
      setBusy(false)
    }
  }

  const entitlementHint = (() => {
    if (!entitlement) return "Загрузка лимитов…"
    if (entitlement.freeAvailable) return "Доступно 1 бесплатное скачивание (навсегда на аккаунт)"
    if (entitlement.credits > 0) {
      return `Бесплатное использовано. Осталось платных скачиваний: ${entitlement.credits}`
    }
    return `Бесплатное использовано. Следующее скачивание - ${TOOLS_MASTERING_DOWNLOAD_PRICE_RUB} ₽ с баланса`
  })()

  return (
    <div className="w-full min-w-0 max-w-none space-y-6">
      <div className="space-y-3">
        <Link
          href="/cabinet/tools"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          К инструментам
        </Link>
        <PageHeader
          title="Онлайн-мастеринг"
          description="Обработка в браузере: пресеты, громкость, EQ, компрессор и лимитер. Предпрослушивание и A/B прямо во время настройки. AI-мастеринг на заказ - отдельно в разделе услуг."
        />
      </div>

      <div className="rounded-lg border border-border bg-card/40 px-4 py-3 text-sm text-muted-foreground">
        {entitlementHint}
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
        <div className="min-w-0 space-y-6">
          <section className="space-y-3 rounded-lg border border-border bg-card/30 p-4">
            <p className="text-sm font-medium">Исходный WAV</p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".wav,audio/wav,audio/x-wav"
              className="hidden"
              onChange={(e) => void onPickFile(e.target.files?.[0] ?? null)}
            />
            <div className="flex flex-wrap items-center gap-3">
              <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}>
                <Upload className="mr-2 h-4 w-4" />
                Выбрать файл
              </Button>
              <span className="text-sm text-muted-foreground">
                {file ? file.name : "Файл не выбран"}
              </span>
            </div>

            {loadState === "loading" ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2 text-sm">
                  <span className="text-muted-foreground">{loadPhase}</span>
                  <span className="tabular-nums text-muted-foreground">{loadPercent}%</span>
                </div>
                <Progress value={loadPercent} className="h-2" />
              </div>
            ) : null}

            {loadState === "ready" ? (
              <div className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">
                Трек загружен и готов к мастерингу
              </div>
            ) : null}
          </section>

          <section className="space-y-4 rounded-lg border border-border bg-card/30 p-4">
            <div className="space-y-2">
              <p className="text-sm font-medium">Пресет</p>
              <div className="flex flex-wrap gap-2">
                {MASTERING_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => setParams((prev) => applyPreset(preset.id, prev))}
                    className={
                      params.presetId === preset.id
                        ? "rounded-md border border-primary bg-primary/15 px-3 py-1.5 text-sm font-medium"
                        : "rounded-md border border-border px-3 py-1.5 text-sm text-muted-foreground hover:border-primary/40"
                    }
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            <LevelToggle<LoudnessLevel>
              label="Loudness"
              value={params.loudness}
              options={[
                { id: "low", label: "Low" },
                { id: "med", label: "Med" },
                { id: "high", label: "High" },
              ]}
              onChange={(loudness) => patchParams({ loudness })}
            />

            <LevelToggle<DensityLevel>
              label="Density"
              value={params.density}
              options={[
                { id: "low", label: "Low" },
                { id: "med", label: "Med" },
                { id: "high", label: "High" },
              ]}
              onChange={(density) => patchParams({ density })}
            />

            <ParamSlider
              label="Output gain"
              value={params.outputGainDb}
              min={-12}
              max={12}
              step={0.5}
              unit=" dB"
              onChange={(outputGainDb) => patchParams({ outputGainDb })}
            />

            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={params.magicMakeup}
                onCheckedChange={(v) => patchParams({ magicMakeup: v === true })}
              />
              Magic Makeup (автоподбор громкости)
            </label>
          </section>

          <section className="space-y-4 rounded-lg border border-border bg-card/30 p-4">
            <p className="text-sm font-medium">Advanced</p>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <ParamSlider
                label="HPF"
                value={params.hpfHz}
                min={20}
                max={120}
                step={1}
                unit=" Hz"
                onChange={(hpfHz) => patchParams({ hpfHz })}
              />
              <ParamSlider
                label="LF shelf"
                value={params.lfShelfDb}
                min={-6}
                max={6}
                step={0.1}
                unit=" dB"
                onChange={(lfShelfDb) => patchParams({ lfShelfDb })}
              />
              <ParamSlider
                label="HF shelf"
                value={params.hfShelfDb}
                min={-6}
                max={6}
                step={0.1}
                unit=" dB"
                onChange={(hfShelfDb) => patchParams({ hfShelfDb })}
              />
              <ParamSlider
                label="Threshold"
                value={params.thresholdDb}
                min={-40}
                max={0}
                step={0.5}
                unit=" dB"
                onChange={(thresholdDb) => patchParams({ thresholdDb })}
              />
              <ParamSlider
                label="Ratio"
                value={params.ratio}
                min={1.1}
                max={10}
                step={0.1}
                onChange={(ratio) => patchParams({ ratio })}
              />
              <ParamSlider
                label="Attack"
                value={params.attackMs}
                min={1}
                max={100}
                step={1}
                unit=" ms"
                onChange={(attackMs) => patchParams({ attackMs })}
              />
              <ParamSlider
                label="Release"
                value={params.releaseMs}
                min={20}
                max={400}
                step={5}
                unit=" ms"
                onChange={(releaseMs) => patchParams({ releaseMs })}
              />
              <ParamSlider
                label="Limiter ceiling"
                value={params.ceilingDb}
                min={-3}
                max={0}
                step={0.1}
                unit=" dB"
                onChange={(ceilingDb) => patchParams({ ceilingDb })}
              />
            </div>
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={params.softClip}
                  onCheckedChange={(v) => patchParams({ softClip: v === true })}
                />
                Soft clip
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={params.monoBass}
                  onCheckedChange={(v) => patchParams({ monoBass: v === true })}
                />
                Mono bass (в скачивании)
              </label>
            </div>
          </section>
        </div>

        <aside className="min-w-0 space-y-4 xl:sticky xl:top-4 xl:self-start">
          <section className="space-y-4 rounded-lg border border-border bg-card/30 p-4">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium">Предпрослушивание</p>
              <div className="inline-flex rounded-md border border-border p-0.5">
                <button
                  type="button"
                  className={cn(
                    "rounded px-3 py-1.5 text-xs font-semibold",
                    abMode === "A"
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                  onClick={() => switchAb("A")}
                  disabled={loadState !== "ready"}
                >
                  A · оригинал
                </button>
                <button
                  type="button"
                  className={cn(
                    "rounded px-3 py-1.5 text-xs font-semibold",
                    abMode === "B"
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                  onClick={() => switchAb("B")}
                  disabled={loadState !== "ready"}
                >
                  B · мастер
                </button>
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              Двигайте ползунки во время воспроизведения - звук меняется сразу (B). A/B сравнивает
              оригинал и обработку на лету.
            </p>

            <div className="flex flex-wrap items-center gap-3">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-11 w-11"
                disabled={loadState !== "ready"}
                aria-label={playing ? "Пауза" : "Воспроизвести"}
                onClick={() => void togglePlay()}
              >
                {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </Button>
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex justify-between text-xs tabular-nums text-muted-foreground">
                  <span>{formatTime(playhead)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
                <Progress
                  value={duration > 0 ? Math.min(100, (playhead / duration) * 100) : 0}
                  className="h-1.5"
                />
              </div>
            </div>
          </section>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <div className="flex flex-col gap-3">
            <Button
              type="button"
              onClick={() => void handleDownload()}
              disabled={busy || loadState !== "ready"}
              className="w-full"
            >
              {busy ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Download className="mr-2 h-4 w-4" />
              )}
              Скачать master WAV
            </Button>
            {entitlement && !entitlement.canDownload ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => setPayDialogOpen(true)}
                disabled={paying}
                className="w-full"
              >
                Купить скачивание за {TOOLS_MASTERING_DOWNLOAD_PRICE_RUB} ₽ с баланса
              </Button>
            ) : null}
            <Button type="button" variant="ghost" asChild className="w-full">
              <Link href="/cabinet/design/mastering">AI-мастеринг на заказ</Link>
            </Button>
          </div>
        </aside>
      </div>

      <Dialog open={payDialogOpen} onOpenChange={setPayDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Скачивание мастера</DialogTitle>
            <DialogDescription>
              Бесплатное скачивание уже использовано. Оплатите{" "}
              {TOOLS_MASTERING_DOWNLOAD_PRICE_RUB} ₽ с баланса кабинета за одно дополнительное
              скачивание.
            </DialogDescription>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Баланс: {walletBalance.toLocaleString("ru-RU")} ₽
            {walletBalance < TOOLS_MASTERING_DOWNLOAD_PRICE_RUB ? (
              <>
                {" "}
                ·{" "}
                <Link href="/cabinet/finance/balance" className="text-primary underline-offset-2 hover:underline">
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
              disabled={paying || walletBalance < TOOLS_MASTERING_DOWNLOAD_PRICE_RUB}
            >
              {paying ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Оплатить {TOOLS_MASTERING_DOWNLOAD_PRICE_RUB} ₽ с баланса
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export function ToolsMasteringClient() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Загрузка…
        </div>
      }
    >
      <ToolsMasteringInner />
    </Suspense>
  )
}
