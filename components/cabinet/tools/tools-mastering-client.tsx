"use client"

import { Suspense, useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { ArrowLeft, Download, Loader2, Upload } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
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
import { renderMasteredWav } from "@/lib/tools-mastering-render"

type EntitlementState = ToolsMasteringEntitlement | null

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

function ToolsMasteringInner() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const paymentHandledRef = useRef(false)

  const [file, setFile] = useState<File | null>(null)
  const [params, setParams] = useState<MasteringParams>(DEFAULT_MASTERING_PARAMS)
  const [entitlement, setEntitlement] = useState<EntitlementState>(null)
  const [busy, setBusy] = useState(false)
  const [paying, setPaying] = useState(false)
  const [payDialogOpen, setPayDialogOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
    const paymentState = searchParams.get("payment")
    const orderId = searchParams.get("orderId")
    if (!paymentState || !orderId || paymentHandledRef.current) return
    paymentHandledRef.current = true

    void (async () => {
      if (paymentState === "fail") {
        toast.error("Оплата не завершена")
        router.replace(pathname)
        return
      }
      try {
        const res = await fetch(
          `/api/cabinet/payments/order-status?orderId=${encodeURIComponent(orderId)}`,
          { credentials: "include" }
        )
        const data = (await res.json().catch(() => ({}))) as { paid?: boolean }
        if (res.ok && data.paid) {
          toast.success("Оплата прошла - можно скачать мастер")
          await refreshEntitlement()
        } else {
          toast.error("Платёж ещё не подтверждён, обновите страницу через минуту")
        }
      } catch {
        toast.error("Не удалось проверить оплату")
      } finally {
        router.replace(pathname)
      }
    })()
  }, [searchParams, pathname, router, refreshEntitlement])

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
  }

  const patchParams = (patch: Partial<MasteringParams>) => {
    setParams((prev) => ({ ...prev, ...patch }))
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

  const startPayment = async () => {
    setPaying(true)
    try {
      const res = await fetch("/api/cabinet/payments/tools-mastering/create", {
        method: "POST",
        credentials: "include",
      })
      const data = (await res.json().catch(() => ({}))) as {
        confirmationUrl?: string
        error?: string
      }
      if (!res.ok || !data.confirmationUrl) {
        toast.error(data.error || "Не удалось создать платёж")
        return
      }
      window.location.href = data.confirmationUrl
    } catch {
      toast.error("Не удалось создать платёж")
    } finally {
      setPaying(false)
    }
  }

  const handleDownload = async () => {
    if (!file) {
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
    return `Бесплатное использовано. Следующее скачивание - ${TOOLS_MASTERING_DOWNLOAD_PRICE_RUB} ₽`
  })()

  return (
    <div className="w-full max-w-4xl space-y-6">
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
          description="Обработка в браузере: пресеты, громкость, EQ, компрессор и лимитер. AI-мастеринг на заказ - отдельно в разделе услуг."
        />
      </div>

      <div className="rounded-lg border border-border bg-card/40 px-4 py-3 text-sm text-muted-foreground">
        {entitlementHint}
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
          <span className="text-sm text-muted-foreground">
            {file ? file.name : "Файл не выбран"}
          </span>
        </div>
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
        <div className="grid gap-4 sm:grid-cols-2">
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
            Mono bass
          </label>
        </div>
      </section>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="flex flex-wrap gap-3">
        <Button type="button" onClick={() => void handleDownload()} disabled={busy || !file}>
          {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
          Скачать master WAV
        </Button>
        {entitlement && !entitlement.canDownload ? (
          <Button type="button" variant="outline" onClick={() => setPayDialogOpen(true)} disabled={paying}>
            Купить скачивание за {TOOLS_MASTERING_DOWNLOAD_PRICE_RUB} ₽
          </Button>
        ) : null}
        <Button type="button" variant="ghost" asChild>
          <Link href="/cabinet/design/mastering">AI-мастеринг на заказ</Link>
        </Button>
      </div>

      <Dialog open={payDialogOpen} onOpenChange={setPayDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Скачивание мастера</DialogTitle>
            <DialogDescription>
              Бесплатное скачивание уже использовано. Оплатите{" "}
              {TOOLS_MASTERING_DOWNLOAD_PRICE_RUB} ₽ за одно дополнительное скачивание.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setPayDialogOpen(false)}>
              Отмена
            </Button>
            <Button type="button" onClick={() => void startPayment()} disabled={paying}>
              {paying ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Оплатить {TOOLS_MASTERING_DOWNLOAD_PRICE_RUB} ₽
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
