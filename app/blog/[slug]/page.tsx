import { getArticleBySlug, getPublishedArticles, getDisplayDate } from "@/lib/articles"
import { ArticleContent } from "../components/article-content"
import { notFound } from "next/navigation"
import { Metadata } from "next"
import { format } from "date-fns"
import { ru } from "date-fns/locale"
import type { Article } from "@/lib/articles"
import Link from "next/link"
import { getHeroBackgroundOgUrl } from "@/lib/hero-background"

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
  const defaultOg = getHeroBackgroundOgUrl(siteUrl)
  // Для соцсетей предпочтительна 16:9 обложка страницы
  const ogImage = resolveOgImageUrl(article.heroImage || article.ogImage, siteUrl, defaultOg)

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
  const defaultOg = getHeroBackgroundOgUrl(siteUrl)
  // Для соцсетей предпочтительна 16:9 обложка страницы
  const ogImage = resolveOgImageUrl(article.heroImage || article.ogImage, siteUrl, defaultOg)

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
    <main id="main-content" className="min-h-screen">
      <article className="mx-auto w-full max-w-[860px] px-4 pb-20 pt-28 sm:px-6 md:pt-32 lg:px-8">
        <div className="mb-8 space-y-2">
          <Link
            href="/blog"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-primary"
          >
            <span aria-hidden="true">←</span>
            <span>Назад к списку статей</span>
          </Link>

          <nav className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
            <Link href="/blog" className="transition-colors hover:text-primary">
              Блог
            </Link>
            <span className="text-muted-foreground/70">/</span>
            <span className="line-clamp-1 text-foreground">{article.title}</span>
          </nav>
        </div>

        {(article.heroImage || article.ogImage) && (
          <div className="relative mb-8 aspect-video max-h-[420px] w-full overflow-hidden rounded-2xl border border-border/40 bg-muted/30">
            <img
              src={article.heroImage || article.ogImage}
              alt=""
              className="h-full w-full object-cover"
              sizes="(max-width: 1024px) 100vw, 860px"
            />
          </div>
        )}

        <header className="mb-8 space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full border border-border/60 px-3 py-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {article.category}
            </span>
            <time className="text-sm text-muted-foreground">
              {format(new Date(getDisplayDate(article)), "d MMMM yyyy", { locale: ru })}
            </time>
          </div>
          <h1 className="text-[2rem] font-bold leading-[1.1] tracking-tight sm:text-4xl md:text-5xl">
            {article.title}
          </h1>
          {article.excerpt ? (
            <p className="text-lg leading-relaxed text-muted-foreground md:text-xl">
              {article.excerpt}
            </p>
          ) : null}
          {article.tags.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {article.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-md bg-white/5 px-3 py-1 text-sm text-muted-foreground"
                >
                  #{tag}
                </span>
              ))}
            </div>
          ) : null}
        </header>

        <div className="prose prose-lg dark:prose-invert max-w-none text-muted-foreground">
          <ArticleContent content={article.content} />
        </div>

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </article>
    </main>
  )
}
