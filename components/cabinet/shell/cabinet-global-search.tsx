"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  CreditCard,
  Disc3,
  FileText,
  Search,
  Settings,
  Sparkles,
  Wallet,
  type LucideIcon,
} from "lucide-react"
import { Input } from "@/components/ui/input"
import {
  CABINET_SIDEBAR_NAV,
  FINANCE_SUB_NAV,
} from "@/lib/cabinet/navigation"
import { SERVICES_CATALOG } from "@/lib/cabinet/services-catalog"
import { useCabinetReleases } from "@/lib/cabinet/hooks/use-cabinet-releases"
import { releaseDetailHref } from "@/lib/cabinet/release-presenters"
import { openCabinetSupportChat } from "@/components/cabinet/support/cabinet-support-chat"
import { cn } from "@/lib/utils"

type SearchHit = {
  id: string
  title: string
  subtitle?: string
  /** Доп. слова для поиска (старые названия, синонимы). */
  keywords?: string[]
  href: string
  group: "pages" | "releases" | "services"
  Icon: LucideIcon
}

const EXTRA_PAGES: SearchHit[] = [
  {
    id: "balance",
    title: "Баланс",
    subtitle: "Финансы кабинета",
    keywords: ["баланс", "кошелёк", "кошелек", "деньги", "wallet"],
    href: "/cabinet/finance/balance",
    group: "pages",
    Icon: Wallet,
  },
  {
    id: "tariffs",
    title: "Тарифы",
    subtitle: "Подписка и оплата",
    keywords: ["тариф", "тарифы", "подписка", "оплата", "план"],
    href: "/cabinet/settings?tab=profile#cabinet-tariff",
    group: "pages",
    Icon: CreditCard,
  },
  {
    id: "settings-security",
    title: "Безопасность",
    subtitle: "Пароль, 2FA, сессии",
    href: "/cabinet/settings?tab=security",
    group: "pages",
    Icon: Settings,
  },
  {
    id: "upload",
    title: "Загрузить релиз",
    subtitle: "Новый сингл или альбом",
    href: "/cabinet/upload",
    group: "pages",
    Icon: Disc3,
  },
  {
    id: "support",
    title: "Поддержка",
    subtitle: "Чат с менеджером",
    keywords: ["чат", "помощь", "вопрос", "тикет"],
    href: "/cabinet?support=1",
    group: "pages",
    Icon: FileText,
  },
]

function normalize(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ")
}

function matchesQuery(haystack: string, q: string): boolean {
  const h = normalize(haystack)
  const parts = normalize(q).split(" ").filter(Boolean)
  return parts.every((p) => h.includes(p))
}

const GROUP_LABEL: Record<SearchHit["group"], string> = {
  pages: "Разделы",
  releases: "Релизы",
  services: "Услуги",
}

export function CabinetGlobalSearch({ className }: { className?: string }) {
  const router = useRouter()
  const { releases } = useCabinetReleases()
  const [query, setQuery] = useState("")
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const rootRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const catalog = useMemo(() => {
    const pages: SearchHit[] = [
      ...CABINET_SIDEBAR_NAV.map((item) => ({
        id: `nav-${item.id}`,
        title: item.label,
        href: item.href,
        group: "pages" as const,
        Icon: item.icon,
        keywords:
          item.id === "finance"
            ? ["баланс", "кошелёк", "кошелек", "деньги", "wallet"]
            : item.id === "settings"
              ? ["тариф", "тарифы", "подписка", "профиль", "оплата"]
              : undefined,
      })),
      ...FINANCE_SUB_NAV.map((item) => ({
        id: `fin-${item.id}`,
        title: item.label,
        subtitle: "Финансы",
        href: item.href,
        group: "pages" as const,
        Icon: item.icon,
        keywords:
          item.id === "finance"
            ? ["баланс", "кошелёк", "кошелек", "деньги", "wallet"]
            : undefined,
      })),
      ...EXTRA_PAGES,
    ]

    const services: SearchHit[] = SERVICES_CATALOG.map((s) => ({
      id: `svc-${s.slug}`,
      title: s.title,
      subtitle: s.shortDescription,
      href: s.href,
      group: "services" as const,
      Icon: Sparkles,
    }))

    const releaseHits: SearchHit[] = releases.map((r) => ({
      id: `rel-${r.id}`,
      title: r.title || "Без названия",
      subtitle: [r.artist, r.status].filter(Boolean).join(" · "),
      href: releaseDetailHref(r),
      group: "releases" as const,
      Icon: Disc3,
    }))

    return { pages, services, releaseHits }
  }, [releases])

  const hits = useMemo(() => {
    const q = query.trim()
    if (q.length < 1) {
      // Быстрые подсказки без запроса
      return [
        ...catalog.pages.slice(0, 6),
        ...catalog.releaseHits.slice(0, 4),
      ]
    }

    const filter = (list: SearchHit[]) =>
      list.filter((h) => {
        if (matchesQuery(h.title, q)) return true
        if (h.subtitle && matchesQuery(h.subtitle, q)) return true
        if (h.keywords?.some((kw) => matchesQuery(kw, q) || matchesQuery(q, kw))) {
          return true
        }
        return false
      })

    return [
      ...filter(catalog.pages).slice(0, 6),
      ...filter(catalog.releaseHits).slice(0, 8),
      ...filter(catalog.services).slice(0, 6),
    ]
  }, [catalog, query])

  const grouped = useMemo(() => {
    const order: SearchHit["group"][] = ["pages", "releases", "services"]
    return order
      .map((group) => ({
        group,
        items: hits.filter((h) => h.group === group),
      }))
      .filter((g) => g.items.length > 0)
  }, [hits])

  useEffect(() => {
    setActiveIndex(0)
  }, [query, open])

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", onDoc)
    return () => document.removeEventListener("mousedown", onDoc)
  }, [])

  const go = (href: string) => {
    setOpen(false)
    setQuery("")
    try {
      const url = new URL(href, "http://local")
      if (url.searchParams.get("support") === "1") {
        openCabinetSupportChat()
        return
      }
    } catch {
      // fall through
    }
    router.push(href)
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!open && (e.key === "ArrowDown" || e.key === "Enter")) {
      setOpen(true)
      return
    }
    if (!open) return
    if (e.key === "Escape") {
      setOpen(false)
      return
    }
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setActiveIndex((i) => Math.min(i + 1, Math.max(0, hits.length - 1)))
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setActiveIndex((i) => Math.max(i - 1, 0))
    } else if (e.key === "Enter") {
      e.preventDefault()
      const hit = hits[activeIndex]
      if (hit) go(hit.href)
    }
  }

  let flatIndex = -1

  return (
    <div ref={rootRef} className={cn("relative min-w-0", className)}>
      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          ref={inputRef}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder="Поиск по кабинету…"
          className="h-9 border-border/70 bg-muted/30 pl-9 pr-3 text-sm"
          aria-label="Поиск по кабинету"
          aria-expanded={open}
          aria-controls="cabinet-global-search-list"
          autoComplete="off"
        />
      </div>

      {open ? (
        <div
          id="cabinet-global-search-list"
          className="absolute left-0 top-[calc(100%+0.35rem)] z-50 w-[min(24rem,calc(100vw-1.5rem))] overflow-hidden rounded-xl border border-border/70 bg-popover shadow-lg"
          role="listbox"
        >
          <div className="cabinet-sidebar-scroll max-h-[min(22rem,70vh)] overflow-y-auto overscroll-contain p-1.5">
            {hits.length === 0 ? (
              <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                Ничего не найдено
              </p>
            ) : (
              grouped.map(({ group, items }) => (
                <div key={group} className="mb-1 last:mb-0">
                  <p className="px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {GROUP_LABEL[group]}
                    {query.trim().length === 0 && group === "pages"
                      ? " · подсказки"
                      : null}
                  </p>
                  <ul className="space-y-0.5">
                    {items.map((hit) => {
                      flatIndex += 1
                      const idx = flatIndex
                      const active = idx === activeIndex
                      const Icon = hit.Icon
                      return (
                        <li key={hit.id}>
                          <Link
                            href={hit.href}
                            role="option"
                            aria-selected={active}
                            className={cn(
                              "flex min-w-0 items-start gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors",
                              active ? "bg-accent" : "hover:bg-accent/60",
                            )}
                            onMouseEnter={() => setActiveIndex(idx)}
                            onClick={(e) => {
                              e.preventDefault()
                              go(hit.href)
                            }}
                          >
                            <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm font-medium text-foreground">
                                {hit.title}
                              </span>
                              {hit.subtitle ? (
                                <span className="block truncate text-xs text-muted-foreground">
                                  {hit.subtitle}
                                </span>
                              ) : null}
                            </span>
                          </Link>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              ))
            )}
          </div>
          <div className="border-t border-border/60 px-3 py-1.5 text-[11px] text-muted-foreground">
            ↑↓ навигация · Enter открыть · Esc закрыть
          </div>
        </div>
      ) : null}
    </div>
  )
}
