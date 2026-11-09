"use client"

import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useI18n } from "@/lib/i18n-context"
import { trackGoal } from "@/lib/analytics"

export function HomeFinalCta() {
  const { t } = useI18n()
  const copy = t.home.final

  return (
    <section className="py-16 md:py-24">
      <div className="mx-auto max-w-[1180px] px-4 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-3xl border border-primary/30 bg-gradient-to-br from-primary/25 via-card/60 to-card/40 px-6 py-14 text-center backdrop-blur-xl md:px-12">
          <div className="pointer-events-none absolute -top-24 left-1/2 h-64 w-[36rem] -translate-x-1/2 rounded-full bg-primary/30 blur-3xl" aria-hidden />
          <div className="relative mx-auto max-w-2xl space-y-5">
            <h2 className="text-3xl font-bold tracking-tight md:text-5xl">{copy.title}</h2>
            <p className="text-muted-foreground md:text-lg">{copy.description}</p>
            <div className="flex flex-col items-center justify-center gap-3 pt-2 sm:flex-row">
              <Button size="lg" className="w-full gap-2 px-8 sm:w-auto" asChild>
                <Link
                  href="/cabinet?tab=register"
                  prefetch={false}
                  onClick={() => trackGoal("cta_register_click", { location: "final_cta" })}
                >
                  {copy.ctaPrimary}
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="w-full border-border/70 bg-background/20 px-8 sm:w-auto" asChild>
                <Link href="/pricing">{copy.ctaSecondary}</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
