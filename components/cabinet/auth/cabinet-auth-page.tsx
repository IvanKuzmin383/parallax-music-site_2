"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Lock } from "lucide-react"
import { Turnstile } from "@marsidev/react-turnstile"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CABINET_ACCOUNT_BLOCKED_LOGIN_MESSAGE } from "@/lib/cabinet-account-messages"
import { getTurnstileSiteKeyClient, isTurnstileEnabledClient } from "@/lib/turnstile-config"

const PRICING_PAGE_URL = "https://parallaxmusic.ru/#pricing"
const SUBSCRIPTION_REQUIRED_REGISTER_MESSAGE =
  "Сначала оплатите подписку или пакет треков Fix на сайте, указав этот email. После успешной оплаты вы сможете зарегистрироваться."

interface CabinetAuthPageProps {
  onAuthenticated: () => void
}

export function CabinetAuthPage({ onAuthenticated }: CabinetAuthPageProps) {
  const searchParams = useSearchParams()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loginLoading, setLoginLoading] = useState(false)
  const [registerEmail, setRegisterEmail] = useState("")
  const [registerPassword, setRegisterPassword] = useState("")
  const [registerPasswordConfirm, setRegisterPasswordConfirm] = useState("")
  const [registerArtistName, setRegisterArtistName] = useState("")
  const [registerLoading, setRegisterLoading] = useState(false)
  const [registerCaptchaToken, setRegisterCaptchaToken] = useState<string | null>(null)
  const [registerConsentPersonalData, setRegisterConsentPersonalData] = useState(false)
  const [registerConsentPrivacy, setRegisterConsentPrivacy] = useState(false)
  const [registerConsentTerms, setRegisterConsentTerms] = useState(false)
  const [authTab, setAuthTab] = useState<"login" | "register">("login")
  const [subscriptionRequiredDialogOpen, setSubscriptionRequiredDialogOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const turnstileEnabled = isTurnstileEnabledClient()
  const turnstileSiteKey = getTurnstileSiteKeyClient()

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (searchParams.get("tab") === "register") setAuthTab("register")
    const qEmail = searchParams.get("email")?.trim()
    if (qEmail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(qEmail)) {
      setRegisterEmail(qEmail)
      setEmail(qEmail)
    }
  }, [searchParams])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) {
      toast.error("Введите email и пароль")
      return
    }
    setLoginLoading(true)
    try {
      const response = await fetch("/api/cabinet/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
        credentials: "include",
      })
      const data = await response.json().catch(() => ({} as { error?: string }))
      if (response.ok) {
        toast.success("Вход выполнен успешно")
        onAuthenticated()
      } else if (response.status === 429) {
        toast.error(data.error || "Слишком много попыток. Попробуйте позже.")
      } else if (response.status === 403) {
        toast.error(data.error || CABINET_ACCOUNT_BLOCKED_LOGIN_MESSAGE)
      } else {
        toast.error(data.error || "Неверный email или пароль")
      }
    } catch {
      toast.error("Ошибка аутентификации")
    } finally {
      setLoginLoading(false)
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!registerEmail || !registerPassword || !registerPasswordConfirm) {
      toast.error("Введите email, пароль и подтверждение пароля")
      return
    }
    if (registerPassword !== registerPasswordConfirm) {
      toast.error("Пароли не совпадают")
      return
    }
    if (turnstileEnabled && !registerCaptchaToken) {
      toast.error("Подтвердите, что вы не робот")
      return
    }
    if (!registerConsentPersonalData || !registerConsentPrivacy || !registerConsentTerms) {
      toast.error("Подтвердите все согласия")
      return
    }
    setRegisterLoading(true)
    try {
      const response = await fetch("/api/cabinet/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: registerEmail,
          password: registerPassword,
          artistName: registerArtistName,
          captchaToken: turnstileEnabled ? registerCaptchaToken : undefined,
          consentPersonalData: true,
          consentPrivacyPolicy: true,
          consentTermsOfUse: true,
        }),
        credentials: "include",
      })
      const data = await response.json().catch(() => ({}))
      if (response.ok) {
        toast.success("Регистрация выполнена успешно")
        onAuthenticated()
      } else if (response.status === 403 && data.code === "SUBSCRIPTION_REQUIRED") {
        setSubscriptionRequiredDialogOpen(true)
      } else {
        toast.error(data.error || "Не удалось создать аккаунт")
      }
    } catch {
      toast.error("Ошибка регистрации")
    } finally {
      setRegisterLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md border-border">
        <CardHeader className="text-center space-y-2">
          <Lock className="h-10 w-10 mx-auto text-muted-foreground" />
          <CardTitle className="text-2xl">Личный кабинет</CardTitle>
          <CardDescription>
            {authTab === "register" ? (
              <>
                Регистрация доступна после оплаты тарифа —{" "}
                <Link
                  href="https://parallaxmusic.ru/#pricing"
                  className="text-primary underline underline-offset-2"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  оформите подписку
                </Link>
                , затем создайте аккаунт на тот же email.
              </>
            ) : null}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={authTab} onValueChange={(v) => setAuthTab(v as "login" | "register")}>
            <TabsList className="w-full grid grid-cols-2 mb-4">
              <TabsTrigger value="login">Вход</TabsTrigger>
              <TabsTrigger value="register">Регистрация</TabsTrigger>
            </TabsList>
            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4">
                <Input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} disabled={loginLoading} autoComplete="email" />
                <Input type="password" placeholder="Пароль" value={password} onChange={(e) => setPassword(e.target.value)} disabled={loginLoading} autoComplete="current-password" />
                <Button type="submit" className="w-full" disabled={loginLoading}>
                  {loginLoading ? "Вход..." : "Войти"}
                </Button>
                <p className="text-center text-sm text-muted-foreground">
                  <Link href="/cabinet/forgot-password" className="underline hover:text-foreground">
                    Забыли пароль?
                  </Link>
                </p>
              </form>
            </TabsContent>
            <TabsContent value="register">
              <form onSubmit={handleRegister} className="space-y-4">
                <Input type="email" placeholder="Email" value={registerEmail} onChange={(e) => setRegisterEmail(e.target.value)} disabled={registerLoading} autoComplete="email" />
                <Input type="password" placeholder="Пароль (минимум 10 символов)" value={registerPassword} onChange={(e) => setRegisterPassword(e.target.value)} disabled={registerLoading} autoComplete="new-password" />
                <Input type="password" placeholder="Подтверждение пароля" value={registerPasswordConfirm} onChange={(e) => setRegisterPasswordConfirm(e.target.value)} disabled={registerLoading} autoComplete="new-password" />
                <Input type="text" placeholder="Имя артиста (опционально)" value={registerArtistName} onChange={(e) => setRegisterArtistName(e.target.value)} disabled={registerLoading} />
                <div className="space-y-3 rounded-md border border-border p-3 text-sm text-muted-foreground">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <Checkbox checked={registerConsentPersonalData} onCheckedChange={(v) => setRegisterConsentPersonalData(v === true)} disabled={registerLoading} className="mt-0.5" />
                    <span>
                      Согласие на обработку ПДн (
                      <Link href="/personal-data-consent" target="_blank" className="text-primary underline">подробнее</Link>)
                    </span>
                  </label>
                  <label className="flex items-start gap-3 cursor-pointer">
                    <Checkbox checked={registerConsentPrivacy} onCheckedChange={(v) => setRegisterConsentPrivacy(v === true)} disabled={registerLoading} className="mt-0.5" />
                    <span>
                      Ознакомлен с{" "}
                      <Link href="/privacy" target="_blank" className="text-primary underline">политикой конфиденциальности</Link>
                    </span>
                  </label>
                  <label className="flex items-start gap-3 cursor-pointer">
                    <Checkbox checked={registerConsentTerms} onCheckedChange={(v) => setRegisterConsentTerms(v === true)} disabled={registerLoading} className="mt-0.5" />
                    <span>
                      Согласен с{" "}
                      <Link href="/terms" target="_blank" className="text-primary underline">условиями использования</Link>
                    </span>
                  </label>
                </div>
                {mounted && turnstileEnabled && turnstileSiteKey ? (
                  <div className="flex justify-center">
                    <Turnstile siteKey={turnstileSiteKey} onSuccess={setRegisterCaptchaToken} onError={() => setRegisterCaptchaToken(null)} onExpire={() => setRegisterCaptchaToken(null)} options={{ theme: "dark" }} />
                  </div>
                ) : null}
                <Button type="submit" className="w-full" disabled={registerLoading || !registerConsentPersonalData || !registerConsentPrivacy || !registerConsentTerms}>
                  {registerLoading ? "Регистрация..." : "Зарегистрироваться"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Dialog open={subscriptionRequiredDialogOpen} onOpenChange={setSubscriptionRequiredDialogOpen}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle>Регистрация</DialogTitle>
            <DialogDescription className="text-base text-foreground leading-relaxed">
              {SUBSCRIPTION_REQUIRED_REGISTER_MESSAGE}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button className="w-full" asChild>
              <a href={PRICING_PAGE_URL} target="_blank" rel="noopener noreferrer">
                Выбрать тариф
              </a>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
