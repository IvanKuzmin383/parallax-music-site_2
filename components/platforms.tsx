"use client"

import { Button } from "@/components/ui/button"
import { useI18n } from "@/lib/i18n-context"

const platforms = [
  "Spotify",
  "Apple Music",
  "YouTube",
  "Amazon Music",
  "TIDAL",
  "Beatport",
]

export function Platforms() {
  const { t, locale } = useI18n()

  return (
    <section id="platforms" className="py-24 bg-background">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mb-16">
          <h2 className="text-4xl md:text-6xl font-bold mb-6">
            <span className="text-foreground">{t.platforms.title}</span>{" "}
            <span className="text-primary">{t.platforms.titleHighlight}</span>
          </h2>
          <p className="text-lg text-muted-foreground text-pretty">{t.platforms.description}</p>
        </div>

        {/* Логотипы платформ */}
        <div className="flex flex-wrap items-center justify-center gap-8 md:gap-12 mb-12">
          {platforms.map((platform) => (
            <div
              key={platform}
              className="text-foreground font-semibold text-base md:text-lg opacity-80 hover:opacity-100 transition-opacity uppercase tracking-wide"
            >
              {platform}
            </div>
          ))}
        </div>

        {/* Кнопка */}
        <div className="text-center">
          <Button
            size="lg"
            className="uppercase tracking-wider bg-primary text-primary-foreground hover:bg-primary/90 px-8"
          >
            {t.platforms.viewAllButton}
          </Button>
        </div>
      </div>
    </section>
  )
}
