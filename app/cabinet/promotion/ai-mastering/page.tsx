"use client"

import { Suspense, useEffect, useRef, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
import { AI_MASTERING_PRICE_RUB, MAX_AI_MASTERING_TRACKS } from "@/lib/ai-mastering-pricing"
import { checkWavFileIsStereo } from "@/lib/wav-parse-stereo"
import { toast } from "sonner"

const TRACKS_MIN = 1
const MAX_WAV_BYTES = 80 * 1024 * 1024

function AiMasteringPageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { t } = useI18n()
  const am = t.cabinet.promotion.aiMastering

  const [orderOpen, setOrderOpen] = useState(false)
  const [tracksCount, setTracksCount] = useState(1)
  const [audioFiles, setAudioFiles] = useState<(File | null)[]>([])
  const [audioSlotErrors, setAudioSlotErrors] = useState<(string | null)[]>([])
  const [contactEmail, setContactEmail] = useState("")
  const [contactTelegram, setContactTelegram] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [consentOfferLicense, setConsentOfferLicense] = useState(false)
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

  useEffect(() => {
    if (!orderOpen) {
      setError(null)
    }
  }, [orderOpen])

  const validCount =
    Number.isInteger(tracksCount) && tracksCount >= TRACKS_MIN && tracksCount <= MAX_AI_MASTERING_TRACKS
  const slotsOk =
    audioFiles.slice(0, tracksCount).every((f) => f !== null && f.size > 0) &&
    !audioSlotErrors.slice(0, tracksCount).some(Boolean)
  const hasContact = Boolean(contactEmail.trim() || contactTelegram.trim())
  const total = tracksCount * AI_MASTERING_PRICE_RUB
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
      for (let i = 0; i < tracksCount; i++) {
        const f = audioFiles[i]
        if (f) fd.append(`audio_${i}`, f, f.name)
      }
      const res = await fetch("/api/cabinet/payments/ai-mastering/create", {
        method: "POST",
        credentials: "include",
        body: fd,
      })
      const data = (await res.json().catch(() => ({}))) as { confirmationUrl?: string; error?: string }
      if (!res.ok) {
        setError(data.error || am.errorCreate)
        return
      }
      if (data.confirmationUrl) {
        window.location.href = data.confirmationUrl
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
    <div className="min-h-screen bg-background p-4 pt-20">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/cabinet/promotion">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{am.title}</h1>
            <p className="text-muted-foreground">{am.description}</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-xl">{am.serviceDescriptionTitle}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <p className="text-muted-foreground">{am.serviceDescription}</p>
            <div className="space-y-3">
              <p className="font-medium">Пример AI мастеринга</p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {masteringExampleAudios.map((audio) => (
                  <div key={audio.src} className="rounded-md border border-border bg-muted p-3 space-y-2">
                    <p className="text-sm font-medium">{audio.label}</p>
                    <audio
                      controls
                      preload="metadata"
                      className="w-full"
                      title={audio.title}
                      ref={(node) => {
                        masteringAudioRefs.current[audio.src] = node
                      }}
                      onPlay={() => handleMasteringAudioPlay(audio.src)}
                    >
                      <source src={audio.src} />
                      Ваш браузер не поддерживает воспроизведение аудио.
                    </audio>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h2 className="text-lg font-semibold mb-2">{am.priceTitle}</h2>
              <p className="text-primary text-xl font-bold">{am.price}</p>
            </div>

            <div className="flex justify-start">
              <Button type="button" onClick={() => setOrderOpen(true)}>
                {am.orderButton}
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2">
          <Button variant="outline" asChild>
            <Link href="/cabinet/promotion">{t.cabinet.promotion.backToServices}</Link>
          </Button>
        </div>
      </div>

      <Dialog open={orderOpen} onOpenChange={setOrderOpen}>
        <DialogContent className="w-[95vw] sm:max-w-[84rem] max-h-[95vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{am.orderDialogTitle}</DialogTitle>
            <DialogDescription>{am.orderDialogDescription}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
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
              <p className="text-sm text-muted-foreground">{am.tracksCountHint}</p>
            </div>

            <div className="space-y-3">
              <div>
                <p className="text-sm font-medium leading-none">{am.tracksPickLabel}</p>
                <p className="text-sm text-muted-foreground mt-1.5">{am.tracksPickHint}</p>
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
              <p className="text-sm text-muted-foreground">{am.contactHint}</p>
            </div>

            <p className="text-sm font-medium">
              {am.totalLabel}: {AI_MASTERING_PRICE_RUB} {am.currencySuffix} × {tracksCount} = {total} {am.currencySuffix}
            </p>

            <div className="flex flex-row items-start gap-3 rounded-md border border-border p-4">
              <Checkbox
                id="ai-mastering-consent-offer-license"
                checked={consentOfferLicense}
                onCheckedChange={(checked) => setConsentOfferLicense(checked === true)}
                disabled={loading}
              />
              <label
                htmlFor="ai-mastering-consent-offer-license"
                className="text-sm font-normal leading-snug cursor-pointer space-y-1"
              >
                {t.pay.consentOfferLicenseIntro}{" "}
                <Link href="/offer" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">
                  {t.pay.offerLink}
                </Link>{" "}
                *
              </label>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOrderOpen(false)} disabled={loading}>
                {am.cancel}
              </Button>
              <Button
                type="submit"
                disabled={
                  !validCount ||
                  !slotsOk ||
                  loading ||
                  !consentOfferLicense ||
                  !hasContact
                }
              >
                {loading ? am.payLoading : am.pay}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

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
            <DialogDescription className="text-base text-foreground pt-2">
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
    <Suspense fallback={<div className="min-h-screen bg-background p-4 pt-20" />}>
      <AiMasteringPageInner />
    </Suspense>
  )
}
