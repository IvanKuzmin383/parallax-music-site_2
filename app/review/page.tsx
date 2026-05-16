"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"

type MyReview = {
  id: string
}

export default function ReviewPage() {
  const [loading, setLoading] = useState(true)
  const [isAuthorized, setIsAuthorized] = useState(true)
  const [existingReview, setExistingReview] = useState<MyReview | null>(null)
  const [authorName, setAuthorName] = useState("")
  const [text, setText] = useState("")
  const [rating, setRating] = useState(5)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    fetch("/api/cabinet/reviews/me", { credentials: "include" })
      .then(async (res) => {
        if (res.status === 401) {
          setIsAuthorized(false)
          return null
        }
        if (!res.ok) return null
        const data = await res.json()
        if (data?.review) {
          setExistingReview({ id: data.review.id })
        }
        return null
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!authorName.trim()) {
      toast.error("Введите имя")
      return
    }
    if (text.trim().length < 20) {
      toast.error("Текст отзыва должен быть не менее 20 символов")
      return
    }

    setSubmitting(true)
    try {
      const response = await fetch("/api/cabinet/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          authorName: authorName.trim(),
          text: text.trim(),
          rating,
        }),
      })
      const data = await response.json().catch(() => ({}))
      if (response.ok) {
        setSubmitted(true)
        toast.success("Спасибо! Отзыв отправлен на модерацию.")
      } else if (response.status === 409) {
        setExistingReview({ id: "exists" })
        toast.error(data.error || "Вы уже оставили отзыв")
      } else if (response.status === 401) {
        setIsAuthorized(false)
        toast.error("Необходима авторизация")
      } else {
        toast.error(data.error || "Не удалось отправить отзыв")
      }
    } catch {
      toast.error("Не удалось отправить отзыв")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-background pt-24 pb-10">
      <div className="container mx-auto px-4 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>Оставить отзыв</CardTitle>
            <CardDescription>
              Отзыв отправляется на модерацию и после подтверждения публикуется на главной странице.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground">Загрузка...</p>
            ) : !isAuthorized ? (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Оставить отзыв могут только зарегистрированные пользователи.
                </p>
                <Button asChild>
                  <Link href="/cabinet">Войти в личный кабинет</Link>
                </Button>
              </div>
            ) : existingReview ? (
              <p className="text-sm text-muted-foreground">Вы уже оставили отзыв.</p>
            ) : submitted ? (
              <p className="text-sm text-muted-foreground">
                Спасибо! Отзыв отправлен на модерацию.
              </p>
            ) : (
              <form onSubmit={onSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="authorName">Имя</Label>
                  <Input
                    id="authorName"
                    value={authorName}
                    onChange={(e) => setAuthorName(e.target.value)}
                    maxLength={80}
                    disabled={submitting}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rating">Оценка</Label>
                  <select
                    id="rating"
                    className="w-full h-10 rounded-md border bg-background px-3"
                    value={rating}
                    onChange={(e) => setRating(Number(e.target.value))}
                    disabled={submitting}
                  >
                    <option value={5}>5</option>
                    <option value={4}>4</option>
                    <option value={3}>3</option>
                    <option value={2}>2</option>
                    <option value={1}>1</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="text">Текст отзыва</Label>
                  <textarea
                    id="text"
                    className="w-full min-h-[140px] rounded-md border bg-background px-3 py-2 text-sm"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    maxLength={3000}
                    disabled={submitting}
                  />
                  <p className="text-xs text-muted-foreground">Минимум 20 символов.</p>
                </div>
                <Button type="submit" disabled={submitting}>
                  {submitting ? "Отправка..." : "Отправить отзыв"}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
