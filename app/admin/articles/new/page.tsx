"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ArticleForm } from "@/app/admin/components/article-form"
import { toast } from "sonner"
import type { ArticleApiData } from "@/app/admin/components/article-form"

export default function NewArticlePage() {
  const router = useRouter()
  const [password, setPassword] = useState("")

  // Получаем пароль из sessionStorage
  if (typeof window !== "undefined") {
    const savedPassword = sessionStorage.getItem("admin_password")
    if (savedPassword && !password) {
      setPassword(savedPassword)
    }
  }

  const handleSubmit = async (data: ArticleApiData) => {
    if (!password) {
      toast.error("Please login first")
      router.push("/admin")
      return
    }

    try {
      const response = await fetch("/api/articles", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-password": password,
        },
        body: JSON.stringify(data),
      })

      const result = await response.json()

      if (response.ok && result.article) {
        toast.success("Article created successfully")
        router.push("/admin")
      } else {
        toast.error(result.error || "Failed to create article")
      }
    } catch (error) {
      console.error("Error creating article:", error)
      toast.error("Failed to create article")
    }
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Create New Article</h1>
          <p className="text-muted-foreground">Fill in the form below to create a new article</p>
        </div>
        <ArticleForm onSubmit={handleSubmit} onCancel={() => router.push("/admin")} />
      </div>
    </div>
  )
}
