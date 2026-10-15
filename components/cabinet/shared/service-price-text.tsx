"use client"

import { cn } from "@/lib/utils"
import type { ServicePriceKey } from "@/lib/service-prices"
import { useServicePrices } from "@/lib/cabinet/hooks/use-service-prices"

type ServicePriceTextProps = {
  priceKey: ServicePriceKey
  /** Пока цены не загрузились */
  fallback: string
  className?: string
  /** Показать ~~старую~~ и скидку рядом */
  showSale?: boolean
}

export function ServicePriceText({
  priceKey,
  fallback,
  className,
  showSale = true,
}: ServicePriceTextProps) {
  const { byKey } = useServicePrices()
  const p = byKey(priceKey)
  if (!p) {
    return <span className={className}>{fallback}</span>
  }

  return (
    <span className={cn("inline-flex flex-wrap items-baseline gap-x-2 gap-y-0.5", className)}>
      <span>{p.cardLabel}</span>
      {showSale && p.compareAtRub != null && p.discountPercent != null ? (
        <>
          <span className="text-xs font-normal text-muted-foreground">
            скидка {p.discountPercent}%
          </span>
          <span className="text-xs font-normal text-muted-foreground line-through">
            {p.compareAtRub.toLocaleString("ru-RU")} ₽
          </span>
        </>
      ) : null}
    </span>
  )
}
