"use client"

import { useRouter } from "next/navigation"
import { ArticleForm } from "@/app/admin26081993/components/article-form"
import { toast } from "sonner"
import type { ArticleApiData } from "@/app/admin26081993/components/article-form"

export default function NewArticlePage() {
  const router = useRouter()

  const handleSubmit = async (data: ArticleApiData) => {
    try {
      const response = await fetch("/api/articles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      })

      const result = await response.json()

      if (response.ok && result.article) {
        toast.success("Статья успешно создана")
        router.push("/admin26081993")
      } else if (response.status === 401) {
        toast.error("Сессия истекла. Войдите снова.")
        router.push("/admin26081993")
      } else {
        toast.error(result.error || "Не удалось создать статью")
      }
    } catch (error) {
      console.error("Error creating article:", error)
      toast.error("Не удалось создать статью")
    }
  }

  return (
    <div className="min-h-screen bg-background pt-20">
      <div className="container mx-auto px-4 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Создать новую статью</h1>
          <p className="text-muted-foreground">Заполните форму ниже, чтобы создать новую статью</p>
        </div>
        <ArticleForm onSubmit={handleSubmit} onCancel={() => router.push("/admin26081993")} />
      </div>
    </div>
  )
}
