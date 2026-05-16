"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { ArticleForm } from "@/app/admin/components/article-form"
import { Article } from "@/lib/articles"
import { toast } from "sonner"
import type { ArticleApiData } from "@/app/admin/components/article-form"

export default function EditArticlePage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string
  const [article, setArticle] = useState<Article | null>(null)
  const [loading, setLoading] = useState(true)
  const [password, setPassword] = useState("")

  useEffect(() => {
    // Получаем пароль из sessionStorage
    const savedPassword = sessionStorage.getItem("admin_password")
    if (savedPassword) {
      setPassword(savedPassword)
      loadArticle(savedPassword)
    } else {
      toast.error("Please login first")
      router.push("/admin")
    }
  }, [id, router])

  const loadArticle = async (adminPassword: string) => {
    try {
      const response = await fetch(`/api/articles/${id}`, {
        headers: {
          "x-admin-password": adminPassword,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setArticle(data.article)
      } else {
        if (response.status === 401) {
          toast.error("Unauthorized. Please login again.")
          router.push("/admin")
        } else {
          toast.error("Article not found")
          router.push("/admin")
        }
      }
    } catch (error) {
      console.error("Error loading article:", error)
      toast.error("Failed to load article")
      router.push("/admin")
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (data: ArticleApiData) => {
    if (!password) {
      toast.error("Please login first")
      router.push("/admin")
      return
    }

    try {
      const response = await fetch(`/api/articles/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-admin-password": password,
        },
        body: JSON.stringify(data),
      })

      const result = await response.json()

      if (response.ok && result.article) {
        toast.success("Article updated successfully")
        router.push("/admin")
      } else {
        toast.error(result.error || "Failed to update article")
      }
    } catch (error) {
      console.error("Error updating article:", error)
      toast.error("Failed to update article")
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading article...</p>
      </div>
    )
  }

  if (!article) {
    return null
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Edit Article</h1>
          <p className="text-muted-foreground">Update the article information below</p>
        </div>
        <ArticleForm article={article} onSubmit={handleSubmit} onCancel={() => router.push("/admin")} />
      </div>
    </div>
  )
}
