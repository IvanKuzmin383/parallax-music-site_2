"use client"

import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ServicePriceText } from "@/components/cabinet/shared/service-price-text"
import { cabinetAuthHref } from "@/components/cabinet/shared/service-landing-mode"
import { TOOL_CATALOG_HREFS, ToolsCatalog } from "@/components/cabinet/tools/tools-catalog"
import { dashboardGlassPanelClass } from "@/components/cabinet/dashboard/dashboard-glass"
import { getVisibleServicesCatalog } from "@/lib/cabinet/services-catalog"
import { publicPathForCabinetPath } from "@/lib/marketing/public-landings"
import { cn } from "@/lib/utils"

const SERVICE_GROUPS = [
  { category: "design", title: "Звук и видео" },
  { category: "promotion", title: "Продвижение" },
] as const

/** Публичный каталог: те же карточки и тексты, что в разделах «Инструменты» и «Продвижение» кабинета. */
export function FeaturesCatalog() {
  const services = getVisibleServicesCatalog().filter((s) => !TOOL_CATALOG_HREFS.has(s.href))

  return (
    <div className="space-y-10">
      <ToolsCatalog publicLinks />

      {SERVICE_GROUPS.map((group) => {
        const items = services.filter((s) => s.category === group.category)
        if (items.length === 0) return null
        return (
          <section key={group.category} className="space-y-4">
            <h2 className="text-lg font-semibold">{group.title}</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {items.map((service) => {
                const href =
                  publicPathForCabinetPath(service.href) ?? cabinetAuthHref(service.href, true)
                return (
                  <div
                    key={service.slug}
                    className={cn(dashboardGlassPanelClass, "flex h-full flex-col gap-3 p-4")}
                  >
                    <div className="min-w-0 flex-1 space-y-1">
                      <p className="font-medium leading-snug">{service.title}</p>
                      <p className="text-sm text-muted-foreground">{service.shortDescription}</p>
                    </div>
                    <p className="text-sm font-medium text-primary">
                      {service.priceKey ? (
                        <ServicePriceText priceKey={service.priceKey} fallback={service.priceLabel} />
                      ) : (
                        service.priceLabel
                      )}
                    </p>
                    <Button variant="outline" size="sm" className="w-full" asChild>
                      <Link href={href}>
                        Подробнее
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                )
              })}
            </div>
          </section>
        )
      })}
    </div>
  )
}
