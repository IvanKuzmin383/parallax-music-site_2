"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { marketingGlassPanelClass } from "@/components/marketing/marketing-glass"
import { useI18n } from "@/lib/i18n-context"
import { trackGoal } from "@/lib/analytics"
import { cn } from "@/lib/utils"

/** Реальные скриншоты демо-аккаунта (public/marketing). Размеры - после кадрирования. */
const STEP_IMAGES: Record<string, { src: string; width: number; height: number }> = {
  cabinet: { src: "/marketing/cabinet-dashboard.webp", width: 1600, height: 1000 },
  upload: { src: "/marketing/path-upload.webp", width: 1600, height: 864 },
  moderation: { src: "/marketing/path-moderation.webp", width: 1600, height: 864 },
  stats: { src: "/marketing/cabinet-stats.webp", width: 1600, height: 1000 },
}

export function HomeReleasePath() {
  const { t } = useI18n()
  const copy = t.home.path
  const [active, setActive] = useState(0)
  const steps = copy.steps
  const current = steps[active] ?? steps[0]
  const image = STEP_IMAGES[current.id] ?? STEP_IMAGES.cabinet

  return (
    <section id="path" className="scroll-mt-20 py-16 md:py-24">
      <div className="mx-auto max-w-[1180px] px-4 sm:px-6 lg:px-8">
        <div className="mx-auto mb-10 max-w-2xl text-center md:mb-14">
          <h2 className="text-balance text-3xl font-bold tracking-tight md:text-5xl">
            {copy.title} <span className="text-primary">{copy.titleHighlight}</span>
          </h2>
          <p className="mt-4 text-pretty text-muted-foreground md:text-lg">{copy.description}</p>
        </div>

        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,0.34fr)_minmax(0,0.66fr)] lg:gap-8">
          <ol
            className="order-2 grid gap-2 sm:grid-cols-2 lg:order-1 lg:grid-cols-1"
            aria-label={`${copy.title} ${copy.titleHighlight}`}
          >
            {steps.map((step, index) => {
              const isActive = index === active
              return (
                <li key={step.id}>
                  <button
                    type="button"
                    onClick={() => setActive(index)}
                    aria-current={isActive ? "step" : undefined}
                    className={cn(
                      marketingGlassPanelClass,
                      "flex w-full items-center gap-3 p-3 text-left transition-colors sm:p-3.5",
                      isActive ? "border-primary/60 bg-primary/10" : "hover:border-primary/30",
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold",
                        isActive ? "bg-primary text-primary-foreground" : "bg-white/10 text-muted-foreground",
                      )}
                      aria-hidden
                    >
                      {index + 1}
                    </span>
                    <span className="min-w-0 text-sm font-semibold sm:text-base">
                      <span className="sr-only">
                        {copy.stepLabel} {index + 1}:{" "}
                      </span>
                      {step.title}
                    </span>
                  </button>
                </li>
              )
            })}
          </ol>

          <div className="order-1 lg:order-2">
            <div className="relative overflow-hidden rounded-2xl border border-border/50 bg-card/50 p-1.5 shadow-[0_30px_80px_rgba(0,0,0,0.4)] backdrop-blur-xl">
              <Image
                key={current.id}
                src={image.src}
                alt={current.alt}
                width={image.width}
                height={image.height}
                sizes="(min-width: 1024px) 760px, 100vw"
                className="h-auto w-full rounded-xl"
              />
              <span className="absolute bottom-4 right-4 rounded-full border border-border/60 bg-background/80 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur">
                {t.home.hero.demoBadge}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-10 flex justify-center">
          <Link
            href="/cabinet?tab=register"
            prefetch={false}
            onClick={() => trackGoal("cta_register_click", { location: "release_path" })}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-primary px-8 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            {copy.cta}
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>
      </div>
    </section>
  )
}
