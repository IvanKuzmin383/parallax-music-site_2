"use client"

import Link from "next/link"
import { useMemo } from "react"
import { Card } from "@/components/ui/card"
import { Music, ShieldCheck, TrendingUp, Headset, ArrowRight } from "lucide-react"
import { useI18n } from "@/lib/i18n-context"

type ServiceItem = {
  icon: typeof Music
  title: string
  description: string
  href?: string
}

export function Services() {
  const { t } = useI18n()

  const services = useMemo<ServiceItem[]>(
    () => [
      {
        icon: Music,
        title: t.services.labelServices.title,
        description: t.services.labelServices.description,
      },
      {
        icon: ShieldCheck,
        title: t.services.digitalMarketing.title,
        description: t.services.digitalMarketing.description,
      },
      {
        icon: TrendingUp,
        title: t.services.radioPromotion.title,
        description: t.services.radioPromotion.description,
        href: (t.services.radioPromotion as { href?: string }).href,
      },
      {
        icon: Headset,
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
          {services.map((service) => {
            const content = (
              <>
                <div className="mb-4">
                  <service.icon className="h-10 w-10 text-primary group-hover:scale-110 transition-transform" />
                </div>
                <h3 className="text-xl font-bold mb-3 uppercase tracking-wide flex items-center gap-2">
                  {service.title}
                  {service.href ? <ArrowRight className="h-4 w-4 opacity-60" aria-hidden /> : null}
                </h3>
                <p className="text-muted-foreground leading-relaxed">{service.description}</p>
              </>
            )

            if (service.href) {
              return (
                <Card
                  key={service.title}
                  className="p-6 bg-card border-border hover:border-primary transition-all duration-300 group"
                >
                  <Link href={service.href} className="block h-full focus-visible:outline-none">
                    {content}
                  </Link>
                </Card>
              )
            }

            return (
              <Card
                key={service.title}
                className="p-6 bg-card border-border hover:border-primary transition-all duration-300 group"
              >
                {content}
              </Card>
            )
          })}
        </div>
      </div>
    </section>
  )
}
