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
import { useI18n } from "@/lib/i18n-context"

export function Advantages() {
  const { t } = useI18n()

  const fallbackItems = useMemo(
    () => [
      "Персональная и быстрая поддержка без долгих ожиданий",
      "Лояльная модерация и оперативная работа с AI-релизами. Ваш трек на площадках за 5 дней!*",
      "Релизы не удаляются даже после завершения подписки",
      "Аналитика со всех популярных площадок в одном личном кабинете",
      "Продвижение, питчинг, монетизация и дополнительные сервисы",
      "Быстрые выплаты роялти удобным для вас способом",
    ],
    []
  )

  const advantages = (t as {
    advantages?: { title?: string; titleHighlight?: string; highlightText?: string; items?: string[] }
  }).advantages
  const items = useMemo(() => advantages?.items ?? fallbackItems, [advantages, fallbackItems])
  const title = advantages?.title ?? "Наши"
  const titleHighlight = advantages?.titleHighlight ?? "Преимущества"
  const highlightText =
    advantages?.highlightText ??
    "Доставляем треки на более чем 50 стриминговых платформ: Яндекс Музыка, VK Music, СберЗвук, КИОН, Apple Music, Spotify, TikTok, YouTube и другие"
  const icons = useMemo(() => [Headset, Rocket, ShieldCheck, BarChart3, Handshake, DollarSign], [])

  return (
    <section id="advantages" className="py-24 bg-background/60">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mb-16">
          <h2 className="text-4xl md:text-6xl font-bold mb-6">
            <span className="text-foreground">{title}</span>{" "}
            <span className="text-primary">{titleHighlight}</span>
          </h2>
        </div>

        <div className="mb-10 rounded-2xl border border-primary/30 bg-gradient-to-r from-primary/10 via-primary/5 to-violet-500/10 p-6 md:p-8">
          <p className="text-base leading-relaxed text-foreground md:text-lg">{highlightText}</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {items.map((item, index) => {
            const Icon = icons[index % icons.length]

            return (
              <article
                key={item}
                className="group rounded-2xl border border-border/60 bg-card p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-md"
              >
                <div className="mb-4 flex items-center gap-3">
                  <div className="inline-flex h-20 w-20 items-center justify-center rounded-full border border-primary/20 bg-background/60 text-primary transition-colors group-hover:border-primary/40 group-hover:bg-primary/10">
                    <Icon className="h-10 w-10" />
                  </div>
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
