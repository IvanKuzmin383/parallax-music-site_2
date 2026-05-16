import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getArticleById, updateArticle, deleteArticle, generateSlug } from '@/lib/articles'
import { getAdminToken, verifySession } from '@/lib/auth'

const updateArticleSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  content: z.string().min(1).optional(),
  excerpt: z.string().max(500).optional(),
  metaDescription: z.string().max(300).optional(),
  keywords: z.array(z.string()).optional(),
  ogImage: z
    .string()
    .refine(
      (v) =>
        !v ||
        v.startsWith('http://') ||
        v.startsWith('https://') ||
        (v.startsWith('/blog/') && v.length > 6),
      'OG image: full URL or path /blog/filename'
    )
    .optional()
    .or(z.literal('')),
  category: z.string().min(1).max(50).optional(),
  tags: z.array(z.string()).optional(),
  published: z.boolean().optional(),
  slug: z.string().optional(),
  publishedAt: z.string().optional().or(z.literal('')),
}).partial()

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const article = await getArticleById(id)
    
    if (!article) {
      return NextResponse.json(
        { error: 'Article not found' },
        { status: 404 }
      )
    }
    
    if (!article.published) {
      const token = getAdminToken(request)
      if (!verifySession(token)) {
        return NextResponse.json(
          { error: 'Article not found' },
          { status: 404 }
        )
      }
    }
    
    return NextResponse.json({ article })
  } catch (error) {
    console.error('Error fetching article:', error)
    return NextResponse.json(
      { error: 'Failed to fetch article' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = getAdminToken(request)
    if (!verifySession(token)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { id } = await params
    const body = await request.json()
    
    // Убеждаемся, что published правильно обрабатывается (даже если false)
    if ('published' in body) {
      body.published = body.published === true || body.published === 'true'
    }
    if ('publishedAt' in body && (body.publishedAt === '' || body.publishedAt === null)) {
      body.publishedAt = undefined
    }

    const validatedData = updateArticleSchema.parse(body)
    
    // Если обновляется slug, проверяем уникальность
    if (validatedData.slug) {
      const { getArticleBySlug } = await import('@/lib/articles')
      const existingArticle = await getArticleBySlug(validatedData.slug)
      if (existingArticle && existingArticle.id !== id) {
        return NextResponse.json(
          { error: 'Article with this slug already exists' },
          { status: 400 }
        )
      }
    }
    
    // Если обновляется title и slug не указан, генерируем новый slug
    if (validatedData.title && !validatedData.slug) {
      validatedData.slug = generateSlug(validatedData.title)
      // Проверяем уникальность сгенерированного slug
      const { getArticleBySlug } = await import('@/lib/articles')
      const existingArticle = await getArticleBySlug(validatedData.slug)
      if (existingArticle && existingArticle.id !== id) {
        // Добавляем timestamp к slug для уникальности
        validatedData.slug = `${validatedData.slug}-${Date.now()}`
      }
    }
    
    const updatedArticle = await updateArticle(id, validatedData)
    
    if (!updatedArticle) {
      return NextResponse.json(
        { error: 'Article not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json({ article: updatedArticle })
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
    
    console.error('Error updating article:', error)
    return NextResponse.json(
      { error: 'Failed to update article' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = getAdminToken(request)
    if (!verifySession(token)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { id } = await params
    const deleted = await deleteArticle(id)
    
    if (!deleted) {
      return NextResponse.json(
        { error: 'Article not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting article:', error)
    return NextResponse.json(
      { error: 'Failed to delete article' },
      { status: 500 }
    )
  }
}
