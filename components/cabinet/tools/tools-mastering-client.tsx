"use client"

import { Suspense, useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { ArrowLeft, CircleHelp, Download, Loader2, Pause, Play, Upload } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
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
        <p className="text-sm font-medium">{label}</p>
        <HintIcon label={label} tip={tip} />
      </div>
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
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2 text-sm">
        <span className="inline-flex items-center gap-1.5 font-medium">
          {label}
          <HintIcon label={label} tip={tip} />
        </span>
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
          className="[&_p]:max-w-none"
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
              <div className="flex items-center gap-1.5">
                <p className="text-sm font-medium">Пресет</p>
                <HintIcon
                  label="Пресет"
                  tip="Готовый характер звука. Выберите стиль, затем при необходимости подкрутите громкость и сглаживание."
                />
              </div>
              <div className="flex flex-wrap gap-2">
                {MASTERING_PRESETS.map((preset) => (
                  <div key={preset.id} className="inline-flex items-center gap-1">
                    <button
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
                    <HintIcon label={preset.label} tip={preset.hint} />
                  </div>
                ))}
              </div>
            </div>

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
              tip="Смягчает резкость, свистящие «с/ч» и шипение. В превью - резкость и свист; в скачанном файле также чуть тише шипение в паузах."
              value={params.smooth}
              options={[
                { id: "off", label: "Выкл" },
                { id: "low", label: "Лёгкое" },
                { id: "med", label: "Норма" },
                { id: "high", label: "Сильное" },
              ]}
              onChange={(smooth) => patchParams({ smooth })}
            />

            <ParamSlider
              label="Выходная громкость"
              tip="Ручная подстройка громкости после автоподбора. Двигайте, если мастер слишком тихий или громкий."
              value={params.outputGainDb}
              min={-12}
              max={12}
              step={0.5}
              unit=" dB"
              onChange={(outputGainDb) => patchParams({ outputGainDb })}
            />

            <HintCheckbox
              label="Автогромкость"
              tip="Сам подбирает уровень под выбранную громкость, чтобы разные треки звучали похоже по силе."
              checked={params.magicMakeup}
              onCheckedChange={(magicMakeup) => patchParams({ magicMakeup })}
            />
          </section>

          <section className="space-y-4 rounded-lg border border-border bg-card/30 p-4">
            <div className="flex items-center gap-1.5">
              <p className="text-sm font-medium">Тонкая настройка</p>
              <HintIcon
                label="Тонкая настройка"
                tip="Для тех, кто хочет подкрутить звук вручную. Если не уверены - оставьте пресет и сглаживание."
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <ParamSlider
                label="Обрезка низа"
                tip="Убирает лишний гул и шум ниже выбранной частоты. Чуть выше - чище низ, но можно потерять «тело» баса."
                value={params.hpfHz}
                min={20}
                max={120}
                step={1}
                unit=" Hz"
                onChange={(hpfHz) => patchParams({ hpfHz })}
              />
              <ParamSlider
                label="Низ"
                tip="Поднимает или опускает бас и «тело» трека. В плюс - мощнее низ, в минус - легче и суше."
                value={params.lfShelfDb}
                min={-6}
                max={6}
                step={0.1}
                unit=" dB"
                onChange={(lfShelfDb) => patchParams({ lfShelfDb })}
              />
              <ParamSlider
                label="Середина"
                tip="Акцент на голосе и основных инструментах. В плюс - плотнее и ближе, в минус - мягче и дальше."
                value={params.mfPeakDb}
                min={-6}
                max={6}
                step={0.1}
                unit=" dB"
                onChange={(mfPeakDb) => patchParams({ mfPeakDb })}
              />
              <ParamSlider
                label="Верх"
                tip="Яркость и воздух. В плюс - звонче и детальнее, в минус - теплее и спокойнее."
                value={params.hfShelfDb}
                min={-6}
                max={6}
                step={0.1}
                unit=" dB"
                onChange={(hfShelfDb) => patchParams({ hfShelfDb })}
              />
              <ParamSlider
                label="Ширина стерео"
                tip="1 - как в исходнике, выше - шире и объёмнее, ниже - уже, ближе к моно. Слишком широко может «плыть» на телефоне."
                value={params.stereoWidth}
                min={0}
                max={2}
                step={0.05}
                onChange={(stereoWidth) => patchParams({ stereoWidth })}
              />
              <ParamSlider
                label="Насыщенность"
                tip="Добавляет плотность и «тепло» за счёт мягкого искажения. Сильнее - жирнее и горячее, но можно пережать."
                value={params.saturation}
                min={0}
                max={5}
                step={0.1}
                onChange={(saturation) => patchParams({ saturation })}
              />
              <ParamSlider
                label="Порог сжатия"
                tip="С какого уровня включается компрессор. Ниже (например −20) - сильнее выравнивает громкость."
                value={params.thresholdDb}
                min={-40}
                max={0}
                step={0.5}
                unit=" dB"
                onChange={(thresholdDb) => patchParams({ thresholdDb })}
              />
              <ParamSlider
                label="Сила сжатия"
                tip="Насколько сильно прижимаются громкие моменты. Выше - ровнее и плотнее, но меньше «живости»."
                value={params.ratio}
                min={1.1}
                max={10}
                step={0.1}
                onChange={(ratio) => patchParams({ ratio })}
              />
              <ParamSlider
                label="Атака"
                tip="Как быстро срабатывает сжатие. Быстрее - плотнее и контролируемее, медленнее - больше остроты атак."
                value={params.attackMs}
                min={1}
                max={100}
                step={1}
                unit=" ms"
                onChange={(attackMs) => patchParams({ attackMs })}
              />
              <ParamSlider
                label="Восстановление"
                tip="Как быстро компрессор отпускает после пика. Быстрее - живее, медленнее - ровнее и спокойнее."
                value={params.releaseMs}
                min={20}
                max={400}
                step={5}
                unit=" ms"
                onChange={(releaseMs) => patchParams({ releaseMs })}
              />
              <ParamSlider
                label="Потолок"
                tip="Максимальная громкость на выходе, чтобы не было клиппинга. Чуть ниже нуля - безопаснее для площадок."
                value={params.ceilingDb}
                min={-3}
                max={0}
                step={0.1}
                unit=" dB"
                onChange={(ceilingDb) => patchParams({ ceilingDb })}
              />
            </div>
            <div className="flex flex-wrap gap-4">
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
          </section>
        </div>

        <aside className="min-w-0 space-y-4 xl:sticky xl:top-4 xl:self-start">
          <section className="space-y-4 rounded-lg border border-border bg-card/30 p-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <p className="text-sm font-medium">Предпрослушивание</p>
                <HintIcon
                  label="Предпрослушивание"
                  tip="Слушайте результат до скачивания. A - исходник, B - с мастерингом. Ползунок перематывает трек."
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
