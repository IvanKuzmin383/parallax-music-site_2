import Link from "next/link"
import { getFeaturedCaseStudies } from "@/data/cases"
import { CaseCard } from "@/app/cases/components/case-card"
import { Button } from "@/components/ui/button"

export function CaseStudies() {
  const cases = getFeaturedCaseStudies(6)
  if (cases.length === 0) return null

  return (
    <section id="cases" className="py-24 border-y border-border bg-muted/20">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-12">
          <div className="max-w-3xl">
            <h2 className="text-4xl md:text-6xl font-bold mb-3">
              <span className="text-foreground">Наши</span>{" "}
              <span className="text-primary">кейсы</span>
            </h2>
            <p className="text-lg text-muted-foreground text-pretty">
              Истории артистов, с которыми мы работали: задачи, решения и измеримые результаты
            </p>
          </div>
          <Button asChild variant="outline" className="uppercase tracking-wider shrink-0">
            <Link href="/cases">Все кейсы</Link>
          </Button>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {cases.map((caseStudy) => (
            <CaseCard key={caseStudy.slug} caseStudy={caseStudy} />
          ))}
        </div>
      </div>
    </section>
  )
}
