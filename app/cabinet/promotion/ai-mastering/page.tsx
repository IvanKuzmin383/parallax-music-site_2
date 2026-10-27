"use client"

import { Suspense, useCallback, useEffect, useRef, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { useI18n } from "@/lib/i18n-context"
import {
  getCabinetServiceHubBackLabel,
  getCabinetServiceHubHref,
} from "@/lib/cabinet/service-back"
import { CabinetAudioPlayer } from "@/components/cabinet/shared/cabinet-audio-player"
import { AI_MASTERING_PRICE_RUB, MAX_AI_MASTERING_TRACKS } from "@/lib/ai-mastering-pricing"
import { MAX_CABINET_WAV_BYTES } from "@/lib/cabinet-wav-upload-limits"
import { checkWavFileIsStereo } from "@/lib/wav-parse-stereo"
import { toast } from "sonner"
import {
  CabinetApplyCouponControl,
  type ApplicableCouponPreview,
} from "@/components/cabinet/shared/cabinet-apply-coupon"

const TRACKS_MIN = 1
const MAX_WAV_BYTES = MAX_CABINET_WAV_BYTES

function AiMasteringPageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const backHref = getCabinetServiceHubHref(pathname)
  const { t } = useI18n()
  const backLabel = getCabinetServiceHubBackLabel(backHref, t.cabinet.promotion.backToServices)
  const am = t.cabinet.promotion.aiMastering

  const [tracksCount, setTracksCount] = useState(1)
  const [audioFiles, setAudioFiles] = useState<(File | null)[]>([])
  const [audioSlotErrors, setAudioSlotErrors] = useState<(string | null)[]>([])
  const [contactEmail, setContactEmail] = useState("")
  const [contactTelegram, setContactTelegram] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [consentOfferLicense, setConsentOfferLicense] = useState(false)
  const [applyCoupon, setApplyCoupon] = useState(false)
  const [couponPreview, setCouponPreview] = useState<ApplicableCouponPreview | null>(null)
  const onCouponAppliedChange = useCallback(
    (next: boolean, preview: ApplicableCouponPreview | null) => {
      setApplyCoupon(next)
      setCouponPreview(preview)
    },
    []
  )
  const [paymentSuccessOpen, setPaymentSuccessOpen] = useState(false)
  const paymentSuccessHandledRef = useRef(false)
  const masteringAudioRefs = useRef<Record<string, HTMLAudioElement | null>>({})

  useEffect(() => {
    setAudioFiles((prev) => {
      const next = prev.slice(0, tracksCount)
      while (next.length < tracksCount) next.push(null)
      return next
    })
    setAudioSlotErrors((prev) => {
      const next = prev.slice(0, tracksCount)
      while (next.length < tracksCount) next.push(null)
      return next
    })
  }, [tracksCount])

  useEffect(() => {
    const paymentState = searchParams.get("payment")
    const orderId = searchParams.get("orderId")
    if (paymentState !== "return" || !orderId || paymentSuccessHandledRef.current) return
    paymentSuccessHandledRef.current = true
    void (async () => {
      try {
        const res = await fetch(`/api/cabinet/payments/order-status?orderId=${encodeURIComponent(orderId)}`, {
          credentials: "include",
        })
        const data = (await res.json().catch(() => ({}))) as { paid?: boolean }
        if (res.ok && data.paid) {
          setPaymentSuccessOpen(true)
        } else {
          toast.error("Оплата не завершена, заказ не оформлен")
        }
      } finally {
        router.replace("/cabinet/promotion/ai-mastering", { scroll: false })
      }
    })()
  }, [searchParams, router])

  const validCount =
    Number.isInteger(tracksCount) && tracksCount >= TRACKS_MIN && tracksCount <= MAX_AI_MASTERING_TRACKS
  const slotsOk =
    audioFiles.slice(0, tracksCount).every((f) => f !== null && f.size > 0) &&
    !audioSlotErrors.slice(0, tracksCount).some(Boolean)
  const hasContact = Boolean(contactEmail.trim() || contactTelegram.trim())
  const total = tracksCount * AI_MASTERING_PRICE_RUB
  const dueTotal = applyCoupon && couponPreview ? couponPreview.finalAmountRub : total
  const masteringExampleAudios = [
    { src: "/aimastering/before.wav", title: "AI мастеринг: До", label: "До" },
    { src: "/aimastering/after.wav", title: "AI мастеринг: После", label: "После" },
  ] as const

  const handleMasteringAudioPlay = (currentSrc: string) => {
    Object.entries(masteringAudioRefs.current).forEach(([src, audio]) => {
      if (!audio || src === currentSrc) return
      audio.pause()
      audio.currentTime = 0
    })
  }

  const setAudioAt = async (index: number, file: File | null) => {
    setAudioSlotErrors((prev) => {
      const next = [...prev]
      while (next.length < tracksCount) next.push(null)
      next[index] = null
      return next
    })
    if (!file) {
      setAudioFiles((prev) => {
        const next = [...prev]
        next[index] = null
        return next
      })
      return
    }
    if (!file.name.toLowerCase().endsWith(".wav")) {
      setAudioSlotErrors((prev) => {
        const next = [...prev]
        next[index] = am.validationAudioWav
        return next
      })
      setAudioFiles((prev) => {
        const next = [...prev]
        next[index] = null
        return next
      })
      return
    }
    if (file.size > MAX_WAV_BYTES) {
      setAudioSlotErrors((prev) => {
        const next = [...prev]
        next[index] = am.validationAudioSize
        return next
      })
      setAudioFiles((prev) => {
        const next = [...prev]
        next[index] = null
        return next
      })
      return
    }
    const stereoErr = await checkWavFileIsStereo(file)
    if (stereoErr) {
      setAudioSlotErrors((prev) => {
        const next = [...prev]
        next[index] = stereoErr
        return next
      })
      setAudioFiles((prev) => {
        const next = [...prev]
        next[index] = null
        return next
      })
      return
    }
    setAudioFiles((prev) => {
      const next = [...prev]
      next[index] = file
      return next
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validCount || !hasContact) {
      setError(hasContact ? null : am.validationContact)
      return
    }
    if (!slotsOk) {
      setError(am.validationAudioSlots)
      return
    }
    if (!consentOfferLicense) {
      setError(t.pay.validationConsentOfferLicense)
      return
    }
    setError(null)
    setLoading(true)
    try {
      const fd = new FormData()
      fd.append("tracksCount", String(tracksCount))
      fd.append("contactEmail", contactEmail.trim())
      fd.append("contactTelegram", contactTelegram.trim())
      fd.append("consentOfferLicense", "true")
      if (applyCoupon) fd.append("applyCoupon", "true")
      for (let i = 0; i < tracksCount; i++) {
        const f = audioFiles[i]
        if (f) fd.append(`audio_${i}`, f, f.name)
      }
      const res = await fetch("/api/cabinet/payments/ai-mastering/create", {
        method: "POST",
        credentials: "include",
        body: fd,
      })
      const data = (await res.json().catch(() => ({}))) as { paid?: boolean; error?: string }
      if (!res.ok) {
        setError(data.error || am.errorCreate)
        return
      }
      if (data.paid) {
        toast.success("Оплата с баланса прошла успешно. Заказ принят в работу.")
        return
      }
      setError(am.errorCreate)
    } catch {
      setError(am.errorNetwork)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full min-w-0 max-w-none space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href={backHref}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{am.title}</h1>
          <p className="text-muted-foreground">{am.description}</p>
        </div>
      </div>

      <div className="grid w-full min-w-0 grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(18rem,0.8fr)] lg:items-start lg:gap-8">
        <div className="min-w-0 space-y-6 bg-transparent">
          <div className="space-y-2">
            <h2 className="text-xl font-semibold leading-none">{am.serviceDescriptionTitle}</h2>
            <p className="text-muted-foreground">{am.serviceDescription}</p>
          </div>
          <div className="space-y-3">
            <p className="font-medium">Пример AI мастеринга</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {masteringExampleAudios.map((audio) => (
                <div
                  key={audio.src}
                  className="space-y-2 rounded-lg border border-border/80 bg-muted/40 p-3"
                >
                  <p className="text-sm font-medium">{audio.label}</p>
                  <CabinetAudioPlayer
                    src={audio.src}
                    title={audio.title}
                    onPlay={handleMasteringAudioPlay}
                    audioRef={(node) => {
                      masteringAudioRefs.current[audio.src] = node
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
          <div>
            <h2 className="mb-2 text-lg font-semibold">{am.priceTitle}</h2>
            <p className="text-xl font-bold text-primary">{am.price}</p>
          </div>
        </div>

        <div className="min-w-0 space-y-4 bg-transparent lg:sticky lg:top-4">
          <div className="space-y-1">
            <h3 className="text-base font-semibold leading-none">{am.orderDialogTitle}</h3>
            <p className="text-xs text-muted-foreground">{am.orderDialogDescription}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div className="space-y-2">
              <Label htmlFor="ai-mastering-tracks">{am.tracksCountLabel}</Label>
              <Input
                id="ai-mastering-tracks"
                type="number"
                min={TRACKS_MIN}
                max={MAX_AI_MASTERING_TRACKS}
                value={tracksCount}
                onChange={(e) => setTracksCount(Number(e.target.value) || 0)}
                disabled={loading}
              />
              <p className="text-xs text-muted-foreground">{am.tracksCountHint}</p>
            </div>

            <div className="space-y-3">
              <div>
                <p className="text-sm font-medium leading-none">{am.tracksPickLabel}</p>
                <p className="mt-1.5 text-xs text-muted-foreground">{am.tracksPickHint}</p>
              </div>
              {Array.from({ length: tracksCount }, (_, i) => (
                <div key={i} className="space-y-2">
                  <Label htmlFor={`ai-mastering-audio-${i}`}>
                    {am.audioFileLabel} {i + 1}
                  </Label>
                  <Input
                    id={`ai-mastering-audio-${i}`}
                    type="file"
                    accept=".wav,audio/wav"
                    disabled={loading}
                    className="cursor-pointer"
                    onChange={(e) => {
                      const f = e.target.files?.[0] ?? null
                      void setAudioAt(i, f)
                      e.target.value = ""
                    }}
                  />
                  {audioFiles[i] ? (
                    <p className="text-xs text-muted-foreground">
                      {am.audioFileSelected}: {audioFiles[i]!.name}
                    </p>
                  ) : null}
                  {audioSlotErrors[i] ? (
                    <p className="text-xs text-destructive">{audioSlotErrors[i]}</p>
                  ) : null}
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <Label htmlFor="ai-mastering-email">{am.contactEmailLabel}</Label>
              <Input
                id="ai-mastering-email"
                type="email"
                autoComplete="email"
                placeholder={am.contactEmailPlaceholder}
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="ai-mastering-telegram">{am.contactTelegramLabel}</Label>
              <Input
                id="ai-mastering-telegram"
                type="text"
                placeholder={am.contactTelegramPlaceholder}
                value={contactTelegram}
                onChange={(e) => setContactTelegram(e.target.value)}
                disabled={loading}
              />
              <p className="text-xs text-muted-foreground">{am.contactHint}</p>
            </div>

            {validCount && total > 0 ? (
              <CabinetApplyCouponControl
                orderType="ai_mastering"
                amountRub={total}
                applied={applyCoupon}
                onAppliedChange={onCouponAppliedChange}
              />
            ) : null}

            <p className="text-sm font-semibold">
              {am.totalLabel}: {AI_MASTERING_PRICE_RUB} {am.currencySuffix} × {tracksCount} = {dueTotal}{" "}
              {am.currencySuffix}
              {applyCoupon && couponPreview ? (
                <span className="ml-1 text-xs font-normal text-muted-foreground">
                  (было {total} {am.currencySuffix})
                </span>
              ) : null}
            </p>

            <div className="flex flex-row items-start gap-3 rounded-md border border-border p-3">
              <Checkbox
                id="ai-mastering-consent-offer-license"
                checked={consentOfferLicense}
                onCheckedChange={(checked) => setConsentOfferLicense(checked === true)}
                disabled={loading}
              />
              <label
                htmlFor="ai-mastering-consent-offer-license"
                className="cursor-pointer space-y-1 text-sm font-normal leading-snug"
              >
                {t.pay.consentOfferLicenseIntro}{" "}
                <Link href="/offer" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">
                  {t.pay.offerLink}
                </Link>{" "}
                *
              </label>
            </div>

            {error ? <p className="text-sm text-destructive">{error}</p> : null}

            <Button
              type="submit"
              className="w-full"
              disabled={!validCount || !slotsOk || loading || !consentOfferLicense || !hasContact}
            >
              {loading ? am.payLoading : am.pay}
            </Button>
          </form>
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="outline" asChild>
          <Link href={backHref}>{backLabel}</Link>
        </Button>
      </div>

      <Dialog
        open={paymentSuccessOpen}
        onOpenChange={(open) => {
          if (open) setPaymentSuccessOpen(true)
        }}
      >
        <DialogContent
          className="sm:max-w-md"
          onPointerDownOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
          showCloseButton={false}
        >
          <DialogHeader className="text-center sm:text-center">
            <DialogTitle>{am.paymentSuccessTitle}</DialogTitle>
            <DialogDescription className="pt-2 text-base text-foreground">
              {am.paymentSuccessToast}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-center">
            <Button type="button" className="min-w-[120px]" onClick={() => setPaymentSuccessOpen(false)}>
              {am.paymentSuccessOk}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function AiMasteringPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background p-4" />}>
      <AiMasteringPageInner />
    </Suspense>
  )
}
