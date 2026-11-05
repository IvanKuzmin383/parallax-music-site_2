"use client"

import type { ReactNode } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type MarketingHeroProps = {
  eyebrow?: string
  title: string
  titleHighlight?: string
  description: string
  primaryHref: string
  primaryLabel: string
  secondaryHref?: string
  secondaryLabel?: string
  children?: ReactNode
  className?: string
  align?: "center" | "left"
}

export function MarketingHero({
  eyebrow = "Parallax Music",
  title,
  titleHighlight,
  description,
  primaryHref,
  primaryLabel,
  secondaryHref,
  secondaryLabel,
  children,
  className,
  align = "center",
}: MarketingHeroProps) {
  const isCenter = align === "center"

  return (
    <section
      className={cn(
        "relative flex min-h-[78vh] items-center overflow-hidden pt-24 pb-16 md:min-h-[86vh] md:pt-28 md:pb-20",
        className
      )}
    >
      <div className="container relative z-10 mx-auto px-4">
        <div className={cn("max-w-3xl space-y-7", isCenter && "mx-auto text-center")}>
          {eyebrow ? (
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary/90 sm:text-sm">
              {eyebrow}
            </p>
          ) : null}

          <h1 className="text-balance text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
            <span className="text-foreground">{title}</span>
            {titleHighlight ? (
              <>
                {" "}
                <span className="text-primary">{titleHighlight}</span>
              </>
            ) : null}
          </h1>

          <p
            className={cn(
              "text-pretty text-lg text-muted-foreground md:text-xl",
              isCenter && "mx-auto max-w-2xl"
            )}
          >
            {description}
          </p>

          <div
            className={cn(
              "flex flex-col gap-3 sm:flex-row",
              isCenter && "items-center justify-center"
            )}
          >
            <Button
              size="lg"
              className="bg-primary px-8 uppercase tracking-wider text-primary-foreground hover:bg-primary/90"
              asChild
            >
              <Link href={primaryHref} prefetch={false}>
                {primaryLabel}
              </Link>
            </Button>
            {secondaryHref && secondaryLabel ? (
              <Button
                size="lg"
                variant="outline"
                className="border-border/70 bg-background/20 px-8 uppercase tracking-wider backdrop-blur-sm"
                asChild
              >
                <Link href={secondaryHref} prefetch={false}>
                  {secondaryLabel}
                </Link>
              </Button>
            ) : null}
          </div>

          {children}
        </div>
      </div>
    </section>
  )
}
