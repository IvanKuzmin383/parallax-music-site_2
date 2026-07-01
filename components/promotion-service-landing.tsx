"use client"

import { useRef, useEffect, useState } from "react"
import Link from "next/link"
import {
  Zap,
  Play,
  Infinity,
  Users,
  Target,
  TrendingUp,
  Link2,
  Video,
  Flame,
  Rocket,
} from "lucide-react"
import * as AccordionPrimitive from "@radix-ui/react-accordion"
import { Minus, Plus } from "lucide-react"
import { HeroBackgroundImage } from "@/components/hero-background-image"
import { Button } from "@/components/ui/button"
import { PromotionOrderDialog } from "@/components/promotion-order-dialog"
import { PromotionAnalyticsMockup } from "@/components/promotion-analytics-mockup"
import { PartnerMarquee } from "@/components/partner-marquee"
import { useI18n } from "@/lib/i18n-context"
import type { PromotionSlug } from "@/lib/promotion-pages"

const FEATURE_ICONS = {
  zap: Zap,
  play: Play,
  infinity: Infinity,
  users: Users,
  target: Target,
  chart: TrendingUp,
  link: Link2,
  video: Video,
  flame: Flame,
} as const

type PageContent = {
  title: string
  titleHighlight?: string
  subtitle: string
  ctaCaption: string
  mockupType: "streams" | "vk" | "yandex" | "tiktok"
  badge: string
  orderPrefill: string
  features: Array<{
    id: string
    icon: keyof typeof FEATURE_ICONS
    title: string
    description: string
  }>
  steps: {
    title: string
    description: string
    items: Array<{ id: string; title: string; description: string }>
  }
  faq: {
    title: string
    description: string
    items: Array<{ id: string; question: string; answer: string }>
  }
  finalCta: {
    title: string
    description: string
    cta: string
  }
}

export function PromotionServiceLanding({ slug }: { slug: PromotionSlug }) {
  const { t } = useI18n()
  const containerRef = useRef<HTMLDivElement>(null)
  const [orderOpen, setOrderOpen] = useState(false)

  const page = t.promotionLanding.pages[slug] as PageContent
  const shared = t.promotionLanding

  useEffect(() => {
    const handleScroll = () => {
      if (!containerRef.current) return
      const scrolled = window.scrollY
      containerRef.current.querySelectorAll(".parallax-layer").forEach((element, index) => {
        const speed = (index + 1) * 0.15
        ;(element as HTMLElement).style.transform = `translateY(${-(scrolled * speed)}px)`
      })
    }
    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  const scrollToFeatures = () => {
    document.getElementById("promotion-features")?.scrollIntoView({ behavior: "smooth", block: "start" })
  }

  return (
    <>
      <section className="relative min-h-screen flex items-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <HeroBackgroundImage alt={shared.hero.imageAlt} />
          <div className="absolute inset-0 bg-gradient-to-b from-background/90 via-background/70 to-background" />
        </div>

        <div className="container mx-auto px-4 z-10 py-28 md:py-32">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <div className="space-y-8">
              <div ref={containerRef} className="relative">
                <h1 className="parallax-layer text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-tight">
                  <span className="text-foreground">{page.title}</span>
                  {page.titleHighlight ? (
                    <>
                      <br />
                      <span className="text-primary">{page.titleHighlight}</span>
                    </>
                  ) : null}
                </h1>
              </div>
              <p className="text-lg md:text-xl text-muted-foreground max-w-xl text-pretty">{page.subtitle}</p>

              <div className="grid sm:grid-cols-2 gap-4" id="promotion-features">
                {page.features.map((feature) => {
                  const Icon = FEATURE_ICONS[feature.icon] ?? Zap
                  return (
                    <div key={feature.id} className="flex gap-3">
                      <div className="shrink-0 mt-0.5">
                        <Icon className="h-5 w-5 text-primary" aria-hidden />
                      </div>
                      <div>
                        <p className="font-bold text-sm uppercase tracking-wide">{feature.title}</p>
                        <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
                      </div>
                    </div>
                  )
                })}
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center gap-4 pt-2">
                <Button
                  size="lg"
                  className="uppercase tracking-wider bg-primary text-primary-foreground hover:bg-primary/90 px-8 gap-2"
                  onClick={() => setOrderOpen(true)}
                >
                  <Rocket className="h-4 w-4" aria-hidden />
                  {page.badge}
                </Button>
                <p className="text-sm text-muted-foreground max-w-xs">{page.ctaCaption}</p>
              </div>
            </div>

            <div className="flex justify-center lg:justify-end">
              <PromotionAnalyticsMockup type={page.mockupType} />
            </div>
          </div>

          <div className="mt-16">
            <PartnerMarquee />
          </div>
        </div>
      </section>

      <section className="py-24 bg-background border-t border-border">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mb-16">
            <h2 className="text-4xl md:text-6xl font-bold mb-6 text-foreground">{page.steps.title}</h2>
            <p className="text-lg text-muted-foreground text-pretty">{page.steps.description}</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {page.steps.items.map((step, index) => (
              <div key={step.id} className="space-y-4">
                <div className="text-6xl font-bold text-primary opacity-50">0{index + 1}</div>
                <h3 className="text-xl font-bold uppercase tracking-wide">{step.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>


      <section className="py-20 bg-background border-t border-border">
        <div className="container mx-auto px-4 max-w-5xl">
          <h2 className="text-3xl md:text-5xl font-bold mb-6 text-foreground">{page.faq.title}</h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-3xl">{page.faq.description}</p>
          <AccordionPrimitive.Root type="single" collapsible className="space-y-3">
            {page.faq.items.map((item) => (
              <AccordionPrimitive.Item
                key={item.id}
                value={item.id}
                className="rounded-2xl border border-border bg-card/60 data-[state=open]:bg-card/80"
              >
                <AccordionPrimitive.Header>
                  <AccordionPrimitive.Trigger className="group flex w-full items-center justify-between gap-4 p-5 text-left font-semibold text-base transition-colors hover:bg-muted/30 rounded-2xl [&[data-state=open]]:rounded-b-none">
                    <span>{item.question}</span>
                    <span className="flex size-8 shrink-0 items-center justify-center text-primary">
                      <Plus className="size-4 transition-transform group-data-[state=open]:hidden" aria-hidden />
                      <Minus className="size-4 hidden group-data-[state=open]:block" aria-hidden />
                    </span>
                  </AccordionPrimitive.Trigger>
                </AccordionPrimitive.Header>
                <AccordionPrimitive.Content className="overflow-hidden data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
                  <p className="px-5 pb-5 pt-0 text-sm text-muted-foreground whitespace-pre-line">{item.answer}</p>
                </AccordionPrimitive.Content>
              </AccordionPrimitive.Item>
            ))}
          </AccordionPrimitive.Root>
        </div>
      </section>

      <section className="py-24 bg-background border-t border-border">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto text-center space-y-6">
            <h2 className="text-4xl md:text-5xl font-bold text-foreground">{page.finalCta.title}</h2>
            <p className="text-lg text-muted-foreground">{page.finalCta.description}</p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button
                size="lg"
                className="uppercase tracking-wider bg-primary text-primary-foreground hover:bg-primary/90 px-12"
                onClick={() => setOrderOpen(true)}
              >
                {page.finalCta.cta}
              </Button>
              <Button size="lg" variant="outline" className="uppercase tracking-wider" onClick={scrollToFeatures}>
                {shared.hero.ctaServices}
              </Button>
            </div>
            <p className="text-sm">
              <Link href="/promotion" className="text-primary hover:underline">
                {shared.hero.ctaServices}
              </Link>
            </p>
          </div>
        </div>
      </section>

      <PromotionOrderDialog
        open={orderOpen}
        onOpenChange={setOrderOpen}
        prefillMessage={page.orderPrefill}
        title={shared.orderDialog.title}
        description={shared.orderDialog.description}
      />
    </>
  )
}
