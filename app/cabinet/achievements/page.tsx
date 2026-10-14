"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Award, Check, Copy, Gift, Lock, Trophy } from "lucide-react"
import { toast } from "sonner"
import { PageHeader } from "@/components/cabinet/shared/page-header"
import { EmptyState } from "@/components/cabinet/shared/empty-state"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { cn } from "@/lib/utils"
import type { GamificationProgress, UserAchievementView } from "@/lib/cabinet-achievements"
import type { CabinetCoupon } from "@/lib/cabinet-coupons"
import type { AchievementCategory } from "@/lib/cabinet/achievements-catalog"

const CATEGORY_ORDER: AchievementCategory[] = [
  "onboarding",
  "catalog",
  "finance",
  "services",
  "referrals",
]

const CATEGORY_LABELS: Record<AchievementCategory, string> = {
  onboarding: "Старт",
  catalog: "Каталог",
  finance: "Финансы",
  services: "Услуги",
  referrals: "Партнёрка",
}

const CATEGORY_HINTS: Record<AchievementCategory, string> = {
  onboarding: "Первые шаги в кабинете",
  catalog: "Релизы на площадках",
  finance: "Баланс и пополнения",
  services: "Оплата услуг кабинета",
  referrals: "Приглашённые артисты",
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

  const grouped = useMemo(() => {
    if (!progress) return []
    return CATEGORY_ORDER.map((category) => {
      const items = progress.achievements.filter((a) => a.category === category)
      return {
        category,
        label: CATEGORY_LABELS[category],
        hint: CATEGORY_HINTS[category],
        items,
        unlocked: items.filter((a) => a.unlocked).length,
        total: items.length,
      }
    }).filter((g) => g.total > 0)
  }, [progress])

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

  const levels = progress.levels?.length
    ? progress.levels
    : [
        progress.level,
        ...(progress.nextLevel ? [progress.nextLevel] : []),
      ]
  const currentIdx = levels.findIndex((l) => l.id === progress.level.id)
  const next = progress.nextLevel
  const xpToNext = next ? Math.max(0, next.minXp - progress.xp) : 0
  const span =
    next && progress.level ? Math.max(1, next.minXp - progress.level.minXp) : 1
  const filled =
    next && progress.level
      ? Math.min(100, ((progress.xp - progress.level.minXp) / span) * 100)
      : 100
  const maxXp = levels[levels.length - 1]?.minXp ?? progress.xp

  return (
    <div className="w-full max-w-none space-y-6">
      <PageHeader
        title="Достижения"
        className="[&_p]:max-w-none"
        description="Делаете действия в кабинете - получаете XP и открываете уровень. Часть ачивок даёт купон или деньги на баланс."
      />

      <section className="rounded-2xl border border-border/60 bg-card/40 p-4 sm:p-5 space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Текущий уровень
            </p>
            <p className="text-2xl font-bold tracking-tight">{progress.level.title}</p>
            <p className="text-sm text-muted-foreground mt-0.5">
              {progress.xp} XP из {maxXp} · открыто {progress.unlockedCount} из{" "}
              {progress.totalCount} достижений
            </p>
          </div>
          {next ? (
            <p className="text-sm text-muted-foreground">
              До «{next.title}»: ещё {xpToNext} XP
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

        <div>
          <p className="text-sm font-medium mb-2">Лестница уровней</p>
          <ol className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {levels.map((level, index) => {
              const reached = progress.xp >= level.minXp
              const isCurrent = level.id === progress.level.id
              const prevMin = index > 0 ? levels[index - 1]!.minXp : 0
              const needFromPrev = level.minXp - prevMin
              return (
                <li
                  key={level.id}
                  className={cn(
                    "rounded-xl border px-3 py-2.5",
                    isCurrent
                      ? "border-primary/50 bg-primary/10"
                      : reached
                        ? "border-emerald-500/25 bg-emerald-500/5"
                        : "border-border/50 bg-muted/15"
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p
                      className={cn(
                        "text-sm font-semibold",
                        !reached && !isCurrent && "text-muted-foreground"
                      )}
                    >
                      {index + 1}. {level.title}
                    </p>
                    {isCurrent ? (
                      <span className="text-[10px] uppercase tracking-wide text-primary">
                        Сейчас
                      </span>
                    ) : reached ? (
                      <Check className="h-3.5 w-3.5 text-emerald-500" />
                    ) : null}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    от {level.minXp} XP
                    {index > 0 ? ` · +${needFromPrev} XP с прошлого` : ""}
                    {isCurrent && next
                      ? ` · до следующего ${xpToNext} XP`
                      : ""}
                  </p>
                </li>
              )
            })}
          </ol>
          {currentIdx >= 0 && next ? (
            <p className="text-xs text-muted-foreground mt-2">
              Уровень {currentIdx + 1} из {levels.length}. Наберите ещё {xpToNext}{" "}
              XP за достижения ниже.
            </p>
          ) : null}
        </div>
      </section>

      {coupons.length > 0 ? (
        <section className="space-y-2">
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
            Купон применяется при заказе услуги (скидка с лимитом в рублях).
          </p>
        </section>
      ) : null}

      <section className="space-y-5">
        <div>
          <p className="text-sm font-medium">Что нужно сделать</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Открытая ачивка уже засчитана. Закрытая - условие ещё не выполнено.
          </p>
        </div>

        {grouped.map((group) => (
          <div key={group.category} className="space-y-2">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <div>
                <h2 className="text-sm font-semibold">{group.label}</h2>
                <p className="text-xs text-muted-foreground">{group.hint}</p>
              </div>
              <p className="text-xs text-muted-foreground tabular-nums">
                {group.unlocked}/{group.total}
              </p>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {group.items.map((a) => (
                <AchievementCard key={a.id} achievement={a} />
              ))}
            </div>
          </div>
        ))}
      </section>
    </div>
  )
}

function AchievementCard({ achievement: a }: { achievement: UserAchievementView }) {
  return (
    <div
      className={cn(
        "rounded-xl border px-3 py-3 space-y-1.5",
        a.unlocked
          ? "border-emerald-500/30 bg-emerald-500/10"
          : "border-border/50 bg-muted/20"
      )}
    >
      <div className="flex items-start gap-2">
        {a.unlocked ? (
          <Award className="h-4 w-4 shrink-0 text-emerald-500 mt-0.5" />
        ) : (
          <Lock className="h-4 w-4 shrink-0 text-muted-foreground mt-0.5" />
        )}
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold">{a.title}</p>
            <span
              className={cn(
                "text-[10px] uppercase tracking-wide",
                a.unlocked ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"
              )}
            >
              {a.unlocked ? "Открыто" : "Закрыто"}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            <span className="text-foreground/80">Условие: </span>
            {a.description}
          </p>
          <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
            <span>+{a.xp} XP</span>
            {a.rewardLabel ? (
              <span className="inline-flex items-center gap-1 text-foreground/80">
                <Gift className="h-3 w-3 shrink-0" />
                {a.rewardLabel}
              </span>
            ) : (
              <span>Без доп. награды</span>
            )}
            {a.unlockedAt ? (
              <span>{new Date(a.unlockedAt).toLocaleDateString("ru-RU")}</span>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}
