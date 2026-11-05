"use client"

import Image from "next/image"
import Link from "next/link"
import { ArrowRight } from "lucide-react"
import {
  marketingGlassHoverClass,
  marketingGlassPanelClass,
} from "@/components/marketing/marketing-glass"
import { Button } from "@/components/ui/button"
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel"
import { CarouselDots } from "@/components/ui/carousel-dots"
import { useI18n } from "@/lib/i18n-context"
import { cn } from "@/lib/utils"

const PROOFS = [
  {
    src: "/proofs/milarada03-playlists.png",
    altRu: "Milarada03 в плейлистах Яндекс Музыки - видеошоты с десятками тысяч реакций",
    altEn: "Milarada03 in Yandex Music playlists - videoshots with tens of thousands of reactions",
  },
  {
    src: "/proofs/aduardo-bandlink.png",
    altRu: "Aduardo в индексе BandLink / Яндекс Музыки",
    altEn: "Aduardo in the BandLink / Yandex Music interest index",
  },
  {
    src: "/proofs/pyaty-rassvet-playlist.png",
    altRu: "Пятый рассвет в плейлисте 'Русский шансон: лучшее' Яндекс Музыки",
    altEn: "Pyaty Rassvet in the Yandex Music playlist Russian chanson: best",
  },
  {
    src: "/proofs/nebolubvi-editorial.png",
    altRu: "Nebolubvi в редакторских плейлистах Яндекс Музыки",
    altEn: "Nebolubvi in Yandex Music editorial playlists",
  },
  {
    src: "/proofs/artists-monthly-listeners.png",
    altRu: "Артисты Parallax Music с сотнями тысяч и миллионами слушателей в месяц",
    altEn: "Parallax Music artists with hundreds of thousands and millions of monthly listeners",
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

        <Carousel
          opts={{ align: "start", loop: true }}
          className="relative mx-auto w-full max-w-4xl px-10 md:px-12"
        >
          <CarouselContent className="-ml-3">
            {PROOFS.map((item) => (
              <CarouselItem key={item.src} className="basis-1/2 pl-3">
                <div
                  className={cn(
                    marketingGlassPanelClass,
                    "overflow-hidden border-border/50"
                  )}
                >
                  <Image
                    src={item.src}
                    alt={locale === "en" ? item.altEn : item.altRu}
                    width={640}
                    height={360}
                    className="h-auto w-full object-cover"
                    sizes="(max-width: 640px) 85vw, 40vw"
                  />
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious className="-left-1 h-8 w-8 md:-left-3" />
          <CarouselNext className="-right-1 h-8 w-8 md:-right-3" />
          <div className="mt-4 flex justify-center">
            <CarouselDots />
          </div>
        </Carousel>

        <div className="mt-10 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
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
