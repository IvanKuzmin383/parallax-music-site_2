"use client"

import { useCallback, useEffect, useState } from "react"
import { Award, Copy, Lock, Trophy } from "lucide-react"
import { toast } from "sonner"
import { PageHeader } from "@/components/cabinet/shared/page-header"
import { EmptyState } from "@/components/cabinet/shared/empty-state"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { cn } from "@/lib/utils"
import type { GamificationProgress } from "@/lib/cabinet-achievements"
import type { CabinetCoupon } from "@/lib/cabinet-coupons"

const CATEGORY_LABELS: Record<string, string> = {
  onboarding: "Старт",
  catalog: "Каталог",
  finance: "Финансы",
  services: "Услуги",
  referrals: "Партнёрка",
}

export default function CabinetAchievementsPage() {
  const [progress, setProgress] = useState<GamificationProgress | null>(null)
  const [coupons, setCoupons] = useState<CabinetCoupon[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/cabinet/achievements", { credentials: "include" })
      if (!res.ok) {
        setProgress(null)
        setCoupons([])
        return
      }
      const data = (await res.json()) as {
        progress?: GamificationProgress
        coupons?: CabinetCoupon[]
      }
      setProgress(data.progress ?? null)
      setCoupons(data.coupons ?? [])
    } catch {
      setProgress(null)
      setCoupons([])
    }
  }, [])

  useEffect(() => {
    void load().finally(() => setLoading(false))
  }, [load])

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner className="h-8 w-8" />
      </div>
    )
  }

  if (!progress) {
    return (
      <EmptyState
        title="Не удалось загрузить"
        description="Обновите страницу или зайдите позже"
        icon={Trophy}
      />
    )
  }

  const next = progress.nextLevel
  const xpToNext = next ? Math.max(0, next.minXp - progress.xp) : 0
  const span =
    next && progress.level
      ? Math.max(1, next.minXp - progress.level.minXp)
      : 1
  const filled =
    next && progress.level
      ? Math.min(100, ((progress.xp - progress.level.minXp) / span) * 100)
      : 100

  return (
    <div className="w-full max-w-none space-y-5">
      <PageHeader
        title="Достижения"
        description="Уровень артиста, бейджи и награды за активность в кабинете"
      />

      <div className="rounded-2xl border border-border/60 bg-card/40 p-4 sm:p-5 space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Уровень</p>
            <p className="text-2xl font-bold tracking-tight">{progress.level.title}</p>
            <p className="text-sm text-muted-foreground mt-0.5">
              {progress.xp} XP · {progress.unlockedCount} из {progress.totalCount} достижений
            </p>
          </div>
          {next ? (
            <p className="text-sm text-muted-foreground">
              До «{next.title}»: {xpToNext} XP
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">Максимальный уровень</p>
          )}
        </div>
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-primary transition-[width]"
            style={{ width: `${filled}%` }}
          />
        </div>
      </div>

      {coupons.length > 0 ? (
        <div className="space-y-2">
          <p className="text-sm font-medium">Активные купоны</p>
          <ul className="space-y-2">
            {coupons.map((c) => (
              <li
                key={c.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/60 bg-card/30 px-3 py-2.5"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium">{c.title}</p>
                  <p className="text-xs text-muted-foreground">
                    Код {c.code}
                    {c.expiresAt
                      ? ` · до ${new Date(c.expiresAt).toLocaleDateString("ru-RU")}`
                      : ""}
                    {c.maxDiscountRub ? ` · до ${c.maxDiscountRub} ₽` : ""}
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(c.code)
                      toast.success("Код скопирован")
                    } catch {
                      toast.error("Не удалось скопировать")
                    }
                  }}
                >
                  <Copy className="h-3.5 w-3.5 mr-1.5" />
                  Копировать
                </Button>
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted-foreground">
            Купон можно применить при заказе услуги (скидка с лимитом в рублях).
          </p>
        </div>
      ) : null}

      <div className="grid gap-2 sm:grid-cols-2">
        {progress.achievements.map((a) => (
          <div
            key={a.id}
            className={cn(
              "rounded-xl border px-3 py-3 space-y-1",
              a.unlocked
                ? "border-emerald-500/30 bg-emerald-500/10"
                : "border-border/50 bg-muted/20 opacity-80"
            )}
          >
            <div className="flex items-start gap-2">
              {a.unlocked ? (
                <Award className="h-4 w-4 shrink-0 text-emerald-500 mt-0.5" />
              ) : (
                <Lock className="h-4 w-4 shrink-0 text-muted-foreground mt-0.5" />
              )}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold">{a.title}</p>
                  <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                    {CATEGORY_LABELS[a.category] || a.category}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{a.description}</p>
                <p className="text-[11px] text-muted-foreground mt-1">
                  {a.xp} XP
                  {a.unlockedAt
                    ? ` · ${new Date(a.unlockedAt).toLocaleDateString("ru-RU")}`
                    : ""}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
