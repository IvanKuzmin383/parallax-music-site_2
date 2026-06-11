import { getAllCaseStudies } from "@/data/cases"
import { CaseCard } from "./components/case-card"
import { casesListMetadata } from "@/lib/case-seo"

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
      <main className="min-h-screen bg-background pt-20">
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12">
              <h1 className="text-4xl md:text-6xl font-bold mb-6">
                <span className="text-foreground">Наши</span>{" "}
                <span className="text-primary">кейсы</span>
              </h1>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Реальные истории артистов: задачи, решения и результаты работы с Parallax Music
              </p>
            </div>

            {cases.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">Кейсов пока нет. Загляните позже!</p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
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
