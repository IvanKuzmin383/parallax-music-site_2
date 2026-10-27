"use client"

import { useCallback, useEffect, useMemo, useState, type MouseEvent } from "react"
import { useRouter } from "next/navigation"
import { formatDistanceToNow } from "date-fns"
import { ru } from "date-fns/locale"
import { Bell } from "lucide-react"
import { toast } from "sonner"
import { isClickOnLink, LinkifiedText } from "@/components/announcement-body"
import { PageHeader } from "@/components/cabinet/shared/page-header"
import { EmptyState } from "@/components/cabinet/shared/empty-state"
import { openCabinetSupportChat } from "@/components/cabinet/support/cabinet-support-chat"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  cabinetServiceOrderExists,
  parseCabinetOrderDetailHref,
} from "@/lib/cabinet/notification-href"
import { cn } from "@/lib/utils"

type NotificationItem = {
  id: string
  title: string
  body: string | null
  href: string | null
  readAt: string | null
  createdAt: string
}

function isSupportChatHref(href: string | null | undefined): boolean {
  if (!href) return false
  try {
    const url = new URL(href, "http://local")
    return url.searchParams.get("support") === "1"
  } catch {
    return href.includes("support=1")
  }
}

function relativeTime(iso: string): string {
  try {
    return formatDistanceToNow(new Date(iso), { addSuffix: true, locale: ru })
  } catch {
    return ""
  }
}

export default function CabinetNotificationsPage() {
  const router = useRouter()
  const [items, setItems] = useState<NotificationItem[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<"all" | "unread">("all")
  const [marking, setMarking] = useState(false)

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/cabinet/notifications?limit=100", {
        credentials: "include",
      })
      if (!res.ok) {
        setItems([])
        setUnreadCount(0)
        return
      }
      const data = (await res.json()) as {
        notifications?: NotificationItem[]
        unreadCount?: number
      }
      setItems(data.notifications ?? [])
      setUnreadCount(data.unreadCount ?? 0)
    } catch {
      setItems([])
      setUnreadCount(0)
    }
  }, [])

  useEffect(() => {
    void load().finally(() => setLoading(false))
  }, [load])

  const markRead = useCallback(
    async (ids?: string[], all?: boolean) => {
      setMarking(true)
      try {
        await fetch("/api/cabinet/notifications/read", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(all ? { all: true } : { ids }),
        })
      } catch {
        // ignore
      }
      await load()
      setMarking(false)
    },
    [load]
  )

  const visible = useMemo(() => {
    if (tab === "unread") return items.filter((item) => !item.readAt)
    return items
  }, [items, tab])

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner className="h-8 w-8" />
      </div>
    )
  }

  return (
    <div className="w-full max-w-none space-y-5">
      <PageHeader
        title="Уведомления"
        description="События по заказам, релизам и поддержке"
      >
        {unreadCount > 0 ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={marking}
            onClick={() => void markRead(undefined, true)}
          >
            Прочитать все
          </Button>
        ) : null}
      </PageHeader>

      <Tabs
        value={tab}
        onValueChange={(v) => setTab(v === "unread" ? "unread" : "all")}
      >
        <TabsList>
          <TabsTrigger value="all">Все</TabsTrigger>
          <TabsTrigger value="unread">
            Непрочитанные
            {unreadCount > 0 ? ` (${unreadCount})` : ""}
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {visible.length === 0 ? (
        <EmptyState
          title={tab === "unread" ? "Нет непрочитанных" : "Нет уведомлений"}
          description={
            tab === "unread"
              ? "Все события уже прочитаны"
              : "Здесь появятся уведомления о заказах и статусах"
          }
          icon={Bell}
        />
      ) : (
        <ul className="space-y-1.5">
          {visible.map((item) => {
            const unread = !item.readAt
            const opensSupport = isSupportChatHref(item.href)
            const rowClass = cn(
              "block min-w-0 rounded-xl border border-border/60 px-3 py-3 transition-colors hover:bg-muted/50",
              unread
                ? "bg-emerald-500/10 ring-1 ring-inset ring-emerald-500/25"
                : "bg-card/30"
            )
            const body = (
              <div className="flex min-w-0 items-start gap-2.5">
                <span
                  className={cn(
                    "mt-1.5 h-2 w-2 shrink-0 rounded-full",
                    unread ? "bg-emerald-500" : "bg-transparent"
                  )}
                  aria-hidden
                />
                <div className="min-w-0 flex-1 space-y-0.5">
                  <p
                    className={cn(
                      "break-words text-sm leading-snug text-foreground",
                      unread ? "font-semibold" : "font-medium"
                    )}
                  >
                    {item.title}
                  </p>
                  {item.body ? (
                    <p className="break-words text-sm text-muted-foreground whitespace-pre-wrap">
                      <LinkifiedText text={item.body} />
                    </p>
                  ) : null}
                  <p className="text-[11px] text-muted-foreground">
                    {relativeTime(item.createdAt)}
                  </p>
                </div>
              </div>
            )

            const orderDetail = parseCabinetOrderDetailHref(item.href)

            const onActivate = () => {
              if (unread) void markRead([item.id])
              if (opensSupport) openCabinetSupportChat()
            }

            const onRowClick = async (e: MouseEvent) => {
              if (isClickOnLink(e)) return
              onActivate()
              if (opensSupport) return
              if (orderDetail) {
                const exists = await cabinetServiceOrderExists(orderDetail.orderId)
                if (!exists) {
                  toast.message("Этот платёж не отображается в разделе «Заказы»", {
                    description: "Уведомление отмечено прочитанным.",
                  })
                  return
                }
                router.push(`/cabinet/orders/${orderDetail.orderId}`)
                return
              }
              if (item.href) router.push(item.href)
            }

            return (
              <li key={item.id} className="min-w-0">
                <div
                  role="button"
                  tabIndex={0}
                  className={cn(rowClass, "w-full cursor-pointer text-left")}
                  onClick={(e) => void onRowClick(e)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault()
                      void onRowClick(e as unknown as MouseEvent)
                    }
                  }}
                >
                  {body}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
