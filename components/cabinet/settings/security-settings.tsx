"use client"

import { useCallback, useEffect, useState } from "react"
import { format } from "date-fns"
import { ru } from "date-fns/locale"
import { KeyRound, Loader2, MonitorSmartphone, ShieldCheck } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Spinner } from "@/components/ui/spinner"

type SessionRow = {
  id: string
  createdAt: string
  lastSeenAt: string
  userAgent: string | null
  ip: string | null
  current: boolean
}

function shortUa(ua: string | null): string {
  if (!ua?.trim()) return "Неизвестное устройство"
  const s = ua.trim()
  if (/Mobile|Android|iPhone/i.test(s)) return "Мобильное устройство"
  if (/Windows/i.test(s)) return "Windows"
  if (/Mac OS|Macintosh/i.test(s)) return "macOS"
  if (/Linux/i.test(s)) return "Linux"
  return s.slice(0, 48) + (s.length > 48 ? "…" : "")
}

export function SecuritySettings() {
  const [loading, setLoading] = useState(true)
  const [totpEnabled, setTotpEnabled] = useState(false)
  const [sessions, setSessions] = useState<SessionRow[]>([])

  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [passwordBusy, setPasswordBusy] = useState(false)

  const [setupSecret, setSetupSecret] = useState<string | null>(null)
  const [setupQr, setSetupQr] = useState<string | null>(null)
  const [setupCode, setSetupCode] = useState("")
  const [setupBusy, setSetupBusy] = useState(false)

  const [disablePassword, setDisablePassword] = useState("")
  const [disableCode, setDisableCode] = useState("")
  const [disableBusy, setDisableBusy] = useState(false)

  const [sessionsBusy, setSessionsBusy] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [tRes, sRes] = await Promise.all([
        fetch("/api/cabinet/2fa", { credentials: "include" }),
        fetch("/api/cabinet/sessions", { credentials: "include" }),
      ])
      if (tRes.ok) {
        const data = (await tRes.json()) as { enabled?: boolean }
        setTotpEnabled(Boolean(data.enabled))
      }
      if (sRes.ok) {
        const data = (await sRes.json()) as { sessions?: SessionRow[] }
        setSessions(data.sessions ?? [])
      }
    } catch {
      toast.error("Не удалось загрузить настройки безопасности")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner className="h-6 w-6" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <KeyRound className="h-4 w-4" />
            Смена пароля
          </CardTitle>
          <CardDescription>
            Минимум 10 символов. После смены другие сессии будут завершены.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="grid max-w-md gap-3"
            onSubmit={async (e) => {
              e.preventDefault()
              if (newPassword.length < 10) {
                toast.error("Новый пароль - не менее 10 символов")
                return
              }
              if (newPassword !== confirmPassword) {
                toast.error("Пароли не совпадают")
                return
              }
              setPasswordBusy(true)
              try {
                const res = await fetch("/api/cabinet/password", {
                  method: "POST",
                  credentials: "include",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ currentPassword, newPassword }),
                })
                const data = await res.json().catch(() => ({}))
                if (!res.ok) {
                  toast.error(typeof data.error === "string" ? data.error : "Не удалось сменить пароль")
                  return
                }
                toast.success("Пароль обновлён")
                setCurrentPassword("")
                setNewPassword("")
                setConfirmPassword("")
                void load()
              } catch {
                toast.error("Ошибка сети")
              } finally {
                setPasswordBusy(false)
              }
            }}
          >
            <div>
              <Label htmlFor="sec-cur-pass">Текущий пароль</Label>
              <Input
                id="sec-cur-pass"
                type="password"
                autoComplete="current-password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                disabled={passwordBusy}
              />
            </div>
            <div>
              <Label htmlFor="sec-new-pass">Новый пароль</Label>
              <Input
                id="sec-new-pass"
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                disabled={passwordBusy}
                minLength={10}
              />
            </div>
            <div>
              <Label htmlFor="sec-confirm-pass">Подтверждение</Label>
              <Input
                id="sec-confirm-pass"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={passwordBusy}
                minLength={10}
              />
            </div>
            <Button type="submit" disabled={passwordBusy} className="w-fit">
              {passwordBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Сохранить пароль
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldCheck className="h-4 w-4" />
            Двухфакторная аутентификация (2FA)
          </CardTitle>
          <CardDescription>
            Код из приложения вроде Google Authenticator или Яндекс Ключ при входе.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {totpEnabled ? (
            <div className="space-y-3">
              <p className="text-sm text-green-600 dark:text-green-400">2FA включена</p>
              <form
                className="grid max-w-md gap-3"
                onSubmit={async (e) => {
                  e.preventDefault()
                  setDisableBusy(true)
                  try {
                    const res = await fetch("/api/cabinet/2fa", {
                      method: "POST",
                      credentials: "include",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        action: "disable",
                        password: disablePassword,
                        code: disableCode,
                      }),
                    })
                    const data = await res.json().catch(() => ({}))
                    if (!res.ok) {
                      toast.error(typeof data.error === "string" ? data.error : "Не удалось отключить")
                      return
                    }
                    toast.success("2FA отключена")
                    setDisablePassword("")
                    setDisableCode("")
                    setSetupSecret(null)
                    setSetupQr(null)
                    void load()
                  } catch {
                    toast.error("Ошибка сети")
                  } finally {
                    setDisableBusy(false)
                  }
                }}
              >
                <div>
                  <Label htmlFor="dis-pass">Пароль</Label>
                  <Input
                    id="dis-pass"
                    type="password"
                    value={disablePassword}
                    onChange={(e) => setDisablePassword(e.target.value)}
                    disabled={disableBusy}
                  />
                </div>
                <div>
                  <Label htmlFor="dis-code">Код 2FA</Label>
                  <Input
                    id="dis-code"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    value={disableCode}
                    onChange={(e) => setDisableCode(e.target.value)}
                    disabled={disableBusy}
                    maxLength={8}
                  />
                </div>
                <Button type="submit" variant="outline" disabled={disableBusy} className="w-fit">
                  Отключить 2FA
                </Button>
              </form>
            </div>
          ) : !setupSecret ? (
            <Button
              type="button"
              disabled={setupBusy}
              onClick={async () => {
                setSetupBusy(true)
                try {
                  const res = await fetch("/api/cabinet/2fa", {
                    method: "POST",
                    credentials: "include",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ action: "setup" }),
                  })
                  const data = await res.json().catch(() => ({}))
                  if (!res.ok) {
                    toast.error(typeof data.error === "string" ? data.error : "Не удалось начать настройку")
                    return
                  }
                  setSetupSecret(typeof data.secret === "string" ? data.secret : null)
                  setSetupQr(typeof data.qrUrl === "string" ? data.qrUrl : null)
                } catch {
                  toast.error("Ошибка сети")
                } finally {
                  setSetupBusy(false)
                }
              }}
            >
              {setupBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Настроить 2FA
            </Button>
          ) : (
            <div className="space-y-3 max-w-md">
              <p className="text-sm text-muted-foreground">
                Отсканируйте QR в приложении-аутентификаторе или введите ключ вручную.
              </p>
              {setupQr ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={setupQr}
                  alt="QR-код для 2FA"
                  className="h-[200px] w-[200px] rounded-md border border-border bg-white p-2"
                />
              ) : null}
              <div>
                <Label>Ключ</Label>
                <Input readOnly value={setupSecret} className="font-mono text-xs" />
              </div>
              <form
                className="grid gap-3"
                onSubmit={async (e) => {
                  e.preventDefault()
                  setSetupBusy(true)
                  try {
                    const res = await fetch("/api/cabinet/2fa", {
                      method: "POST",
                      credentials: "include",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ action: "confirm", code: setupCode }),
                    })
                    const data = await res.json().catch(() => ({}))
                    if (!res.ok) {
                      toast.error(typeof data.error === "string" ? data.error : "Неверный код")
                      return
                    }
                    toast.success("2FA включена")
                    setSetupSecret(null)
                    setSetupQr(null)
                    setSetupCode("")
                    void load()
                  } catch {
                    toast.error("Ошибка сети")
                  } finally {
                    setSetupBusy(false)
                  }
                }}
              >
                <div>
                  <Label htmlFor="setup-code">Код из приложения</Label>
                  <Input
                    id="setup-code"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    value={setupCode}
                    onChange={(e) => setSetupCode(e.target.value)}
                    disabled={setupBusy}
                    maxLength={8}
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button type="submit" disabled={setupBusy}>
                    Подтвердить и включить
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={setupBusy}
                    onClick={() => {
                      setSetupSecret(null)
                      setSetupQr(null)
                      setSetupCode("")
                    }}
                  >
                    Отмена
                  </Button>
                </div>
              </form>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <MonitorSmartphone className="h-4 w-4" />
            Активные сессии
          </CardTitle>
          <CardDescription>
            Завершите чужие или старые входы. Текущую сессию завершите через «Выйти».
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {sessions.length === 0 ? (
            <p className="text-sm text-muted-foreground">Нет активных сессий</p>
          ) : (
            <ul className="divide-y divide-border rounded-lg border border-border">
              {sessions.map((s) => (
                <li
                  key={s.id}
                  className="flex flex-col gap-2 px-3 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0 space-y-0.5">
                    <p className="text-sm font-medium">
                      {shortUa(s.userAgent)}
                      {s.current ? (
                        <span className="ml-2 text-xs font-normal text-amber-600 dark:text-amber-400">
                          текущая
                        </span>
                      ) : null}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {s.ip ? `${s.ip} · ` : null}
                      активность{" "}
                      {format(new Date(s.lastSeenAt), "d MMM yyyy, HH:mm", { locale: ru })}
                    </p>
                  </div>
                  {!s.current ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={sessionsBusy}
                      onClick={async () => {
                        setSessionsBusy(true)
                        try {
                          const res = await fetch("/api/cabinet/sessions", {
                            method: "DELETE",
                            credentials: "include",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ sessionId: s.id }),
                          })
                          const data = await res.json().catch(() => ({}))
                          if (!res.ok) {
                            toast.error(
                              typeof data.error === "string" ? data.error : "Не удалось завершить",
                            )
                            return
                          }
                          toast.success("Сессия завершена")
                          void load()
                        } catch {
                          toast.error("Ошибка сети")
                        } finally {
                          setSessionsBusy(false)
                        }
                      }}
                    >
                      Завершить
                    </Button>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
          <Button
            type="button"
            variant="outline"
            disabled={sessionsBusy || sessions.filter((s) => !s.current).length === 0}
            onClick={async () => {
              setSessionsBusy(true)
              try {
                const res = await fetch("/api/cabinet/sessions", {
                  method: "DELETE",
                  credentials: "include",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ allOthers: true }),
                })
                const data = await res.json().catch(() => ({}))
                if (!res.ok) {
                  toast.error(typeof data.error === "string" ? data.error : "Не удалось завершить")
                  return
                }
                toast.success("Остальные сессии завершены")
                void load()
              } catch {
                toast.error("Ошибка сети")
              } finally {
                setSessionsBusy(false)
              }
            }}
          >
            Завершить все остальные сессии
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
