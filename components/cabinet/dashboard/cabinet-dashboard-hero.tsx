"use client"

import Link from "next/link"
import Image from "next/image"
import { format } from "date-fns"
import { ru } from "date-fns/locale"
import { ArrowRight, BarChart3, Disc3, Music, Upload } from "lucide-react"
import { Button } from "@/components/ui/button"
import { StatusBadge } from "@/components/cabinet/shared/status-badge"
import type { ReleaseView } from "@/lib/cabinet/types"
import {
  formatReleaseRelativeDate,
  isReleasedStatus,
  releaseDetailHref,
} from "@/lib/cabinet/release-presenters"
import { cn } from "@/lib/utils"

type CabinetDashboardHeroProps = {
  displayName?: string
  featured: ReleaseView | null
  balance: number
  activeOrders: number
  inProgressCount: number
}

export function CabinetDashboardHero({
  displayName,
  featured,
  balance,
  activeOrders,
  inProgressCount,
}: CabinetDashboardHeroProps) {
  const greeting = displayName?.trim() || "Артист"

  if (!featured) {
    return (
      <section className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-card via-card to-primary/10">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/15 via-transparent to-transparent" />
        <div className="relative grid gap-8 p-6 md:p-10 lg:grid-cols-[1fr_280px] lg:items-center">
          <div className="space-y-5 max-w-xl">
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight leading-tight">
              {greeting}, начните свой путь
            </h1>
            <p className="text-muted-foreground text-base leading-relaxed">
              Загрузите первый релиз - обложка, треки и доставка на площадки в одном месте
            </p>
            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link href="/cabinet/upload">
                  <Upload className="h-4 w-4 mr-2" />
                  Выпустить первый релиз
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/cabinet/publishing-rules">Правила публикации</Link>
              </Button>
            </div>
          </div>
          <div className="hidden lg:flex items-center justify-center">
            <div className="relative h-56 w-56 rounded-full border border-primary/20 bg-muted/30 flex items-center justify-center">
              <Disc3 className="h-24 w-24 text-primary/40 animate-[spin_12s_linear_infinite]" />
            </div>
          </div>
        </div>
        <HeroMetrics balance={balance} activeOrders={activeOrders} inProgressCount={inProgressCount} />
      </section>
    )
  }

  const relativeDate = formatReleaseRelativeDate(featured.releaseDate)
  const released = isReleasedStatus(featured.status)

  return (
    <section className="relative overflow-hidden rounded-2xl border border-border bg-card">
      <div className="absolute inset-0 bg-gradient-to-r from-background via-background/95 to-background/40 z-[1]" />
      {featured.coverUrl ? (
        <Image
          src={featured.coverUrl}
          alt=""
          fill
          className="object-cover object-center opacity-30 blur-sm scale-105"
          unoptimized
          sizes="100vw"
          priority
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-muted/50 to-primary/5" />
      )}

      <div className="relative z-[2] grid gap-6 p-6 md:p-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <div className="flex flex-col sm:flex-row gap-6 items-start">
          <div className="relative h-40 w-40 sm:h-48 sm:w-48 shrink-0 rounded-xl overflow-hidden shadow-2xl ring-1 ring-white/10">
            {featured.coverUrl ? (
              <Image
                src={featured.coverUrl}
                alt=""
                fill
                className="object-cover"
                unoptimized
                sizes="192px"
                priority
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-muted">
                <Music className="h-12 w-12 text-muted-foreground" />
              </div>
            )}
          </div>
          <div className="space-y-3 min-w-0 pt-1">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">
              {released ? "Последний релиз" : "Сейчас в работе"}
            </p>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight truncate">{featured.title}</h1>
            <p className="text-lg text-muted-foreground truncate">{featured.artist}</p>
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={featured.status} kind="generic" />
              {relativeDate ? (
                <span className="text-sm text-muted-foreground">{relativeDate}</span>
              ) : featured.releaseDate ? (
                <span className="text-sm text-muted-foreground">
                  {format(new Date(featured.releaseDate), "d MMMM yyyy", { locale: ru })}
                </span>
              ) : null}
            </div>
            {featured.platforms && featured.platforms.length > 0 ? (
              <div className="flex flex-wrap gap-2 pt-1">
                {featured.platforms.slice(0, 5).map((p) => (
                  <span
                    key={p}
                    className="text-xs rounded-full border border-border bg-background/60 px-2.5 py-1 text-foreground/90"
                  >
                    {p}
                  </span>
                ))}
              </div>
            ) : null}
            <Button asChild className="mt-2">
              <Link href={releaseDetailHref(featured)}>
                {featured.kind === "draft" ? "Продолжить релиз" : "Открыть релиз"}
                <ArrowRight className="h-4 w-4 ml-2" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
      <HeroMetrics balance={balance} activeOrders={activeOrders} inProgressCount={inProgressCount} />
    </section>
  )
}

function HeroMetrics({
  balance,
  activeOrders,
  inProgressCount,
}: {
  balance: number
  activeOrders: number
  inProgressCount: number
}) {
  const items: Array<{
    label: string
    value: string
    href: string
    icon?: typeof BarChart3
  }> = [
    {
      label: "Баланс",
      value: `${balance.toLocaleString("ru-RU")} ₽`,
      href: "/cabinet/finance/balance",
    },
    {
      label: "Заказы",
      value: String(activeOrders),
      href: "/cabinet/orders",
    },
    {
      label: "В работе",
      value: String(inProgressCount),
      href: "/cabinet/music/releases",
    },
    {
      label: "Стримы",
      value: "Статистика",
      href: "/cabinet/music-stats",
      icon: BarChart3,
    },
  ]

  return (
    <div className="relative z-[2] border-t border-border/60 bg-background/40 backdrop-blur-sm">
      <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-border/60">
        {items.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className="group px-4 py-3 md:px-6 md:py-4 hover:bg-muted/30 transition-colors"
          >
            <p className="text-xs text-muted-foreground mb-0.5">{item.label}</p>
            <p className="text-sm md:text-base font-semibold flex items-center gap-1.5 group-hover:text-primary transition-colors">
              {item.icon ? <item.icon className="h-4 w-4 shrink-0" /> : null}
              {item.value}
            </p>
          </Link>
        ))}
      </div>
    </div>
  )
}

export function ReleaseCoverCard({
  release,
  size = "md",
  className,
}: {
  release: ReleaseView
  size?: "sm" | "md" | "lg"
  className?: string
}) {
  const sizeClass =
    size === "lg" ? "aspect-square" : size === "sm" ? "aspect-[4/3]" : "aspect-square"

  return (
    <Link
      href={releaseDetailHref(release)}
      className={cn(
        "group block relative overflow-hidden rounded-xl border border-border bg-muted/20 transition-all hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5",
        className
      )}
    >
      <div className={cn("relative w-full", sizeClass)}>
        {release.coverUrl ? (
          <Image
            src={release.coverUrl}
            alt=""
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            unoptimized
            sizes="(max-width:768px) 50vw, 33vw"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-muted">
            <Music className="h-10 w-10 text-muted-foreground" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-3 md:p-4">
          <p className="font-semibold text-white truncate text-sm md:text-base">{release.title}</p>
          <p className="text-xs md:text-sm text-white/70 truncate">{release.artist}</p>
          <div className="mt-2">
            <StatusBadge
              status={release.status}
              kind="generic"
              className="bg-black/40 border-white/20 text-white text-[10px]"
            />
          </div>
        </div>
      </div>
    </Link>
  )
}
