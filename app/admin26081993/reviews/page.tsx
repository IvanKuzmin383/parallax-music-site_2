"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AdminSectionNav } from "@/components/admin-section-nav"

type Review = {
  id: string
  authorName: string
  rating: number
  text: string
  createdAt: string
  updatedAt: string
}

type ReviewFormState = {
  authorName: string
  rating: number
  text: string
}

const defaultForm: ReviewFormState = {
  authorName: "",
  rating: 5,
  text: "",
}

export default function AdminReviewsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [reviews, setReviews] = useState<Review[]>([])
  const [creating, setCreating] = useState(false)
  const [createForm, setCreateForm] = useState<ReviewFormState>(defaultForm)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<ReviewFormState>(defaultForm)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const loadReviews = async () => {
    const response = await fetch("/api/admin/reviews", { credentials: "include" })
    if (response.status === 401) {
      setIsAuthenticated(false)
      return
    }
    if (!response.ok) {
      throw new Error("failed")
    }
    const data = await response.json()
    setReviews(data.reviews || [])
    setIsAuthenticated(true)
  }

  useEffect(() => {
    loadReviews()
      .catch(() => {
        toast.error("Не удалось загрузить отзывы")
      })
      .finally(() => setLoading(false))
  }, [])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (createForm.authorName.trim().length < 2) {
      toast.error("Имя должно быть не менее 2 символов")
      return
    }
    if (createForm.text.trim().length < 20) {
      toast.error("Текст должен быть не менее 20 символов")
      return
    }

    setCreating(true)
    try {
      const response = await fetch("/api/admin/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(createForm),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        toast.error(data.error || "Не удалось создать отзыв")
        return
      }
      toast.success("Отзыв добавлен на главную")
      setCreateForm(defaultForm)
      await loadReviews()
    } catch {
      toast.error("Не удалось создать отзыв")
    } finally {
      setCreating(false)
    }
  }

  const startEdit = (review: Review) => {
    setEditingId(review.id)
    setEditForm({
      authorName: review.authorName,
      rating: review.rating,
      text: review.text,
    })
  }

  const saveEdit = async (id: string) => {
    if (editForm.authorName.trim().length < 2) {
      toast.error("Имя должно быть не менее 2 символов")
      return
    }
    if (editForm.text.trim().length < 20) {
      toast.error("Текст должен быть не менее 20 символов")
      return
    }

    setSavingId(id)
    try {
      const response = await fetch(`/api/admin/reviews/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(editForm),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        toast.error(data.error || "Не удалось сохранить изменения")
        return
      }
      toast.success("Отзыв обновлен")
      setEditingId(null)
      await loadReviews()
    } catch {
      toast.error("Не удалось сохранить изменения")
    } finally {
      setSavingId(null)
    }
  }

  const handleDelete = async (id: string) => {
    setDeletingId(id)
    try {
      const response = await fetch(`/api/admin/reviews/${id}`, {
        method: "DELETE",
        credentials: "include",
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        toast.error(data.error || "Не удалось удалить отзыв")
        return
      }
      toast.success("Отзыв удален")
      await loadReviews()
    } catch {
      toast.error("Не удалось удалить отзыв")
    } finally {
      setDeletingId(null)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen pt-20 flex items-center justify-center">
        <p>Загрузка...</p>
      </div>
    )
  }

  if (!isAuthenticated) {
    router.replace("/admin26081993")
    return null
  }

  return (
    <div className="min-h-screen bg-background pt-20">
      <div className="container mx-auto px-4 space-y-6">
        <AdminSectionNav active="reviews" />

        <div>
          <h1 className="text-2xl font-bold">Отзывы</h1>
          <p className="text-muted-foreground text-sm">
            Отзывы на главной хранятся в JSON ({`data/reviews.json`} или `/data/reviews.json` на сервере).
            После сохранения главная обновляется сразу (сброс кэша страницы).
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Добавить отзыв</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="create-author">Имя</Label>
                  <Input
                    id="create-author"
                    value={createForm.authorName}
                    onChange={(e) =>
                      setCreateForm((prev) => ({ ...prev, authorName: e.target.value }))
                    }
                    maxLength={80}
                    disabled={creating}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="create-rating">Оценка</Label>
                  <select
                    id="create-rating"
                    className="w-full h-10 rounded-md border bg-background px-3"
                    value={createForm.rating}
                    onChange={(e) =>
                      setCreateForm((prev) => ({ ...prev, rating: Number(e.target.value) }))
                    }
                    disabled={creating}
                  >
                    <option value={5}>5</option>
                    <option value={4}>4</option>
                    <option value={3}>3</option>
                    <option value={2}>2</option>
                    <option value={1}>1</option>
                  </select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-text">Текст</Label>
                <textarea
                  id="create-text"
                  className="w-full min-h-[120px] rounded-md border bg-background px-3 py-2 text-sm"
                  value={createForm.text}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, text: e.target.value }))}
                  maxLength={3000}
                  disabled={creating}
                />
              </div>
              <Button type="submit" disabled={creating}>
                {creating ? "Сохранение..." : "Добавить на главную"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="space-y-3">
          {reviews.length === 0 ? (
            <div className="border rounded-lg p-8 text-center text-muted-foreground">
              Отзывов пока нет
            </div>
          ) : (
            reviews.map((review) => {
              const isEditing = editingId === review.id
              return (
                <Card key={review.id}>
                  <CardContent className="pt-6 space-y-3">
                    {isEditing ? (
                      <>
                        <div className="grid gap-4 md:grid-cols-2">
                          <Input
                            value={editForm.authorName}
                            onChange={(e) =>
                              setEditForm((prev) => ({ ...prev, authorName: e.target.value }))
                            }
                            maxLength={80}
                          />
                          <select
                            className="w-full h-10 rounded-md border bg-background px-3"
                            value={editForm.rating}
                            onChange={(e) =>
                              setEditForm((prev) => ({ ...prev, rating: Number(e.target.value) }))
                            }
                          >
                            <option value={5}>5</option>
                            <option value={4}>4</option>
                            <option value={3}>3</option>
                            <option value={2}>2</option>
                            <option value={1}>1</option>
                          </select>
                        </div>
                        <textarea
                          className="w-full min-h-[120px] rounded-md border bg-background px-3 py-2 text-sm"
                          value={editForm.text}
                          onChange={(e) =>
                            setEditForm((prev) => ({ ...prev, text: e.target.value }))
                          }
                          maxLength={3000}
                        />
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => saveEdit(review.id)}
                            disabled={savingId === review.id}
                          >
                            {savingId === review.id ? "Сохранение..." : "Сохранить"}
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => setEditingId(null)}>
                            Отмена
                          </Button>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold">{review.authorName}</span>
                          <span className="text-sm text-muted-foreground">
                            Оценка: {review.rating}/5
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(review.createdAt).toLocaleString("ru-RU")}
                          </span>
                        </div>
                        <p className="whitespace-pre-wrap text-sm">{review.text}</p>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => startEdit(review)}>
                            Редактировать
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDelete(review.id)}
                            disabled={deletingId === review.id}
                          >
                            {deletingId === review.id ? "Удаление..." : "Удалить"}
                          </Button>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
