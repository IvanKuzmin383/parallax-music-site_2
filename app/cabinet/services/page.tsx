"use client"

import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { PageHeader } from "@/components/cabinet/shared/page-header"
import { SERVICES_CATALOG } from "@/lib/cabinet/services-catalog"
import type { OrderCategory } from "@/lib/cabinet/types"
import { cn } from "@/lib/utils"

const CATEGORY_LABELS: Record<OrderCategory, string> = {
  music: "Музыка",
  promotion: "Продвижение",
  design: "Оформление",
  ai: "AI",
  protect: "Защита",
  other: "Другое",
}

const CATEGORY_ORDER: OrderCategory[] = ["promotion", "design", "ai", "protect", "music", "other"]

export default function CabinetServicesPage() {
  const grouped = CATEGORY_ORDER.map((cat) => ({
    category: cat,
    label: CATEGORY_LABELS[cat],
    items: SERVICES_CATALOG.filter((s) => s.category === cat),
  })).filter((g) => g.items.length > 0)

  return (
    <div className="max-w-5xl space-y-10">
      <PageHeader
        title="Каталог услуг"
        description="Закажите продвижение, оформление и инструменты для уже выпущенных релизов"
      />

      {grouped.map((group) => (
        <section key={group.category} className="space-y-4">
          <h2 className="text-lg font-semibold">{group.label}</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {group.items.map((service) => (
              <Link
                key={service.slug}
                href={service.href}
                className="group rounded-xl border border-border p-4 hover:border-primary/40 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium group-hover:text-primary transition-colors">{service.title}</p>
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{service.shortDescription}</p>
                  </div>
                  <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground group-hover:text-primary" />
                </div>
                <p className={cn("text-sm font-medium text-primary mt-3")}>{service.priceLabel}</p>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
