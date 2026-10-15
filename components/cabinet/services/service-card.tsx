"use client"

import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowRight } from "lucide-react"
import type { ServiceCatalogEntry } from "@/lib/cabinet/services-catalog"
import { ServicePriceText } from "@/components/cabinet/shared/service-price-text"

interface ServiceCardProps {
  service: ServiceCatalogEntry
  compact?: boolean
}

export function ServiceCard({ service, compact }: ServiceCardProps) {
  return (
    <Link href={service.href} className="block group">
      <Card className="h-full transition-colors hover:border-primary/40 hover:bg-white/[0.08]">
        <CardHeader className={compact ? "pb-2" : undefined}>
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle className="text-base transition-colors group-hover:text-primary">
              {service.title}
            </CardTitle>
            {service.comingSoon ? (
              <span className="rounded-md bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-300">
                Скоро
              </span>
            ) : null}
          </div>
          {!compact ? (
            <CardDescription className="line-clamp-2">{service.shortDescription}</CardDescription>
          ) : null}
        </CardHeader>
        <CardContent className="flex items-center justify-between pt-0">
          <span className="text-sm font-medium text-primary">
            {service.priceKey ? (
              <>
                {service.pricePrefix ? <span>{service.pricePrefix}</span> : null}
                <ServicePriceText priceKey={service.priceKey} fallback={service.priceLabel} />
              </>
            ) : (
              service.priceLabel
            )}
          </span>
          <ArrowRight className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-primary" />
        </CardContent>
      </Card>
    </Link>
  )
}
