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
import { TRACK_COVER_PRICE_RUB } from "@/lib/track-cover-pricing"
import { toast } from "sonner"

function TrackCoverPageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { t } = useI18n()
  const tc = t.cabinet.promotion.trackCover

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
        router.replace("/cabinet/promotion/track-cover", { scroll: false })
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
      if (!validTrackTitle) {
        setError(tc.validationTrackTitle)
      } else if (!orderWithoutTrackSelection && !hasTracks) {
        setError(tc.validationNoTracks)
      } else if (!validComment) {
        setError(tc.validationComment)
      } else if (!validContact) {
        setError(tc.validationContact)
      }
      return
    }
    setError(null)
    setLoading(true)
    try {
      const res = await fetch("/api/cabinet/payments/track-cover/create", {
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
        setError(data.error || tc.errorCreate)
        return
      }
      if (data.confirmationUrl) {
        window.location.href = data.confirmationUrl
        return
      }
      setError(tc.errorCreate)
    } catch {
      setError(tc.errorNetwork)
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
            <h1 className="text-2xl font-bold">{tc.title}</h1>
            <p className="text-muted-foreground">{tc.description}</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-xl">{tc.serviceDescriptionTitle}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <p className="text-muted-foreground">{tc.serviceDescription}</p>

            <div>
              <h2 className="text-lg font-semibold mb-2">{tc.priceTitle}</h2>
              <p className="text-primary text-xl font-bold">{tc.price}</p>
            </div>

            <div>
              <h2 className="text-lg font-semibold mb-4">Примеры работ</h2>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                {[
                  { src: "/aicover/example1.png", alt: "Пример обложки 1" },
                  { src: "/aicover/example2.png", alt: "Пример обложки 2" },
                  { src: "/aicover/example3.png", alt: "Пример обложки 3" },
                ].map((image) => (
                  <div key={image.src} className="overflow-hidden rounded-lg border border-border bg-muted">
                    <img
                      src={image.src}
                      alt={image.alt}
                      className="aspect-square w-full object-cover"
                      loading="lazy"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-start">
              <Button type="button" onClick={() => setOrderOpen(true)}>
                {tc.orderButton}
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
            <DialogTitle>{tc.orderDialogTitle}</DialogTitle>
            <DialogDescription>{tc.orderDialogDescription}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="track-cover-track-title">{tc.trackTitleLabel}</Label>
              <div className="flex items-start gap-3 rounded-md border border-border p-3">
                <Checkbox
                  id="track-cover-without-track-selection"
                  checked={orderWithoutTrackSelection}
                  onCheckedChange={(checked) => setOrderWithoutTrackSelection(checked === true)}
                  disabled={loading}
                />
                <label
                  htmlFor="track-cover-without-track-selection"
                  className="text-sm font-normal leading-snug cursor-pointer"
                >
                  {tc.orderWithoutTrackSelectionLabel}
                </label>
              </div>
              {orderWithoutTrackSelection ? (
                <p className="text-sm text-muted-foreground">{tc.orderWithoutTrackSelectionHint}</p>
              ) : null}
              <select
                id="track-cover-track-title"
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                value={trackTitle}
                onChange={(e) => setTrackTitle(e.target.value)}
                disabled={loading || tracksLoading || !hasTracks || orderWithoutTrackSelection}
              >
                {tracksLoading ? (
                  <option value="">{tc.trackSelectLoading}</option>
                ) : hasTracks ? (
                  tracks.map((track) => (
                    <option key={track.id} value={track.trackName}>
                      {track.trackName}
                    </option>
                  ))
                ) : (
                  <option value="">{tc.trackSelectEmpty}</option>
                )}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="track-cover-comment">{tc.commentLabel}</Label>
              <Textarea
                id="track-cover-comment"
                placeholder={tc.commentPlaceholder}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={4}
                disabled={loading}
              />
              <p className="text-sm text-muted-foreground">{tc.commentRequiredHint}</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="track-cover-contact-type">{tc.contactTypeLabel}</Label>
              <select
                id="track-cover-contact-type"
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                value={contactType}
                onChange={(e) => setContactType(e.target.value as "telegram" | "vk" | "max")}
                disabled={loading}
              >
                <option value="telegram">{tc.contactTypeTelegram}</option>
                <option value="vk">{tc.contactTypeVk}</option>
                <option value="max">{tc.contactTypeMax}</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="track-cover-contact-value">{tc.contactValueLabel}</Label>
              <Input
                id="track-cover-contact-value"
                type="text"
                placeholder={tc.contactValuePlaceholder}
                value={contactValue}
                onChange={(e) => setContactValue(e.target.value)}
                disabled={loading}
              />
            </div>

            <p className="text-sm font-medium">
              {tc.totalLabel}: {TRACK_COVER_PRICE_RUB} {tc.currencySuffix}
            </p>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOrderOpen(false)} disabled={loading}>
                {tc.cancel}
              </Button>
              <Button
                type="submit"
                disabled={!validTrackTitle || !validContact || !validComment || (!orderWithoutTrackSelection && !hasTracks) || loading}
              >
                {loading ? tc.payLoading : tc.pay}
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
            <DialogTitle>{tc.paymentSuccessTitle}</DialogTitle>
            <DialogDescription className="text-base text-foreground pt-2">
              {tc.paymentSuccessToast}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-center">
            <Button type="button" className="min-w-[120px]" onClick={() => setPaymentSuccessOpen(false)}>
              {tc.paymentSuccessOk}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function TrackCoverPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background p-4 pt-20" />}>
      <TrackCoverPageInner />
    </Suspense>
  )
}
