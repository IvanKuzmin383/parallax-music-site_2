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
import { Textarea } from "@/components/ui/textarea"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { useI18n } from "@/lib/i18n-context"
import { YANDEX_VIDEOSHOT_CREATION_PRICE_RUB } from "@/lib/yandex-videoshot-creation-pricing"
import { toast } from "sonner"

function YandexVideoshotCreationPageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { t } = useI18n()
  const service = t.cabinet.promotion.yandexVideoshotCreation
  const formText = t.cabinet.promotion.trackCover
  const [orderOpen, setOrderOpen] = useState(false)
  const [tracks, setTracks] = useState<Array<{ id: string; trackName: string }>>([])
  const [tracksLoading, setTracksLoading] = useState(true)
  const [trackTitle, setTrackTitle] = useState("")
  const [orderWithoutTrackSelection, setOrderWithoutTrackSelection] = useState(false)
  const [comment, setComment] = useState("")
  const [contactType, setContactType] = useState<"telegram" | "vk" | "max">("telegram")
  const [contactValue, setContactValue] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [paymentSuccessOpen, setPaymentSuccessOpen] = useState(false)
  const paymentSuccessHandledRef = useRef(false)
  const initialTrackPickedRef = useRef(false)

  useEffect(() => {
    fetch("/api/cabinet/tracks", { credentials: "include" })
      .then(async (res) => {
        if (res.status === 401) {
          router.replace("/cabinet")
          return
        }
        const data = (await res.json().catch(() => ({}))) as {
          tracks?: Array<{ id: string; trackName?: string }>
        }
        const nextTracks = Array.isArray(data.tracks)
          ? data.tracks
              .map((track) => ({
                id: String(track.id),
                trackName: String(track.trackName ?? "").trim(),
              }))
              .filter((track) => track.trackName.length > 0)
          : []
        setTracks(nextTracks)
        if (!initialTrackPickedRef.current && nextTracks.length > 0) {
          initialTrackPickedRef.current = true
          setTrackTitle(nextTracks[0].trackName)
        }
      })
      .finally(() => setTracksLoading(false))
  }, [router])

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
        router.replace("/cabinet/promotion/yandex-videoshot-creation", { scroll: false })
      }
    })()
  }, [searchParams, router])

  useEffect(() => {
    if (!orderOpen) setError(null)
  }, [orderOpen])

  const hasTracks = tracks.length > 0
  const validTrackTitle = orderWithoutTrackSelection || trackTitle.trim().length > 0
  const validComment = comment.trim().length >= 2
  const validContact = contactValue.trim().length >= 2

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validTrackTitle || !validContact || !validComment || (!orderWithoutTrackSelection && !hasTracks)) {
      if (!validTrackTitle) setError(formText.validationTrackTitle)
      else if (!orderWithoutTrackSelection && !hasTracks) setError(formText.validationNoTracks)
      else if (!validComment) setError(formText.validationComment)
      else if (!validContact) setError(formText.validationContact)
      return
    }
    setError(null)
    setLoading(true)
    try {
      const res = await fetch("/api/cabinet/payments/yandex-videoshot-creation/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          trackTitle: orderWithoutTrackSelection ? "" : trackTitle.trim(),
          comment: comment.trim(),
          contactType,
          contactValue: contactValue.trim(),
        }),
      })
      const data = (await res.json().catch(() => ({}))) as { confirmationUrl?: string; error?: string }
      if (!res.ok) {
        setError(data.error || formText.errorCreate)
        return
      }
      if (data.confirmationUrl) {
        window.location.href = data.confirmationUrl
        return
      }
      setError(formText.errorCreate)
    } catch {
      setError(formText.errorNetwork)
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
            <h1 className="text-2xl font-bold">{service.title}</h1>
            <p className="text-muted-foreground">{service.description}</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-xl">{service.serviceDescriptionTitle}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <p className="text-muted-foreground">{service.serviceDescription}</p>
            {service.examples?.length ? (
              <div className="space-y-3">
                <p className="font-medium">{service.examplesTitle}</p>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  {service.examples.map((example) => (
                    <li key={example}>{example}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            {service.exampleVideos?.length ? (
              <div className="space-y-3">
                <p className="font-medium">{service.videosTitle}</p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  {service.exampleVideos.map((video) => (
                    <div key={video.src} className="aspect-[9/16] overflow-hidden rounded-md border border-border bg-muted">
                      <video
                        src={video.src}
                        controls
                        playsInline
                        className="h-full w-full object-cover"
                        preload="metadata"
                        title={video.title}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
            <div>
              <h2 className="text-lg font-semibold mb-2">{service.priceTitle}</h2>
              <p className="text-primary text-xl font-bold">{service.price}</p>
            </div>
            <div className="flex justify-start">
              <Button type="button" onClick={() => setOrderOpen(true)}>
                {formText.orderButton}
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
            <DialogTitle>{service.title}</DialogTitle>
            <DialogDescription>{formText.orderDialogDescription}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="yandex-videoshot-creation-track-title">Трек для видеошота</Label>
              <div className="flex items-start gap-3 rounded-md border border-border p-3">
                <Checkbox
                  id="yandex-videoshot-creation-without-track-selection"
                  checked={orderWithoutTrackSelection}
                  onCheckedChange={(checked) => setOrderWithoutTrackSelection(checked === true)}
                  disabled={loading}
                />
                <label
                  htmlFor="yandex-videoshot-creation-without-track-selection"
                  className="text-sm font-normal leading-snug cursor-pointer"
                >
                  {formText.orderWithoutTrackSelectionLabel}
                </label>
              </div>
              {orderWithoutTrackSelection ? (
                <p className="text-sm text-muted-foreground">{formText.orderWithoutTrackSelectionHint}</p>
              ) : null}
              <select
                id="yandex-videoshot-creation-track-title"
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                value={trackTitle}
                onChange={(e) => setTrackTitle(e.target.value)}
                disabled={loading || tracksLoading || !hasTracks || orderWithoutTrackSelection}
              >
                {tracksLoading ? (
                  <option value="">{formText.trackSelectLoading}</option>
                ) : hasTracks ? (
                  tracks.map((track) => (
                    <option key={track.id} value={track.trackName}>
                      {track.trackName}
                    </option>
                  ))
                ) : (
                  <option value="">{formText.trackSelectEmpty}</option>
                )}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="yandex-videoshot-creation-comment">{formText.commentLabel}</Label>
              <Textarea
                id="yandex-videoshot-creation-comment"
                placeholder={formText.commentPlaceholder}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={4}
                disabled={loading}
              />
              <p className="text-sm text-muted-foreground">{formText.commentRequiredHint}</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="yandex-videoshot-creation-contact-type">{formText.contactTypeLabel}</Label>
              <select
                id="yandex-videoshot-creation-contact-type"
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                value={contactType}
                onChange={(e) => setContactType(e.target.value as "telegram" | "vk" | "max")}
                disabled={loading}
              >
                <option value="telegram">{formText.contactTypeTelegram}</option>
                <option value="vk">{formText.contactTypeVk}</option>
                <option value="max">{formText.contactTypeMax}</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="yandex-videoshot-creation-contact-value">{formText.contactValueLabel}</Label>
              <Input
                id="yandex-videoshot-creation-contact-value"
                type="text"
                placeholder={formText.contactValuePlaceholder}
                value={contactValue}
                onChange={(e) => setContactValue(e.target.value)}
                disabled={loading}
              />
            </div>

            <p className="text-sm font-medium">
              {formText.totalLabel}: {YANDEX_VIDEOSHOT_CREATION_PRICE_RUB} {formText.currencySuffix}
            </p>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOrderOpen(false)} disabled={loading}>
                {formText.cancel}
              </Button>
              <Button
                type="submit"
                disabled={!validTrackTitle || !validContact || !validComment || (!orderWithoutTrackSelection && !hasTracks) || loading}
              >
                {loading ? formText.payLoading : formText.pay}
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
            <DialogTitle>{formText.paymentSuccessTitle}</DialogTitle>
            <DialogDescription className="text-base text-foreground pt-2">{formText.paymentSuccessToast}</DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-center">
            <Button type="button" className="min-w-[120px]" onClick={() => setPaymentSuccessOpen(false)}>
              {formText.paymentSuccessOk}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function YandexVideoshotCreationPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background p-4 pt-20" />}>
      <YandexVideoshotCreationPageInner />
    </Suspense>
  )
}
