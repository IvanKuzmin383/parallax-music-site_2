"use client"

import Link from "next/link"
import { ArrowUpRight } from "lucide-react"
import { marketingGlassHoverClass, marketingGlassPanelClass } from "@/components/marketing/marketing-glass"
import { cabinetAuthHref } from "@/components/cabinet/shared/service-landing-mode"
import { trackGoal } from "@/lib/analytics"
import { getToolItem, type ToolItem } from "@/components/cabinet/tools/tools-catalog"
import { useI18n } from "@/lib/i18n-context"
import { cn } from "@/lib/utils"

const FREE_TOOLS = ["mastering", "slowed-reverb", "snippet"]
  .map(getToolItem)
  .filter((item): item is ToolItem => Boolean(item))

export function HomeFreeTools() {
  const { t } = useI18n()
  const copy = t.home.free

  return (
    <section className="py-16 md:py-24">
      <div className="mx-auto max-w-[1180px] px-4 sm:px-6 lg:px-8">
        <div className="mx-auto mb-10 max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight md:text-5xl">
            {copy.title} <span className="text-primary">{copy.titleHighlight}</span>
          </h2>
          <p className="mt-4 text-muted-foreground md:text-lg">{copy.description}</p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {FREE_TOOLS.map((tool) => {
            const Icon = tool.icon
            return (
              <Link
                key={tool.id}
                href={cabinetAuthHref(tool.href, true)}
                prefetch={false}
                onClick={() => trackGoal("cta_register_click", { location: "free_tools", tool: tool.id })}
                className={cn(marketingGlassPanelClass, marketingGlassHoverClass, "group flex flex-col gap-4 p-6")}
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/15 text-primary">
                  <Icon className="h-5 w-5" aria-hidden />
                </span>
                <div className="flex-1 space-y-1.5">
                  <h3 className="text-lg font-semibold">{tool.label}</h3>
                  <p className="text-sm text-muted-foreground">{tool.description}</p>
                </div>
                <span className="inline-flex items-center gap-1 text-sm font-medium text-primary">
                  {copy.cta}
                  <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden />
                </span>
              </Link>
            )
          })}
        </div>
      </div>
    </section>
  )
}
