"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

const TABS = [
  { id: "releases", label: "Релизы", href: "/cabinet/distribution/music" },
  { id: "videos", label: "Видеоклипы", href: "/cabinet/distribution/music-video" },
] as const

export type DistributionTabId = (typeof TABS)[number]["id"]

export function resolveDistributionTab(pathname: string): DistributionTabId {
  if (
    pathname === "/cabinet/distribution/music-video" ||
    pathname.startsWith("/cabinet/distribution/music-video/") ||
    pathname.startsWith("/cabinet/music/videos")
  ) {
    return "videos"
  }
  return "releases"
}

export function DistributionSectionTabs({ active }: { active?: DistributionTabId }) {
  const pathname = usePathname() ?? ""
  const current = active ?? resolveDistributionTab(pathname)

  return (
    <div className="flex h-9 w-fit shrink-0 items-center gap-0.5 rounded-md bg-card/40 p-0.5">
      {TABS.map((tab) => {
        const isActive = current === tab.id
        return (
          <Link
            key={tab.id}
            href={tab.href}
            className={cn(
              "inline-flex h-full items-center rounded-[5px] px-3 text-sm font-medium leading-none transition-colors",
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
