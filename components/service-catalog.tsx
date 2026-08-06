"use client"

import Link from "next/link"
import { ArrowRight, ArrowUpRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useI18n } from "@/lib/i18n-context"

type CatalogItem = {
  name: string
  blurb: string
  price?: string
  href?: string
  soon?: boolean
}

type CatalogGroup = {
  id: string
  title: string
  items: CatalogItem[]
}

export function ServiceCatalog() {
  const { t } = useI18n()
  const copy = t.serviceCatalog
  const groups = (copy.groups ?? []) as CatalogGroup[]

  return (
    <section id="extras" className="py-24 bg-background/60 border-y border-border/40">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mb-14 md:mb-16">
          <h2 className="text-4xl md:text-6xl font-bold mb-6">
            <span className="text-foreground">{copy.title}</span>{" "}
            <span className="text-primary">{copy.titleHighlight}</span>
          </h2>
          <p className="text-lg text-muted-foreground text-pretty">{copy.description}</p>
        </div>

        <div className="space-y-14 md:space-y-16 max-w-5xl">
          {groups.map((group) => (
            <div key={group.id}>
              <div className="mb-5 flex items-baseline gap-4">
                <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-primary">
                  {group.title}
                </h3>
                <div className="h-px flex-1 bg-border/60" aria-hidden />
              </div>

              <ul className="divide-y divide-border/50 border-y border-border/50">
                {group.items.map((item) => {
                  const rowClass =
                    "group flex flex-col gap-2 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6"

                  const body = (
                    <>
                      <div className="min-w-0 flex-1 text-left">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`font-semibold tracking-tight ${
                              item.soon ? "text-muted-foreground" : "text-foreground"
                            }`}
                          >
                            {item.name}
                          </span>
                          {item.soon ? (
                            <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">
                              {copy.soonBadge}
                            </span>
                          ) : null}
                        </div>
                        <p
                          className={`mt-1 text-sm leading-relaxed ${
                            item.soon ? "text-muted-foreground/70" : "text-muted-foreground"
                          }`}
                        >
                          {item.blurb}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-3 sm:justify-end">
                        {item.price && !item.soon ? (
                          <span className="text-sm font-medium text-foreground/90 tabular-nums">
                            {item.price}
                          </span>
                        ) : null}
                        {item.href && !item.soon ? (
                          <ArrowUpRight
                            className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-primary"
                            aria-hidden
                          />
                        ) : null}
                      </div>
                    </>
                  )

                  if (item.href && !item.soon) {
                    return (
                      <li key={item.name}>
                        <Link
                          href={item.href}
                          className={`${rowClass} transition-colors hover:bg-primary/[0.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 rounded-sm px-1 -mx-1`}
                        >
                          {body}
                        </Link>
                      </li>
                    )
                  }

                  return (
                    <li key={item.name} className={`${rowClass} px-1`}>
                      {body}
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col sm:flex-row gap-3 sm:gap-4">
          <Button
            size="lg"
            className="uppercase tracking-wider bg-primary text-primary-foreground hover:bg-primary/90"
            asChild
          >
            <Link href="/cabinet">
              {copy.ctaCabinet}
              <ArrowRight className="ml-2 h-4 w-4" aria-hidden />
            </Link>
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="uppercase tracking-wider border-border bg-background/40"
            asChild
          >
            <Link href="/promotion">{copy.ctaPromotion}</Link>
          </Button>
        </div>
      </div>
    </section>
  )
}
