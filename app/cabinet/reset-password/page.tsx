"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import { Lock, ArrowLeft } from "lucide-react"

function ResetPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get("token") ?? ""

  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (!token) {
      toast.error("Неверная ссылка. Запросите восстановление пароля снова.")
    }
  }, [token])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token) return
    if (password.length < 10) {
      toast.error("Пароль должен быть не менее 10 символов")
      return
    }
    if (password !== confirmPassword) {
      toast.error("Пароли не совпадают")
      return
    }
    setLoading(true)
    try {
      const response = await fetch("/api/cabinet/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword: password }),
      })
      const data = await response.json().catch(() => ({}))
      if (response.ok) {
        setSuccess(true)
        toast.success(data.message || "Пароль изменён. Войдите с новым паролем.")
        setTimeout(() => router.push("/cabinet"), 2000)
      } else {
        toast.error(data.error || "Не удалось изменить пароль")
      }
    } catch {
      toast.error("Ошибка сети")
    } finally {
      setLoading(false)
    }
  }

  if (!token) {
    return (
      <div className="min-h-screen pt-20 flex items-center justify-center bg-background p-4">
        <div className="max-w-md w-full text-center space-y-4">
          <Lock className="h-12 w-12 mx-auto text-muted-foreground" />
          <h1 className="text-2xl font-bold">Неверная ссылка</h1>
          <p className="text-muted-foreground">
            Ссылка для сброса пароля отсутствует или недействительна. Запросите восстановление пароля снова.
          </p>
          <Button asChild>
            <Link href="/cabinet/forgot-password">Восстановить пароль</Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen pt-20 flex items-center justify-center bg-background p-4">
        <div className="max-w-md w-full space-y-4">
          <div className="text-center space-y-2">
            <Lock className="h-12 w-12 mx-auto text-muted-foreground" />
            <h1 className="text-2xl font-bold">Новый пароль</h1>
            <p className="text-muted-foreground">
              {success
                ? "Пароль успешно изменён. Перенаправляем ко входу..."
                : "Задайте новый пароль (минимум 10 символов)."}
            </p>
          </div>

          {!success && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                type="password"
                placeholder="Новый пароль (минимум 10 символов)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                className="w-full"
                autoComplete="new-password"
                minLength={10}
              />
              <Input
                type="password"
                placeholder="Повторите пароль"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={loading}
                className="w-full"
                autoComplete="new-password"
                minLength={10}
              />
              <Button
                type="submit"
                className="w-full"
                disabled={loading || password.length < 10 || password !== confirmPassword}
              >
                {loading ? "Сохранение..." : "Сохранить пароль"}
              </Button>
            </form>
          )}

          <p className="text-center text-sm text-muted-foreground">
            <Link
              href="/cabinet"
              className="inline-flex items-center gap-1 underline hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              Вернуться ко входу
            </Link>
          </p>
        </div>
      </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen pt-20 flex items-center justify-center">
          <p className="text-muted-foreground">Загрузка...</p>
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  )
}
