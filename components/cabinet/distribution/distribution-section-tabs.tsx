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
    <div className="flex w-fit flex-wrap gap-0.5 rounded-lg bg-card/40 p-0.5">
      {TABS.map((tab) => {
        const isActive = current === tab.id
        return (
          <Link
            key={tab.id}
            href={tab.href}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium leading-none transition-colors",
              isActive
                ? "bg-primary/20 text-foreground ring-1 ring-primary/40"
                : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
            )}
          >
            {tab.label}
          </Link>
        )
      })}
    </div>
  )
}
