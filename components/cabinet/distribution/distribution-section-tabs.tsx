"use client"

import Link from "next/link"
import { usePathname, useSearchParams } from "next/navigation"
import { cn } from "@/lib/utils"

const TABS = [
  { id: "releases", label: "Релизы", href: "/cabinet/music/distribution?tab=releases" },
  { id: "videos", label: "Видеоклипы", href: "/cabinet/music/distribution?tab=videos" },
] as const

export type DistributionTabId = (typeof TABS)[number]["id"]

export function resolveDistributionTab(
  pathname: string,
  tabParam: string | null
): DistributionTabId {
  if (pathname.startsWith("/cabinet/music/videos")) return "videos"
  if (tabParam === "videos") return "videos"
  return "releases"
}

export function DistributionSectionTabs({ active }: { active?: DistributionTabId }) {
  const pathname = usePathname() ?? ""
  const searchParams = useSearchParams()
  const current = active ?? resolveDistributionTab(pathname, searchParams.get("tab"))

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
