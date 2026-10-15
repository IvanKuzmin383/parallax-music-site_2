"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Award } from "lucide-react"
import type { GamificationProgress } from "@/lib/cabinet-achievements"

export function DashboardAchievementsCard() {
  const [progress, setProgress] = useState<GamificationProgress | null>(null)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const res = await fetch("/api/cabinet/achievements", { credentials: "include" })
        if (!res.ok) return
        const data = (await res.json()) as { progress?: GamificationProgress }
        if (!cancelled) setProgress(data.progress ?? null)
      } catch {
        // ignore
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  if (!progress) return null

  const next = progress.nextLevel
  const span = next ? Math.max(1, next.minXp - progress.level.minXp) : 1
  const filled = next
    ? Math.min(100, ((progress.xp - progress.level.minXp) / span) * 100)
    : 100

  return (
    <Link
      href="/cabinet/settings?tab=achievements"
      className="block rounded-2xl border border-border/60 bg-card/40 p-4 transition-colors hover:bg-card/60"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15 text-primary">
          <Award className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="font-semibold leading-none">{progress.level.title}</p>
            <p className="text-xs text-muted-foreground">
              {progress.unlockedCount}/{progress.totalCount} · {progress.xp} XP
            </p>
          </div>
          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
            <div className="h-full rounded-full bg-primary" style={{ width: `${filled}%` }} />
          </div>
          <p className="text-xs text-muted-foreground">
            {next
              ? `До «${next.title}»: ${Math.max(0, next.minXp - progress.xp)} XP`
              : "Максимальный уровень"}
          </p>
        </div>
      </div>
    </Link>
  )
}
