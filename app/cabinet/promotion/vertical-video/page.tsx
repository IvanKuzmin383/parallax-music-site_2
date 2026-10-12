"use client"

import { Fragment, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react"
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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ArrowDown, ArrowLeft, ArrowRight } from "lucide-react"
import Link from "next/link"
import { useI18n } from "@/lib/i18n-context"
import {
  getCabinetServiceHubBackLabel,
  getCabinetServiceHubHref,
} from "@/lib/cabinet/service-back"
import { toast } from "sonner"
import {
  getVerticalVideoUnitPrice,
  VERTICAL_VIDEO_MAX_COUNT,
  VERTICAL_VIDEO_MIN_COUNT,
} from "@/lib/vertical-video-pricing"

function VerticalVideoPageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const backHref = getCabinetServiceHubHref(pathname)
  const { t } = useI18n()
  const backLabel = getCabinetServiceHubBackLabel(backHref, t.cabinet.promotion.backToServices)
  const vv = t.cabinet.promotion.verticalVideo
  const [failedIds, setFailedIds] = useState<Set<number>>(new Set())
  const [tracks, setTracks] = useState<Array<{ id: string; trackName: string }>>([])
  const [tracksLoading, setTracksLoading] = useState(true)
  const [paymentSuccessOpen, setPaymentSuccessOpen] = useState(false)
  const [videosCount, setVideosCount] = useState(1)
  const [trackTitle, setTrackTitle] = useState("")
  const [comment, setComment] = useState("")
  const [contactType, setContactType] = useState<"telegram" | "vk" | "max">("telegram")
  const [contactValue, setContactValue] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const paymentSuccessHandledRef = useRef(false)
  const initialTrackPickedRef = useRef(false)

  const handleVideoError = useCallback((id: number) => {
    setFailedIds((prev) => new Set(prev).add(id))
  }, [])

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
        router.replace("/cabinet/promotion/vertical-video", { scroll: false })
      }
    })()
  }, [searchParams, router])

  const unitPrice = useMemo(() => getVerticalVideoUnitPrice(videosCount || 0), [videosCount])
  const total = videosCount * unitPrice
  const validCount =
    Number.isInteger(videosCount) &&
    videosCount >= VERTICAL_VIDEO_MIN_COUNT &&
    videosCount <= VERTICAL_VIDEO_MAX_COUNT
  const hasTracks = tracks.length > 0
  const validTrackTitle = trackTitle.trim().length > 0
  const validContact = contactValue.trim().length >= 2

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validCount || !validTrackTitle || !validContact || !hasTracks) {
      if (!validTrackTitle) {
        setError(vv.validationTrackTitle)
      } else if (!hasTracks) {
        setError(vv.validationNoTracks)
      } else if (!validContact) {
        setError(vv.validationContact)
      }
      return
    }
    setError(null)
    setLoading(true)
    try {
      const res = await fetch("/api/cabinet/payments/vertical-video/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          videosCount,
          trackTitle: trackTitle.trim(),
          comment: comment.trim(),
          contactType,
          contactValue: contactValue.trim(),
        }),
      })
      const data = (await res.json().catch(() => ({}))) as { confirmationUrl?: string; error?: string }
      if (!res.ok) {
        setError(data.error || vv.errorCreate)
        return
      }
      if (data.confirmationUrl) {
        window.location.href = data.confirmationUrl
        return
      }
      setError(vv.errorCreate)
    } catch {
      setError(vv.errorNetwork)
    } finally {
      setLoading(false)
    }
  }

  const exampleVideos = [
    { id: 1, src: "/videos/vertical-examples/example-1.mp4" },
    { id: 2, src: "/videos/vertical-examples/example-2.mp4" },
    { id: 3, src: "/videos/vertical-examples/example-3.mp4" },
  ]

  const processSteps = useMemo(
    () => [vv.processStep1, vv.processStep2, vv.processStep3, vv.processStep4],
    [vv.processStep1, vv.processStep2, vv.processStep3, vv.processStep4]
  )

  const priceTiers = [
    { range: vv.priceRange1, price: "199₽/шт", preset: 10 },
    { range: vv.priceRange2, price: "149₽/шт", preset: 50 },
    { range: vv.priceRange3, price: "99₽/шт", preset: 51 },
  ] as const

  return (
    <div className="w-full min-w-0 max-w-none space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href={backHref}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="min-w-0">
          <h1 className="text-2xl font-bold">{vv.title}</h1>
          <p className="text-muted-foreground">{vv.description}</p>
        </div>
      </div>

      <div className="grid w-full min-w-0 grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.25fr)_minmax(18rem,0.75fr)] lg:items-start lg:gap-8">
        <div className="min-w-0 space-y-6 bg-transparent">
          <div className="space-y-2">
            <h2 className="text-xl font-semibold leading-none">{vv.serviceDescriptionTitle}</h2>
            <p className="text-muted-foreground">{vv.serviceDescription}</p>
          </div>

          <div className="space-y-3">
            <h3 className="text-base font-semibold text-foreground md:text-lg">{vv.processFlowTitle}</h3>
            <div className="flex flex-col md:flex-row md:items-start md:gap-0">
              {processSteps.map((text, index) => (
                <Fragment key={index}>
                  <div className="flex flex-1 flex-col md:min-w-0">
                    <span className="mb-2 text-xl font-bold tabular-nums text-primary md:text-2xl">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <p className="text-sm leading-relaxed text-muted-foreground">{text}</p>
                  </div>
                  {index < processSteps.length - 1 ? (
                    <div
                      className="flex shrink-0 items-center justify-center py-3 text-primary md:px-2 md:py-0 md:pt-2"
                      aria-hidden
                    >
                      <ArrowDown className="h-5 w-5 md:hidden" />
                      <ArrowRight className="hidden h-5 w-5 md:block" />
                    </div>
                  ) : null}
                </Fragment>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <h2 className="text-lg font-semibold">{vv.priceTitle}</h2>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {priceTiers.map((tier) => (
                <button
                  key={tier.range}
                  type="button"
                  className="rounded-lg border border-border/70 bg-transparent px-3 py-2.5 text-left transition-colors hover:border-primary/40"
                  onClick={() => setVideosCount(tier.preset)}
                >
                  <span className="block text-xs text-muted-foreground">{tier.range}</span>
                  <span className="text-base font-bold text-primary">{tier.price}</span>
                </button>
              ))}
            </div>
          </div>

          {exampleVideos.length > 0 ? (
            <div className="space-y-3">
              <h2 className="text-lg font-semibold">{vv.examplesTitle}</h2>
              <div className="flex flex-wrap gap-3">
                {exampleVideos.map((video) => (
                  <div
                    key={video.id}
                    className="h-[200px] w-[112px] shrink-0 overflow-hidden rounded-lg border border-border bg-muted sm:h-[220px] sm:w-[124px]"
                  >
                    {failedIds.has(video.id) ? (
                      <div className="flex h-full w-full items-center justify-center p-2">
                        <p className="text-center text-xs text-muted-foreground">{vv.videoError}</p>
                      </div>
                    ) : (
                      <video
                        src={video.src}
                        controls
                        playsInline
                        className="h-full w-full object-cover"
                        title={`Пример видео ${video.id}`}
                        preload="metadata"
                        onError={() => handleVideoError(video.id)}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <div className="min-w-0 space-y-4 bg-transparent lg:sticky lg:top-4">
          <div className="space-y-1">
            <h3 className="text-base font-semibold leading-none">{vv.orderDialogTitle}</h3>
            <p className="text-xs text-muted-foreground">{vv.orderDialogDescription}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div className="space-y-2">
              <Label htmlFor="vertical-video-count">{vv.videosCountLabel}</Label>
              <Input
                id="vertical-video-count"
                type="number"
                min={VERTICAL_VIDEO_MIN_COUNT}
                max={VERTICAL_VIDEO_MAX_COUNT}
                value={videosCount}
                onChange={(e) => setVideosCount(Number(e.target.value) || 0)}
                disabled={loading}
              />
              <p className="text-xs text-muted-foreground">{vv.videosCountHint}</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="vertical-video-track-title">{vv.trackTitleLabel}</Label>
              <select
                id="vertical-video-track-title"
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={trackTitle}
                onChange={(e) => setTrackTitle(e.target.value)}
                disabled={loading || tracksLoading || !hasTracks}
              >
                {tracksLoading ? (
                  <option value="">{vv.trackSelectLoading}</option>
                ) : hasTracks ? (
                  tracks.map((track) => (
                    <option key={track.id} value={track.trackName}>
                      {track.trackName}
                    </option>
                  ))
                ) : (
                  <option value="">{vv.trackSelectEmpty}</option>
                )}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="vertical-video-comment">{vv.commentLabel}</Label>
              <Textarea
                id="vertical-video-comment"
                placeholder={vv.commentPlaceholder}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={3}
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="vertical-video-contact-type">{vv.contactTypeLabel}</Label>
              <select
                id="vertical-video-contact-type"
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={contactType}
                onChange={(e) => setContactType(e.target.value as "telegram" | "vk" | "max")}
                disabled={loading}
              >
                <option value="telegram">{vv.contactTypeTelegram}</option>
                <option value="vk">{vv.contactTypeVk}</option>
                <option value="max">{vv.contactTypeMax}</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="vertical-video-contact-value">{vv.contactValueLabel}</Label>
              <Input
                id="vertical-video-contact-value"
                type="text"
                placeholder={vv.contactValuePlaceholder}
                value={contactValue}
                onChange={(e) => setContactValue(e.target.value)}
                disabled={loading}
              />
            </div>

            <p className="text-sm font-semibold">
              {vv.totalLabel}: {unitPrice} {vv.currencySuffix} × {videosCount} = {total} {vv.currencySuffix}
            </p>

            {error ? <p className="text-sm text-destructive">{error}</p> : null}

            <Button
              type="submit"
              className="w-full"
              disabled={!validCount || !validTrackTitle || !validContact || !hasTracks || loading}
            >
              {loading ? vv.payLoading : vv.pay}
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
            <DialogTitle>{vv.paymentSuccessTitle}</DialogTitle>
            <DialogDescription className="pt-2 text-base text-foreground">
              {vv.paymentSuccessToast}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-center">
            <Button type="button" className="min-w-[120px]" onClick={() => setPaymentSuccessOpen(false)}>
              {vv.paymentSuccessOk}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function VerticalVideoPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background p-4" />}>
      <VerticalVideoPageInner />
    </Suspense>
  )
}
