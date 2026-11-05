"use client"

import { useMemo } from "react"
import { useI18n } from "@/lib/i18n-context"

export function Process() {
  const { t } = useI18n()

  const steps = useMemo(
    () => [
      {
        number: "01",
        title: t.process.steps.discovery.title,
        description: t.process.steps.discovery.description,
      },
      {
        number: "02",
        title: t.process.steps.strategy.title,
        description: t.process.steps.strategy.description,
      },
      {
        number: "03",
        title: t.process.steps.execution.title,
        description: t.process.steps.execution.description,
      },
      {
        number: "04",
        title: t.process.steps.growth.title,
        description: t.process.steps.growth.description,
      },
    ],
    [t]
  )

  return (
    <section id="process" className="border-t border-border/40 py-20 md:py-24">
      <div className="container mx-auto px-4">
        <div className="mb-12 max-w-3xl md:mb-16">
          <h2 className="mb-6 text-4xl font-bold tracking-tight md:text-5xl lg:text-6xl">
            <span className="text-foreground">{t.process.title}</span>{" "}
            <span className="text-primary">{t.process.titleHighlight}</span>
          </h2>
          <p className="text-lg text-muted-foreground text-pretty">{t.process.description}</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((step) => (
            <div key={step.number} className="space-y-4">
              <div className="text-6xl font-bold text-primary opacity-50">{step.number}</div>
              <h3 className="text-2xl font-bold uppercase tracking-wide">{step.title}</h3>
              <p className="text-muted-foreground leading-relaxed">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
