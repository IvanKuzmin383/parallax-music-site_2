"use client"

import { useCallback, useEffect, useMemo, useState, type MouseEvent } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { formatDistanceToNow } from "date-fns"
import { ru } from "date-fns/locale"
import { Bell, CreditCard, LogOut, User, Wallet } from "lucide-react"
import { toast } from "sonner"
import { formatRub } from "@/lib/withdrawal-payout-calc"
import {
  cabinetServiceOrderExists,
  parseCabinetOrderDetailHref,
} from "@/lib/cabinet/notification-href"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { CabinetGlobalSearch } from "@/components/cabinet/shell/cabinet-global-search"
import { CabinetProjectFilter } from "@/components/cabinet/shell/cabinet-project-filter"
import { CabinetThemeToggle } from "@/components/cabinet/shell/cabinet-theme-toggle"
import { openCabinetSupportChat } from "@/components/cabinet/support/cabinet-support-chat"
import { isClickOnLink, LinkifiedText } from "@/components/announcement-body"
import { useCabinetSession } from "@/lib/cabinet/hooks/use-cabinet-session"
import { CabinetKycStatusBadge } from "@/components/cabinet/kyc/cabinet-kyc-status-badge"
import { cn } from "@/lib/utils"

function isSupportChatHref(href: string | null | undefined): boolean {
  if (!href) return false
  try {
    const url = new URL(href, "http://local")
    return url.searchParams.get("support") === "1"
  } catch {
    return href.includes("support=1")
  }
}

type CabinetNotificationItem = {
  id: string
  title: string
  body: string | null
  href: string | null
  readAt: string | null
  createdAt: string
}

type PendingNewsItem = {
  id: string
  title: string
  createdAt?: string
}

function userInitial(displayName?: string, email?: string): string {
  const source = displayName?.trim() || email?.trim() || "?"
  return source.charAt(0).toUpperCase()
}

function relativeTime(iso: string): string {
  try {
    return formatDistanceToNow(new Date(iso), { addSuffix: true, locale: ru })
  } catch {
    return ""
  }
}

export function CabinetTopbar() {
  const router = useRouter()
  const { user, logout } = useCabinetSession()
  const [items, setItems] = useState<CabinetNotificationItem[]>([])
  const [unreadEvents, setUnreadEvents] = useState(0)
  const [news, setNews] = useState<PendingNewsItem[]>([])

  const loadInbox = useCallback(async () => {
    try {
      const [eventsRes, newsRes] = await Promise.all([
        fetch("/api/cabinet/notifications?limit=15&unread=1", { credentials: "include" }),
        fetch("/api/cabinet/announcements", { credentials: "include" }),
      ])

      if (eventsRes.ok) {
        const data = (await eventsRes.json()) as {
          notifications?: CabinetNotificationItem[]
          unreadCount?: number
        }
        setItems(data.notifications ?? [])
        setUnreadEvents(data.unreadCount ?? 0)
      } else {
        setItems([])
        setUnreadEvents(0)
      }

      if (newsRes.ok) {
        const data = (await newsRes.json()) as { announcements?: PendingNewsItem[] }
        setNews(data.announcements ?? [])
      } else {
        setNews([])
      }
    } catch {
      setItems([])
      setUnreadEvents(0)
      setNews([])
    }
  }, [])

  useEffect(() => {
    void loadInbox()
    const timer = window.setInterval(() => void loadInbox(), 60_000)
    return () => window.clearInterval(timer)
  }, [loadInbox])

  const markEventsRead = useCallback(
    async (ids?: string[], all?: boolean) => {
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
      await loadInbox()
    },
    [loadInbox],
  )

  const dismissNews = useCallback(
    async (announcementId: string) => {
      try {
        await fetch("/api/cabinet/announcements/dismiss", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ announcementId }),
        })
      } catch {
        // ignore
      }
      await loadInbox()
    },
    [loadInbox],
  )

  const name = user?.displayName?.trim() || "Аккаунт"
  const email = user?.email ?? ""
  const initial = userInitial(user?.displayName, user?.email)
  const walletBalance = user?.walletBalance ?? 0
  const badgeCount = unreadEvents + news.length

  type InboxRow =
    | {
        kind: "event"
        id: string
        title: string
        body: string | null
        href: string | null
        createdAt: string
        unread: boolean
      }
    | {
        kind: "news"
        id: string
        title: string
        body: null
        href: "/cabinet/news"
        createdAt: string
        unread: true
      }

  const inboxRows = useMemo((): InboxRow[] => {
    const eventRows: InboxRow[] = items.map((item) => ({
      kind: "event",
      id: item.id,
      title: item.title,
      body: item.body,
      href: item.href,
      createdAt: item.createdAt,
      unread: !item.readAt,
    }))
    const newsRows: InboxRow[] = news.map((item) => ({
      kind: "news",
      id: item.id,
      title: item.title,
      body: null,
      href: "/cabinet/news",
      createdAt: item.createdAt || new Date(0).toISOString(),
      unread: true,
    }))
    return [...eventRows, ...newsRows].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
  }, [items, news])

  const markAllRead = useCallback(async () => {
    try {
      const tasks: Promise<unknown>[] = []
      if (unreadEvents > 0) {
        tasks.push(
          fetch("/api/cabinet/notifications/read", {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ all: true }),
          })
        )
      }
      for (const item of news) {
        tasks.push(
          fetch("/api/cabinet/announcements/dismiss", {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ announcementId: item.id }),
          })
        )
      }
      await Promise.all(tasks)
    } catch {
      // ignore
    }
    await loadInbox()
  }, [loadInbox, news, unreadEvents])

  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2 border-b border-border/50 bg-background/90 px-3 backdrop-blur-xl supports-[backdrop-filter]:bg-background/75 sm:px-4 md:px-6">
      <div className="flex shrink-0 items-center md:hidden">
        <SidebarTrigger />
      </div>

      <div className="flex min-w-0 flex-1 items-center gap-2 max-w-2xl md:max-w-3xl">
        <CabinetProjectFilter />
        <CabinetGlobalSearch className="min-w-0 flex-1" />
      </div>

      <div className="ml-auto flex shrink-0 items-center gap-2">
        <CabinetThemeToggle />
        <DropdownMenu onOpenChange={(open) => open && void loadInbox()}>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="relative h-9 w-9 rounded-lg"
              aria-label={
                badgeCount > 0
                  ? `Уведомления, непрочитанных: ${badgeCount}`
                  : "Уведомления"
              }
            >
              <Bell className="h-4 w-4" />
              {badgeCount > 0 ? (
                <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-semibold leading-none text-black">
                  {badgeCount > 9 ? "9+" : badgeCount}
                </span>
              ) : null}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-[min(20rem,calc(100vw-1.25rem))] overflow-hidden p-0"
          >
            <div className="cabinet-sidebar-scroll max-h-[min(22rem,70vh)] min-w-0 overflow-y-auto overscroll-contain">
              <div className="flex items-center justify-between gap-2 px-3 pt-2.5 pb-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Непрочитанные
                </p>
                {badgeCount > 0 ? (
                  <button
                    type="button"
                    className="shrink-0 text-xs font-medium text-muted-foreground hover:text-foreground"
                    onClick={() => void markAllRead()}
                  >
                    Прочитать все
                  </button>
                ) : null}
              </div>

              {inboxRows.length === 0 ? (
                <p className="px-3 pb-3 text-sm text-muted-foreground">
                  Нет непрочитанных уведомлений
                </p>
              ) : (
                <ul className="min-w-0 space-y-0.5 px-1.5 pb-2">
                  {inboxRows.map((item) => {
                    const opensSupport =
                      item.kind === "event" && isSupportChatHref(item.href)
                    const rowClass = cn(
                      "block min-w-0 rounded-md px-2 py-2 transition-colors hover:bg-muted/70",
                      item.unread
                        ? "bg-emerald-500/15 ring-1 ring-inset ring-emerald-500/30 hover:bg-emerald-500/20"
                        : "bg-transparent",
                    )
                    const body = (
                      <div className="flex min-w-0 items-start gap-2">
                        <span
                          className={cn(
                            "mt-1.5 h-2 w-2 shrink-0 rounded-full",
                            item.unread ? "bg-emerald-500" : "bg-transparent",
                          )}
                          aria-hidden
                        />
                        <div className="min-w-0 flex-1 space-y-0.5">
                          <p
                            className={cn(
                              "break-words text-sm leading-snug text-foreground",
                              item.unread ? "font-semibold" : "font-medium",
                            )}
                          >
                            {item.title}
                          </p>
                          {item.body ? (
                            <p className="line-clamp-2 break-words text-xs text-foreground/70">
                              <LinkifiedText text={item.body} />
                            </p>
                          ) : null}
                          <p className="text-[11px] text-foreground/55">
                            {relativeTime(item.createdAt)}
                          </p>
                        </div>
                      </div>
                    )

                    const orderDetail = parseCabinetOrderDetailHref(item.href)

                    const onActivate = () => {
                      if (item.kind === "event" && item.unread) {
                        void markEventsRead([item.id])
                      }
                      if (item.kind === "news") {
                        void dismissNews(item.id)
                      }
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
                      <li key={`${item.kind}-${item.id}`} className="min-w-0">
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

            <div className="border-t border-border/60 p-1">
              <DropdownMenuItem asChild className="cursor-pointer justify-center">
                <Link href="/cabinet/notifications">Показать все</Link>
              </DropdownMenuItem>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="secondary"
              className={cn(
                "h-9 gap-2 rounded-full pl-1 pr-2.5 sm:pr-3",
                "bg-muted/70 text-foreground ring-1 ring-inset ring-border/60",
                "hover:bg-muted",
              )}
              aria-label={`Меню аккаунта, баланс ${formatRub(walletBalance)}`}
            >
              <span
                className={cn(
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-semibold",
                  "bg-primary/15 text-foreground ring-1 ring-inset ring-primary/30",
                )}
              >
                {initial}
              </span>
              <span className="text-sm font-medium tabular-nums whitespace-nowrap">
                {formatRub(walletBalance)}
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuLabel className="font-normal">
              <p className="truncate text-sm font-semibold text-foreground">{name}</p>
              {email ? (
                <p className="truncate text-xs text-muted-foreground">{email}</p>
              ) : null}
            </DropdownMenuLabel>
            <div className="px-2 pb-2">
              <CabinetKycStatusBadge />
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/cabinet/finance/balance" className="cursor-pointer gap-2">
                <Wallet className="h-4 w-4" />
                Баланс · {formatRub(walletBalance)}
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/cabinet/subscription" className="cursor-pointer gap-2">
                <CreditCard className="h-4 w-4" />
                Тарифы и оплата
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/cabinet/settings?tab=profile" className="cursor-pointer gap-2">
                <User className="h-4 w-4" />
                Профиль
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="cursor-pointer gap-2 text-muted-foreground focus:text-rose-300"
              onSelect={() => void logout()}
            >
              <LogOut className="h-4 w-4" />
              Выйти
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
