"use client"

import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { PageHeader } from "@/components/cabinet/shared/page-header"
import { LYRICS_SYNC_PRICE_LABEL } from "@/lib/lyrics-sync-pricing"

type ToolItem = {
  label: string
  href: string
  description: string
  soon?: boolean
  priceLabel?: string
}

const TOOL_SECTIONS: Array<{ title: string; items: ToolItem[] }> = [
  {
    title: "Оформление и звук",
    items: [
      { label: "Создание обложки", href: "/cabinet/design/covers", description: "AI-обложка для релиза" },
      {
        label: "Онлайн-мастеринг",
        href: "/cabinet/tools/mastering",
        description: "Пресеты и параметры, 1 бесплатное скачивание",
        priceLabel: "далее 100 ₽",
      },
      { label: "Вертикальные видео", href: "/cabinet/design/vertical-videos", description: "Видео для Reels / Shorts / TikTok" },
      {
        label: "Видеошот в Яндекс Музыке",
        href: "/cabinet/design/video-shots",
        description: "Загрузим готовый ролик или создадим видеошот под ваш трек",
        priceLabel: "от 900 ₽",
      },
      {
        label: "Синхронизация текста",
        href: "/cabinet/design/lyrics-sync",
        description: "Строки текста привязаны к моментам исполнения в вашей записи",
        priceLabel: LYRICS_SYNC_PRICE_LABEL,
      },
    ],
  },
  {
    title: "Контент и защита",
    items: [
      {
        label: "Генерация музыки",
        href: "/cabinet/ai/tracks",
        description: "Песни с вокалом и инструментал по вашей идее",
        priceLabel: "Открыть студию",
      },
      { label: "Пресс-релиз", href: "/cabinet/ai/press-release", description: "Текст для промо" },
      { label: "Питчинг", href: "/cabinet/ai/pitch", description: "Материалы для кураторов" },
      {
        label: "Депонирование",
        href: "/cabinet/protect/deposit",
        description: "Фиксация авторства",
        soon: true,
        priceLabel: "от 1 490 ₽",
      },
    ],
  },
]

export default function CabinetToolsPage() {
  return (
    <div className="w-full max-w-none space-y-10">
      <PageHeader title="Инструменты" />

      {TOOL_SECTIONS.map((section) => (
        <section key={section.title} className="space-y-4">
          <h2 className="text-lg font-semibold">{section.title}</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {section.items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="group rounded-lg border border-border bg-card/40 p-4 transition-colors hover:border-primary/40 hover:bg-muted/30"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">{item.label}</p>
                      {item.soon ? (
                        <span className="rounded-md bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-300">
                          Скоро
                        </span>
                      ) : null}
                    </div>
                    <p className="text-sm text-muted-foreground">{item.description}</p>
                    {item.priceLabel ? (
                      <p className="text-sm font-medium text-primary">{item.priceLabel}</p>
                    ) : null}
                  </div>
                  <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
                </div>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
