"use client"

import Link from "next/link"
import { ArrowRight, Music2, Sparkles, TrendingUp } from "lucide-react"
import {
  marketingGlassHoverClass,
  marketingGlassPanelClass,
} from "@/components/marketing/marketing-glass"
import { useI18n } from "@/lib/i18n-context"
import { cn } from "@/lib/utils"

const ICONS = [Music2, Sparkles, TrendingUp] as const

export function ProductPaths() {
  const { t } = useI18n()
  const paths = t.productPaths

  return (
    <section id="paths" className="border-t border-border/40 py-20 md:py-24">
      <div className="container mx-auto px-4">
        <div className="mb-12 max-w-3xl md:mb-16">
          <h2 className="mb-4 text-4xl font-bold tracking-tight md:text-5xl lg:text-6xl">
            <span className="text-foreground">{paths.title}</span>{" "}
            <span className="text-primary">{paths.titleHighlight}</span>
          </h2>
          <p className="text-lg text-muted-foreground text-pretty">{paths.description}</p>
        </div>

        <div className="grid gap-4 md:grid-cols-3 md:gap-5">
          {paths.items.map((item, index) => {
            const Icon = ICONS[index % ICONS.length]
            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch={false}
                className={cn(
                  marketingGlassPanelClass,
                  marketingGlassHoverClass,
                  "group flex h-full flex-col p-6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                )}
              >
                <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-primary/25 transition-all group-hover:bg-primary/20 group-hover:ring-primary/45">
                  <Icon className="h-6 w-6 text-primary" aria-hidden />
                </div>
                <h3 className="mb-2 text-xl font-bold tracking-tight group-hover:text-primary">
                  {item.title}
                </h3>
                <p className="mb-6 flex-1 text-sm leading-relaxed text-muted-foreground md:text-base">
                  {item.description}
                </p>
                <span className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-primary">
                  {item.cta}
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </span>
              </Link>
            )
          })}
        </div>
      </div>
    </section>
  )
}
