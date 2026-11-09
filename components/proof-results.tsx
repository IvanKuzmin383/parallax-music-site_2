"use client"

import Image from "next/image"
import Link from "next/link"
import { ArrowRight } from "lucide-react"
import {
  marketingGlassHoverClass,
  marketingGlassPanelClass,
} from "@/components/marketing/marketing-glass"
import { Button } from "@/components/ui/button"
import { useI18n } from "@/lib/i18n-context"
import { cn } from "@/lib/utils"

const PROOFS = [
  {
    src: "/proofs/milarada03-playlists.png",
    altRu: "Milarada03 в плейлистах Яндекс Музыки после публикации видеошота",
    altEn: "Milarada03 in Yandex Music playlists after a video shot was published",
    tagRu: "Видеошот",
    tagEn: "Video shot",
  },
  {
    src: "/proofs/aduardo-bandlink.png",
    altRu: "Aduardo в индексе BandLink / Яндекс Музыки",
    altEn: "Aduardo in the BandLink / Yandex Music interest index",
    tagRu: "Дистрибуция",
    tagEn: "Distribution",
  },
  {
    src: "/proofs/pyaty-rassvet-playlist.png",
    altRu: "Пятый рассвет в плейлисте Яндекс Музыки",
    altEn: "Pyaty Rassvet in a Yandex Music playlist",
    tagRu: "Дистрибуция",
    tagEn: "Distribution",
  },
  {
    src: "/proofs/nebolubvi-editorial.png",
    altRu: "Nebolubvi в редакторских плейлистах Яндекс Музыки",
    altEn: "Nebolubvi in Yandex Music editorial playlists",
    tagRu: "Дистрибуция",
    tagEn: "Distribution",
  },
] as const

export function ProofResults() {
  const { t, locale } = useI18n()
  const copy = t.proofResults
  const ctaCases = copy.ctaCases ?? "Смотреть кейсы"
  const ctaPromotion = copy.ctaPromotion ?? "Заказать продвижение"
  const ctaDistribution = copy.ctaDistribution ?? "Выпустить трек"

  return (
    <section id="proofs" className="border-t border-border/40 py-20 md:py-24">
      <div className="container mx-auto px-4">
        <div className="mb-10 max-w-3xl md:mb-14">
          <h2 className="mb-6 text-4xl font-bold tracking-tight md:text-5xl lg:text-6xl">
            <span className="text-foreground">{copy.title}</span>{" "}
            <span className="text-primary">{copy.titleHighlight}</span>
          </h2>
          <p className="text-pretty text-lg text-muted-foreground">{copy.description}</p>
        </div>

        <p className="mx-auto mb-4 max-w-4xl text-sm font-medium text-muted-foreground">{copy.screenshotsTitle}</p>

        <ul className="mx-auto grid max-w-4xl gap-4 sm:grid-cols-2">
          {PROOFS.map((item) => (
            <li key={item.src} className={cn(marketingGlassPanelClass, "overflow-hidden border-border/50")}>
              <div className="relative">
                <Image
                  src={item.src}
                  alt={locale === "en" ? item.altEn : item.altRu}
                  width={640}
                  height={360}
                  className="h-auto w-full object-cover"
                  sizes="(max-width: 640px) 100vw, 40vw"
                />
                <span className="absolute left-3 top-3 rounded-full border border-border/60 bg-background/85 px-2.5 py-1 text-[11px] font-medium uppercase tracking-wider backdrop-blur">
                  {locale === "en" ? item.tagEn : item.tagRu}
                </span>
              </div>
            </li>
          ))}
        </ul>

        <p className="mx-auto mt-4 max-w-4xl text-center text-xs text-muted-foreground">{copy.disclaimer}</p>

        <div className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
          <Button
            size="lg"
            className="bg-primary uppercase tracking-wider text-primary-foreground hover:bg-primary/90"
            asChild
          >
            <Link href="/promotion" prefetch={false}>
              {ctaPromotion}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button size="lg" variant="outline" className="uppercase tracking-wider" asChild>
            <Link href="/distribution" prefetch={false}>
              {ctaDistribution}
            </Link>
          </Button>
          <Link
            href="/cases"
            prefetch={false}
            className={cn(
              marketingGlassPanelClass,
              marketingGlassHoverClass,
              "inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-semibold uppercase tracking-wider"
            )}
          >
            {ctaCases}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  )
}
