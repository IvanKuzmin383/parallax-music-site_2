import { getPublishedArticles } from "@/lib/articles"
import { ArticleCard } from "./components/article-card"
import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Блог",
  description: "Читайте наши последние статьи о музыкальном продюсировании, продвижении и инсайтах индустрии.",
}

// Отключаем кэширование для страницы блога, чтобы всегда показывать актуальные статьи
export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function BlogPage() {
  const articles = await getPublishedArticles()
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://parallaxmusic.ru'

  // BreadcrumbList для навигации
  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Главная',
        item: siteUrl,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Блог',
        item: `${siteUrl}/blog`,
      },
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
              <span className="text-foreground">Наш</span>{" "}
              <span className="text-primary">Блог</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Инсайты, советы и истории о музыкальном продюсировании, продвижении и индустрии
            </p>
          </div>

          {articles.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Статей пока нет. Загляните позже!</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {articles.map((article) => (
                <ArticleCard key={article.id} article={article} />
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
    </>
  )
}
