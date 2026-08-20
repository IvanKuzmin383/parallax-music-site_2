"use client"

import Image from "next/image"
import { useI18n } from "@/lib/i18n-context"
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel"
import { CarouselDots } from "@/components/ui/carousel-dots"

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
    altRu: "Пятый рассвет в плейлисте «Русский шансон: лучшее» Яндекс Музыки",
    altEn: "Pyaty Rassvet in the Yandex Music playlist “Russian chanson: best”",
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

  return (
    <section id="proofs" className="py-24 bg-background">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mb-12 md:mb-16">
          <h2 className="text-4xl md:text-6xl font-bold mb-6">
            <span className="text-foreground">{copy.title}</span>{" "}
            <span className="text-primary">{copy.titleHighlight}</span>
          </h2>
          <p className="text-lg text-muted-foreground text-pretty">{copy.description}</p>
        </div>

        <Carousel
          opts={{ align: "start", loop: true }}
          className="relative w-full max-w-4xl mx-auto px-10 md:px-12"
        >
          <CarouselContent className="-ml-3">
            {PROOFS.map((item) => (
              <CarouselItem key={item.src} className="pl-3 basis-1/2">
                <div className="overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm">
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
          <CarouselPrevious className="-left-1 md:-left-3 h-8 w-8" />
          <CarouselNext className="-right-1 md:-right-3 h-8 w-8" />
          <div className="mt-4 flex justify-center">
            <CarouselDots />
          </div>
        </Carousel>
      </div>
    </section>
  )
}
