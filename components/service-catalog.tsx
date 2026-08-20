"use client"

import Link from "next/link"
import { ArrowUpRight } from "lucide-react"
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

function ItemCard({
  item,
  soonBadge,
}: {
  item: CatalogItem
  soonBadge: string
}) {
  const content = (
    <>
      <div className="flex items-start justify-between gap-3">
        <h4
          className={`text-base font-bold leading-snug tracking-tight ${
            item.soon ? "text-foreground/55" : "text-foreground"
          }`}
        >
          {item.name}
        </h4>
        {item.href && !item.soon ? (
          <ArrowUpRight
            className="mt-0.5 h-4 w-4 shrink-0 text-primary/70 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-primary"
            aria-hidden
          />
        ) : null}
      </div>

      <p
        className={`mt-2 text-sm leading-relaxed ${
          item.soon ? "text-foreground/40" : "text-foreground/70"
        }`}
      >
        {item.blurb}
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {item.soon ? (
          <span className="rounded-md border border-primary/40 bg-primary/15 px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-primary">
            {soonBadge}
          </span>
        ) : item.price ? (
          <span className="rounded-md bg-foreground/10 px-2.5 py-1 text-sm font-semibold tabular-nums text-foreground">
            {item.price}
          </span>
        ) : null}
      </div>
    </>
  )

  const className = [
    "group block h-full rounded-xl border p-4 transition-all duration-200",
    item.soon
      ? "border-border/40 bg-background/30"
      : "border-border/70 bg-card/80 hover:border-primary/50 hover:bg-card",
  ].join(" ")

  if (item.href && !item.soon) {
    return (
      <Link
        href={item.href}
        className={`${className} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50`}
      >
        {content}
      </Link>
    )
  }

  return <div className={className}>{content}</div>
}

export function ServiceCatalog() {
  const { t } = useI18n()
  const copy = t.serviceCatalog
  const groups = (copy.groups ?? []) as CatalogGroup[]

  return (
    <section id="extras" className="py-20 md:py-24 bg-background">
      <div className="container mx-auto px-4">
        <div className="mb-10 md:mb-12 max-w-4xl">
          <h2 className="mb-4 text-3xl font-bold whitespace-nowrap sm:text-4xl md:text-5xl">
            <span className="text-foreground">{copy.title}</span>{" "}
            <span className="text-primary">{copy.titleHighlight}</span>
          </h2>
          <p className="max-w-2xl text-base md:text-lg text-foreground/75 text-pretty">
            {copy.description}
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {groups.map((group) => (
            <article
              key={group.id}
              className={`rounded-2xl border border-border/60 bg-gradient-to-b from-card to-background p-5 md:p-6 shadow-sm ${
                group.items.length > 4 ? "lg:col-span-2" : ""
              }`}
            >
              <h3 className="mb-4 text-lg font-bold uppercase tracking-wide text-primary">
                {group.title}
              </h3>
              <div
                className={`grid gap-3 ${
                  group.items.length > 4
                    ? "sm:grid-cols-2 lg:grid-cols-3"
                    : "sm:grid-cols-2"
                }`}
              >
                {group.items.map((item) => (
                  <ItemCard key={item.name} item={item} soonBadge={copy.soonBadge} />
                ))}
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
