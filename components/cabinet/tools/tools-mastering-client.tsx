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
import {
  ArrowLeft,
  ChevronDown,
  CircleHelp,
  Download,
  Loader2,
  Pause,
  Play,
  Sparkles,
  Upload,
} from "lucide-react"
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
  applyPresetAmount,
  DEFAULT_MASTERING_PARAMS,
  isAiCleanPreset,
  isManualPreset,
  MANUAL_PRESET_ID,
  MASTERING_PRESETS,
  patchTouchesTone,
  type DensityLevel,
  type LoudnessLevel,
  type MasteringParams,
  type SmoothLevel,
} from "@/lib/tools-mastering-params"
import { AI_CLEAN_LIMITS } from "@/lib/tools-mastering-spectral-clean"
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
  disabled = false,
}: {
  label: string
  tip: string
  value: number
  min: number
  max: number
  step: number
  unit?: string
  onChange: (v: number) => void
  disabled?: boolean
}) {
  const gradId = useId().replace(/:/g, "")
  const dragRef = useRef<{ startY: number; startValue: number } | null>(null)
  const t = max === min ? 0 : (value - min) / (max - min)
  const angle = -135 + Math.min(1, Math.max(0, t)) * 270
  const arcLen = 270 * (Math.PI / 180) * 40

  const applyFromDeltaY = (deltaY: number, startValue: number) => {
    if (disabled) return
    const range = max - min
    const next = startValue - (deltaY / 110) * range
    onChange(clampStepped(next, min, max, step))
  }

  return (
    <div
      className={cn(
        "flex w-[5.5rem] flex-col items-center gap-1.5 sm:w-[6rem]",
        disabled && "pointer-events-none opacity-45"
      )}
    >
      <p className="tabular-nums text-[11px] font-medium text-primary">{formatKnobValue(value, unit)}</p>
      <div
        role="slider"
        tabIndex={disabled ? -1 : 0}
        aria-disabled={disabled || undefined}
        aria-label={label}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        aria-valuetext={formatKnobValue(value, unit)}
        className="relative h-[4.25rem] w-[4.25rem] cursor-ns-resize touch-none select-none outline-none focus-visible:ring-2 focus-visible:ring-primary/50 sm:h-[4.75rem] sm:w-[4.75rem]"
        onPointerDown={(e) => {
          if (disabled) return
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
          if (disabled) return
          e.preventDefault()
          const dir = e.deltaY > 0 ? -1 : 1
          onChange(clampStepped(value + dir * step, min, max, step))
        }}
        onKeyDown={(e) => {
          if (disabled) return
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

function CompactMeter({
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
    <div className="flex w-[6.5rem] shrink-0 flex-col gap-0.5">
      <div className="flex items-center justify-between gap-1">
        <span className="inline-flex items-center gap-0.5 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
          <HintIcon label={label} tip={tip} />
        </span>
        <span
          className={cn(
            "tabular-nums text-[10px] font-semibold",
            hot ? "text-primary" : "text-foreground"
          )}
        >
          {valueText}
        </span>
      </div>
      <div className="h-1 overflow-hidden rounded-full bg-muted">
        <div
          className={cn(
            "h-full rounded-full transition-[width] duration-75",
            hot ? "bg-primary" : "bg-primary/80"
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

function CompactLoudnessMeters({ reading, live }: { reading: MeterReading; live: boolean }) {
  const lufsFill = live ? lufsBarLevel(reading.lufs) : 0
  const tpFill = live ? truePeakBarLevel(reading.truePeakDb) : 0
  const tpHot = live && reading.truePeakDb > -1
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <CompactMeter
        label="LUFS"
        tip="Моментальная громкость (примерно как на стриминге). Ориентир Spotify/Apple - около -14 LUFS."
        valueText={formatLufs(reading.lufs, live)}
        fill={lufsFill}
      />
      <CompactMeter
        label="TP"
        tip="True Peak (dBTP). Держите ниже -1 dBTP, чтобы на площадках не клиповало."
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
  const [renderPercent, setRenderPercent] = useState(0)
  const [renderLabel, setRenderLabel] = useState("")
  const renderAbortRef = useRef<AbortController | null>(null)

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
      renderAbortRef.current?.abort()
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
    setParams((prev) => {
      const next = { ...prev, ...patch }
      // Ручная правка тона снимает готовый характер - иначе интенсивность всё перетрёт.
      if (patchTouchesTone(patch) && !isManualPreset(prev.presetId)) {
        next.presetId = MANUAL_PRESET_ID
        next.presetAmount = 0
      }
      return next
    })
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

  const togglePlayRef = useRef(togglePlay)
  togglePlayRef.current = togglePlay

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code !== "Space" && e.key !== " ") return
      if (e.altKey || e.ctrlKey || e.metaKey) return
      const target = e.target
      if (target instanceof HTMLElement) {
        const tag = target.tagName
        if (
          tag === "INPUT" ||
          tag === "TEXTAREA" ||
          tag === "SELECT" ||
          target.isContentEditable
        ) {
          return
        }
      }
      e.preventDefault()
      void togglePlayRef.current()
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [])

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

    if (isAiCleanPreset(params.presetId) && duration > AI_CLEAN_LIMITS.maxDurationSec) {
      const maxMin = Math.round(AI_CLEAN_LIMITS.maxDurationSec / 60)
      toast.error(`Для очистки AI-трека максимум ${maxMin} мин. Обрежьте файл или выберите другой характер.`)
      return
    }

    renderAbortRef.current?.abort()
    const abort = new AbortController()
    renderAbortRef.current = abort

    setBusy(true)
    setError(null)
    setRenderPercent(0)
    setRenderLabel(isAiCleanPreset(params.presetId) ? "Подготовка очистки…" : "Рендер…")
    try {
      const rendered = await renderMasteredWav(file, params, {
        signal: abort.signal,
        onProgress: (p) => {
          setRenderPercent(Math.round(p.ratio * 100))
          setRenderLabel(p.label)
        },
      })

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
          : isAiCleanPreset(params.presetId)
            ? "Очищенный мастер скачан"
            : "Мастер скачан"
      )
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") {
        toast.message("Рендер отменён")
        return
      }
      const message = e instanceof Error ? e.message : "Ошибка обработки"
      setError(message)
      toast.error(message)
    } finally {
      setBusy(false)
      setRenderPercent(0)
      setRenderLabel("")
      if (renderAbortRef.current === abort) renderAbortRef.current = null
    }
  }

  const aiCleanActive = isAiCleanPreset(params.presetId)

  const needsPurchase = Boolean(entitlement && !entitlement.canDownload)
  const downloadPriceRub = entitlement?.priceRub ?? TOOLS_MASTERING_DOWNLOAD_PRICE_RUB
  const downloadLabel = (() => {
    const base = aiCleanActive ? "Скачать очищенный WAV" : "Скачать master WAV"
    if (!entitlement) return base
    if (entitlement.freeAvailable) return `${base} бесплатно`
    if (needsPurchase) {
      return `Скачать (${downloadPriceRub} р)`
    }
    return base
  })()

  return (
    <div className="flex w-full min-w-0 max-w-none flex-col gap-4">
      <div className="space-y-2">
        <Link
          href="/cabinet/tools"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          К инструментам
        </Link>
        <PageHeader title="Онлайн-мастеринг" className="mb-0 sm:mb-0" />
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".wav,audio/wav,audio/x-wav"
        className="hidden"
        onChange={(e) => void onPickFile(e.target.files?.[0] ?? null)}
      />

      <div className="sticky top-0 z-20 w-full min-w-0 rounded-lg border border-border/70 bg-background/92 px-3 py-2.5 shadow-[0_8px_24px_rgba(0,0,0,0.28)] backdrop-blur-xl supports-[backdrop-filter]:bg-background/80 sm:px-4">
        <div className="flex min-w-0 flex-col gap-2">
          <div className="flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 shrink-0"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="mr-1.5 h-3.5 w-3.5" />
              {file ? "Файл" : "WAV"}
            </Button>
            <span
              className={cn(
                "min-w-0 max-w-[9rem] truncate text-xs sm:max-w-[14rem]",
                loadState === "ready" ? "text-emerald-400" : "text-muted-foreground"
              )}
              title={file?.name}
            >
              {loadState === "ready"
                ? file?.name || "Готово"
                : file
                  ? file.name
                  : "Файл не выбран"}
            </span>

            <div className="hidden h-5 w-px shrink-0 bg-border sm:block" aria-hidden />

            <div className="inline-flex shrink-0 rounded-md border border-border p-0.5">
              <button
                type="button"
                className={cn(
                  "rounded px-2 py-1 text-[11px] font-semibold",
                  abMode === "A"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
                onClick={() => switchAb("A")}
                disabled={loadState !== "ready"}
              >
                A
              </button>
              <button
                type="button"
                className={cn(
                  "rounded px-2 py-1 text-[11px] font-semibold",
                  abMode === "B"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
                onClick={() => switchAb("B")}
                disabled={loadState !== "ready"}
              >
                B
              </button>
            </div>
            <HintIcon
              label="A/B"
              tip="A - исходник, B - мастер. Крутилки меняют звук сразу в режиме B."
            />

            <div className="hidden h-5 w-px shrink-0 bg-border md:block" aria-hidden />

            <button
              type="button"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground disabled:opacity-40"
              disabled={loadState !== "ready"}
              aria-label={playing ? "Пауза" : "Воспроизвести"}
              onClick={() => void togglePlay()}
            >
              {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5 translate-x-px" />}
            </button>
            <div className="flex w-full min-w-[10rem] max-w-md flex-1 basis-[12rem] items-center gap-2">
              <span className="w-8 shrink-0 text-right text-[10px] tabular-nums text-muted-foreground">
                {formatTime(playhead)}
              </span>
              <Slider
                value={[Math.min(playhead, duration || 0)]}
                min={0}
                max={duration > 0 ? duration : 1}
                step={0.01}
                disabled={loadState !== "ready" || duration <= 0}
                aria-label="Позиция воспроизведения"
                className="flex-1"
                onValueChange={(value) => {
                  scrubbingRef.current = true
                  setPlayhead(value[0] ?? 0)
                }}
                onValueCommit={(value) => {
                  scrubbingRef.current = false
                  void seekTo(value[0] ?? 0)
                }}
              />
              <span className="w-8 shrink-0 text-[10px] tabular-nums text-muted-foreground">
                {formatTime(duration)}
              </span>
            </div>

            <div className="hidden h-5 w-px shrink-0 bg-border lg:block" aria-hidden />

            <CompactLoudnessMeters reading={meter} live={playing && loadState === "ready"} />

            <div className="flex shrink-0 flex-col items-stretch gap-1.5 sm:items-end">
              {busy && renderLabel ? (
                <div className="w-full min-w-[10rem] space-y-1 sm:w-44">
                  <div className="flex items-center justify-between gap-2 text-[10px] text-muted-foreground">
                    <span className="truncate">{renderLabel}</span>
                    <span className="tabular-nums">{renderPercent}%</span>
                  </div>
                  <Progress value={renderPercent} className="h-1.5" />
                </div>
              ) : null}
              <Button
                type="button"
                size="sm"
                className="h-8 shrink-0"
                onClick={() => {
                  if (needsPurchase) {
                    setPayDialogOpen(true)
                    return
                  }
                  void handleDownload()
                }}
                disabled={needsPurchase ? paying : busy || loadState !== "ready"}
              >
                {busy || paying ? (
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                ) : needsPurchase ? null : (
                  <Download className="mr-1.5 h-3.5 w-3.5" />
                )}
                {downloadLabel}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-8 shrink-0 border-primary/45 bg-primary/10 text-primary hover:bg-primary/20 hover:text-primary"
                asChild
              >
                <Link href="/cabinet/design/mastering">
                  <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                  AI-мастеринг на заказ
                </Link>
              </Button>
            </div>
          </div>

          {loadState === "loading" ? (
            <div className="space-y-1">
              <div className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
                <span>{loadPhase}</span>
                <span className="tabular-nums">{loadPercent}%</span>
              </div>
              <Progress value={loadPercent} className="h-1" />
            </div>
          ) : null}

          {error ? <p className="text-xs text-destructive">{error}</p> : null}

          <p className="text-[11px] text-muted-foreground">
            Настройки меняют звук сразу в режиме B
          </p>
        </div>
      </div>

      <div className="min-w-0 space-y-3">
          <Collapsible open={presetsOpen} onOpenChange={setPresetsOpen}>
            <section className="rounded-lg border border-border bg-card/40">
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
                    tip="Можно начать без характера и крутить настройки вручную, либо выбрать готовый стиль. Громкость и плотность - отдельно."
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
                    По умолчанию без характера - звук почти как исходник. Выберите стиль или доведите
                    крутилками ниже.
                  </p>
                  <div className="grid gap-3 lg:grid-cols-2">
                    <KnobGroup
                      title="Характер"
                      hint='Готовый стиль мастеринга. "Без характера" - ручной режим: тон не подменяется пресетом. Интенсивность работает только у готовых стилей.'
                    >
                      <div className="flex w-full flex-col gap-3">
                        <div className="grid w-full grid-cols-2 gap-2">
                          {MASTERING_PRESETS.map((preset) => {
                            const active = params.presetId === preset.id
                            const manual = isManualPreset(preset.id)
                            const aiClean = isAiCleanPreset(preset.id)
                            return (
                              <div
                                key={preset.id}
                                className={cn(
                                  "group relative flex min-h-[3.25rem] items-start gap-1 rounded-xl border px-2.5 py-2.5 transition-all",
                                  active
                                    ? "border-primary bg-primary/15 shadow-[0_0_0_1px_color-mix(in_oklab,var(--primary)_40%,transparent),0_10px_24px_-14px_var(--primary)]"
                                    : "border-border/70 bg-background/35 hover:border-primary/40 hover:bg-muted/30",
                                  (manual || aiClean) && "col-span-2"
                                )}
                              >
                                <button
                                  type="button"
                                  onClick={() =>
                                    setParams((prev) =>
                                      applyPreset(
                                        preset.id,
                                        prev,
                                        isManualPreset(preset.id) ? 0 : prev.presetAmount || 100
                                      )
                                    )
                                  }
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
                        <div className="flex items-center justify-center gap-4 border-t border-border/40 pt-3 sm:justify-start">
                          <RotaryKnob
                            label="Интенсивность"
                            tip='Насколько сильно применён выбранный характер. В режиме "Без характера" не используется - крутите тонкую настройку.'
                            value={params.presetAmount}
                            min={0}
                            max={100}
                            step={1}
                            unit="%"
                            disabled={isManualPreset(params.presetId) || aiCleanActive}
                            onChange={(presetAmount) =>
                              setParams((prev) => applyPresetAmount(prev, presetAmount))
                            }
                          />
                          <p className="max-w-[12rem] text-[11px] leading-snug text-muted-foreground">
                            {isManualPreset(params.presetId)
                              ? "Характер выключен. Настраивайте EQ, компрессор и окрас вручную ниже."
                              : aiCleanActive
                                ? "В этом режиме характер фиксирован: спектр + мягкий лимит при скачивании."
                                : "Подмешивание характера к нейтральной обработке."}
                          </p>
                        </div>
                        {aiCleanActive ? (
                          <div className="rounded-lg border border-primary/30 bg-primary/10 px-3 py-2.5 text-[12px] leading-snug text-foreground/90">
                            <p className="font-medium">Очистка AI-фонограмм</p>
                            <p className="mt-1 text-muted-foreground">
                              Спектральный шаг выполняется в фоне при скачивании (до{" "}
                              {Math.round(AI_CLEAN_LIMITS.maxDurationSec / 60)} мин), чтобы вкладка
                              не зависала. В плеере сейчас слышна только цепочка мастеринга без
                              спектральной очистки. Автоматика может чуть задеть тихие детали -
                              перед релизом послушайте файл.
                            </p>
                          </div>
                        ) : null}
                      </div>
                    </KnobGroup>

                    <KnobGroup
                      title="Уровни"
                      hint="Громкость (цель + подстройка), плотность динамики и сглаживание резкости."
                    >
                      <div className="flex w-full flex-col gap-3.5">
                        <div className="space-y-3 rounded-lg border border-border/50 bg-muted/15 p-3">
                          <LevelToggle<LoudnessLevel>
                            label="Громкость"
                            tip='Цель громкости мастера. При включённой автогромкости под эту цель подбирается уровень. Тише - спокойнее, Громче - ближе к стриминговому "громкому" звуку.'
                            value={params.loudness}
                            options={[
                              { id: "low", label: "Тише" },
                              { id: "med", label: "Норма" },
                              { id: "high", label: "Громче" },
                            ]}
                            onChange={(loudness) => patchParams({ loudness })}
                          />
                          <div className="flex flex-wrap items-center gap-4 border-t border-border/40 pt-3">
                            <RotaryKnob
                              label="Подстройка"
                              tip="Ручная добавка к громкости (дБ). Работает вместе с целью Тише/Норма/Громче и автогромкостью."
                              value={params.outputGainDb}
                              min={-12}
                              max={12}
                              step={0.5}
                              unit=" dB"
                              onChange={(outputGainDb) => patchParams({ outputGainDb })}
                            />
                            <div className="flex min-w-[10rem] flex-col justify-center gap-2">
                              <HintCheckbox
                                label="Автогромкость"
                                tip="Подгоняет уровень под выбранную цель (Тише / Норма / Громче), чтобы разные треки звучали похоже по силе. Крутилка Подстройка добавляется сверху."
                                checked={params.magicMakeup}
                                onCheckedChange={(magicMakeup) => patchParams({ magicMakeup })}
                              />
                              <p className="max-w-[14rem] text-[11px] leading-snug text-muted-foreground">
                                Тише / Норма / Громче - цель. Подстройка и автогромкость - к ней.
                              </p>
                            </div>
                          </div>
                        </div>
                        <LevelToggle<DensityLevel>
                          label="Плотность"
                          tip='Насколько сильно сжимается динамика. Выше - трек ровнее и "плотнее", ниже - больше живых пиков и тихих мест. Не путать с громкостью.'
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
                          tip='Приглушает резкую середину и яркий верх (свист, "с/ч"). В скачанном файле дополнительно чуть тише шипение в паузах.'
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
                  </div>
                </div>
              </CollapsibleContent>
            </section>
          </Collapsible>

          <Collapsible open={fineTuneOpen} onOpenChange={setFineTuneOpen}>
            <section className="rounded-lg border border-border bg-card/40">
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
                    tip='Ручная доводка звука. Любая правка тона переключает характер в "Без характера", чтобы пресет не перетёр ваши настройки.'
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
                    Тяните крутилки вверх/вниз или крутите колесом мыши. В режиме "Без характера"
                    здесь основной контроль звука: тон, динамика, окрас, лимитер.
                  </p>
                  <div className="grid gap-3 lg:grid-cols-2">
                    <KnobGroup
                      title="Тон / EQ"
                      hint="Баланс частот: обрезка гула, низ, середина и яркость верха."
                    >
                      <RotaryKnob
                        label="Обрезка низа"
                        tip='Убирает лишний гул и шум ниже выбранной частоты. Чуть выше - чище низ, но можно потерять "тело" баса.'
                        value={params.hpfHz}
                        min={20}
                        max={120}
                        step={1}
                        unit=" Hz"
                        onChange={(hpfHz) => patchParams({ hpfHz })}
                      />
                      <RotaryKnob
                        label="Низ"
                        tip='Поднимает или опускает бас и "тело" трека. В плюс - мощнее низ, в минус - легче и суше.'
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
                      hint='Компрессор: порог, сила, атака и восстановление - как громкость "прижимается".'
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
                        tip='Насколько сильно прижимаются громкие моменты. Выше - ровнее и плотнее, но меньше "живости".'
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
                      hint='Ширина стерео и насыщенность - объём и "тепло" звука.'
                    >
                      <RotaryKnob
                        label="Стерео"
                        tip='1 - как в исходнике, выше - шире и объёмнее, ниже - уже, ближе к моно. Слишком широко может "плыть" на телефоне.'
                        value={params.stereoWidth}
                        min={0}
                        max={2}
                        step={0.05}
                        onChange={(stereoWidth) => patchParams({ stereoWidth })}
                      />
                      <RotaryKnob
                        label="Насыщенность"
                        tip='Добавляет плотность и "тепло" за счёт мягкого искажения. Сильнее - жирнее и горячее, но можно пережать.'
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
