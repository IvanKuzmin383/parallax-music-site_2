"use client"

import { useMemo } from "react"
import { useI18n } from "@/lib/i18n-context"

export function Process() {
  const { t } = useI18n()

  const steps = useMemo(
    () => [
      {
        number: "01",
        description: t.process.steps.discovery.description,
      },
      {
        number: "02",
        description: t.process.steps.strategy.description,
      },
      {
        number: "03",
        description: t.process.steps.execution.description,
      },
      {
        number: "04",
        description: t.process.steps.growth.description,
      },
    ],
    [t]
  )
  return (
    <section id="process" className="py-24 bg-background">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mb-16">
          <h2 className="text-4xl md:text-6xl font-bold mb-6">
            <span className="text-foreground">{t.process.title}</span>{" "}
            <span className="text-primary">{t.process.titleHighlight}</span>
          </h2>
          <p className="text-lg text-muted-foreground text-pretty">{t.process.description}</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((step) => (
            <div key={step.number} className="space-y-4">
              <div className="text-6xl font-bold text-primary opacity-50">{step.number}</div>
              <p className="text-muted-foreground leading-relaxed">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
