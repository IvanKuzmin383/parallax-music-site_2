"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Article } from "@/lib/articles"
import { toast } from "sonner"
import { Plus, Edit, Trash2, Eye, EyeOff, Lock } from "lucide-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { format } from "date-fns"

export default function AdminPage() {
  const [articles, setArticles] = useState<Article[]>([])
  const [loading, setLoading] = useState(true)
  const [password, setPassword] = useState("")
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [articleToDelete, setArticleToDelete] = useState<Article | null>(null)
  const router = useRouter()

  useEffect(() => {
    // Проверяем, есть ли сохраненный пароль в sessionStorage
    const savedPassword = sessionStorage.getItem("admin_password")
    if (savedPassword) {
      setPassword(savedPassword)
      setIsAuthenticated(true)
      loadArticles(savedPassword)
    } else {
      setLoading(false)
    }
  }, [])

  const handleLogin = async () => {
    if (!password) {
      toast.error("Please enter a password")
      return
    }

    try {
      // Проверяем пароль, пытаясь получить список статей
      const response = await fetch("/api/articles?includeUnpublished=true", {
        headers: {
          "x-admin-password": password,
        },
      })

      if (response.ok) {
        setIsAuthenticated(true)
        sessionStorage.setItem("admin_password", password)
        loadArticles(password)
        toast.success("Login successful")
      } else {
        toast.error("Invalid password")
      }
    } catch (error) {
      console.error("Login error:", error)
      toast.error("Failed to authenticate")
    }
  }

  const loadArticles = async (adminPassword: string) => {
    setLoading(true)
    try {
      const response = await fetch("/api/articles?includeUnpublished=true", {
        headers: {
          "x-admin-password": adminPassword,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setArticles(data.articles || [])
      } else {
        if (response.status === 401) {
          setIsAuthenticated(false)
          sessionStorage.removeItem("admin_password")
          toast.error("Session expired. Please login again.")
        }
      }
    } catch (error) {
      console.error("Error loading articles:", error)
      toast.error("Failed to load articles")
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!articleToDelete || !password) return

    try {
      const response = await fetch(`/api/articles/${articleToDelete.id}`, {
        method: "DELETE",
        headers: {
          "x-admin-password": password,
        },
      })

      if (response.ok) {
        toast.success("Article deleted successfully")
        loadArticles(password)
        setDeleteDialogOpen(false)
        setArticleToDelete(null)
      } else {
        toast.error("Failed to delete article")
      }
    } catch (error) {
      console.error("Delete error:", error)
      toast.error("Failed to delete article")
    }
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="max-w-md w-full space-y-4">
          <div className="text-center space-y-2">
            <Lock className="h-12 w-12 mx-auto text-muted-foreground" />
            <h1 className="text-2xl font-bold">Admin Login</h1>
            <p className="text-muted-foreground">Enter admin password to access the panel</p>
          </div>
          <div className="space-y-4">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              placeholder="Admin password"
              className="w-full px-3 py-2 border rounded-md bg-background"
            />
            <Button onClick={handleLogin} className="w-full">
              Login
            </Button>
          </div>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading articles...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Admin Panel</h1>
            <p className="text-muted-foreground">Manage your blog articles</p>
          </div>
          <Button onClick={() => router.push("/admin/articles/new")}>
            <Plus className="h-4 w-4 mr-2" />
            New Article
          </Button>
        </div>

        {articles.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">No articles yet</p>
            <Button onClick={() => router.push("/admin/articles/new")}>
              <Plus className="h-4 w-4 mr-2" />
              Create First Article
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {articles.map((article) => (
              <div
                key={article.id}
                className="border rounded-lg p-4 space-y-2 hover:bg-muted/50 transition-colors"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h2 className="text-xl font-semibold">{article.title}</h2>
                      {article.published ? (
                        <Eye className="h-4 w-4 text-green-500" />
                      ) : (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">{article.excerpt || article.metaDescription || "No description"}</p>
                    <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                      <span>Category: {article.category}</span>
                      <span>•</span>
                      <span>Created: {format(new Date(article.createdAt), "MMM d, yyyy")}</span>
                      {article.tags.length > 0 && (
                        <>
                          <span>•</span>
                          <span>Tags: {article.tags.join(", ")}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push(`/admin/articles/${article.id}/edit`)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setArticleToDelete(article)
                        setDeleteDialogOpen(true)
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete the article "{articleToDelete?.title}". This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  )
}
