import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getAllArticles, createArticle, generateSlug, Article } from '@/lib/articles'
import { getAdminToken, verifySession } from '@/lib/auth'

const articleSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title must be less than 200 characters'),
  content: z.string().min(1, 'Content is required'),
  excerpt: z.string().max(500, 'Excerpt must be less than 500 characters').optional().default(''),
  metaDescription: z.string().max(300, 'Meta description must be less than 300 characters').optional().default(''),
  keywords: z.array(z.string()).optional().default([]),
  ogImage: z
    .string()
    .optional()
    .refine(
      (v) =>
        !v ||
        v.startsWith('http://') ||
        v.startsWith('https://') ||
        (v.startsWith('/blog/') && v.length > 6),
      'OG image: full URL or path /blog/filename'
    )
    .or(z.literal('')),
  category: z.string().min(1, 'Category is required').max(50, 'Category must be less than 50 characters'),
  tags: z.array(z.string()).optional().default([]),
  published: z.boolean().optional().default(false),
  slug: z.string().optional(), // Если не указан, будет сгенерирован из title
  publishedAt: z.string().optional().or(z.literal('')), // Дата публикации (YYYY-MM-DD или ISO). Пусто = использовать createdAt.
})

export async function GET(request: NextRequest) {
  try {
    // Публичный доступ - возвращаем только опубликованные статьи
    const url = new URL(request.url)
    const includeUnpublished = url.searchParams.get('includeUnpublished') === 'true'
    
    if (includeUnpublished) {
      const token = getAdminToken(request)
      if (!verifySession(token)) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        )
      }
      const articles = await getAllArticles()
      return NextResponse.json({ articles })
    }
    
    // Публичный доступ - только опубликованные
    const { getPublishedArticles } = await import('@/lib/articles')
    const articles = await getPublishedArticles()
    return NextResponse.json({ articles })
  } catch (error) {
    console.error('Error fetching articles:', error)
    return NextResponse.json(
      { error: 'Failed to fetch articles' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = getAdminToken(request)
    if (!verifySession(token)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const validatedData = articleSchema.parse(body)
    
    // Генерируем slug, если не указан
    const slug = validatedData.slug || generateSlug(validatedData.title)
    
    // Проверяем уникальность slug
    const existingArticle = await import('@/lib/articles').then(m => m.getArticleBySlug(slug))
    if (existingArticle) {
      return NextResponse.json(
        { error: 'Article with this slug already exists' },
        { status: 400 }
      )
    }
    
    const newArticle = await createArticle({
      ...validatedData,
      slug,
      publishedAt: validatedData.publishedAt?.trim() || undefined,
    })
    
    return NextResponse.json(
      { article: newArticle },
      { status: 201 }
    )
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          errors: error.errors,
        },
        { status: 400 }
      )
    }
    
    console.error('Error creating article:', error)
    return NextResponse.json(
      { error: 'Failed to create article' },
      { status: 500 }
    )
  }
}
