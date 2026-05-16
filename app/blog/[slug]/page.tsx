import { getArticleBySlug, getPublishedArticles, getDisplayDate } from "@/lib/articles"
import { ArticleContent } from "../components/article-content"
import { notFound } from "next/navigation"
import { Metadata } from "next"
import { format } from "date-fns"
import { ru } from "date-fns/locale"
import type { Article } from "@/lib/articles"
import Link from "next/link"

// Отключаем статическую генерацию, чтобы новые статьи обрабатывались динамически
export const dynamic = 'force-dynamic'
export const revalidate = 0

interface BlogPostPageProps {
  params: Promise<{ slug: string }>
}

async function getArticle(slug: string): Promise<Article | null> {
  return await getArticleBySlug(slug)
}

function resolveOgImageUrl(ogImage: string | undefined, siteUrl: string, fallback: string): string {
  if (!ogImage) return fallback
  if (ogImage.startsWith("http://") || ogImage.startsWith("https://")) return ogImage
  return `${siteUrl}${ogImage.startsWith("/") ? ogImage : `/${ogImage}`}`
}

// Опционально: генерируем статические параметры для существующих статей (для оптимизации)
// Но с dynamic = 'force-dynamic' это не обязательно
export async function generateStaticParams() {
  try {
    const articles = await getPublishedArticles()
    return articles.map((article) => ({
      slug: article.slug,
    }))
  } catch (error) {
    // Если не удалось загрузить статьи, возвращаем пустой массив
    // Страница все равно будет работать динамически
    console.error('Error generating static params:', error)
    return []
  }
}

export async function generateMetadata({ params }: BlogPostPageProps): Promise<Metadata> {
  const { slug } = await params
  const article = await getArticle(slug)

  if (!article || !article.published) {
    return {
      title: "Статья не найдена",
    }
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://parallaxmusic.ru"
  const defaultOg = `${siteUrl}/music-studio-recording-session-dark-moody-atmosphe.jpg`
  const ogImage = resolveOgImageUrl(article.ogImage, siteUrl, defaultOg)

  return {
    title: article.title,
    description: article.metaDescription || article.excerpt || article.title,
    keywords: article.keywords,
    openGraph: {
      title: article.title,
      description: article.metaDescription || article.excerpt || article.title,
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: article.title,
        },
      ],
      type: "article",
      publishedTime: getDisplayDate(article),
      modifiedTime: article.updatedAt,
      authors: ["Parallax Music"],
      tags: article.tags,
    },
    twitter: {
      card: "summary_large_image",
      title: article.title,
      description: article.metaDescription || article.excerpt || article.title,
      images: [ogImage],
    },
  }
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { slug } = await params
  const article = await getArticle(slug)

  if (!article || !article.published) {
    notFound()
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://parallaxmusic.ru"
  const defaultOg = `${siteUrl}/music-studio-recording-session-dark-moody-atmosphe.jpg`
  const ogImage = resolveOgImageUrl(article.ogImage, siteUrl, defaultOg)

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    description: article.metaDescription || article.excerpt || article.title,
    image: ogImage,
    datePublished: getDisplayDate(article),
    dateModified: article.updatedAt,
    author: {
      "@type": "Organization",
      name: "Parallax Music",
    },
    publisher: {
      "@type": "Organization",
      name: "Parallax Music",
      logo: {
        "@type": "ImageObject",
        url: `${siteUrl}/icon.svg`,
      },
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `${siteUrl}/blog/${article.slug}`,
    },
    keywords: article.keywords.join(", "),
    articleSection: article.category,
  }

  return (
    <main className="min-h-screen bg-background pt-20">
      <article className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <div className="mb-6 space-y-2">
            <Link
              href="/blog"
              className="inline-flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors"
            >
              <span aria-hidden="true">←</span>
              <span>Назад к списку статей</span>
            </Link>

            <nav className="text-sm text-muted-foreground flex flex-wrap items-center gap-1">
              <Link
                href="/blog"
                className="hover:text-primary transition-colors"
              >
                Блог
              </Link>
              <span className="text-muted-foreground/70">/</span>
              <span className="text-foreground line-clamp-1">{article.title}</span>
            </nav>
          </div>

          {/* Превью-обложка */}
          {article.ogImage && (
            <div className="relative w-full aspect-video max-h-[420px] rounded-lg overflow-hidden bg-muted mb-8">
              <img
                src={article.ogImage}
                alt=""
                className="object-cover w-full h-full"
                sizes="(max-width: 1024px) 100vw, 896px"
              />
            </div>
          )}

          {/* Header */}
          <header className="mb-8">
            <div className="flex items-center gap-4 mb-4">
              <span className="text-sm text-muted-foreground bg-muted px-3 py-1 rounded">
                {article.category}
              </span>
              <time className="text-sm text-muted-foreground">
                {format(new Date(getDisplayDate(article)), "d MMMM yyyy", { locale: ru })}
              </time>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">{article.title}</h1>
            {article.excerpt && (
              <p className="text-xl text-muted-foreground mb-6">{article.excerpt}</p>
            )}
            {article.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {article.tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-sm text-muted-foreground bg-muted/50 px-3 py-1 rounded"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </header>

          {/* Content */}
          <div className="prose prose-lg dark:prose-invert max-w-none text-muted-foreground">
            <ArticleContent content={article.content} />
          </div>

          {/* Structured Data */}
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
          />
        </div>
      </article>
    </main>
  )
}
