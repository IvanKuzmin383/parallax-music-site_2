"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Article } from "@/lib/articles"
import { toast } from "sonner"
import { Plus, Edit, Trash2, Eye, EyeOff, Lock, LogOut, Download } from "lucide-react"
import { AdminSectionNav } from "@/components/admin-section-nav"
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
import { ru } from "date-fns/locale"

type StorageUsage = {
  uploadsBase: string
  audio: { files: number; bytes: number }
  covers: { files: number; bytes: number }
  draftWav: { files: number; bytes: number }
  totals: { files: number; bytes: number }
  generatedAt: string
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  const units = ["KB", "MB", "GB", "TB"]
  let value = bytes
  let unitIndex = -1
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024
    unitIndex += 1
  }
  return `${value.toFixed(value >= 100 ? 0 : 1)} ${units[unitIndex]}`
}

export default function AdminPage() {
  const [articles, setArticles] = useState<Article[]>([])
  const [loading, setLoading] = useState(true)
  const [password, setPassword] = useState("")
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [storageUsage, setStorageUsage] = useState<StorageUsage | null>(null)
  const [storageLoading, setStorageLoading] = useState(false)
  const [downloadingCovers, setDownloadingCovers] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [articleToDelete, setArticleToDelete] = useState<Article | null>(null)
  const router = useRouter()

  useEffect(() => {
    fetch("/api/articles?includeUnpublished=true", { credentials: "include" })
      .then((res) => {
        if (res.ok) {
          setIsAuthenticated(true)
          void loadStorageUsage()
          return res.json()
        }
        if (res.status === 401) setIsAuthenticated(false)
        return null
      })
      .then((data) => {
        if (data?.articles) setArticles(data.articles)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const handleLogin = async () => {
    if (!password) {
      toast.error("Введите пароль")
      return
    }

    try {
      const response = await fetch("/api/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
        credentials: "include",
      })

      if (response.ok) {
        setIsAuthenticated(true)
        loadArticles()
        void loadStorageUsage()
        toast.success("Вход выполнен успешно")
      } else if (response.status === 429) {
        toast.error("Слишком много попыток. Попробуйте позже.")
      } else {
        toast.error("Неверный пароль")
      }
    } catch (error) {
      console.error("Login error:", error)
      toast.error("Ошибка аутентификации")
    }
  }

  const loadArticles = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/articles?includeUnpublished=true", {
        credentials: "include",
      })

      if (response.ok) {
        const data = await response.json()
        setArticles(data.articles || [])
      } else {
        if (response.status === 401) {
          setIsAuthenticated(false)
          toast.error("Сессия истекла. Пожалуйста, войдите снова.")
        }
      }
    } catch (error) {
      console.error("Error loading articles:", error)
      toast.error("Не удалось загрузить статьи")
    } finally {
      setLoading(false)
    }
  }

  const handleDownloadAllCovers = async () => {
    setDownloadingCovers(true)
    try {
      const listRes = await fetch("/api/admin/uploads/covers/list", { credentials: "include" })
      if (!listRes.ok) {
        const data = (await listRes.json().catch(() => null)) as { error?: string } | null
        toast.error(data?.error || "Не удалось получить список обложек")
        return
      }
      const listData = (await listRes.json()) as { files?: string[] }
      const files = listData.files ?? []
      if (files.length === 0) {
        toast.error("В каталоге uploads/covers нет файлов для скачивания")
        return
      }

      const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))
      let failed = 0
      for (let i = 0; i < files.length; i++) {
        const name = files[i]
        try {
          const fileRes = await fetch(
            `/api/admin/uploads/covers/download?name=${encodeURIComponent(name)}`,
            { credentials: "include" }
          )
          if (!fileRes.ok) {
            failed += 1
            continue
          }
          const blob = await fileRes.blob()
          const blobUrl = window.URL.createObjectURL(blob)
          const anchor = document.createElement("a")
          anchor.href = blobUrl
          anchor.download = name
          document.body.appendChild(anchor)
          anchor.click()
          document.body.removeChild(anchor)
          window.URL.revokeObjectURL(blobUrl)
          if (i < files.length - 1) {
            await pause(400)
          }
        } catch {
          failed += 1
        }
      }

      if (failed === 0) {
        toast.success(`Скачано файлов: ${files.length}`)
      } else if (failed < files.length) {
        toast.success(`Частично: скачано ${files.length - failed}, ошибок ${failed}`)
      } else {
        toast.error("Не удалось скачать обложки")
      }
    } catch (error) {
      console.error("Error downloading covers:", error)
      toast.error("Ошибка при скачивании обложек")
    } finally {
      setDownloadingCovers(false)
    }
  }

  const loadStorageUsage = async () => {
    setStorageLoading(true)
    try {
      const response = await fetch("/api/admin/storage-usage", {
        credentials: "include",
      })
      if (response.ok) {
        const data = (await response.json()) as StorageUsage
        setStorageUsage(data)
      } else if (response.status === 401) {
        setIsAuthenticated(false)
      } else {
        toast.error("Не удалось получить статистику хранилища")
      }
    } catch (error) {
      console.error("Error loading storage usage:", error)
      toast.error("Ошибка загрузки статистики хранилища")
    } finally {
      setStorageLoading(false)
    }
  }

  const handleLogout = async () => {
    try {
      await fetch("/api/admin/auth", { method: "DELETE", credentials: "include" })
    } catch {
      // ignore
    }
    setIsAuthenticated(false)
    setArticles([])
    setPassword("")
  }

  const handleDelete = async () => {
    if (!articleToDelete) return

    try {
      const response = await fetch(`/api/articles/${articleToDelete.id}`, {
        method: "DELETE",
        credentials: "include",
      })

      if (response.ok) {
        toast.success("Статья успешно удалена")
        loadArticles()
        setDeleteDialogOpen(false)
        setArticleToDelete(null)
      } else {
        toast.error("Не удалось удалить статью")
      }
    } catch (error) {
      console.error("Delete error:", error)
      toast.error("Не удалось удалить статью")
    }
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen pt-20 flex items-center justify-center bg-background p-4">
        <div className="max-w-md w-full space-y-4">
          <div className="text-center space-y-2">
            <Lock className="h-12 w-12 mx-auto text-muted-foreground" />
            <h1 className="text-2xl font-bold">Вход в админ-панель</h1>
            <p className="text-muted-foreground">Введите пароль администратора для доступа к панели</p>
          </div>
          <div className="space-y-4">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              placeholder="Пароль администратора"
              className="w-full px-3 py-2 border rounded-md bg-background"
            />
            <Button onClick={handleLogin} className="w-full">
              Войти
            </Button>
          </div>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen pt-20 flex items-center justify-center">
        <p>Загрузка статей...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background pt-20">
      <div className="container mx-auto px-4 space-y-6">
        <AdminSectionNav active="articles" />

        <div className="flex justify-between items-center flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold">Админ-панель</h1>
            <p className="text-muted-foreground">Управление статьями блога</p>
          </div>
          <div className="flex gap-2 items-center flex-wrap">
            <Button variant="outline" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              Выйти
            </Button>
            <Button onClick={() => router.push("/admin26081993/articles/new")}>
              <Plus className="h-4 w-4 mr-2" />
              Новая статья
            </Button>
          </div>
        </div>

        <div className="border rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h2 className="text-lg font-semibold">Использование хранилища файлов</h2>
              <p className="text-sm text-muted-foreground">
                WAV и обложки в uploads
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push("/admin26081993/upload-drafts")}
              >
                Скачать WAV черновиков по одному
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadAllCovers}
                disabled={downloadingCovers || !storageUsage?.covers.files}
              >
                <Download className="h-4 w-4 mr-1" />
                {downloadingCovers ? "Скачиваем по одному…" : "Скачать все обложки по одному"}
              </Button>
              <Button variant="outline" size="sm" onClick={loadStorageUsage} disabled={storageLoading}>
                {storageLoading ? "Обновляем..." : "Обновить"}
              </Button>
            </div>
          </div>
          {storageUsage ? (
            <div className="grid gap-2 text-sm">
              <p><strong>Всего:</strong> {formatBytes(storageUsage.totals.bytes)} ({storageUsage.totals.files} файлов)</p>
              <p><strong>Финальные WAV:</strong> {formatBytes(storageUsage.audio.bytes)} ({storageUsage.audio.files} файлов)</p>
              <p><strong>WAV в черновиках:</strong> {formatBytes(storageUsage.draftWav.bytes)} ({storageUsage.draftWav.files} файлов)</p>
              <p><strong>Обложки:</strong> {formatBytes(storageUsage.covers.bytes)} ({storageUsage.covers.files} файлов)</p>
              <p className="text-xs text-muted-foreground">Путь uploads: {storageUsage.uploadsBase}</p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Статистика пока не загружена</p>
          )}
        </div>

        {articles.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">Статей пока нет</p>
            <Button onClick={() => router.push("/admin26081993/articles/new")}>
              <Plus className="h-4 w-4 mr-2" />
              Создать первую статью
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
                    <p className="text-sm text-muted-foreground mb-2">{article.excerpt || article.metaDescription || "Нет описания"}</p>
                    <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                      <span>Категория: {article.category}</span>
                      <span>•</span>
                      <span>Создано: {format(new Date(article.createdAt), "d MMM yyyy", { locale: ru })}</span>
                      {article.tags.length > 0 && (
                        <>
                          <span>•</span>
                          <span>Теги: {article.tags.join(", ")}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push(`/admin26081993/articles/${article.id}/edit`)}
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
              <AlertDialogTitle>Вы уверены?</AlertDialogTitle>
              <AlertDialogDescription>
                Это действие навсегда удалит статью "{articleToDelete?.title}". Это действие нельзя отменить.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Отмена</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
                Удалить
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  )
}
