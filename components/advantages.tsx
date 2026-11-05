"use client"

import { useMemo } from "react"
import {
  BarChart3,
  DollarSign,
  Handshake,
  Headset,
  Rocket,
  ShieldCheck,
} from "lucide-react"
import {
  marketingGlassHoverClass,
  marketingGlassPanelClass,
} from "@/components/marketing/marketing-glass"
import { useI18n } from "@/lib/i18n-context"
import { cn } from "@/lib/utils"

export function Advantages() {
  const { t } = useI18n()

  const fallbackItems = useMemo(
    () => [
      "Персональная и быстрая поддержка без долгих ожиданий",
      "Лояльная модерация и оперативная работа с AI-релизами",
      "Релизы не удаляются даже после завершения подписки",
      "Аналитика со всех популярных площадок в одном личном кабинете",
      "Продвижение, питчинг, монетизация и дополнительные сервисы",
      "Быстрые выплаты роялти удобным для вас способом",
    ],
    []
  )

  const advantages = t.advantages
  const items = advantages?.items ?? fallbackItems
  const title = advantages?.title ?? "Почему"
  const titleHighlight = advantages?.titleHighlight ?? "мы"
  const highlightText =
    advantages?.highlightText ??
    "Доставляем треки на более чем 50 стриминговых платформ: Яндекс Музыка, VK Music, СберЗвук, КИОН, Apple Music, Spotify, TikTok, YouTube и другие"
  const icons = useMemo(() => [Headset, Rocket, ShieldCheck, BarChart3, Handshake, DollarSign], [])

  return (
    <section id="advantages" className="border-t border-border/40 py-20 md:py-24">
      <div className="container mx-auto px-4">
        <div className="mb-10 max-w-3xl md:mb-14">
          <h2 className="mb-6 text-4xl font-bold tracking-tight md:text-5xl lg:text-6xl">
            <span className="text-foreground">{title}</span>{" "}
            <span className="text-primary">{titleHighlight}</span>
          </h2>
        </div>

        <div
          className={cn(
            marketingGlassPanelClass,
            "mb-8 border-primary/25 bg-primary/[0.07] p-6 md:mb-10 md:p-8"
          )}
        >
          <p className="text-base leading-relaxed text-foreground md:text-lg">{highlightText}</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {items.map((item, index) => {
            const Icon = icons[index % icons.length]

            return (
              <article
                key={item}
                className={cn(marketingGlassPanelClass, marketingGlassHoverClass, "p-5 md:p-6")}
              >
                <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-primary/25 text-primary">
                  <Icon className="h-5 w-5" aria-hidden />
                </div>
                <p className="text-base leading-relaxed text-muted-foreground">{item}</p>
              </article>
            )
          })}
        </div>
      </div>
    </section>
  )
}
