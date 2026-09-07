"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { ArrowRight, Rocket } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { PromotionOrderDialog } from "@/components/promotion-order-dialog"
import { useI18n } from "@/lib/i18n-context"

type PromoteItem = {
  id: string
  slug: string
  title: string
  description: string
  price: string
  orderPrefill: string
  cta?: string
  ctaUrl?: string
}

type CabinetPromoteSectionProps = {
  /** Show page-level title row (standalone /cabinet/promote). */
  showHeader?: boolean
}

export function CabinetPromoteSection({ showHeader = true }: CabinetPromoteSectionProps) {
  const { t } = useI18n()
  const promote = t.cabinet.promote
  const items = promote.items as PromoteItem[]

  const [orderOpen, setOrderOpen] = useState(false)
  const [prefillMessage, setPrefillMessage] = useState(items[0]?.orderPrefill ?? "")

  const openOrder = (item: PromoteItem) => {
    setPrefillMessage(item.orderPrefill)
    setOrderOpen(true)
  }

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      {showHeader ? (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Rocket className="h-5 w-5" />
            <h2 className="text-xl font-semibold">{promote.title}</h2>
          </div>
          <p className="text-sm text-muted-foreground">{promote.description}</p>
        </div>
      ) : null}

      <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 items-stretch">
        {items.map((item) => (
          <Card key={item.id} className="h-full overflow-hidden hover:shadow-lg transition-shadow flex flex-col">
            <div className="aspect-video relative shrink-0 bg-muted">
              <Image
                src="/hero-studio.webp"
                alt={item.title}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              />
            </div>
            <CardHeader className="flex flex-1 flex-col gap-2">
              <CardTitle className="text-xl">{item.title}</CardTitle>
              <CardDescription className="flex-1">{item.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 mt-auto">
              <div className="flex items-center justify-between gap-2">
                <span className="text-2xl font-bold text-primary whitespace-nowrap">{item.price}</span>
                <Button variant="link" className="h-auto p-0 text-muted-foreground" asChild>
                  <Link href={`/promotion/${item.slug}`} target="_blank" rel="noopener noreferrer">
                    {promote.moreDetails}
                    <ArrowRight className="ml-1 h-3.5 w-3.5" />
                  </Link>
                </Button>
              </div>
              {item.ctaUrl ? (
                <Button className="w-full" asChild>
                  <a href={item.ctaUrl} target="_blank" rel="noopener noreferrer">
                    {item.cta ?? promote.orderCta}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </a>
                </Button>
              ) : (
                <Button className="w-full" onClick={() => openOrder(item)}>
                  {item.cta ?? promote.orderCta}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <PromotionOrderDialog
        open={orderOpen}
        onOpenChange={setOrderOpen}
        prefillMessage={prefillMessage}
        title={promote.orderDialogTitle}
        description={promote.orderDialogDescription}
      />
    </div>
  )
}
