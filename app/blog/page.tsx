import { getPublishedArticles } from "@/lib/articles"
import { ArticleCard } from "./components/article-card"
import type { Metadata } from "next"
import { ErrorBoundary } from "@/components/error-boundary"

export const metadata: Metadata = {
  title: "Блог",
  description:
    "Инсайты, советы и истории о дистрибуции музыки, продвижении и индустрии - блог Parallax Music.",
}

export const dynamic = "force-dynamic"
export const revalidate = 0

export default async function BlogPage() {
  const articles = await getPublishedArticles()
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://parallaxmusic.ru"

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Главная",
        item: siteUrl,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Блог",
        item: `${siteUrl}/blog`,
      },
    ],
  }

  return (
    <ErrorBoundary>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />
      <main id="main-content" className="min-h-screen">
        <div className="mx-auto w-full max-w-[1180px] space-y-10 px-4 pb-20 pt-28 sm:px-6 md:pt-32 lg:px-8">
          <header className="max-w-3xl space-y-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Блог
            </p>
            <h1 className="text-[2.15rem] font-bold leading-[1.1] tracking-tight sm:text-[2.75rem] md:text-[3.25rem]">
              Инсайты и истории <span className="text-primary">индустрии</span>
            </h1>
            <p className="text-[15px] leading-relaxed text-muted-foreground md:text-base">
              Дистрибуция, продвижение и кабинет артиста - коротко и по делу
            </p>
          </header>

          {articles.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-muted-foreground">Статей пока нет. Загляните позже!</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {articles.map((article) => (
                <ArticleCard key={article.id} article={article} />
              ))}
            </div>
          )}
        </div>
      </main>
    </ErrorBoundary>
  )
}
