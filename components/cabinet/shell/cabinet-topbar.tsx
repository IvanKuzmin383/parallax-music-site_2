"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { formatDistanceToNow } from "date-fns"
import { ru } from "date-fns/locale"
import { Bell, CreditCard, LogOut, User } from "lucide-react"
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
import { useCabinetSession } from "@/lib/cabinet/hooks/use-cabinet-session"
import { cn } from "@/lib/utils"

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
  const { user, logout } = useCabinetSession()
  const [items, setItems] = useState<CabinetNotificationItem[]>([])
  const [unreadEvents, setUnreadEvents] = useState(0)
  const [news, setNews] = useState<PendingNewsItem[]>([])

  const loadInbox = useCallback(async () => {
    try {
      const [eventsRes, newsRes] = await Promise.all([
        fetch("/api/cabinet/notifications?limit=15", { credentials: "include" }),
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
  const badgeCount = unreadEvents + news.length
  const hasEvents = items.length > 0
  const hasNews = news.length > 0

  return (
    <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-2 border-b border-border/60 bg-background/90 px-3 backdrop-blur-md supports-[backdrop-filter]:bg-background/70 sm:px-4 md:px-5">
      <div className="flex shrink-0 items-center md:hidden">
        <SidebarTrigger />
      </div>

      <CabinetGlobalSearch className="min-w-0 flex-1 max-w-md md:max-w-lg" />

      <div className="ml-auto flex shrink-0 items-center gap-2">
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
                  События
                </p>
                {unreadEvents > 0 ? (
                  <button
                    type="button"
                    className="shrink-0 text-xs font-medium text-muted-foreground hover:text-foreground"
                    onClick={() => void markEventsRead(undefined, true)}
                  >
                    Прочитать все
                  </button>
                ) : null}
              </div>

              {!hasEvents ? (
                <p className="px-3 pb-3 text-sm text-muted-foreground">Нет новых событий</p>
              ) : (
                <ul className="min-w-0 space-y-0.5 px-1.5 pb-2">
                  {items.map((item) => {
                    const unread = !item.readAt
                    const rowClass = cn(
                      "block min-w-0 rounded-md px-2 py-2 transition-colors hover:bg-accent/60",
                      unread && "bg-muted/35",
                    )
                    const body = (
                      <div className="min-w-0 space-y-0.5">
                        <p
                          className={cn(
                            "break-words text-sm leading-snug",
                            unread ? "font-semibold" : "font-medium text-foreground/90",
                          )}
                        >
                          {item.title}
                        </p>
                        {item.body ? (
                          <p className="line-clamp-2 break-words text-xs text-muted-foreground">
                            {item.body}
                          </p>
                        ) : null}
                        <p className="text-[11px] text-muted-foreground/75">
                          {relativeTime(item.createdAt)}
                        </p>
                      </div>
                    )

                    return (
                      <li key={item.id} className="min-w-0">
                        {item.href ? (
                          <Link
                            href={item.href}
                            className={rowClass}
                            onClick={() => {
                              if (unread) void markEventsRead([item.id])
                            }}
                          >
                            {body}
                          </Link>
                        ) : (
                          <button
                            type="button"
                            className={cn(rowClass, "w-full text-left")}
                            onClick={() => {
                              if (unread) void markEventsRead([item.id])
                            }}
                          >
                            {body}
                          </button>
                        )}
                      </li>
                    )
                  })}
                </ul>
              )}

              <div className="mx-3 border-t border-border/60" />

              <div className="flex items-center justify-between gap-2 px-3 pt-2.5 pb-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Новости
                </p>
                {hasNews ? (
                  <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">
                    {news.length}
                  </span>
                ) : null}
              </div>

              {!hasNews ? (
                <p className="px-3 pb-3 text-sm text-muted-foreground">
                  Нет непрочитанных новостей
                </p>
              ) : (
                <ul className="min-w-0 space-y-0.5 px-1.5 pb-2">
                  {news.slice(0, 5).map((item) => (
                    <li key={item.id} className="min-w-0">
                      <Link
                        href="/cabinet/news"
                        className="block min-w-0 rounded-md bg-muted/35 px-2 py-2 transition-colors hover:bg-accent/60"
                        onClick={() => void dismissNews(item.id)}
                      >
                        <p className="break-words text-sm font-semibold leading-snug">
                          {item.title}
                        </p>
                        {item.createdAt ? (
                          <p className="mt-0.5 text-[11px] text-muted-foreground/75">
                            {relativeTime(item.createdAt)}
                          </p>
                        ) : null}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="border-t border-border/60 p-1">
              <DropdownMenuItem asChild className="cursor-pointer justify-center">
                <Link href="/cabinet/news">Все новости</Link>
              </DropdownMenuItem>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="secondary"
              size="icon"
              className={cn(
                "h-9 w-9 rounded-full text-sm font-semibold",
                "bg-muted text-foreground hover:bg-muted/80",
              )}
              aria-label="Меню аккаунта"
            >
              {initial}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuLabel className="font-normal">
              <p className="truncate text-sm font-semibold text-foreground">{name}</p>
              {email ? (
                <p className="truncate text-xs text-muted-foreground">{email}</p>
              ) : null}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/cabinet/settings?tab=profile#cabinet-tariff" className="cursor-pointer gap-2">
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
              className="cursor-pointer gap-2"
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
