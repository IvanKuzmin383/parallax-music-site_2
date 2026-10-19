"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import {
  Award,
  Briefcase,
  Check,
  Copy,
  Disc3,
  Gift,
  Lock,
  Music2,
  Share2,
  Sparkles,
  Trophy,
  Upload,
  Video,
  Wallet,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { toast } from "sonner"
import { dashboardGlassPanelClass } from "@/components/cabinet/dashboard/dashboard-glass"
import { EmptyState } from "@/components/cabinet/shared/empty-state"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { cn } from "@/lib/utils"
import type { GamificationProgress, UserAchievementView } from "@/lib/cabinet-achievements"
import type { CabinetCoupon } from "@/lib/cabinet-coupons"
import { ARTIST_LEVELS } from "@/lib/cabinet/achievements-catalog"

const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII"] as const

const ACHIEVEMENT_ICONS: Record<string, LucideIcon> = {
  welcome: Sparkles,
  first_draft: Upload,
  first_moderation: Music2,
  first_released: Disc3,
  releases_3: Trophy,
  releases_10: Award,
  first_wallet_topup: Wallet,
  first_service: Gift,
  first_music_video: Video,
  first_publicka: Briefcase,
  referral_1: Share2,
  referral_3: Share2,
}

function levelIndex(levelId: string): number {
  const idx = ARTIST_LEVELS.findIndex((l) => l.id === levelId)
  return idx >= 0 ? idx : 0
}

function levelRoman(levelId: string): string {
  return ROMAN[levelIndex(levelId)] ?? String(levelIndex(levelId) + 1)
}

function progressRatio(a: UserAchievementView): number {
  if (a.unlocked) return 1
  if (a.progressTarget <= 0) return 0
  return Math.min(1, a.progressCurrent / a.progressTarget)
}

function pluralRu(n: number, one: string, few: string, many: string): string {
  const abs = Math.abs(n) % 100
  const last = abs % 10
  if (abs > 10 && abs < 20) return `${n} ${many}`
  if (last === 1) return `${n} ${one}`
  if (last >= 2 && last <= 4) return `${n} ${few}`
  return `${n} ${many}`
}

function remainingLabel(a: UserAchievementView): string {
  const left = Math.max(0, a.progressTarget - a.progressCurrent)
  if (a.id.startsWith("releases_") || a.id === "first_released") {
    return pluralRu(left, "релиз", "релиза", "релизов")
  }
  if (a.id.startsWith("referral_")) {
    return pluralRu(left, "реферал", "реферала", "рефералов")
  }
  return pluralRu(left, "шаг", "шага", "шагов")
}

export function CabinetAchievementsTab() {
  const [progress, setProgress] = useState<GamificationProgress | null>(null)
  const [coupons, setCoupons] = useState<CabinetCoupon[]>([])
  const [loading, setLoading] = useState(true)
  const [showLevels, setShowLevels] = useState(false)

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

  const nextRewardAchievement = useMemo(() => {
    if (!progress) return null
    return (
      progress.achievements.find((a) => !a.unlocked && a.rewardLabel) ??
      progress.achievements.find((a) => !a.unlocked) ??
      null
    )
  }, [progress])

  const nearComplete = useMemo(() => {
    if (!progress) return null
    const candidates = progress.achievements.filter(
      (a) => !a.unlocked && a.progressTarget > 1 && a.progressCurrent > 0
    )
    if (candidates.length === 0) return null
    return candidates.sort((a, b) => progressRatio(b) - progressRatio(a))[0] ?? null
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

  const next = progress.nextLevel
  const xpToNext = next ? Math.max(0, next.minXp - progress.xp) : 0
  const span =
    next && progress.level ? Math.max(1, next.minXp - progress.level.minXp) : 1
  const filled =
    next && progress.level
      ? Math.min(100, ((progress.xp - progress.level.minXp) / span) * 100)
      : 100
  const levelNum = levelIndex(progress.level.id) + 1
  const nextLevelNum = next ? levelIndex(next.id) + 1 : null
  const availableBonuses = coupons.length
  const levels = progress.levels?.length ? progress.levels : ARTIST_LEVELS

  return (
    <div className="w-full max-w-none space-y-5 md:space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">
            Достижения и бонусы
          </h2>
          <p className="text-sm text-muted-foreground">
            Важные этапы вашего проекта. Награды за каждый шаг.
          </p>
        </div>
        {availableBonuses > 0 ? (
          <button
            type="button"
            onClick={() => {
              const el = document.getElementById("achievements-coupons")
              el?.scrollIntoView({ behavior: "smooth", block: "start" })
            }}
            className="inline-flex items-center gap-2 rounded-full border border-primary/35 bg-primary/15 px-3.5 py-1.5 text-sm font-medium text-primary shadow-[0_0_24px_rgba(240,31,67,0.2)] transition-colors hover:bg-primary/25"
          >
            <Gift className="h-4 w-4" />
            {availableBonuses}{" "}
            {availableBonuses === 1
              ? "бонус доступен"
              : availableBonuses < 5
                ? "бонуса доступно"
                : "бонусов доступно"}
          </button>
        ) : null}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section
          className={cn(
            dashboardGlassPanelClass,
            "group/level relative overflow-hidden p-5 transition-all duration-300",
            "motion-safe:hover:-translate-y-0.5 hover:border-primary/40",
            "hover:shadow-[0_12px_36px_rgba(240,31,67,0.14)]",
          )}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-start gap-4">
              <div className="relative flex h-16 w-16 shrink-0 items-center justify-center">
                <div
                  className="absolute inset-0 rotate-45 rounded-xl border border-primary/40 bg-gradient-to-br from-primary/30 via-primary/10 to-transparent shadow-[0_0_28px_rgba(240,31,67,0.25)] transition-transform duration-500 motion-safe:group-hover/level:rotate-[50deg] motion-safe:group-hover/level:scale-105"
                  aria-hidden
                />
                <span className="relative text-xl font-bold tracking-wide text-primary transition-transform duration-300 motion-safe:group-hover/level:scale-110">
                  {levelRoman(progress.level.id)}
                </span>
              </div>
              <div className="min-w-0 pt-0.5">
                <p className="text-xs text-muted-foreground">Ваш уровень в Parallax</p>
                <p className="mt-0.5 text-2xl font-semibold tracking-tight">
                  Уровень {levelNum}
                </p>
                <p className="mt-0.5 text-sm text-muted-foreground">{progress.level.title}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowLevels((v) => !v)}
              className="shrink-0 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              {showLevels ? "Скрыть" : "Все уровни"}
              <span className="ml-0.5">›</span>
            </button>
          </div>

          <div className="mt-5 space-y-2">
            <div className="flex items-center justify-between text-xs tabular-nums text-muted-foreground">
              <span>
                {progress.xp}
                {next ? ` / ${next.minXp}` : ""} XP
              </span>
              {next ? <span>Ещё {xpToNext} XP до уровня {nextLevelNum}</span> : <span>Макс. уровень</span>}
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-muted/60">
              <div
                className="h-full rounded-full bg-primary transition-[width] duration-500 shadow-[0_0_12px_rgba(240,31,67,0.55)]"
                style={{ width: `${filled}%` }}
              />
            </div>
          </div>

          {showLevels ? (
            <ol className="mt-4 grid gap-2 sm:grid-cols-2">
              {levels.map((level, index) => {
                const reached = progress.xp >= level.minXp
                const isCurrent = level.id === progress.level.id
                return (
                  <li
                    key={level.id}
                    className={cn(
                      "rounded-xl border px-3 py-2 text-sm",
                      isCurrent
                        ? "border-primary/40 bg-primary/10"
                        : reached
                          ? "border-emerald-500/25 bg-emerald-500/5"
                          : "border-border/40 bg-muted/10"
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className={cn(!reached && !isCurrent && "text-muted-foreground")}>
                        {ROMAN[index] ?? index + 1}. {level.title}
                      </span>
                      {isCurrent ? (
                        <span className="text-[10px] uppercase tracking-wide text-primary">Сейчас</span>
                      ) : reached ? (
                        <Check className="h-3.5 w-3.5 text-emerald-500" />
                      ) : (
                        <Lock className="h-3 w-3 text-muted-foreground" />
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">от {level.minXp} XP</p>
                  </li>
                )
              })}
            </ol>
          ) : null}
        </section>

        <section
          className={cn(
            dashboardGlassPanelClass,
            "group/reward relative overflow-hidden p-5",
            "bg-gradient-to-br from-primary/20 via-card/40 to-card/20",
            "transition-all duration-300 motion-safe:hover:-translate-y-0.5",
            "hover:border-primary/45 hover:shadow-[0_12px_40px_rgba(240,31,67,0.2)]",
          )}
        >
          <div
            className="pointer-events-none absolute -right-8 -top-10 h-40 w-40 rounded-full bg-primary/25 blur-3xl transition-all duration-500 group-hover/reward:bg-primary/40 group-hover/reward:scale-125"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/[0.06] to-transparent transition-transform duration-700 ease-out group-hover/reward:translate-x-full"
            aria-hidden
          />
          <p className="relative text-xs text-muted-foreground">Следующая награда</p>
          {nextRewardAchievement ? (
            <>
              <p className="relative mt-2 text-xl font-semibold tracking-tight sm:text-2xl">
                {nextRewardAchievement.rewardLabel ?? `+${nextRewardAchievement.xp} XP`}
              </p>
              <p className="relative mt-1 text-sm text-muted-foreground">
                {nextRewardAchievement.title} - {nextRewardAchievement.description}
              </p>
              <div className="relative mt-5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <Lock className="h-3.5 w-3.5" />
                  {nextRewardAchievement.progressTarget > 1
                    ? `${nextRewardAchievement.progressCurrent} из ${nextRewardAchievement.progressTarget}`
                    : "Ещё не открыто"}
                </span>
              </div>
            </>
          ) : (
            <>
              <p className="relative mt-2 text-xl font-semibold tracking-tight">Все награды открыты</p>
              <p className="relative mt-1 text-sm text-muted-foreground">
                Продолжайте пользоваться кабинетом - новые ачивки появятся позже
              </p>
            </>
          )}
        </section>
      </div>

      {nearComplete ? (
        <section
          className={cn(
            dashboardGlassPanelClass,
            "flex flex-wrap items-center gap-3 px-4 py-3.5 sm:px-5"
          )}
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
            <Disc3 className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">
              До достижения "{nearComplete.title}" осталось {remainingLabel(nearComplete)}
            </p>
            <p className="text-xs text-muted-foreground">
              Уже {nearComplete.progressCurrent} из {nearComplete.progressTarget}
              {nearComplete.id.startsWith("releases_") || nearComplete.id === "first_released"
                ? " релизов"
                : nearComplete.id.startsWith("referral_")
                  ? " рефералов"
                  : ""}
            </p>
          </div>
          <span className="shrink-0 text-sm font-semibold text-primary tabular-nums">
            +{nearComplete.xp} XP
          </span>
        </section>
      ) : null}

      {coupons.length > 0 ? (
        <section id="achievements-coupons" className="space-y-2">
          <p className="text-sm font-medium">Активные купоны</p>
          <ul className="grid gap-2 sm:grid-cols-2">
            {coupons.map((c) => (
              <li
                key={c.id}
                className={cn(
                  dashboardGlassPanelClass,
                  "flex flex-wrap items-center justify-between gap-2 px-3 py-2.5"
                )}
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium">{c.title}</p>
                  <p className="text-xs text-muted-foreground">
                    Код {c.code}
                    {c.expiresAt
                      ? ` · до ${new Date(c.expiresAt).toLocaleDateString("ru-RU")}`
                      : ""}
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
        </section>
      ) : null}

      <section className="space-y-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="text-base font-semibold">Ваша коллекция</h3>
          <p className="text-sm text-muted-foreground tabular-nums">
            {progress.unlockedCount} из {progress.totalCount} получено
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {progress.achievements.map((a) => (
            <AchievementCollectionCard key={a.id} achievement={a} />
          ))}
        </div>
      </section>
    </div>
  )
}

function AchievementCollectionCard({ achievement: a }: { achievement: UserAchievementView }) {
  const Icon = ACHIEVEMENT_ICONS[a.id] ?? Trophy
  const ratio = progressRatio(a)
  const inProgress = !a.unlocked && a.progressCurrent > 0 && a.progressTarget > 1

  return (
    <article
      className={cn(
        dashboardGlassPanelClass,
        "group relative flex flex-col items-center overflow-hidden px-3 py-4 text-center",
        "transition-all duration-300 ease-out",
        "motion-safe:hover:-translate-y-1.5",
        a.unlocked
          ? "border-emerald-500/25 hover:border-emerald-400/55 hover:bg-emerald-500/[0.07] hover:shadow-[0_14px_40px_rgba(16,185,129,0.18)]"
          : inProgress
            ? "hover:border-primary/50 hover:bg-primary/[0.08] hover:shadow-[0_14px_40px_rgba(240,31,67,0.16)]"
            : "hover:border-primary/35 hover:bg-card/60 hover:shadow-[0_12px_32px_rgba(0,0,0,0.28)]",
      )}
    >
      <div
        className="pointer-events-none absolute inset-0 -translate-x-[120%] bg-gradient-to-r from-transparent via-white/[0.07] to-transparent transition-transform duration-700 ease-out group-hover:translate-x-[120%]"
        aria-hidden
      />
      <div
        className={cn(
          "pointer-events-none absolute inset-x-6 -top-8 h-16 rounded-full blur-2xl transition-opacity duration-300",
          a.unlocked
            ? "bg-amber-400/25 opacity-60 group-hover:opacity-100"
            : inProgress
              ? "bg-primary/30 opacity-0 group-hover:opacity-80"
              : "bg-primary/20 opacity-0 group-hover:opacity-60",
        )}
        aria-hidden
      />

      <div
        className={cn(
          "relative mb-3 flex h-16 w-16 items-center justify-center rounded-2xl transition-all duration-300",
          "motion-safe:group-hover:scale-110 motion-safe:group-hover:-rotate-3",
          a.unlocked
            ? "bg-gradient-to-br from-amber-400/25 via-primary/20 to-transparent ring-1 ring-amber-400/30 shadow-[0_0_24px_rgba(240,31,67,0.18)] group-hover:shadow-[0_0_36px_rgba(251,191,36,0.4)] group-hover:ring-amber-300/50"
            : inProgress
              ? "bg-primary/10 ring-1 ring-primary/25 group-hover:bg-primary/20 group-hover:ring-primary/45 group-hover:shadow-[0_0_28px_rgba(240,31,67,0.28)]"
              : "bg-muted/30 ring-1 ring-border/40 group-hover:bg-primary/10 group-hover:ring-primary/30 group-hover:shadow-[0_0_20px_rgba(240,31,67,0.15)]",
        )}
      >
        <Icon
          className={cn(
            "h-7 w-7 transition-all duration-300",
            a.unlocked
              ? "text-amber-300 motion-safe:group-hover:drop-shadow-[0_0_8px_rgba(251,191,36,0.8)]"
              : inProgress
                ? "text-primary"
                : "text-muted-foreground/70 group-hover:text-foreground/90",
          )}
        />
        {a.unlocked ? (
          <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-white shadow transition-transform duration-300 motion-safe:group-hover:scale-110">
            <Check className="h-3 w-3" strokeWidth={3} />
          </span>
        ) : null}
      </div>

      <p className="relative text-sm font-semibold leading-snug transition-colors group-hover:text-foreground">
        {a.title}
      </p>
      <p className="relative mt-1 line-clamp-2 text-xs text-muted-foreground transition-colors group-hover:text-muted-foreground/90">
        {a.description}
      </p>

      <div className="relative mt-auto w-full pt-3">
        {a.unlocked ? (
          <p className="inline-flex items-center gap-1 text-xs font-medium text-emerald-500 transition-all group-hover:text-emerald-400">
            <Check className="h-3.5 w-3.5" />
            Получено +{a.xp} XP
          </p>
        ) : inProgress ? (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[11px] tabular-nums text-muted-foreground">
              <span>
                {a.progressCurrent} из {a.progressTarget}
              </span>
              <span className="text-primary">+{a.xp} XP</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-muted/60">
              <div
                className="h-full rounded-full bg-primary transition-[width] duration-500 group-hover:shadow-[0_0_10px_rgba(240,31,67,0.55)]"
                style={{ width: `${Math.round(ratio * 100)}%` }}
              />
            </div>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground transition-colors group-hover:text-primary/90">
            Впереди · +{a.xp} XP
          </p>
        )}
      </div>
    </article>
  )
}
