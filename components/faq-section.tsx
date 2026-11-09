"use client"

import * as AccordionPrimitive from "@radix-ui/react-accordion"
import { Minus, Plus } from "lucide-react"
import { useI18n } from "@/lib/i18n-context"

type FaqItem = {
  id: string
  question: string
  answer: string
}

type FaqGroup = {
  title: string
  items: FaqItem[]
}

function FaqAccordion({ items }: { items: FaqItem[] }) {
  return (
    <AccordionPrimitive.Root type="single" collapsible className="space-y-3">
      {items.map((item) => (
        <AccordionPrimitive.Item
          key={item.id}
          value={item.id}
          className="rounded-2xl border border-border bg-card/60 data-[state=open]:bg-card/80"
        >
          <AccordionPrimitive.Header>
            <AccordionPrimitive.Trigger className="group flex w-full items-center justify-between gap-4 rounded-2xl p-5 text-left text-base font-semibold transition-colors hover:bg-muted/30 [&[data-state=open]]:rounded-b-none">
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
  )
}

export function FaqSection() {
  const { t } = useI18n()
  const homeFaq = t.home?.faq as
    | { title: string; description: string; groups?: FaqGroup[]; items?: FaqItem[] }
    | undefined
  const fallback = t.aiLanding.faq
  const title = homeFaq?.title ?? fallback.title
  const description = homeFaq?.description ?? fallback.description
  const groups = homeFaq?.groups
  const flatItems = (homeFaq?.items ?? fallback.items) as FaqItem[]

  return (
    <section className="py-20">
      <div className="container mx-auto max-w-5xl px-4">
        <h2 className="mb-6 text-3xl font-bold text-foreground md:text-5xl">{title}</h2>
        <p className="mb-8 max-w-3xl text-lg text-muted-foreground">{description}</p>
        {groups && groups.length > 0 ? (
          <div className="grid gap-10 md:grid-cols-2">
            {groups.map((group) => (
              <div key={group.title}>
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-primary">{group.title}</h3>
                <FaqAccordion items={group.items} />
              </div>
            ))}
          </div>
        ) : (
          <FaqAccordion items={flatItems} />
        )}
      </div>
    </section>
  )
}
