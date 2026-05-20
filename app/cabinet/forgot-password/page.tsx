"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import { Lock, ArrowLeft } from "lucide-react"
import { Turnstile } from "@marsidev/react-turnstile"
import { getTurnstileSiteKeyClient, isTurnstileEnabledClient } from "@/lib/turnstile-config"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [notRegistered, setNotRegistered] = useState(false)
  const [captchaToken, setCaptchaToken] = useState<string | null>(null)
  const turnstileEnabled = isTurnstileEnabledClient()
  const turnstileSiteKey = getTurnstileSiteKeyClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) {
      toast.error("Введите email")
      return
    }
    if (turnstileEnabled && !captchaToken) {
      toast.error("Подтвердите, что вы не робот")
      return
    }
    setLoading(true)
    setNotRegistered(false)
    try {
      const response = await fetch("/api/cabinet/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          captchaToken: turnstileEnabled ? captchaToken : undefined,
        }),
      })
      const data = await response.json().catch(() => ({}))
      if (response.ok) {
        setSent(true)
        toast.success(data.message || "На указанный email отправлена ссылка для восстановления пароля.")
      } else if (response.status === 404 && data.notRegistered) {
        setNotRegistered(true)
        toast.error(data.error || "Пользователь с таким email не зарегистрирован.")
      } else {
        toast.error(data.error || "Не удалось отправить ссылку")
      }
    } catch {
      toast.error("Ошибка сети")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen pt-20 flex items-center justify-center bg-background p-4">
        <div className="max-w-md w-full space-y-4">
          <div className="text-center space-y-2">
            <Lock className="h-12 w-12 mx-auto text-muted-foreground" />
            <h1 className="text-2xl font-bold">Восстановление пароля</h1>
            <p className="text-muted-foreground">
              {sent
                ? "На указанный email отправлена ссылка для сброса пароля (действует 1 час). Проверьте почту."
                : notRegistered
                  ? "Пользователь с таким email не зарегистрирован. Зарегистрируйтесь, чтобы войти в кабинет."
                  : "Введите email вашего аккаунта - мы отправим ссылку для сброса пароля."}
            </p>
          </div>

          {notRegistered && (
            <div className="rounded-lg border border-amber-500/50 bg-amber-500/10 p-4 text-center text-sm">
              <p className="mb-3">Аккаунт с таким email не найден. Создайте аккаунт, чтобы войти в личный кабинет.</p>
              <Button asChild variant="secondary" size="sm">
                <Link href="/cabinet?tab=register">Зарегистрироваться</Link>
              </Button>
            </div>
          )}

          {!sent && !notRegistered ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                className="w-full"
                autoComplete="email"
              />
              {turnstileEnabled && turnstileSiteKey ? (
                <div className="flex justify-center">
                  <Turnstile
                    siteKey={turnstileSiteKey}
                    onSuccess={(token) => setCaptchaToken(token)}
                    onError={() => setCaptchaToken(null)}
                    onExpire={() => setCaptchaToken(null)}
                    options={{ theme: "dark" }}
                  />
                </div>
              ) : null}
              <Button
                type="submit"
                className="w-full"
                disabled={loading || (turnstileEnabled && !captchaToken)}
              >
                {loading ? "Отправка..." : "Отправить ссылку"}
              </Button>
            </form>
          ) : null}

          {notRegistered && (
            <p className="text-center text-sm text-muted-foreground">
              Уже есть аккаунт?{" "}
              <Link href="/cabinet" className="underline hover:text-foreground">
                Войти
              </Link>
            </p>
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
