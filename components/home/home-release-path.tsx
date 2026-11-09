"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { ArrowRight, ChevronRight } from "lucide-react"
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

const AUTO_MS = 4500

export function HomeReleasePath() {
  const { t } = useI18n()
  const copy = t.home.path
  const [active, setActive] = useState(0)
  const [paused, setPaused] = useState(false)
  const steps = copy.steps
  const current = steps[active] ?? steps[0]
  const image = STEP_IMAGES[current.id] ?? STEP_IMAGES.cabinet

  useEffect(() => {
    if (paused || steps.length < 2) return
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return
    }
    const id = window.setInterval(() => {
      setActive((prev) => (prev + 1) % steps.length)
    }, AUTO_MS)
    return () => window.clearInterval(id)
  }, [paused, steps.length])

  return (
    <section id="path" className="scroll-mt-20 py-16 md:py-24">
      <div className="mx-auto max-w-[1180px] px-4 sm:px-6 lg:px-8">
        <div className="mx-auto mb-10 max-w-2xl text-center md:mb-12">
          <h2 className="text-balance text-3xl font-bold tracking-tight md:text-5xl">
            {copy.title} <span className="text-primary">{copy.titleHighlight}</span>
          </h2>
          <p className="mt-4 text-pretty text-muted-foreground md:text-lg">{copy.description}</p>
        </div>

        <div
          className="space-y-5"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          onFocusCapture={() => setPaused(true)}
          onBlurCapture={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
              setPaused(false)
            }
          }}
        >
          <ol
            className={cn(
              marketingGlassPanelClass,
              "flex flex-wrap items-center justify-center gap-x-1 gap-y-2 px-3 py-3 sm:gap-x-2 sm:px-4 sm:py-3.5",
            )}
            aria-label={`${copy.title} ${copy.titleHighlight}`}
          >
            {steps.map((step, index) => {
              const isActive = index === active
              return (
                <li key={step.id} className="flex items-center gap-1 sm:gap-2">
                  {index > 0 ? (
                    <ChevronRight
                      className="mx-0.5 hidden h-3.5 w-3.5 shrink-0 text-muted-foreground/50 sm:block"
                      aria-hidden
                    />
                  ) : null}
                  <button
                    type="button"
                    onClick={() => setActive(index)}
                    aria-current={isActive ? "step" : undefined}
                    className={cn(
                      "inline-flex max-w-full items-center gap-2 rounded-full px-2.5 py-1.5 text-left transition-colors sm:px-3 sm:py-2",
                      isActive
                        ? "bg-primary/15 text-foreground"
                        : "text-muted-foreground hover:bg-white/5 hover:text-foreground",
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold sm:h-7 sm:w-7 sm:text-xs",
                        isActive
                          ? "bg-primary text-primary-foreground"
                          : "bg-white/10 text-muted-foreground",
                      )}
                      aria-hidden
                    >
                      {index + 1}
                    </span>
                    <span className="min-w-0 text-[11px] font-semibold leading-tight sm:text-sm">
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

          <div className="relative overflow-hidden rounded-2xl border border-border/50 bg-card/50 p-1.5 shadow-[0_30px_80px_rgba(0,0,0,0.4)] backdrop-blur-xl">
            <Image
              key={current.id}
              src={image.src}
              alt={current.alt}
              width={image.width}
              height={image.height}
              sizes="(min-width: 1180px) 1140px, 100vw"
              className="h-auto w-full rounded-xl"
            />
            <span className="absolute bottom-4 right-4 rounded-full border border-border/60 bg-background/80 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur">
              {t.home.hero.demoBadge}
            </span>

            <div
              className="absolute inset-x-1.5 bottom-1.5 h-0.5 overflow-hidden rounded-b-xl bg-white/10"
              aria-hidden
            >
              <div
                key={`${current.id}-${paused ? "paused" : "run"}`}
                className={cn(
                  "h-full bg-primary",
                  paused ? "w-full opacity-40" : "animate-path-step-progress",
                )}
              />
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
