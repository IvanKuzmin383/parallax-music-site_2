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
  title: z.string().min(1, "Title is required").max(200, "Title must be less than 200 characters"),
  slug: z.string().optional(),
  content: z.string().min(1, "Content is required"),
  excerpt: z.string().max(500, "Excerpt must be less than 500 characters").optional().default(""),
  metaDescription: z.string().max(300, "Meta description must be less than 300 characters").optional().default(""),
  keywords: z.string().optional().default(""), // Будет преобразовано в массив
  ogImage: z.string().url("OG image must be a valid URL").optional().or(z.literal("")),
  category: z.string().min(1, "Category is required").max(50, "Category must be less than 50 characters"),
  tags: z.string().optional().default(""), // Будет преобразовано в массив
  published: z.boolean().optional().default(false),
})

export type ArticleFormValues = z.infer<typeof articleFormSchema>

// Тип для данных, отправляемых в API (с массивами вместо строк)
export type ArticleApiData = Omit<ArticleFormValues, 'keywords' | 'tags'> & {
  keywords: string[]
  tags: string[]
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
      ogImage: article?.ogImage || "",
      category: article?.category || "",
      tags: article?.tags?.join(", ") || "",
      published: article?.published || false,
    },
  })

  const handleSubmit = async (data: ArticleFormValues) => {
    setIsSubmitting(true)
    try {
      // Преобразуем keywords и tags в массивы
      const formattedData: ArticleApiData = {
        ...data,
        keywords: data.keywords
          ? data.keywords.split(",").map((k) => k.trim()).filter(Boolean)
          : [],
        tags: data.tags
          ? data.tags.split(",").map((t) => t.trim()).filter(Boolean)
          : [],
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
              <FormLabel>Title *</FormLabel>
              <FormControl>
                <Input placeholder="Article title" {...field} />
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
              <FormLabel>Slug</FormLabel>
              <FormControl>
                <Input placeholder="article-slug (auto-generated if empty)" {...field} />
              </FormControl>
              <FormDescription>
                URL-friendly version of the title. Leave empty to auto-generate from title.
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
              <FormLabel>Category *</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Music, Production, Marketing" {...field} />
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
              <FormLabel>Excerpt</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Short description of the article (max 500 characters)"
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
              <FormLabel>Content (Markdown) *</FormLabel>
              <FormControl>
                <Tabs defaultValue="write" className="w-full">
                  <TabsList>
                    <TabsTrigger value="write">Write</TabsTrigger>
                    <TabsTrigger value="preview">Preview</TabsTrigger>
                  </TabsList>
                  <TabsContent value="write" className="mt-2">
                    <Textarea
                      placeholder="Write your article in Markdown..."
                      rows={20}
                      className="font-mono text-sm"
                      {...field}
                    />
                  </TabsContent>
                  <TabsContent value="preview" className="mt-2">
                    <div className="prose prose-sm dark:prose-invert max-w-none p-4 border rounded-md min-h-[400px] bg-background">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {field.value || "*No content yet*"}
                      </ReactMarkdown>
                    </div>
                  </TabsContent>
                </Tabs>
              </FormControl>
              <FormDescription>
                Use Markdown syntax. Preview available in the Preview tab.
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
                <FormLabel>Meta Description</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="SEO meta description (max 300 characters)"
                    rows={3}
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  Used for search engine results. Recommended: 150-160 characters.
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
                <FormLabel>Keywords</FormLabel>
                <FormControl>
                  <Input placeholder="keyword1, keyword2, keyword3" {...field} />
                </FormControl>
                <FormDescription>
                  Comma-separated keywords for SEO.
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
              <FormLabel>OG Image URL</FormLabel>
              <FormControl>
                <Input placeholder="https://example.com/image.jpg" {...field} />
              </FormControl>
              <FormDescription>
                Open Graph image for social media sharing.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="tags"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tags</FormLabel>
                <FormControl>
                  <Input placeholder="tag1, tag2, tag3" {...field} />
                </FormControl>
                <FormDescription>
                  Comma-separated tags for categorization.
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
                  <FormLabel>Published</FormLabel>
                  <FormDescription>
                    Published articles are visible to the public.
                  </FormDescription>
                </div>
              </FormItem>
            )}
          />
        </div>

        <div className="flex gap-4">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : article ? "Update Article" : "Create Article"}
          </Button>
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
              Cancel
            </Button>
          )}
        </div>
      </form>
    </Form>
  )
}
