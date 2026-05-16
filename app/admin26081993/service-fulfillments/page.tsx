"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import { ru, enUS } from "date-fns/locale"
import { ClipboardList, Clock, CheckCircle, CircleDot, Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { toast } from "sonner"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { AdminSectionNav } from "@/components/admin-section-nav"
import { useI18n } from "@/lib/i18n-context"
import ruMessages from "@/messages/ru.json"
import type { FulfillmentStatus } from "@/lib/service-fulfillments"
import type { UploadAddonBundleItem } from "@/lib/orders"
import { formatUploadAddonBundleLine } from "@/lib/upload-addon-bundle-display"

type CabinetMessages = (typeof ruMessages)["cabinet"]
type FilterKey = "all" | "in_work" | "done"

interface AdminServiceItem {
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
  userId: string | null
  userEmail: string | null
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

export default function AdminServiceFulfillmentsPage() {
  const router = useRouter()
  const { t, locale } = useI18n()
  const mt = t.cabinet.myServices
  const dateLocale = locale === "en" ? enUS : ru

  const [items, setItems] = useState<AdminServiceItem[]>([])
  const [loading, setLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [filter, setFilter] = useState<FilterKey>("all")
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [detailsItem, setDetailsItem] = useState<AdminServiceItem | null>(null)

  const load = useCallback(async (f: FilterKey) => {
    const response = await fetch(`/api/admin/service-fulfillments?filter=${encodeURIComponent(f)}`, {
      credentials: "include",
    })
    if (response.status === 401) {
      setIsAuthenticated(false)
      return
    }
    setIsAuthenticated(true)
    if (response.ok) {
      const data = await response.json()
      setItems(data.items ?? [])
    } else {
      setItems([])
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    void load(filter).finally(() => {
      if (!cancelled) setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [filter, load])

  const handleStatusChange = async (orderId: string, newStatus: FulfillmentStatus) => {
    setUpdatingId(orderId)
    try {
      const response = await fetch(`/api/admin/service-fulfillments/${encodeURIComponent(orderId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ fulfillmentStatus: newStatus }),
      })
      if (response.ok) {
        toast.success(mt.adminUpdateOk)
        await load(filter)
      } else {
        const err = await response.json().catch(() => ({}))
        toast.error(err.error || mt.adminUpdateError)
      }
    } catch {
      toast.error(mt.adminUpdateError)
    } finally {
      setUpdatingId(null)
    }
  }

  const statusBadge = (status: FulfillmentStatus) => {
    if (status === "done") {
      return { label: mt.adminStatusDone, icon: CheckCircle, color: "text-green-600", bg: "bg-green-50 dark:bg-green-950" }
    }
    if (status === "in_progress") {
      return { label: mt.adminStatusInProgress, icon: CircleDot, color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-950" }
    }
    return { label: mt.adminStatusNew, icon: Clock, color: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-950" }
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen pt-20 flex items-center justify-center bg-background p-4">
        <div className="max-w-md w-full space-y-4 text-center">
          <p className="text-muted-foreground">{locale === "en" ? "Authentication required" : "Необходима авторизация"}</p>
          <Button onClick={() => router.push("/admin26081993")}>
            {locale === "en" ? "Go to login" : "Перейти на страницу входа"}
          </Button>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen pt-20 flex items-center justify-center">
        <p>{locale === "en" ? "Loading…" : "Загрузка…"}</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background pt-20">
      <div className="container mx-auto px-4 space-y-6">
        <AdminSectionNav active="service-fulfillments" />

        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <ClipboardList className="h-8 w-8" />
            {mt.adminPageTitle}
          </h1>
          <p className="text-muted-foreground mt-1">{mt.adminPageDescription}</p>
        </div>

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

        {items.length === 0 ? (
          <div className="text-center py-12 border rounded-lg">
            <ClipboardList className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">{mt.adminEmpty}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {items.map((item) => {
              const cfg = statusBadge(item.fulfillmentStatus)
              const StatusIcon = cfg.icon
              const paid = item.paidAt ? new Date(item.paidAt) : null
              const created = item.createdAt ? new Date(item.createdAt) : null
              return (
                <div
                  key={item.orderId}
                  className="border rounded-lg p-6 space-y-4 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                    <div className="flex-1 space-y-3">
                      <div className="flex flex-wrap items-center gap-3">
                        <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${cfg.bg}`}>
                          <StatusIcon className={`h-4 w-4 ${cfg.color}`} />
                          <span className={`text-sm font-medium ${cfg.color}`}>{cfg.label}</span>
                        </div>
                        <span className="text-xl font-bold">
                          {parseFloat(item.totalAmount).toLocaleString(locale === "en" ? "en-US" : "ru-RU")} ₽
                        </span>
                      </div>
                      <p className="font-medium">{serviceTitle(item.orderType, t.cabinet)}</p>
                      {item.orderType === "upload_addon_bundle" ? (
                        (item.uploadAddonBundleItems ?? []).length > 0 || item.uploadAddonAiCoverRequested ? (
                          <div className="space-y-1">
                            <p className="text-xs font-medium text-muted-foreground">{mt.uploadAddonBundleComposition}</p>
                            <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-0.5">
                              {(item.uploadAddonBundleItems ?? []).map((line, idx) => (
                                <li key={`${line.type}-${line.quantity}-${idx}`}>
                                  {formatUploadAddonBundleLine(line, t.cabinet.promotion)}
                                </li>
                              ))}
                              {item.uploadAddonAiCoverRequested ? <li>{t.cabinet.promotion.aiCover.title}</li> : null}
                            </ul>
                          </div>
                        ) : (
                          <p className="text-sm text-amber-600 dark:text-amber-500">{mt.uploadAddonBundleCompositionUnavailable}</p>
                        )
                      ) : null}
                      <div className="grid md:grid-cols-2 gap-3 text-sm">
                        <div>
                          <p className="text-muted-foreground">{mt.adminUser}</p>
                          <p className="font-medium break-all">{item.userEmail ?? item.userId ?? "—"}</p>
                        </div>
                        {created ? (
                          <div>
                            <p className="text-muted-foreground">{mt.createdLabel}</p>
                            <p className="font-medium">
                              {format(created, "d MMMM yyyy, HH:mm", { locale: dateLocale })}
                            </p>
                          </div>
                        ) : null}
                        {paid ? (
                          <div>
                            <p className="text-muted-foreground">{mt.paidLabel}</p>
                            <p className="font-medium">
                              {format(paid, "d MMMM yyyy, HH:mm", { locale: dateLocale })}
                            </p>
                          </div>
                        ) : null}
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 min-w-[220px]">
                      <label className="text-sm font-medium">{mt.adminStatusLabel}</label>
                      <Select
                        value={item.fulfillmentStatus}
                        onValueChange={(v) => handleStatusChange(item.orderId, v as FulfillmentStatus)}
                        disabled={updatingId === item.orderId}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="new">
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4 text-amber-600" />
                              {mt.adminStatusNew}
                            </div>
                          </SelectItem>
                          <SelectItem value="in_progress">
                            <div className="flex items-center gap-2">
                              <CircleDot className="h-4 w-4 text-blue-600" />
                              {mt.adminStatusInProgress}
                            </div>
                          </SelectItem>
                          <SelectItem value="done">
                            <div className="flex items-center gap-2">
                              <CheckCircle className="h-4 w-4 text-green-600" />
                              {mt.adminStatusDone}
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <Button variant="outline" onClick={() => setDetailsItem(item)}>
                        {locale === "en" ? "Details" : "Подробнее"}
                      </Button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
      <Dialog open={!!detailsItem} onOpenChange={(open) => !open && setDetailsItem(null)}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{locale === "en" ? "Order details" : "Подробности заказа"}</DialogTitle>
            <DialogDescription className="sr-only">
              {locale === "en" ? "Paid service order and fulfillment data" : "Данные оплаченного заказа услуги"}
            </DialogDescription>
          </DialogHeader>
          {detailsItem ? (
            <div className="space-y-4 text-sm">
              <div className="grid md:grid-cols-2 gap-3">
                <div>
                  <p className="text-muted-foreground">{mt.orderLabel}</p>
                  <p className="font-mono text-xs break-all">{detailsItem.orderId}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">{mt.adminUser}</p>
                  <p className="font-medium break-all">{detailsItem.userEmail ?? detailsItem.userId ?? "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">{mt.paymentStatusLabel}</p>
                  <p className="font-medium">{detailsItem.paymentStatus}</p>
                </div>
                {detailsItem.paymentId ? (
                  <div>
                    <p className="text-muted-foreground">{mt.adminPaymentId}</p>
                    <p className="font-mono text-xs break-all">{detailsItem.paymentId}</p>
                  </div>
                ) : null}
                {detailsItem.createdAt ? (
                  <div>
                    <p className="text-muted-foreground">{mt.createdLabel}</p>
                    <p className="font-medium">
                      {format(new Date(detailsItem.createdAt), "d MMMM yyyy, HH:mm", { locale: dateLocale })}
                    </p>
                  </div>
                ) : null}
                {detailsItem.paidAt ? (
                  <div>
                    <p className="text-muted-foreground">{mt.paidLabel}</p>
                    <p className="font-medium">
                      {format(new Date(detailsItem.paidAt), "d MMMM yyyy, HH:mm", { locale: dateLocale })}
                    </p>
                  </div>
                ) : null}
                {detailsItem.draftId ? (
                  <div>
                    <p className="text-muted-foreground">draft_id</p>
                    <p className="font-mono text-xs break-all">{detailsItem.draftId}</p>
                  </div>
                ) : null}
                {detailsItem.orderType === "upload_addon_bundle" ? (
                  <div className="md:col-span-2 space-y-1 pt-1">
                    <p className="text-muted-foreground">{mt.uploadAddonBundleComposition}</p>
                    {(detailsItem.uploadAddonBundleItems ?? []).length > 0 || detailsItem.uploadAddonAiCoverRequested ? (
                      <ul className="list-disc pl-5 space-y-0.5">
                        {(detailsItem.uploadAddonBundleItems ?? []).map((line, idx) => (
                          <li key={`${line.type}-${line.quantity}-${idx}`}>
                            {formatUploadAddonBundleLine(line, t.cabinet.promotion)}
                          </li>
                        ))}
                        {detailsItem.uploadAddonAiCoverRequested ? <li>{t.cabinet.promotion.aiCover.title}</li> : null}
                      </ul>
                    ) : (
                      <p className="text-amber-600 dark:text-amber-500">{mt.uploadAddonBundleCompositionUnavailable}</p>
                    )}
                  </div>
                ) : null}
                {detailsItem.tracksCount ? (
                  <div>
                    <p className="text-muted-foreground">tracks_count</p>
                    <p className="font-medium">{detailsItem.tracksCount}</p>
                  </div>
                ) : null}
                {detailsItem.contactEmail ? (
                  <div>
                    <p className="text-muted-foreground">contact_email</p>
                    <p className="font-medium break-all">{detailsItem.contactEmail}</p>
                  </div>
                ) : null}
                {detailsItem.contactTelegram ? (
                  <div>
                    <p className="text-muted-foreground">contact_telegram</p>
                    <p className="font-medium break-all">{detailsItem.contactTelegram}</p>
                  </div>
                ) : null}
              </div>
              {detailsItem.orderType === "ai_mastering" ? (
                <div className="space-y-2 pt-2">
                  <p className="text-sm font-medium">AI mastering WAV</p>
                  {detailsItem.aiMasteringAudioFiles.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {detailsItem.aiMasteringAudioFiles.map((fileName) => (
                        <Button key={fileName} variant="outline" size="sm" asChild>
                          <a
                            href={`/api/admin/service-fulfillments/${encodeURIComponent(detailsItem.orderId)}/audio/${encodeURIComponent(fileName)}`}
                          >
                            <Download className="h-4 w-4 mr-2" />
                            {fileName}
                          </a>
                        </Button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">WAV файлы не найдены</p>
                  )}
                </div>
              ) : null}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  )
}
