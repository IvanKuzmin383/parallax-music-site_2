"use client"

import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { PageHeader } from "@/components/cabinet/shared/page-header"

const TOOL_SECTIONS = [
  {
    title: "Оформление и звук",
    items: [
      { label: "Создание обложки", href: "/cabinet/design/covers", description: "AI-обложка для релиза" },
      { label: "Мастеринг", href: "/cabinet/design/mastering", description: "Обработка трека" },
      { label: "Вертикальные видео", href: "/cabinet/design/vertical-videos", description: "Видео для Reels / Shorts / TikTok" },
    ],
  },
  {
    title: "Контент и защита",
    items: [
      { label: "Пресс-релиз", href: "/cabinet/ai/press-release", description: "Текст для промо" },
      { label: "Питчинг", href: "/cabinet/ai/pitch", description: "Материалы для кураторов" },
      { label: "Депонирование", href: "/cabinet/protect/deposit", description: "Фиксация авторства" },
    ],
  },
] as const

export default function CabinetToolsPage() {
  return (
    <div className="max-w-5xl space-y-10">
      <PageHeader title="Инструменты" />

      {TOOL_SECTIONS.map((section) => (
        <section key={section.title} className="space-y-4">
          <h2 className="text-lg font-semibold">{section.title}</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {section.items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="group rounded-lg border border-border bg-card/40 p-4 transition-colors hover:border-primary/40 hover:bg-muted/30"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 space-y-1">
                    <p className="font-medium">{item.label}</p>
                    <p className="text-sm text-muted-foreground">{item.description}</p>
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
