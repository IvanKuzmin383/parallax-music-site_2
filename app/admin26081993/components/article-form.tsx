"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form"
import { toast } from "sonner"
import { Article } from "@/lib/articles"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

const articleFormSchema = z.object({
  title: z.string().min(1, "Заголовок обязателен").max(200, "Заголовок должен быть менее 200 символов"),
  slug: z.string().optional(),
  content: z.string().min(1, "Содержание обязательно"),
  excerpt: z.string().max(500, "Краткое описание должно быть менее 500 символов").optional().default(""),
  metaDescription: z.string().max(300, "Мета-описание должно быть менее 300 символов").optional().default(""),
  keywords: z.string().optional().default(""), // Будет преобразовано в массив
  ogImage: z
    .string()
    .optional()
    .refine(
      (v) =>
        !v ||
        v.startsWith("http://") ||
        v.startsWith("https://") ||
        /^[a-zA-Z0-9._\-\/]+$/.test(v.trim()),
      "Укажите имя файла из каталога blog (например cover.jpg) или полный URL"
    )
    .transform((v) => v?.trim() ?? ""),
  category: z.string().min(1, "Категория обязательна").max(50, "Категория должна быть менее 50 символов"),
  tags: z.string().optional().default(""), // Будет преобразовано в массив
  published: z.boolean().optional().default(false),
  publishedAt: z.string().optional().default(""), // Дата публикации (YYYY-MM-DD). Пусто = дата создания.
})

export type ArticleFormValues = z.infer<typeof articleFormSchema>

// Тип для данных, отправляемых в API (с массивами вместо строк)
export type ArticleApiData = Omit<ArticleFormValues, 'keywords' | 'tags' | 'publishedAt'> & {
  keywords: string[]
  tags: string[]
  publishedAt?: string
}

interface ArticleFormProps {
  article?: Article
  onSubmit: (data: ArticleApiData) => Promise<void>
  onCancel?: () => void
}

export function ArticleForm({ article, onSubmit, onCancel }: ArticleFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<ArticleFormValues>({
    resolver: zodResolver(articleFormSchema),
    defaultValues: {
      title: article?.title || "",
      slug: article?.slug || "",
      content: article?.content || "",
      excerpt: article?.excerpt || "",
      metaDescription: article?.metaDescription || "",
      keywords: article?.keywords?.join(", ") || "",
      ogImage: article?.ogImage?.startsWith("/blog/")
        ? article.ogImage.replace(/^\/blog\/?/, "")
        : article?.ogImage || "",
      category: article?.category || "",
      tags: article?.tags?.join(", ") || "",
      published: article?.published || false,
      publishedAt: article?.publishedAt ? article.publishedAt.slice(0, 10) : "",
    },
  })

  const handleSubmit = async (data: ArticleFormValues) => {
    setIsSubmitting(true)
    try {
      const rawDate = (data.publishedAt ?? "").trim()
      // Имя файла из public/blog → сохраняем как /blog/имя-файла
      let ogImage = (data.ogImage ?? "").trim()
      if (ogImage && !ogImage.startsWith("http://") && !ogImage.startsWith("https://")) {
        const name = ogImage.replace(/^\/?blog\/?/i, "")
        ogImage = name ? `/blog/${name}` : ""
      }
      const formattedData: ArticleApiData = {
        ...data,
        ogImage,
        keywords: data.keywords
          ? data.keywords.split(",").map((k) => k.trim()).filter(Boolean)
          : [],
        tags: data.tags
          ? data.tags.split(",").map((t) => t.trim()).filter(Boolean)
          : [],
        publishedAt: article ? (rawDate || "") : (rawDate || undefined),
      }
      await onSubmit(formattedData)
    } catch (error) {
      console.error("Form submission error:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Заголовок *</FormLabel>
              <FormControl>
                <Input placeholder="Заголовок статьи" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="slug"
          render={({ field }) => (
            <FormItem>
              <FormLabel>URL-адрес (Slug)</FormLabel>
              <FormControl>
                <Input placeholder="url-stati (автоматически, если пусто)" {...field} />
              </FormControl>
              <FormDescription>
                URL-дружественная версия заголовка. Оставьте пустым для автоматической генерации из заголовка.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="category"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Категория *</FormLabel>
              <FormControl>
                <Input placeholder="Например: Музыка, Продюсирование, Маркетинг" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="excerpt"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Краткое описание</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Краткое описание статьи (максимум 500 символов)"
                  rows={3}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="content"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Содержание (Markdown) *</FormLabel>
              <FormControl>
                <Tabs defaultValue="write" className="w-full">
                  <TabsList>
                    <TabsTrigger value="write">Редактор</TabsTrigger>
                    <TabsTrigger value="preview">Предпросмотр</TabsTrigger>
                  </TabsList>
                  <TabsContent value="write" className="mt-2">
                    <Textarea
                      placeholder="Напишите вашу статью в формате Markdown..."
                      rows={20}
                      className="font-mono text-sm"
                      {...field}
                    />
                  </TabsContent>
                  <TabsContent value="preview" className="mt-2">
                    <div className="prose prose-sm dark:prose-invert max-w-none p-4 border rounded-md min-h-[400px] bg-background">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {field.value || "*Контент пока отсутствует*"}
                      </ReactMarkdown>
                    </div>
                  </TabsContent>
                </Tabs>
              </FormControl>
              <FormDescription>
                Используйте синтаксис Markdown. Предпросмотр доступен во вкладке "Предпросмотр".
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="metaDescription"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Мета-описание</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="SEO мета-описание (максимум 300 символов)"
                    rows={3}
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  Используется для результатов поиска. Рекомендуется: 150-160 символов.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="keywords"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Ключевые слова</FormLabel>
                <FormControl>
                  <Input placeholder="ключевое слово1, ключевое слово2, ключевое слово3" {...field} />
                </FormControl>
                <FormDescription>
                  Ключевые слова через запятую для SEO.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="ogImage"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Превью (картинка статьи)</FormLabel>
              <FormControl>
                <Input placeholder="cover.jpg или https://..." {...field} />
              </FormControl>
              <FormDescription>
                Имя файла из каталога public/blog (например cover.jpg) или полный URL. Файлы из blog показываются в списке статей и на странице статьи.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="tags"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Теги</FormLabel>
              <FormControl>
                <Input placeholder="тег1, тег2, тег3" {...field} />
              </FormControl>
              <FormDescription>
                Теги через запятую для категоризации.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="publishedAt"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Дата публикации</FormLabel>
                <FormControl>
                  <Input type="date" {...field} value={field.value || ""} />
                </FormControl>
                <FormDescription>
                  Дата, которая отображается в блоге. Пусто — используется дата создания статьи.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="published"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>Опубликовано</FormLabel>
                  <FormDescription>
                    Опубликованные статьи видны всем пользователям.
                  </FormDescription>
                </div>
              </FormItem>
            )}
          />
        </div>

        <div className="flex gap-4">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Сохранение..." : article ? "Обновить статью" : "Создать статью"}
          </Button>
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
              Отмена
            </Button>
          )}
        </div>
      </form>
    </Form>
  )
}
