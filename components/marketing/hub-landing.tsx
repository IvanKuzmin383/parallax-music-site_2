import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { MarketingHero } from "@/components/marketing/marketing-hero"
import {
  marketingGlassHoverClass,
  marketingGlassPanelClass,
} from "@/components/marketing/marketing-glass"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export type HubCard = {
  id: string
  title: string
  description: string
  href: string
  priceLabel?: string
  badge?: string
}

type HubLandingProps = {
  eyebrow?: string
  title: string
  titleHighlight?: string
  description: string
  primaryHref: string
  primaryLabel: string
  secondaryHref?: string
  secondaryLabel?: string
  cardsTitle: string
  cardsDescription?: string
  cards: HubCard[]
  footerNote?: string
}

export function HubLanding({
  eyebrow,
  title,
  titleHighlight,
  description,
  primaryHref,
  primaryLabel,
  secondaryHref,
  secondaryLabel,
  cardsTitle,
  cardsDescription,
  cards,
  footerNote,
}: HubLandingProps) {
  return (
    <main id="main-content" className="min-h-screen">
      <MarketingHero
        eyebrow={eyebrow}
        title={title}
        titleHighlight={titleHighlight}
        description={description}
        primaryHref={primaryHref}
        primaryLabel={primaryLabel}
        secondaryHref={secondaryHref}
        secondaryLabel={secondaryLabel}
      />

      <section className="border-t border-border/40 py-16 md:py-20">
        <div className="container mx-auto px-4">
          <div className="mb-10 max-w-3xl md:mb-12">
            <h2 className="mb-3 text-3xl font-bold tracking-tight md:text-4xl">{cardsTitle}</h2>
            {cardsDescription ? (
              <p className="text-muted-foreground text-pretty">{cardsDescription}</p>
            ) : null}
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {cards.map((card) => (
              <Link
                key={card.id}
                href={card.href}
                prefetch={false}
                className={cn(
                  marketingGlassPanelClass,
                  marketingGlassHoverClass,
                  "group flex h-full flex-col p-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                )}
              >
                <div className="mb-3 flex items-start justify-between gap-3">
                  <h3 className="text-lg font-semibold tracking-tight group-hover:text-primary">
                    {card.title}
                  </h3>
                  <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
                </div>
                <p className="mb-4 flex-1 text-sm leading-relaxed text-muted-foreground">
                  {card.description}
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  {card.badge ? (
                    <span className="rounded-md border border-primary/40 bg-primary/15 px-2 py-1 text-xs font-bold uppercase tracking-wider text-primary">
                      {card.badge}
                    </span>
                  ) : null}
                  {card.priceLabel ? (
                    <span className="text-sm font-semibold tabular-nums text-foreground">
                      {card.priceLabel}
                    </span>
                  ) : null}
                </div>
              </Link>
            ))}
          </div>

          {footerNote ? (
            <p className="mt-10 text-center text-sm text-muted-foreground">{footerNote}</p>
          ) : null}

          <div className="mt-10 flex justify-center">
            <Button
              size="lg"
              className="bg-primary px-8 uppercase tracking-wider text-primary-foreground hover:bg-primary/90"
              asChild
            >
              <Link href={primaryHref} prefetch={false}>
                {primaryLabel}
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </main>
  )
}
