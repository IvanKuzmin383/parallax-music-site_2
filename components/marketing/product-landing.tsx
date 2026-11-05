import Link from "next/link"
import { ArrowRight, Check } from "lucide-react"
import { MarketingHero } from "@/components/marketing/marketing-hero"
import {
  marketingGlassHoverClass,
  marketingGlassPanelClass,
} from "@/components/marketing/marketing-glass"
import { Button } from "@/components/ui/button"
import type { MarketingProductPage } from "@/lib/marketing/public-catalog"
import { cn } from "@/lib/utils"

export function ProductLanding({ product }: { product: MarketingProductPage }) {
  const hubHref = product.hub === "tools" ? "/tools" : "/services"
  const hubLabel = product.hub === "tools" ? "Все инструменты" : "Все услуги"

  return (
    <main id="main-content" className="min-h-screen">
      <MarketingHero
        title={product.title}
        titleHighlight={product.titleHighlight}
        description={product.subtitle}
        primaryHref={product.cabinetHref}
        primaryLabel={product.ctaLabel}
        secondaryHref={hubHref}
        secondaryLabel={hubLabel}
        align="left"
      >
        <div className="flex flex-wrap items-center gap-3 pt-2">
          <span className="rounded-lg bg-primary/15 px-3 py-1.5 text-sm font-semibold tabular-nums text-primary">
            {product.priceLabel}
          </span>
          {product.priceNote ? (
            <span className="text-sm text-muted-foreground">{product.priceNote}</span>
          ) : null}
        </div>
      </MarketingHero>

      <section className="border-t border-border/40 py-16 md:py-20">
        <div className="container mx-auto grid gap-10 px-4 lg:grid-cols-[1.2fr_0.8fr]">
          <div>
            <h2 className="mb-6 text-2xl font-bold md:text-3xl">Что входит</h2>
            <ul className="space-y-3">
              {product.features.map((feature) => (
                <li
                  key={feature}
                  className={cn(marketingGlassPanelClass, "flex items-start gap-3 p-4")}
                >
                  <Check className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />
                  <span className="text-foreground/90">{feature}</span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h2 className="mb-6 text-2xl font-bold md:text-3xl">Как это работает</h2>
            <ol className="space-y-3">
              {product.steps.map((step, index) => (
                <li key={step} className={cn(marketingGlassPanelClass, "p-4")}>
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-primary">
                    Шаг {index + 1}
                  </p>
                  <p className="text-sm text-muted-foreground md:text-base">{step}</p>
                </li>
              ))}
            </ol>
            <Button
              size="lg"
              className="mt-6 w-full bg-primary uppercase tracking-wider text-primary-foreground hover:bg-primary/90"
              asChild
            >
              <Link href={product.cabinetHref} prefetch={false}>
                {product.ctaLabel}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {product.faq.length > 0 ? (
        <section className="border-t border-border/40 py-16 md:py-20">
          <div className="container mx-auto max-w-3xl px-4">
            <h2 className="mb-8 text-2xl font-bold md:text-3xl">Вопросы</h2>
            <div className="space-y-4">
              {product.faq.map((item) => (
                <article key={item.q} className={cn(marketingGlassPanelClass, "p-5")}>
                  <h3 className="mb-2 font-semibold">{item.q}</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">{item.a}</p>
                </article>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <section className="border-t border-border/40 py-16">
        <div className="container mx-auto px-4 text-center">
          <Link
            href={hubHref}
            className={cn(
              marketingGlassPanelClass,
              marketingGlassHoverClass,
              "inline-flex items-center gap-2 px-5 py-3 text-sm font-semibold uppercase tracking-wider"
            )}
          >
            {hubLabel}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </main>
  )
}
