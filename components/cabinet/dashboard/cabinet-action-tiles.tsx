"use client"

import Link from "next/link"
import type { LucideIcon } from "lucide-react"
import {
  Image,
  Megaphone,
  Music,
  Shield,
  Sparkles,
  Upload,
  Wand2,
} from "lucide-react"
import { cn } from "@/lib/utils"

type ActionTile = {
  id: string
  label: string
  description: string
  href: string
  icon: LucideIcon
  span?: "wide" | "normal"
  accent: string
}

const ACTION_TILES: ActionTile[] = [
  {
    id: "release",
    label: "Выпустить трек",
    description: "Загрузить сингл или альбом на площадки",
    href: "/cabinet/upload",
    icon: Upload,
    span: "wide",
    accent: "from-primary/20 via-primary/5 to-transparent",
  },
  {
    id: "cover",
    label: "AI-обложка",
    description: "Визуал для релиза",
    href: "/cabinet/design/covers",
    icon: Image,
    accent: "from-violet-500/15 via-transparent to-transparent",
  },
  {
    id: "promo",
    label: "Продвижение",
    description: "Реклама и промо",
    href: "/cabinet/promotion/vk",
    icon: Megaphone,
    accent: "from-blue-500/15 via-transparent to-transparent",
  },
  {
    id: "ai-track",
    label: "AI-трек",
    description: "Создание и идеи",
    href: "/cabinet/ai/tracks",
    icon: Sparkles,
    accent: "from-primary/15 via-transparent to-transparent",
  },
  {
    id: "mastering",
    label: "AI-мастеринг",
    description: "Обработка звука",
    href: "/cabinet/design/mastering",
    icon: Wand2,
    accent: "from-emerald-500/15 via-transparent to-transparent",
  },
  {
    id: "deposit",
    label: "Депонирование",
    description: "Защита авторства",
    href: "/cabinet/protect/deposit",
    icon: Shield,
    accent: "from-amber-500/15 via-transparent to-transparent",
  },
]

export function CabinetActionTiles() {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Что дальше?</h2>
        <p className="text-sm text-muted-foreground">Следующий шаг для вашей музыки</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {ACTION_TILES.map((tile) => (
          <Link
            key={tile.id}
            href={tile.href}
            className={cn(
              "group relative overflow-hidden rounded-xl border border-border p-5 transition-all hover:border-primary/40 hover:-translate-y-0.5",
              tile.span === "wide" && "sm:col-span-2 lg:col-span-2"
            )}
          >
            <div
              className={cn(
                "absolute inset-0 bg-gradient-to-br opacity-80 group-hover:opacity-100 transition-opacity",
                tile.accent
              )}
            />
            <div className="relative flex flex-col gap-3 min-h-[88px]">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-background/60 border border-border/60">
                <tile.icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-semibold">{tile.label}</p>
                <p className="text-sm text-muted-foreground mt-0.5">{tile.description}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}

export function CabinetContinueWork({
  releases,
  orders,
}: {
  releases: Array<{ id: string; title: string; status: string; coverUrl?: string; href: string }>
  orders: Array<{ id: string; serviceName: string; status: string; href: string }>
}) {
  const items = [
    ...releases.map((r) => ({
      id: `r-${r.id}`,
      title: r.title,
      subtitle: r.status,
      href: r.href,
      coverUrl: r.coverUrl,
    })),
    ...orders.map((o) => ({
      id: `o-${o.id}`,
      title: o.serviceName,
      subtitle: o.status,
      href: o.href,
      coverUrl: undefined,
    })),
  ].slice(0, 6)

  if (items.length === 0) return null

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold">Продолжить работу</h2>
      <div className="flex gap-3 overflow-x-auto pb-2 cabinet-sidebar-scroll">
        {items.map((item) => (
          <Link
            key={item.id}
            href={item.href}
            className="shrink-0 w-[200px] rounded-xl border border-border bg-card overflow-hidden hover:border-primary/40 transition-colors"
          >
            <div className="relative h-24 bg-muted">
              {item.coverUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.coverUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center">
                  <Music className="h-8 w-8 text-muted-foreground" />
                </div>
              )}
            </div>
            <div className="p-3 space-y-0.5">
              <p className="text-sm font-medium truncate">{item.title}</p>
              <p className="text-xs text-muted-foreground truncate">{item.subtitle}</p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}
