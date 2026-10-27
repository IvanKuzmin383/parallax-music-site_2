"use client"

import Link from "next/link"
import {
  ArrowUpRight,
  AudioLines,
  Captions,
  Clapperboard,
  Gauge,
  ImageIcon,
  Link2,
  Music2,
  ShieldCheck,
  Smartphone,
  Sparkles,
  type LucideIcon,
} from "lucide-react"
import { dashboardGlassPanelClass } from "@/components/cabinet/dashboard/dashboard-glass"
import { PageHeader } from "@/components/cabinet/shared/page-header"
import { ServicePriceText } from "@/components/cabinet/shared/service-price-text"
import type { ServicePriceKey } from "@/lib/service-prices"
import { VERTICAL_VIDEO_PRICE_TIER_3_RUB } from "@/lib/vertical-video-pricing"
import { cn } from "@/lib/utils"

type ToolItem = {
  id: string
  label: string
  href: string
  description: string
  icon: LucideIcon
  soon?: boolean
  priceLabel?: string
  priceKey?: ServicePriceKey
  pricePrefix?: string
}

const TOOL_SECTIONS: Array<{ title: string; items: ToolItem[] }> = [
  {
    title: "Оформление и звук",
    items: [
      {
        id: "covers",
        label: "Создание обложки",
        href: "/cabinet/design/covers",
        description: "AI-обложка для релиза",
        icon: ImageIcon,
        priceKey: "track_cover",
        priceLabel: "500 ₽",
      },
      {
        id: "mastering",
        label: "Онлайн-мастеринг",
        href: "/cabinet/tools/mastering",
        description: "Пресеты и параметры, 1 бесплатное скачивание",
        icon: AudioLines,
        priceKey: "tools_mastering",
        pricePrefix: "далее ",
        priceLabel: "далее 100 ₽",
      },
      {
        id: "slowed-reverb",
        label: "Slowed / Reverb / Nightcore",
        href: "/cabinet/tools/slowed-reverb",
        description: "Скорость, басы, реверб и пресеты. 1 скачивание бесплатно",
        icon: Gauge,
        priceKey: "tools_slowed_reverb",
        pricePrefix: "далее ",
        priceLabel: "далее 100 ₽",
      },
      {
        id: "smartlinks",
        label: "Смартлинки",
        href: "/cabinet/tools/smartlinks",
        description: "Страница со ссылками на площадки: промо до релиза или без дистрибуции",
        icon: Link2,
        priceKey: "tools_smartlink",
        pricePrefix: "от ",
        priceLabel: "от 490 ₽ / год",
      },
      {
        id: "snippet",
        label: "Сниппет",
        href: "/cabinet/tools/story-video",
        description: "5-30 сек для Reels / Shorts / TikTok: обложка, хук, шаблоны. 1 скачивание бесплатно",
        icon: Clapperboard,
        priceKey: "tools_story_video",
        priceLabel: "100 ₽",
      },
      {
        id: "vertical-videos",
        label: "Вертикальные видео",
        href: "/cabinet/design/vertical-videos",
        description: "Монтаж со сток-видеорядом под трек (заказ)",
        icon: Smartphone,
        priceLabel: `от ${VERTICAL_VIDEO_PRICE_TIER_3_RUB.toLocaleString("ru-RU")} ₽`,
      },
      {
        id: "videoshot",
        label: "Видеошот в Яндекс Музыке",
        href: "/cabinet/design/video-shots",
        description: "Загрузим готовый ролик или создадим видеошот под ваш трек",
        icon: Sparkles,
        priceKey: "yandex_videoshot",
        pricePrefix: "от ",
        priceLabel: "от 900 ₽",
      },
      {
        id: "lyrics-sync",
        label: "Синхронизация текста",
        href: "/cabinet/design/lyrics-sync",
        description: "Строки текста привязаны к моментам исполнения в вашей записи",
        icon: Captions,
        priceKey: "lyrics_sync",
        priceLabel: "1 500 ₽",
      },
    ],
  },
  {
    title: "Контент и защита",
    items: [
      {
        id: "ai-tracks",
        label: "Генерация музыки",
        href: "/cabinet/ai/tracks",
        description: "Песни с вокалом и инструментал по вашей идее",
        icon: Music2,
        priceLabel: "Открыть студию",
      },
      {
        id: "deposit",
        label: "Депонирование",
        href: "/cabinet/protect/deposit",
        description: "Фиксация авторства",
        icon: ShieldCheck,
        soon: true,
        priceLabel: "от 1 490 ₽",
      },
    ],
  },
]

function ToolCard({ item }: { item: ToolItem }) {
  const Icon = item.icon

  return (
    <Link
      href={item.href}
      className={cn(
        dashboardGlassPanelClass,
        "group relative flex h-full flex-col overflow-hidden p-4",
        "transition-all duration-300 ease-out",
        "motion-safe:hover:-translate-y-1.5",
        item.soon
          ? "hover:border-amber-400/45 hover:bg-amber-500/[0.06] hover:shadow-[0_14px_40px_rgba(245,158,11,0.14)]"
          : "hover:border-primary/50 hover:bg-primary/[0.08] hover:shadow-[0_14px_40px_rgba(240,31,67,0.16)]",
      )}
    >
      <div
        className="pointer-events-none absolute inset-0 -translate-x-[120%] bg-gradient-to-r from-transparent via-white/[0.07] to-transparent transition-transform duration-700 ease-out group-hover:translate-x-[120%]"
        aria-hidden
      />
      <div
        className={cn(
          "pointer-events-none absolute inset-x-6 -top-8 h-16 rounded-full blur-2xl transition-opacity duration-300",
          item.soon
            ? "bg-amber-400/25 opacity-0 group-hover:opacity-70"
            : "bg-primary/30 opacity-0 group-hover:opacity-80",
        )}
        aria-hidden
      />

      <div className="relative flex items-start justify-between gap-3">
        <div
          className={cn(
            "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl transition-all duration-300",
            "motion-safe:group-hover:scale-110 motion-safe:group-hover:-rotate-3",
            item.soon
              ? "bg-amber-500/10 ring-1 ring-amber-400/25 group-hover:bg-amber-500/20 group-hover:ring-amber-300/45 group-hover:shadow-[0_0_28px_rgba(245,158,11,0.28)]"
              : "bg-primary/10 ring-1 ring-primary/25 group-hover:bg-primary/20 group-hover:ring-primary/45 group-hover:shadow-[0_0_28px_rgba(240,31,67,0.28)]",
          )}
        >
          <Icon
            className={cn(
              "h-5 w-5 transition-all duration-300",
              item.soon
                ? "text-amber-300 group-hover:drop-shadow-[0_0_8px_rgba(251,191,36,0.7)]"
                : "text-primary group-hover:drop-shadow-[0_0_8px_rgba(240,31,67,0.65)]",
            )}
          />
        </div>
        <ArrowUpRight
          className={cn(
            "h-4 w-4 shrink-0 text-muted-foreground transition-all duration-300",
            "group-hover:translate-x-0.5 group-hover:-translate-y-0.5",
            item.soon ? "group-hover:text-amber-300" : "group-hover:text-primary",
          )}
        />
      </div>

      <div className="relative mt-3 min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-medium leading-snug transition-colors group-hover:text-foreground">
            {item.label}
          </p>
          {item.soon ? (
            <span className="rounded-md bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-300">
              Скоро
            </span>
          ) : null}
        </div>
        <p className="text-sm text-muted-foreground transition-colors group-hover:text-muted-foreground/90">
          {item.description}
        </p>
      </div>

      <div className="relative mt-3">
        {item.priceKey ? (
          <p className="text-sm font-medium text-primary transition-colors group-hover:text-primary">
            {item.pricePrefix ? <span>{item.pricePrefix}</span> : null}
            <ServicePriceText priceKey={item.priceKey} fallback={item.priceLabel ?? ""} />
          </p>
        ) : item.priceLabel ? (
          <p className="text-sm font-medium text-primary">{item.priceLabel}</p>
        ) : null}
      </div>
    </Link>
  )
}

export default function CabinetToolsPage() {
  return (
    <div className="w-full max-w-none space-y-10">
      <PageHeader title="Инструменты" />

      {TOOL_SECTIONS.map((section) => (
        <section key={section.title} className="space-y-4">
          <h2 className="text-lg font-semibold">{section.title}</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {section.items.map((item) => (
              <ToolCard key={item.id} item={item} />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
