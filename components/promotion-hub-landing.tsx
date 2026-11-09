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
import { cabinetAuthHref } from "@/components/cabinet/shared/service-landing-mode"
import { getVisibleServicesCatalog } from "@/lib/cabinet/services-catalog"
import { useI18n } from "@/lib/i18n-context"
import { isPromotionLandingSlug, publicPathForCabinetPath } from "@/lib/marketing/public-landings"
import { cn } from "@/lib/utils"

export function PromotionHubLanding() {
  const { t } = useI18n()
  const hub = t.promotionLanding.hub
  const shared = t.promotionLanding
  const [orderOpen, setOrderOpen] = useState(false)

  const hubOnlyServices = (
    hub.services as Array<{ id: string; slug: string; title: string; description: string }>
  )
    .filter((service) => !isPromotionLandingSlug(service.slug))
    .map((service) => ({
      id: service.id,
      title: service.title,
      description: service.description,
      href: `/promotion/${service.slug}`,
    }))
  const catalogServices = getVisibleServicesCatalog()
    .filter((service) => service.category === "promotion")
    .map((service) => ({
      id: service.slug,
      title: service.title,
      description: service.shortDescription,
      href: publicPathForCabinetPath(service.href) ?? cabinetAuthHref(service.href, true),
    }))
  const services = [...hubOnlyServices, ...catalogServices]

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
      <section className="relative overflow-hidden pt-28 pb-14 md:pt-32 md:pb-16">
        <div className="mx-auto w-full max-w-[1180px] px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl space-y-5">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Продвижение
            </p>
            <h1 className="text-[2.15rem] font-bold leading-[1.1] tracking-tight sm:text-[2.75rem] md:text-[3.25rem]">
              <span className="text-foreground">{hub.title}</span>{" "}
              <span className="text-primary">{hub.titleHighlight}</span>
            </h1>
            <p className="text-[15px] leading-relaxed text-muted-foreground md:text-base">
              {hub.subtitle}
            </p>
            {hub.tagline ? (
              <p className="text-sm text-muted-foreground">{hub.tagline}</p>
            ) : null}
            <div className="flex flex-wrap gap-3 pt-1">
              <Button className="h-11 min-h-11 gap-2 px-5" onClick={() => setOrderOpen(true)}>
                <Rocket className="h-4 w-4" aria-hidden />
                {shared.hero.cta}
              </Button>
              <Button
                variant="outline"
                className="h-11 min-h-11 px-5"
                onClick={() =>
                  document.getElementById("promotion-services")?.scrollIntoView({ behavior: "smooth" })
                }
              >
                {shared.hero.ctaServices}
              </Button>
            </div>
          </div>
          <div className="mt-10">
            <PartnerMarquee />
          </div>
        </div>
      </section>

      <section id="promotion-services" className="border-t border-border/40 pb-20 pt-12 md:pb-24 md:pt-16">
        <div className="mx-auto w-full max-w-[1180px] space-y-8 px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl space-y-3">
            <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">
              {hub.servicesTitle}
            </h2>
            <p className="text-sm text-muted-foreground md:text-base">{hub.servicesDescription}</p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {services.map((service) => (
              <Link
                key={service.id}
                href={service.href}
                prefetch={false}
                className={cn(
                  marketingGlassPanelClass,
                  marketingGlassHoverClass,
                  "group flex h-full flex-col gap-3 p-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
                )}
              >
                <h3 className="font-medium leading-snug transition-colors group-hover:text-foreground">
                  {service.title}
                </h3>
                <p className="flex-1 text-sm leading-relaxed text-muted-foreground">
                  {service.description}
                </p>
                <span className="inline-flex items-center gap-1.5 text-sm font-medium text-primary">
                  {hub.serviceCardLink}
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </span>
              </Link>
            ))}
          </div>

          <div className="flex flex-wrap gap-3 pt-2">
            <Button variant="outline" asChild>
              <Link href="/cases" prefetch={false}>
                Кейсы артистов
              </Link>
            </Button>
            <Button variant="ghost" asChild>
              <Link href="/features" prefetch={false}>
                Все возможности
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
