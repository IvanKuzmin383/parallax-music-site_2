"use client"

import * as AccordionPrimitive from "@radix-ui/react-accordion"
import { Minus, Plus } from "lucide-react"
import { useI18n } from "@/lib/i18n-context"

type FaqItem = {
  id: string
  question: string
  answer: string
}

export function FaqSection() {
  const { t } = useI18n()
  const faqItems = t.aiLanding.faq.items as FaqItem[]

  return (
    <section className="py-20 bg-background">
      <div className="container mx-auto px-4 max-w-5xl">
        <h2 className="text-3xl md:text-5xl font-bold mb-6 text-foreground">{t.aiLanding.faq.title}</h2>
        <p className="text-lg text-muted-foreground mb-8 max-w-3xl">{t.aiLanding.faq.description}</p>
        <AccordionPrimitive.Root type="single" collapsible className="space-y-3">
          {faqItems.map((item) => (
            <AccordionPrimitive.Item
              key={item.id}
              value={item.id}
              className="rounded-2xl border border-border bg-card/60 data-[state=open]:bg-card/80"
            >
              <AccordionPrimitive.Header>
                <AccordionPrimitive.Trigger className="group flex w-full items-center justify-between gap-4 p-5 text-left font-semibold text-base transition-colors hover:bg-muted/30 rounded-2xl [&[data-state=open]]:rounded-b-none">
                  <span>{item.question}</span>
                  <span className="flex size-8 shrink-0 items-center justify-center text-primary">
                    <Plus className="size-4 transition-transform group-data-[state=open]:hidden" aria-hidden />
                    <Minus className="size-4 hidden group-data-[state=open]:block" aria-hidden />
                  </span>
                </AccordionPrimitive.Trigger>
              </AccordionPrimitive.Header>
              <AccordionPrimitive.Content className="overflow-hidden data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
                <p className="px-5 pb-5 pt-0 text-sm text-muted-foreground whitespace-pre-line">{item.answer}</p>
              </AccordionPrimitive.Content>
            </AccordionPrimitive.Item>
          ))}
        </AccordionPrimitive.Root>
      </div>
    </section>
  )
}
