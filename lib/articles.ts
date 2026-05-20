import crypto from "crypto"
import { getDb } from "./db"

export interface Article {
  id: string
  slug: string
  title: string
  content: string // Markdown
  excerpt: string
  metaDescription: string
  keywords: string[]
  ogImage?: string
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
  category: string | null
  tags: string
  published: number
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
  const db = getDb()
  const rows = db.prepare("SELECT * FROM articles").all() as ArticleRow[]
  return rows.map(rowToArticle)
}

export async function getArticleById(id: string): Promise<Article | null> {
  const db = getDb()
  const row = db.prepare("SELECT * FROM articles WHERE id = ?").get(id) as ArticleRow | undefined
  return row ? rowToArticle(row) : null
}

export async function getArticleBySlug(slug: string): Promise<Article | null> {
  const db = getDb()
  const row = db.prepare("SELECT * FROM articles WHERE slug = ?").get(slug) as ArticleRow | undefined
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

export async function saveArticles(articles: Article[]): Promise<void> {
  const db = getDb()
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO articles (id, slug, title, content, excerpt, meta_description, keywords, og_image, category, tags, published, published_at, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)
  const run = db.transaction(() => {
    db.prepare("DELETE FROM articles").run()
    for (const a of articles) {
      stmt.run(
        a.id,
        a.slug,
        a.title,
        a.content ?? null,
        a.excerpt ?? null,
        a.metaDescription ?? null,
        JSON.stringify(a.keywords ?? []),
        a.ogImage ?? null,
        a.category ?? null,
        JSON.stringify(a.tags ?? []),
        a.published ? 1 : 0,
        a.publishedAt ?? null,
        a.createdAt,
        a.updatedAt
      )
    }
  })
  run()
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
  const db = getDb()
  db.prepare(`
    INSERT INTO articles (id, slug, title, content, excerpt, meta_description, keywords, og_image, category, tags, published, published_at, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    newArticle.id,
    newArticle.slug,
    newArticle.title,
    newArticle.content ?? null,
    newArticle.excerpt ?? null,
    newArticle.metaDescription ?? null,
    JSON.stringify(newArticle.keywords ?? []),
    newArticle.ogImage ?? null,
    newArticle.category ?? null,
    JSON.stringify(newArticle.tags ?? []),
    newArticle.published ? 1 : 0,
    newArticle.publishedAt ?? null,
    newArticle.createdAt,
    newArticle.updatedAt
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

  const db = getDb()
  db.prepare(`
    UPDATE articles SET slug = ?, title = ?, content = ?, excerpt = ?, meta_description = ?, keywords = ?, og_image = ?, category = ?, tags = ?, published = ?, published_at = ?, updated_at = ?
    WHERE id = ?
  `).run(
    updated.slug,
    updated.title,
    updated.content ?? null,
    updated.excerpt ?? null,
    updated.metaDescription ?? null,
    JSON.stringify(updated.keywords ?? []),
    updated.ogImage ?? null,
    updated.category ?? null,
    JSON.stringify(updated.tags ?? []),
    updated.published ? 1 : 0,
    updated.publishedAt ?? null,
    updated.updatedAt,
    id
  )
  return updated
}

export async function deleteArticle(id: string): Promise<boolean> {
  const db = getDb()
  const result = db.prepare("DELETE FROM articles WHERE id = ?").run(id)
  return result.changes > 0
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
