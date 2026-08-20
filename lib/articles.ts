import crypto from "crypto"
import { query, queryOne, execute, withTransaction, clientExecute } from "./database"

export interface Article {
  id: string
  slug: string
  title: string
  content: string // Markdown
  excerpt: string
  metaDescription: string
  keywords: string[]
  /** Превью в списке блога (обычно 1:1) */
  ogImage?: string
  /** Обложка на странице статьи (16:9) */
  heroImage?: string
  category: string
  tags: string[]
  published: boolean
  /** Дата публикации (отображается пользователям). Если не задана - используется createdAt. */
  publishedAt?: string
  createdAt: string
  updatedAt: string
}

interface ArticleRow {
  id: string
  slug: string
  title: string
  content: string | null
  excerpt: string | null
  meta_description: string | null
  keywords: string
  og_image: string | null
  hero_image?: string | null
  category: string | null
  tags: string
  published: boolean
  published_at: string | null
  created_at: string
  updated_at: string
}

function rowToArticle(row: ArticleRow): Article {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    content: row.content ?? "",
    excerpt: row.excerpt ?? "",
    metaDescription: row.meta_description ?? "",
    keywords: parseJsonArray(row.keywords),
    ogImage: row.og_image ?? undefined,
    heroImage: row.hero_image ?? undefined,
    category: row.category ?? "",
    tags: parseJsonArray(row.tags),
    published: Boolean(row.published),
    publishedAt: row.published_at ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function parseJsonArray(raw: string): string[] {
  if (!raw || !raw.trim()) return []
  try {
    const a = JSON.parse(raw)
    return Array.isArray(a) ? a : []
  } catch {
    return []
  }
}

export async function getAllArticles(): Promise<Article[]> {
  const rows = await query<ArticleRow>("SELECT * FROM articles")
  return rows.map(rowToArticle)
}

export async function getArticleById(id: string): Promise<Article | null> {
  const row = await queryOne<ArticleRow>("SELECT * FROM articles WHERE id = ?", [id])
  return row ? rowToArticle(row) : null
}

export async function getArticleBySlug(slug: string): Promise<Article | null> {
  const row = await queryOne<ArticleRow>("SELECT * FROM articles WHERE slug = ?", [slug])
  return row ? rowToArticle(row) : null
}

/** Дата для отображения и сортировки: publishedAt при наличии, иначе createdAt. */
export function getDisplayDate(article: Article): string {
  return article.publishedAt ?? article.createdAt
}

export async function getPublishedArticles(): Promise<Article[]> {
  const articles = await getAllArticles()
  const published = articles
    .filter((article) => article.published === true)
    .sort((a, b) => new Date(getDisplayDate(b)).getTime() - new Date(getDisplayDate(a)).getTime())

  if (process.env.NODE_ENV === "development") {
    console.log(`[getPublishedArticles] Total articles: ${articles.length}, Published: ${published.length}`)
  }

  return published
}

const INSERT_ARTICLE_SQL = `
  INSERT INTO articles (id, slug, title, content, excerpt, meta_description, keywords, og_image, hero_image, category, tags, published, published_at, created_at, updated_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT (id) DO UPDATE SET
    slug = EXCLUDED.slug,
    title = EXCLUDED.title,
    content = EXCLUDED.content,
    excerpt = EXCLUDED.excerpt,
    meta_description = EXCLUDED.meta_description,
    keywords = EXCLUDED.keywords,
    og_image = EXCLUDED.og_image,
    hero_image = EXCLUDED.hero_image,
    category = EXCLUDED.category,
    tags = EXCLUDED.tags,
    published = EXCLUDED.published,
    published_at = EXCLUDED.published_at,
    created_at = EXCLUDED.created_at,
    updated_at = EXCLUDED.updated_at
`

function articleInsertParams(a: Article): unknown[] {
  return [
    a.id,
    a.slug,
    a.title,
    a.content ?? null,
    a.excerpt ?? null,
    a.metaDescription ?? null,
    JSON.stringify(a.keywords ?? []),
    a.ogImage ?? null,
    a.heroImage ?? null,
    a.category ?? null,
    JSON.stringify(a.tags ?? []),
    a.published,
    a.publishedAt ?? null,
    a.createdAt,
    a.updatedAt,
  ]
}

export async function saveArticles(articles: Article[]): Promise<void> {
  await withTransaction(async (client) => {
    await clientExecute(client, "DELETE FROM articles")
    for (const a of articles) {
      await clientExecute(client, INSERT_ARTICLE_SQL, articleInsertParams(a))
    }
  })
}

export async function createArticle(
  articleData: Omit<Article, "id" | "createdAt" | "updatedAt">
): Promise<Article> {
  const now = new Date().toISOString()
  const newArticle: Article = {
    ...articleData,
    publishedAt: articleData.publishedAt || undefined,
    id: crypto.randomUUID(),
    createdAt: now,
    updatedAt: now,
  }
  await execute(
    `
    INSERT INTO articles (id, slug, title, content, excerpt, meta_description, keywords, og_image, hero_image, category, tags, published, published_at, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `,
    articleInsertParams(newArticle)
  )
  return newArticle
}

export async function updateArticle(
  id: string,
  articleData: Partial<Omit<Article, "id" | "createdAt">>
): Promise<Article | null> {
  const current = await getArticleById(id)
  if (!current) return null

  if (process.env.NODE_ENV === "development") {
    console.log(`[updateArticle] Updating article ${id}:`, { oldPublished: current.published, newPublished: articleData.published })
  }

  const updated: Article = {
    ...current,
    ...articleData,
    publishedAt: articleData.publishedAt !== undefined ? (articleData.publishedAt || undefined) : current.publishedAt,
    updatedAt: new Date().toISOString(),
  }

  await execute(
    `
    UPDATE articles SET slug = ?, title = ?, content = ?, excerpt = ?, meta_description = ?, keywords = ?, og_image = ?, hero_image = ?, category = ?, tags = ?, published = ?, published_at = ?, updated_at = ?
    WHERE id = ?
  `,
    [
      updated.slug,
      updated.title,
      updated.content ?? null,
      updated.excerpt ?? null,
      updated.metaDescription ?? null,
      JSON.stringify(updated.keywords ?? []),
      updated.ogImage ?? null,
      updated.heroImage ?? null,
      updated.category ?? null,
      JSON.stringify(updated.tags ?? []),
      updated.published,
      updated.publishedAt ?? null,
      updated.updatedAt,
      id,
    ]
  )
  return updated
}

export async function deleteArticle(id: string): Promise<boolean> {
  const changes = await execute("DELETE FROM articles WHERE id = ?", [id])
  return changes > 0
}

export function generateSlug(title: string): string {
  const transliterationMap: Record<string, string> = {
    а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "yo",
    ж: "zh", з: "z", и: "i", й: "y", к: "k", л: "l", м: "m",
    н: "n", о: "o", п: "p", р: "r", с: "s", т: "t", у: "u",
    ф: "f", х: "h", ц: "ts", ч: "ch", ш: "sh", щ: "sch",
    ъ: "", ы: "y", ь: "", э: "e", ю: "yu", я: "ya",
    А: "A", Б: "B", В: "V", Г: "G", Д: "D", Е: "E", Ё: "Yo",
    Ж: "Zh", З: "Z", И: "I", Й: "Y", К: "K", Л: "L", М: "M",
    Н: "N", О: "O", П: "P", Р: "R", С: "S", Т: "T", У: "U",
    Ф: "F", Х: "H", Ц: "Ts", Ч: "Ch", Ш: "Sh", Щ: "Sch",
    Ъ: "", Ы: "Y", Ь: "", Э: "E", Ю: "Yu", Я: "Ya",
  }

  let slug = title
    .toLowerCase()
    .split("")
    .map((char) => transliterationMap[char] || char)
    .join("")
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "")

  if (!slug) {
    slug = "article-" + Date.now().toString(36)
  }

  return slug
}
