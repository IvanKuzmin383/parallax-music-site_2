"use client"

import Link from "next/link"
import { usePathname, useSearchParams } from "next/navigation"
import { cn } from "@/lib/utils"

const TABS = [
  { id: "streaming", label: "Стриминги", href: "/cabinet/music-stats?tab=streaming" },
  { id: "publicka", label: "Музыка для бизнеса", href: "/cabinet/music-stats?tab=publicka" },
] as const

export type StatsTabId = (typeof TABS)[number]["id"]

export function resolveStatsTab(tabParam: string | null): StatsTabId {
  return tabParam === "publicka" ? "publicka" : "streaming"
}

export function StatsSectionTabs({ active }: { active?: StatsTabId }) {
  const pathname = usePathname() ?? ""
  const searchParams = useSearchParams()
  const current =
    active ??
    (pathname.startsWith("/cabinet/publicka")
      ? "publicka"
      : resolveStatsTab(searchParams.get("tab")))

  return (
    <div className="flex flex-wrap gap-1 rounded-xl bg-card/40 p-1 w-fit">
      {TABS.map((tab) => {
        const isActive = current === tab.id
        return (
          <Link
            key={tab.id}
            href={tab.href}
            className={cn(
              "rounded-lg px-4 py-2 text-sm font-medium transition-colors",
              isActive
                ? "bg-primary/20 text-foreground ring-1 ring-primary/40"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            )}
          >
            {tab.label}
          </Link>
        )
      })}
    </div>
  )
}
