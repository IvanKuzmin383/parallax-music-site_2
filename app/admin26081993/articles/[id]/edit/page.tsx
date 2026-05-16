"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { ArticleForm } from "@/app/admin26081993/components/article-form"
import { Article } from "@/lib/articles"
import { toast } from "sonner"
import type { ArticleApiData } from "@/app/admin26081993/components/article-form"

export default function EditArticlePage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string
  const [article, setArticle] = useState<Article | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadArticle()
  }, [id])

  const loadArticle = async () => {
    try {
      const response = await fetch(`/api/articles/${id}`, {
        credentials: "include",
      })

      if (response.ok) {
        const data = await response.json()
        setArticle(data.article)
      } else {
        if (response.status === 401) {
          toast.error("Не авторизован. Пожалуйста, войдите снова.")
          router.push("/admin26081993")
        } else {
          toast.error("Статья не найдена")
          router.push("/admin26081993")
        }
      }
    } catch (error) {
      console.error("Error loading article:", error)
      toast.error("Не удалось загрузить статью")
      router.push("/admin26081993")
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (data: ArticleApiData) => {
    try {
      const response = await fetch(`/api/articles/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      })

      const result = await response.json()

      if (response.ok && result.article) {
        toast.success("Статья успешно обновлена")
        router.push("/admin26081993")
      } else if (response.status === 401) {
        toast.error("Сессия истекла. Войдите снова.")
        router.push("/admin26081993")
      } else {
        toast.error(result.error || "Не удалось обновить статью")
      }
    } catch (error) {
      console.error("Error updating article:", error)
      toast.error("Не удалось обновить статью")
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Загрузка статьи...</p>
      </div>
    )
  }

  if (!article) {
    return null
  }

  return (
    <div className="min-h-screen bg-background pt-20">
      <div className="container mx-auto px-4 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Редактировать статью</h1>
          <p className="text-muted-foreground">Обновите информацию о статье ниже</p>
        </div>
        <ArticleForm article={article} onSubmit={handleSubmit} onCancel={() => router.push("/admin26081993")} />
      </div>
    </div>
  )
}
