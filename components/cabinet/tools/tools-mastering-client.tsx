"use client"

import {
  Suspense,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from "react"
import Link from "next/link"
import { ArrowLeft, ChevronDown, CircleHelp, Download, Loader2, Pause, Play, Upload } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible"
import { Progress } from "@/components/ui/progress"
import { Slider } from "@/components/ui/slider"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
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
  type SmoothLevel,
} from "@/lib/tools-mastering-params"
import {
  TOOLS_MASTERING_DOWNLOAD_PRICE_RUB,
  type ToolsMasteringEntitlement,
} from "@/lib/tools-mastering-pricing"
import { LiveMasteringEngine, type AbMode } from "@/lib/tools-mastering-live"
import {
  formatLufs,
  formatTruePeak,
  lufsBarLevel,
  silentMeterReading,
  truePeakBarLevel,
  type MeterReading,
} from "@/lib/tools-mastering-meter"
import { renderMasteredWav } from "@/lib/tools-mastering-render"
import { cn } from "@/lib/utils"

type EntitlementState = ToolsMasteringEntitlement | null
type LoadState = "idle" | "loading" | "ready" | "error"

function HintIcon({ label, tip }: { label: string; tip: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className="inline-flex shrink-0 text-muted-foreground hover:text-foreground"
          aria-label={`Подсказка: ${label}`}
        >
          <CircleHelp className="h-3.5 w-3.5" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs text-balance">
        {tip}
      </TooltipContent>
    </Tooltip>
  )
}

function LevelToggle<T extends string>({
  label,
  tip,
  value,
  options,
  onChange,
}: {
  label: string
  tip: string
  value: T
  options: Array<{ id: T; label: string }>
  onChange: (v: T) => void
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
          {label}
        </p>
        <HintIcon label={label} tip={tip} />
      </div>
      <div
        role="radiogroup"
        aria-label={label}
        className="grid gap-1 rounded-xl border border-border/70 bg-background/40 p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
        style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
      >
        {options.map((opt) => {
          const active = value === opt.id
          return (
            <button
              key={opt.id}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange(opt.id)}
              className={cn(
                "rounded-lg px-2 py-2 text-center text-xs font-medium transition-all sm:text-[13px]",
                active
                  ? "bg-primary text-primary-foreground shadow-[0_0_0_1px_color-mix(in_oklab,var(--primary)_55%,transparent),0_8px_18px_-10px_var(--primary)]"
                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              )}
            >
              {opt.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function clampStepped(value: number, min: number, max: number, step: number): number {
  const clamped = Math.min(max, Math.max(min, value))
  if (step <= 0) return clamped
  const stepped = Math.round((clamped - min) / step) * step + min
  const decimals = String(step).includes(".") ? String(step).split(".")[1]!.length : 0
  return Number(stepped.toFixed(decimals))
}

function formatKnobValue(value: number, unit?: string): string {
  const abs = Math.abs(value)
  const text =
    abs >= 100 ? value.toFixed(0) : abs >= 10 ? value.toFixed(1) : Number.isInteger(value) ? String(value) : value.toFixed(1)
  return `${text}${unit ?? ""}`
}

/** VST-style rotary knob: drag vertically or use wheel / arrows. */
function RotaryKnob({
  label,
  tip,
  value,
  min,
  max,
  step,
  unit,
  onChange,
}: {
  label: string
  tip: string
  value: number
  min: number
  max: number
  step: number
  unit?: string
  onChange: (v: number) => void
}) {
  const gradId = useId().replace(/:/g, "")
  const dragRef = useRef<{ startY: number; startValue: number } | null>(null)
  const t = max === min ? 0 : (value - min) / (max - min)
  const angle = -135 + Math.min(1, Math.max(0, t)) * 270
  const arcLen = 270 * (Math.PI / 180) * 40

  const applyFromDeltaY = (deltaY: number, startValue: number) => {
    const range = max - min
    const next = startValue - (deltaY / 110) * range
    onChange(clampStepped(next, min, max, step))
  }

  return (
    <div className="flex w-[5.5rem] flex-col items-center gap-1.5 sm:w-[6rem]">
      <p className="tabular-nums text-[11px] font-medium text-primary">{formatKnobValue(value, unit)}</p>
      <div
        role="slider"
        tabIndex={0}
        aria-label={label}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        aria-valuetext={formatKnobValue(value, unit)}
        className="relative h-[4.25rem] w-[4.25rem] cursor-ns-resize touch-none select-none outline-none focus-visible:ring-2 focus-visible:ring-primary/50 sm:h-[4.75rem] sm:w-[4.75rem]"
        onPointerDown={(e) => {
          e.preventDefault()
          ;(e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId)
          dragRef.current = { startY: e.clientY, startValue: value }
        }}
        onPointerMove={(e) => {
          if (!dragRef.current) return
          applyFromDeltaY(e.clientY - dragRef.current.startY, dragRef.current.startValue)
        }}
        onPointerUp={() => {
          dragRef.current = null
        }}
        onPointerCancel={() => {
          dragRef.current = null
        }}
        onWheel={(e) => {
          e.preventDefault()
          const dir = e.deltaY > 0 ? -1 : 1
          onChange(clampStepped(value + dir * step, min, max, step))
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowUp" || e.key === "ArrowRight") {
            e.preventDefault()
            onChange(clampStepped(value + step, min, max, step))
          } else if (e.key === "ArrowDown" || e.key === "ArrowLeft") {
            e.preventDefault()
            onChange(clampStepped(value - step, min, max, step))
          } else if (e.key === "Home") {
            e.preventDefault()
            onChange(min)
          } else if (e.key === "End") {
            e.preventDefault()
            onChange(max)
          }
        }}
      >
        <svg viewBox="0 0 100 100" className="h-full w-full drop-shadow-[0_6px_14px_rgba(0,0,0,0.45)]">
          <defs>
            <radialGradient id={gradId} cx="35%" cy="30%" r="70%">
              <stop offset="0%" stopColor="var(--muted-foreground)" stopOpacity="0.35" />
              <stop offset="55%" stopColor="var(--muted)" />
              <stop offset="100%" stopColor="var(--card)" />
            </radialGradient>
          </defs>
          <circle
            cx="50"
            cy="50"
            r="46"
            fill="var(--card)"
            stroke="var(--border)"
            strokeWidth="2"
          />
          <circle
            cx="50"
            cy="50"
            r="40"
            fill="none"
            stroke="var(--border)"
            strokeWidth="5"
            strokeLinecap="round"
            strokeDasharray={`${arcLen} ${2 * Math.PI * 40}`}
            transform="rotate(135 50 50)"
          />
          <circle
            cx="50"
            cy="50"
            r="40"
            fill="none"
            stroke="var(--primary)"
            strokeWidth="5"
            strokeLinecap="round"
            strokeDasharray={`${t * arcLen} ${2 * Math.PI * 40}`}
            transform="rotate(135 50 50)"
            className="opacity-90"
          />
          <circle
            cx="50"
            cy="50"
            r="32"
            fill={`url(#${gradId})`}
            stroke="var(--border)"
            strokeWidth="1"
          />
          <g transform={`rotate(${angle} 50 50)`}>
            <rect x="48" y="18" width="4" height="16" rx="2" fill="var(--primary)" />
            <circle cx="50" cy="50" r="4" fill="var(--background)" />
          </g>
        </svg>
      </div>
      <div className="flex items-center justify-center gap-1 text-center">
        <span className="text-[11px] font-medium leading-tight text-foreground/90">{label}</span>
        <HintIcon label={label} tip={tip} />
      </div>
    </div>
  )
}

function KnobGroup({
  title,
  hint,
  children,
}: {
  title: string
  hint: string
  children: ReactNode
}) {
  return (
    <div className="rounded-xl border border-border/70 bg-gradient-to-b from-card/50 to-card/20 p-3 sm:p-4">
      <div className="mb-3 flex items-center gap-1.5 border-b border-border/50 pb-2">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          {title}
        </p>
        <HintIcon label={title} tip={hint} />
      </div>
      <div className="flex w-full flex-wrap justify-center gap-x-3 gap-y-4 sm:justify-start sm:gap-x-4">
        {children}
      </div>
    </div>
  )
}

function HintCheckbox({
  label,
  tip,
  checked,
  onCheckedChange,
}: {
  label: string
  tip: string
  checked: boolean
  onCheckedChange: (v: boolean) => void
}) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <Checkbox checked={checked} onCheckedChange={(v) => onCheckedChange(v === true)} />
      <span className="inline-flex items-center gap-1.5">
        {label}
        <HintIcon label={label} tip={tip} />
      </span>
    </label>
  )
}

function formatTime(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return "0:00"
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  return `${m}:${s.toString().padStart(2, "0")}`
}

function MeterBar({
  label,
  tip,
  valueText,
  fill,
  hot,
}: {
  label: string
  tip: string
  valueText: string
  fill: number
  hot?: boolean
}) {
  const pct = Math.round(Math.min(1, Math.max(0, fill)) * 100)
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          {label}
          <HintIcon label={label} tip={tip} />
        </span>
        <span
          className={cn(
            "tabular-nums text-xs font-semibold tracking-tight",
            hot ? "text-primary" : "text-foreground"
          )}
        >
          {valueText}
        </span>
      </div>
      <div className="relative h-2 overflow-hidden rounded-full border border-border/60 bg-background/50 shadow-[inset_0_1px_2px_rgba(0,0,0,0.35)]">
        <div
          className={cn(
            "absolute inset-y-0 left-0 rounded-full transition-[width] duration-75 ease-out",
            hot
              ? "bg-gradient-to-r from-primary via-primary to-orange-400 shadow-[0_0_12px_color-mix(in_oklab,var(--primary)_55%,transparent)]"
              : "bg-gradient-to-r from-primary/70 via-primary to-primary/90"
          )}
          style={{ width: `${pct}%` }}
        />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.12]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(90deg, transparent 0 6px, rgba(255,255,255,0.35) 6px 7px)",
          }}
          aria-hidden
        />
      </div>
    </div>
  )
}

function LoudnessMeters({ reading, live }: { reading: MeterReading; live: boolean }) {
  const lufsFill = live ? lufsBarLevel(reading.lufs) : 0
  const tpFill = live ? truePeakBarLevel(reading.truePeakDb) : 0
  const tpHot = live && reading.truePeakDb > -1
  return (
    <div className="space-y-3 rounded-xl border border-border/70 bg-gradient-to-b from-card/55 to-card/20 p-3">
      <div className="flex items-center justify-between gap-2 border-b border-border/50 pb-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Уровень
        </p>
        <span className="text-[10px] text-muted-foreground">
          {live ? "live · текущий A/B" : "нажмите Play"}
        </span>
      </div>
      <MeterBar
        label="LUFS"
        tip="Моментальная громкость (примерно как на стриминге). Ориентир Spotify/Apple - около −14 LUFS."
        valueText={formatLufs(reading.lufs, live)}
        fill={lufsFill}
      />
      <MeterBar
        label="True Peak"
        tip="Пик с запасом (dBTP). Держите ниже −1 dBTP, чтобы на площадках не клиповало."
        valueText={formatTruePeak(reading.truePeakDb, live)}
        fill={tpFill}
        hot={tpHot}
      />
    </div>
  )
}

function ToolsMasteringInner() {
  const { user, refresh: refreshSession } = useCabinetSession()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const engineRef = useRef<LiveMasteringEngine | null>(null)
  const scrubbingRef = useRef(false)

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
  const [meter, setMeter] = useState<MeterReading>(() => silentMeterReading())
  const [presetsOpen, setPresetsOpen] = useState(true)
  const [fineTuneOpen, setFineTuneOpen] = useState(true)
  const meterFrameRef = useRef(0)

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
    if (!playing) {
      setMeter(silentMeterReading())
      return
    }
    let raf = 0
    meterFrameRef.current = 0
    const tick = () => {
      const eng = engineRef.current
      if (eng) {
        if (!scrubbingRef.current) setPlayhead(eng.currentTime)
        if (!eng.isPlaying) {
          setPlaying(false)
        } else {
          meterFrameRef.current += 1
          if (meterFrameRef.current % 2 === 0) {
            setMeter(eng.getMeterReading())
          }
        }
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

  const needsPurchase = Boolean(entitlement && !entitlement.canDownload)
  const downloadPriceRub = entitlement?.priceRub ?? TOOLS_MASTERING_DOWNLOAD_PRICE_RUB
  const downloadLabel = (() => {
    if (!entitlement) return "Скачать master WAV"
    if (entitlement.freeAvailable) return "Скачать master WAV бесплатно"
    if (needsPurchase) {
      return `Купить скачивание за ${downloadPriceRub} ₽ с баланса`
    }
    return "Скачать master WAV"
  })()

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
          title="Онлайн-мастеринг"
          className="[&_p]:max-w-none"
          description="Обработка в браузере: пресеты, громкость, EQ, компрессор и лимитер. Предпрослушивание и A/B прямо во время настройки. AI-мастеринг на заказ - отдельно в разделе услуг"
        />
      </div>

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
          <span className="min-w-0 truncate text-sm text-muted-foreground">
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

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
        <div className="order-2 min-w-0 space-y-6 xl:order-1">
          <Collapsible open={presetsOpen} onOpenChange={setPresetsOpen}>
            <section className="rounded-lg border border-border bg-card/30">
              <div
                role="button"
                tabIndex={0}
                className="flex w-full cursor-pointer items-center gap-1.5 px-4 py-3 text-left hover:bg-muted/40"
                aria-expanded={presetsOpen}
                aria-label={
                  presetsOpen ? "Свернуть пресеты и уровни" : "Развернуть пресеты и уровни"
                }
                onClick={() => setPresetsOpen((v) => !v)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault()
                    setPresetsOpen((v) => !v)
                  }
                }}
              >
                <span className="text-sm font-medium">Пресеты и уровни</span>
                <span
                  className="inline-flex"
                  onClick={(e) => e.stopPropagation()}
                  onPointerDown={(e) => e.stopPropagation()}
                  onKeyDown={(e) => e.stopPropagation()}
                >
                  <HintIcon
                    label="Пресеты и уровни"
                    tip="Быстрый старт: выберите характер звука, громкость и плотность. Тонкую настройку крутилками можно открыть ниже."
                  />
                </span>
                <ChevronDown
                  className={cn(
                    "ml-auto h-4 w-4 shrink-0 text-muted-foreground transition-transform",
                    presetsOpen && "rotate-180"
                  )}
                  aria-hidden
                />
              </div>
              <CollapsibleContent>
                <div className="space-y-4 border-t border-border px-4 py-4">
                  <p className="text-xs text-muted-foreground">
                    Выберите характер, затем подкрутите уровни. Звук в превью меняется сразу.
                  </p>
                  <div className="grid gap-3 lg:grid-cols-2">
                    <KnobGroup
                      title="Характер"
                      hint="Готовый стиль мастеринга. Выберите пресет, затем при необходимости подкрутите уровни справа."
                    >
                      <div className="grid w-full grid-cols-2 gap-2">
                        {MASTERING_PRESETS.map((preset) => {
                          const active = params.presetId === preset.id
                          return (
                            <div
                              key={preset.id}
                              className={cn(
                                "group relative flex min-h-[3.25rem] items-start gap-1 rounded-xl border px-2.5 py-2.5 transition-all",
                                active
                                  ? "border-primary bg-primary/15 shadow-[0_0_0_1px_color-mix(in_oklab,var(--primary)_40%,transparent),0_10px_24px_-14px_var(--primary)]"
                                  : "border-border/70 bg-background/35 hover:border-primary/40 hover:bg-muted/30"
                              )}
                            >
                              <button
                                type="button"
                                onClick={() => setParams((prev) => applyPreset(preset.id, prev))}
                                className="absolute inset-0 rounded-xl"
                                aria-pressed={active}
                                aria-label={`Пресет ${preset.label}`}
                              />
                              <span
                                className={cn(
                                  "pointer-events-none relative z-[1] flex-1 px-0.5 text-left text-[13px] font-medium leading-snug",
                                  active
                                    ? "text-foreground"
                                    : "text-muted-foreground group-hover:text-foreground"
                                )}
                              >
                                {preset.label}
                              </span>
                              <span className="relative z-[1] mt-0.5 shrink-0">
                                <HintIcon label={preset.label} tip={preset.hint} />
                              </span>
                              {active ? (
                                <span
                                  className="pointer-events-none absolute inset-x-3 bottom-1.5 h-px bg-gradient-to-r from-transparent via-primary/80 to-transparent"
                                  aria-hidden
                                />
                              ) : null}
                            </div>
                          )
                        })}
                      </div>
                    </KnobGroup>

                    <KnobGroup
                      title="Уровни"
                      hint="Громкость, плотность динамики и сглаживание резкости - три главных рычага без тонкой настройки."
                    >
                      <div className="flex w-full flex-col gap-3.5">
                        <LevelToggle<LoudnessLevel>
                          label="Громкость"
                          tip="Насколько громко звучит готовый мастер. High - ближе к стриминговому «громкому» звуку, Low - спокойнее и с большим запасом."
                          value={params.loudness}
                          options={[
                            { id: "low", label: "Тише" },
                            { id: "med", label: "Норма" },
                            { id: "high", label: "Громче" },
                          ]}
                          onChange={(loudness) => patchParams({ loudness })}
                        />
                        <LevelToggle<DensityLevel>
                          label="Плотность"
                          tip="Насколько сильно сжимается динамика. Выше - трек ровнее и «плотнее», ниже - больше живых пиков и тихих мест."
                          value={params.density}
                          options={[
                            { id: "low", label: "Легче" },
                            { id: "med", label: "Норма" },
                            { id: "high", label: "Плотнее" },
                          ]}
                          onChange={(density) => patchParams({ density })}
                        />
                        <LevelToggle<SmoothLevel>
                          label="Сглаживание"
                          tip="Приглушает резкую середину и яркий верх (свист, «с/ч»). В скачанном файле дополнительно чуть тише шипение в паузах."
                          value={params.smooth}
                          options={[
                            { id: "off", label: "Выкл" },
                            { id: "low", label: "Лёгкое" },
                            { id: "med", label: "Норма" },
                            { id: "high", label: "Сильное" },
                          ]}
                          onChange={(smooth) => patchParams({ smooth })}
                        />
                      </div>
                    </KnobGroup>

                    <KnobGroup
                      title="Громкость"
                      hint="Финальная громкость мастера и автоподбор уровня под выбранную громкость."
                    >
                      <RotaryKnob
                        label="Громкость"
                        tip="Ручная подстройка громкости после автоподбора. Крутите, если мастер слишком тихий или громкий."
                        value={params.outputGainDb}
                        min={-12}
                        max={12}
                        step={0.5}
                        unit=" dB"
                        onChange={(outputGainDb) => patchParams({ outputGainDb })}
                      />
                      <div className="flex min-w-[10rem] flex-col justify-center gap-3 self-center pl-1">
                        <HintCheckbox
                          label="Автогромкость"
                          tip="Сам подбирает уровень под выбранную громкость, чтобы разные треки звучали похоже по силе."
                          checked={params.magicMakeup}
                          onCheckedChange={(magicMakeup) => patchParams({ magicMakeup })}
                        />
                      </div>
                    </KnobGroup>
                  </div>
                </div>
              </CollapsibleContent>
            </section>
          </Collapsible>

          <Collapsible open={fineTuneOpen} onOpenChange={setFineTuneOpen}>
            <section className="rounded-lg border border-border bg-card/30">
              <div
                role="button"
                tabIndex={0}
                className="flex w-full cursor-pointer items-center gap-1.5 px-4 py-3 text-left hover:bg-muted/40"
                aria-expanded={fineTuneOpen}
                aria-label={
                  fineTuneOpen ? "Свернуть тонкую настройку" : "Развернуть тонкую настройку"
                }
                onClick={() => setFineTuneOpen((v) => !v)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault()
                    setFineTuneOpen((v) => !v)
                  }
                }}
              >
                <span className="text-sm font-medium">Тонкая настройка</span>
                <span
                  className="inline-flex"
                  onClick={(e) => e.stopPropagation()}
                  onPointerDown={(e) => e.stopPropagation()}
                  onKeyDown={(e) => e.stopPropagation()}
                >
                  <HintIcon
                    label="Тонкая настройка"
                    tip="Для тех, кто хочет подкрутить звук вручную. Если не уверены - оставьте пресет и сглаживание."
                  />
                </span>
                <ChevronDown
                  className={cn(
                    "ml-auto h-4 w-4 shrink-0 text-muted-foreground transition-transform",
                    fineTuneOpen && "rotate-180"
                  )}
                  aria-hidden
                />
              </div>
              <CollapsibleContent>
                <div className="space-y-4 border-t border-border px-4 py-4">
                  <p className="text-xs text-muted-foreground">
                    Тяните крутилки вверх/вниз или крутите колесом мыши. Группы как в VST: тон,
                    динамика, окрас, лимитер.
                  </p>
                  <div className="grid gap-3 lg:grid-cols-2">
                    <KnobGroup
                      title="Тон / EQ"
                      hint="Баланс частот: обрезка гула, низ, середина и яркость верха."
                    >
                      <RotaryKnob
                        label="Обрезка низа"
                        tip="Убирает лишний гул и шум ниже выбранной частоты. Чуть выше - чище низ, но можно потерять «тело» баса."
                        value={params.hpfHz}
                        min={20}
                        max={120}
                        step={1}
                        unit=" Hz"
                        onChange={(hpfHz) => patchParams({ hpfHz })}
                      />
                      <RotaryKnob
                        label="Низ"
                        tip="Поднимает или опускает бас и «тело» трека. В плюс - мощнее низ, в минус - легче и суше."
                        value={params.lfShelfDb}
                        min={-6}
                        max={6}
                        step={0.1}
                        unit=" dB"
                        onChange={(lfShelfDb) => patchParams({ lfShelfDb })}
                      />
                      <RotaryKnob
                        label="Середина"
                        tip="Акцент на голосе и основных инструментах. В плюс - плотнее и ближе, в минус - мягче и дальше."
                        value={params.mfPeakDb}
                        min={-6}
                        max={6}
                        step={0.1}
                        unit=" dB"
                        onChange={(mfPeakDb) => patchParams({ mfPeakDb })}
                      />
                      <RotaryKnob
                        label="Верх"
                        tip="Яркость и воздух. В плюс - звонче и детальнее, в минус - теплее и спокойнее."
                        value={params.hfShelfDb}
                        min={-6}
                        max={6}
                        step={0.1}
                        unit=" dB"
                        onChange={(hfShelfDb) => patchParams({ hfShelfDb })}
                      />
                    </KnobGroup>

                    <KnobGroup
                      title="Динамика"
                      hint="Компрессор: порог, сила, атака и восстановление - как громкость «прижимается»."
                    >
                      <RotaryKnob
                        label="Порог"
                        tip="С какого уровня включается компрессор. Ниже (например -20) - сильнее выравнивает громкость."
                        value={params.thresholdDb}
                        min={-40}
                        max={0}
                        step={0.5}
                        unit=" dB"
                        onChange={(thresholdDb) => patchParams({ thresholdDb })}
                      />
                      <RotaryKnob
                        label="Сила"
                        tip="Насколько сильно прижимаются громкие моменты. Выше - ровнее и плотнее, но меньше «живости»."
                        value={params.ratio}
                        min={1.1}
                        max={10}
                        step={0.1}
                        onChange={(ratio) => patchParams({ ratio })}
                      />
                      <RotaryKnob
                        label="Атака"
                        tip="Как быстро срабатывает сжатие. Быстрее - плотнее и контролируемее, медленнее - больше остроты атак."
                        value={params.attackMs}
                        min={1}
                        max={100}
                        step={1}
                        unit=" ms"
                        onChange={(attackMs) => patchParams({ attackMs })}
                      />
                      <RotaryKnob
                        label="Восстановление"
                        tip="Как быстро компрессор отпускает после пика. Быстрее - живее, медленнее - ровнее и спокойнее."
                        value={params.releaseMs}
                        min={20}
                        max={400}
                        step={5}
                        unit=" ms"
                        onChange={(releaseMs) => patchParams({ releaseMs })}
                      />
                    </KnobGroup>

                    <KnobGroup
                      title="Окрас"
                      hint="Ширина стерео и насыщенность - объём и «тепло» звука."
                    >
                      <RotaryKnob
                        label="Стерео"
                        tip="1 - как в исходнике, выше - шире и объёмнее, ниже - уже, ближе к моно. Слишком широко может «плыть» на телефоне."
                        value={params.stereoWidth}
                        min={0}
                        max={2}
                        step={0.05}
                        onChange={(stereoWidth) => patchParams({ stereoWidth })}
                      />
                      <RotaryKnob
                        label="Насыщенность"
                        tip="Добавляет плотность и «тепло» за счёт мягкого искажения. Сильнее - жирнее и горячее, но можно пережать."
                        value={params.saturation}
                        min={0}
                        max={5}
                        step={0.1}
                        onChange={(saturation) => patchParams({ saturation })}
                      />
                    </KnobGroup>

                    <KnobGroup
                      title="Лимитер"
                      hint="Потолок громкости и финальные опции перед скачиванием."
                    >
                      <RotaryKnob
                        label="Потолок"
                        tip="Максимальная громкость на выходе, чтобы не было клиппинга. Чуть ниже нуля - безопаснее для площадок."
                        value={params.ceilingDb}
                        min={-3}
                        max={0}
                        step={0.1}
                        unit=" dB"
                        onChange={(ceilingDb) => patchParams({ ceilingDb })}
                      />
                      <div className="flex min-w-[10rem] flex-col justify-center gap-3 self-center pl-1">
                        <HintCheckbox
                          label="Мягкий клип"
                          tip="Плавно ограничивает самые громкие пики вместо жёсткого обрезания - звук плотнее и без треска."
                          checked={params.softClip}
                          onCheckedChange={(softClip) => patchParams({ softClip })}
                        />
                        <HintCheckbox
                          label="Моно-бас (в скачивании)"
                          tip="Собирает низ в центр. Трек стабильнее на телефонах и в клубе. Действует в скачанном файле."
                          checked={params.monoBass}
                          onCheckedChange={(monoBass) => patchParams({ monoBass })}
                        />
                      </div>
                    </KnobGroup>
                  </div>
                </div>
              </CollapsibleContent>
            </section>
          </Collapsible>
        </div>

        <aside className="sticky top-16 z-10 order-1 min-w-0 self-start xl:order-2">
          <div className="space-y-4 rounded-lg border border-border bg-background/95 p-4 shadow-sm backdrop-blur-md supports-[backdrop-filter]:bg-background/85">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <p className="text-sm font-medium">Предпрослушивание</p>
                <HintIcon
                  label="Предпрослушивание"
                  tip="Слушайте результат до скачивания. A - исходник, B - с мастерингом. Крутилки меняют звук сразу в режиме B."
                />
              </div>
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
              Двигайте настройки во время воспроизведения - звук меняется сразу (B).
            </p>

            <div className="flex flex-wrap items-center gap-3">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-11 w-11 shrink-0"
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
                <Slider
                  value={[Math.min(playhead, duration || 0)]}
                  min={0}
                  max={duration > 0 ? duration : 1}
                  step={0.01}
                  disabled={loadState !== "ready" || duration <= 0}
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

            <LoudnessMeters reading={meter} live={playing && loadState === "ready"} />

            {error ? <p className="text-sm text-destructive">{error}</p> : null}

            <div className="flex flex-col gap-2">
              <Button
                type="button"
                onClick={() => {
                  if (needsPurchase) {
                    setPayDialogOpen(true)
                    return
                  }
                  void handleDownload()
                }}
                disabled={needsPurchase ? paying : busy || loadState !== "ready"}
                className="w-full"
              >
                {busy || paying ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : needsPurchase ? null : (
                  <Download className="mr-2 h-4 w-4" />
                )}
                {downloadLabel}
              </Button>
              <Button type="button" variant="ghost" asChild className="w-full">
                <Link href="/cabinet/design/mastering">AI-мастеринг на заказ</Link>
              </Button>
            </div>
          </div>
        </aside>
      </div>

      <Dialog open={payDialogOpen} onOpenChange={setPayDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Скачивание мастера</DialogTitle>
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
