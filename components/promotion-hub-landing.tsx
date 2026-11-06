"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ArrowRight, Rocket } from "lucide-react"
import {
  marketingGlassHoverClass,
  marketingGlassPanelClass,
} from "@/components/marketing/marketing-glass"
import { Button } from "@/components/ui/button"
import { PromotionOrderDialog } from "@/components/promotion-order-dialog"
import { PartnerMarquee } from "@/components/partner-marquee"
import { useI18n } from "@/lib/i18n-context"
import { cn } from "@/lib/utils"

export function PromotionHubLanding() {
  const { t } = useI18n()
  const hub = t.promotionLanding.hub
  const shared = t.promotionLanding
  const [orderOpen, setOrderOpen] = useState(false)

  const services = hub.services as Array<{
    id: string
    slug: string
    title: string
    description: string
  }>

  useEffect(() => {
    if (window.location.hash !== "#promotion-services") return
    const target = document.getElementById("promotion-services")
    if (!target) return
    window.requestAnimationFrame(() => {
      target.scrollIntoView({ behavior: "smooth", block: "start" })
    })
  }, [])

  return (
    <>
      <section className="relative flex min-h-[78vh] items-center overflow-hidden pt-24 pb-16 md:min-h-[86vh]">
        <div className="container relative z-10 mx-auto px-4 text-center">
          <div className="mx-auto max-w-4xl space-y-8">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary/90 sm:text-sm">
              Parallax Music
            </p>
            <h1 className="text-balance text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
              <span className="text-foreground">{hub.title}</span>{" "}
              <span className="text-primary">{hub.titleHighlight}</span>
            </h1>
            <p className="mx-auto max-w-2xl text-lg text-muted-foreground md:text-xl">
              {hub.subtitle}
            </p>
            <p className="text-sm uppercase tracking-widest text-muted-foreground">{hub.tagline}</p>
            <div className="flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
              <Button
                size="lg"
                className="gap-2 bg-primary px-8 uppercase tracking-wider text-primary-foreground hover:bg-primary/90"
                onClick={() => setOrderOpen(true)}
              >
                <Rocket className="h-4 w-4" aria-hidden />
                {shared.hero.cta}
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-border/70 bg-background/20 px-8 uppercase tracking-wider backdrop-blur-sm"
                onClick={() =>
                  document.getElementById("promotion-services")?.scrollIntoView({ behavior: "smooth" })
                }
              >
                {shared.hero.ctaServices}
              </Button>
              <Button size="lg" variant="ghost" className="uppercase tracking-wider" asChild>
                <Link href="/services" prefetch={false}>
                  Весь каталог услуг
                </Link>
              </Button>
            </div>
          </div>
          <PartnerMarquee />
        </div>
      </section>

      <section id="promotion-services" className="border-t border-border/40 py-20 md:py-24">
        <div className="container mx-auto px-4">
          <div className="mx-auto mb-12 max-w-3xl text-center md:mb-16">
            <h2 className="mb-6 text-4xl font-bold tracking-tight md:text-5xl lg:text-6xl text-foreground">
              {hub.servicesTitle}
            </h2>
            <p className="text-lg text-muted-foreground">{hub.servicesDescription}</p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {services.map((service) => (
              <Link
                key={service.id}
                href={`/promotion/${service.slug}`}
                prefetch={false}
                className={cn(
                  marketingGlassPanelClass,
                  marketingGlassHoverClass,
                  "group flex h-full flex-col p-6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                )}
              >
                <h3 className="mb-3 text-lg font-bold uppercase tracking-wide group-hover:text-primary">
                  {service.title}
                </h3>
                <p className="mb-6 flex-1 text-sm leading-relaxed text-muted-foreground">
                  {service.description}
                </p>
                <span className="inline-flex items-center gap-2 text-sm font-semibold text-primary">
                  {hub.serviceCardLink}
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </span>
              </Link>
            ))}
          </div>

          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button variant="outline" asChild>
              <Link href="/services" prefetch={false}>
                Все услуги в каталоге
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/cases" prefetch={false}>
                Кейсы артистов
              </Link>
            </Button>
            <Button variant="ghost" asChild>
              <Link href="/tools" prefetch={false}>
                Self-serve инструменты
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <PromotionOrderDialog
        open={orderOpen}
        onOpenChange={setOrderOpen}
        prefillMessage={hub.orderPrefill}
        title={shared.orderDialog.title}
        description={shared.orderDialog.description}
      />
    </>
  )
}
