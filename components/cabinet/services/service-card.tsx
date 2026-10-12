"use client"

import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowRight } from "lucide-react"
import type { ServiceCatalogEntry } from "@/lib/cabinet/services-catalog"

interface ServiceCardProps {
  service: ServiceCatalogEntry
  compact?: boolean
}

export function ServiceCard({ service, compact }: ServiceCardProps) {
  return (
    <Link href={service.href} className="block group">
      <Card className="h-full transition-colors hover:border-primary/50 hover:bg-card/80">
        <CardHeader className={compact ? "pb-2" : undefined}>
          <CardTitle className="text-base group-hover:text-primary transition-colors">{service.title}</CardTitle>
          {!compact ? <CardDescription className="line-clamp-2">{service.shortDescription}</CardDescription> : null}
        </CardHeader>
        <CardContent className="flex items-center justify-between pt-0">
          <span className="text-sm font-medium text-primary">{service.priceLabel}</span>
          <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
        </CardContent>
      </Card>
    </Link>
  )
}
