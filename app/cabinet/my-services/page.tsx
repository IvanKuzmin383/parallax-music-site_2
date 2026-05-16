"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { format } from "date-fns"
import { ru, enUS } from "date-fns/locale"
import { ArrowLeft, ClipboardList } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useI18n } from "@/lib/i18n-context"
import ruMessages from "@/messages/ru.json"
import type { FulfillmentStatus } from "@/lib/service-fulfillments"
import type { UploadAddonBundleItem } from "@/lib/orders"
import { formatUploadAddonBundleLine } from "@/lib/upload-addon-bundle-display"

type CabinetMessages = (typeof ruMessages)["cabinet"]

type FilterKey = "all" | "in_work" | "done"

interface ServiceItem {
  orderId: string
  orderType: string
  paymentStatus: string
  fulfillmentStatus: FulfillmentStatus
  totalAmount: string
  createdAt: string
  paidAt: string | null
  paymentId: string | null
  draftId: string | null
  tracksCount: number | null
  contactEmail: string | null
  contactTelegram: string | null
  aiMasteringAudioFiles: string[]
  uploadAddonBundleItems?: UploadAddonBundleItem[]
  uploadAddonAiCoverRequested?: boolean
}

function serviceTitle(orderType: string, t: CabinetMessages): string {
  const p = t.promotion
  const m = t.myServices
  switch (orderType) {
    case "vertical_video":
      return p.verticalVideo.title
    case "track_cover":
      return p.trackCover.title
    case "ai_mastering":
      return p.aiMastering.title
    case "ai_cover":
      return p.aiCover.title
    case "yandex_videoshot":
      return p.yandexVideoshot.title
    case "yandex_videoshot_creation":
      return p.yandexVideoshotCreation.title
    case "yandex_videoavatar":
      return p.yandexVideoavatar.title
    case "spotify_videoshot":
      return p.spotifyVideoshot.title
    case "upload_addon_bundle":
      return m.uploadAddonBundle
    default:
      return orderType
  }
}

export default function MyServicesPage() {
  const router = useRouter()
  const { t, locale } = useI18n()
  const mt = t.cabinet.myServices
  const dateLocale = locale === "en" ? enUS : ru

  const [filter, setFilter] = useState<FilterKey>("all")
  const [items, setItems] = useState<ServiceItem[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async (f: FilterKey) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/cabinet/service-fulfillments?filter=${encodeURIComponent(f)}`, {
        credentials: "include",
      })
      if (res.status === 401) {
        router.replace("/cabinet")
        return
      }
      if (!res.ok) {
        setItems([])
        return
      }
      const data = await res.json()
      setItems(data.items ?? [])
    } catch {
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => {
    void load(filter)
  }, [filter, load])

  const fulfillmentBadgeLabel = (status: FulfillmentStatus) => {
    if (status === "done") return mt.fulfillmentDone
    return mt.fulfillmentInWork
  }

  return (
    <div className="min-h-screen bg-background p-4 pt-20">
      <div className="container mx-auto max-w-3xl space-y-6">
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/cabinet">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="flex items-center gap-2">
            <ClipboardList className="h-6 w-6" />
            <h1 className="text-2xl font-bold">{mt.pageTitle}</h1>
          </div>
        </div>
        <p className="text-muted-foreground text-sm">{mt.pageDescription}</p>

        <div className="flex flex-wrap gap-2">
          {(
            [
              ["all", mt.filterAll],
              ["in_work", mt.filterInWork],
              ["done", mt.filterDone],
            ] as const
          ).map(([key, label]) => (
            <Button
              key={key}
              variant={filter === key ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter(key)}
            >
              {label}
            </Button>
          ))}
        </div>

        {loading ? (
          <p className="text-muted-foreground text-sm">{locale === "en" ? "Loading…" : "Загрузка…"}</p>
        ) : items.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground text-sm">{mt.empty}</CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {items.map((item) => {
              const paid = item.paidAt ? new Date(item.paidAt) : null
              const created = item.createdAt ? new Date(item.createdAt) : null
              return (
                <Card key={item.orderId}>
                  <CardHeader className="pb-2">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <CardTitle className="text-lg">{serviceTitle(item.orderType, t.cabinet)}</CardTitle>
                      <div className="flex flex-wrap gap-2">
                        <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium">
                          {mt.paymentBadge}
                        </span>
                        <span
                          className={
                            item.fulfillmentStatus === "done"
                              ? "inline-flex items-center rounded-full bg-green-500/15 text-green-700 dark:text-green-400 px-2.5 py-0.5 text-xs font-medium"
                              : "inline-flex items-center rounded-full bg-amber-500/15 text-amber-800 dark:text-amber-300 px-2.5 py-0.5 text-xs font-medium"
                          }
                        >
                          {fulfillmentBadgeLabel(item.fulfillmentStatus)}
                        </span>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-1 text-sm text-muted-foreground">
                    {item.orderType === "upload_addon_bundle" ? (
                      (item.uploadAddonBundleItems ?? []).length > 0 || item.uploadAddonAiCoverRequested ? (
                        <div className="space-y-1 pb-2">
                          <p className="text-xs font-medium text-foreground">{mt.uploadAddonBundleComposition}</p>
                          <ul className="list-disc pl-5 space-y-0.5 text-foreground">
                            {(item.uploadAddonBundleItems ?? []).map((line, idx) => (
                              <li key={`${line.type}-${line.quantity}-${idx}`}>
                                {formatUploadAddonBundleLine(line, t.cabinet.promotion)}
                              </li>
                            ))}
                            {item.uploadAddonAiCoverRequested ? <li>{t.cabinet.promotion.aiCover.title}</li> : null}
                          </ul>
                        </div>
                      ) : (
                        <p className="text-xs text-amber-600 dark:text-amber-500 pb-2">
                          {mt.uploadAddonBundleCompositionUnavailable}
                        </p>
                      )
                    ) : null}
                    {created ? (
                      <p>
                        {mt.createdLabel}: {format(created, "d MMM yyyy, HH:mm", { locale: dateLocale })}
                      </p>
                    ) : null}
                    {paid ? (
                      <p>
                        {mt.paidLabel}: {format(paid, "d MMM yyyy, HH:mm", { locale: dateLocale })}
                      </p>
                    ) : null}
                    <p>
                      {mt.amountLabel}: {parseFloat(item.totalAmount).toLocaleString(locale === "en" ? "en-US" : "ru-RU")}{" "}
                      ₽
                    </p>
                    {typeof item.tracksCount === "number" && item.tracksCount > 0 ? (
                      <p>
                        {mt.tracksCountLabel}: {item.tracksCount}
                      </p>
                    ) : null}
                    {item.contactEmail ? (
                      <p className="break-all">
                        {mt.contactEmailLabel}: <span className="text-foreground">{item.contactEmail}</span>
                      </p>
                    ) : null}
                    {item.contactTelegram ? (
                      <p className="break-all">
                        {mt.contactTelegramLabel}: <span className="text-foreground">{item.contactTelegram}</span>
                      </p>
                    ) : null}
                    {item.orderType === "ai_mastering" ? (
                      <div className="space-y-2 pt-2">
                        <p className="text-foreground font-medium">{mt.aiMasteringAudioLabel}</p>
                        {item.aiMasteringAudioFiles.length > 0 ? (
                          <div className="space-y-2">
                            {item.aiMasteringAudioFiles.map((fileName) => (
                              <div key={fileName} className="space-y-1">
                                <p className="text-xs font-mono break-all">{fileName}</p>
                                <audio
                                  controls
                                  preload="none"
                                  className="w-full"
                                  src={`/api/cabinet/service-fulfillments/${encodeURIComponent(item.orderId)}/audio/${encodeURIComponent(fileName)}`}
                                />
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs">{mt.aiMasteringAudioMissing}</p>
                        )}
                      </div>
                    ) : null}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}

        <div className="flex justify-end pt-2">
          <Button variant="outline" asChild>
            <Link href="/cabinet/promotion">{t.cabinet.promotion.goToServices}</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
