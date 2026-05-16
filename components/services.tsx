"use client"

import { useMemo } from "react"
import { Card } from "@/components/ui/card"
import { Music, TrendingUp, Radio, Users } from "lucide-react"
import { useI18n } from "@/lib/i18n-context"

export function Services() {
  const { t } = useI18n()

  const services = useMemo(
    () => [
      {
        icon: Music,
        title: t.services.labelServices.title,
        description: t.services.labelServices.description,
      },
      {
        icon: TrendingUp,
        title: t.services.digitalMarketing.title,
        description: t.services.digitalMarketing.description,
      },
      {
        icon: Radio,
        title: t.services.radioPromotion.title,
        description: t.services.radioPromotion.description,
      },
      {
        icon: Users,
        title: t.services.brandPartnerships.title,
        description: t.services.brandPartnerships.description,
      },
    ],
    [t]
  )
  return (
    <section id="services" className="py-24 bg-background">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mb-16">
          <h2 className="text-4xl md:text-6xl font-bold mb-6">
            <span className="text-foreground">{t.services.title}</span>{" "}
            <span className="text-primary">{t.services.titleHighlight}</span>
          </h2>
          <p className="text-lg text-muted-foreground text-pretty">{t.services.description}</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {services.map((service) => (
            <Card
              key={service.title}
              className="p-6 bg-card border-border hover:border-primary transition-all duration-300 group"
            >
              <div className="mb-4">
                <service.icon className="h-10 w-10 text-primary group-hover:scale-110 transition-transform" />
              </div>
              <h3 className="text-xl font-bold mb-3 uppercase tracking-wide">{service.title}</h3>
              <p className="text-muted-foreground leading-relaxed">{service.description}</p>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
