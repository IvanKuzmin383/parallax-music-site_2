import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { getAllCaseStudies } from "@/data/cases"
import { CaseCard } from "./components/case-card"
import { casesListMetadata } from "@/lib/case-seo"
import { Button } from "@/components/ui/button"
import {
  marketingGlassHoverClass,
  marketingGlassPanelClass,
} from "@/components/marketing/marketing-glass"
import { cn } from "@/lib/utils"

export const metadata = casesListMetadata

export default function CasesPage() {
  const cases = getAllCaseStudies()
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://parallaxmusic.ru"

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Главная", item: siteUrl },
      { "@type": "ListItem", position: 2, name: "Кейсы", item: `${siteUrl}/cases` },
    ],
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />
      <main className="min-h-screen pt-20">
        <div className="container mx-auto px-4 py-12">
          <div className="mx-auto max-w-7xl">
            <div className="mb-12 text-center">
              <h1 className="mb-6 text-4xl font-bold tracking-tight md:text-6xl">
                <span className="text-foreground">Наши</span>{" "}
                <span className="text-primary">кейсы</span>
              </h1>
              <p className="mx-auto mb-8 max-w-2xl text-lg text-muted-foreground">
                Реальные истории артистов: задачи, решения и результаты работы с Parallax Music
              </p>
              <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Button
                  size="lg"
                  className="bg-primary uppercase tracking-wider text-primary-foreground hover:bg-primary/90"
                  asChild
                >
                  <Link href="/promotion" prefetch={false}>
                    Заказать продвижение
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" className="uppercase tracking-wider" asChild>
                  <Link href="/distribution" prefetch={false}>
                    Выпустить трек
                  </Link>
                </Button>
                <Link
                  href="/features"
                  prefetch={false}
                  className={cn(
                    marketingGlassPanelClass,
                    marketingGlassHoverClass,
                    "inline-flex items-center gap-2 px-5 py-3 text-sm font-semibold uppercase tracking-wider"
                  )}
                >
                  Все возможности
                </Link>
              </div>
            </div>

            {cases.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-muted-foreground">Кейсов пока нет. Загляните позже!</p>
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {cases.map((caseStudy) => (
                  <CaseCard key={caseStudy.slug} caseStudy={caseStudy} />
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </>
  )
}
