"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Check, Copy, ExternalLink, Link2, Loader2, Unlink } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Spinner } from "@/components/ui/spinner"
import { Switch } from "@/components/ui/switch"

type Prefs = {
  enabled: boolean
  releases: boolean
  payments: boolean
  withdrawals: boolean
  royalty: boolean
}

type StatusResponse = {
  configured: boolean
  linked: boolean
  username: string | null
  linkedAt: string | null
  prefs: Prefs
  botUsername: string | null
  error?: string
}

type LinkResponse = {
  code: string
  expiresAt: string
  deepLink: string | null
  botUsername: string | null
  error?: string
}

const PREF_ROWS: Array<{
  key: keyof Omit<Prefs, "enabled">
  title: string
  description: string
}> = [
  {
    key: "releases",
    title: "Релизы и модерация",
    description: "Смена статуса, комментарии модерации, доработка",
  },
  {
    key: "payments",
    title: "Оплаты",
    description: "Успешная оплата заказов и пополнение баланса",
  },
  {
    key: "withdrawals",
    title: "Выводы средств",
    description: "Статус заявок на вывод роялти",
  },
  {
    key: "royalty",
    title: "Роялти на баланс",
    description: "Перевод роялти на баланс кабинета",
  },
]

function TelegramGlyph({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden fill="currentColor">
      <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
    </svg>
  )
}

function formatRemain(expiresAt: string, nowMs: number): string {
  const ms = Math.max(0, new Date(expiresAt).getTime() - nowMs)
  const totalSec = Math.floor(ms / 1000)
  const m = Math.floor(totalSec / 60)
  const s = totalSec % 60
  return `${m}:${String(s).padStart(2, "0")}`
}

export function CabinetTelegramSettings() {
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState<StatusResponse | null>(null)
  const [busy, setBusy] = useState(false)
  const [prefsBusy, setPrefsBusy] = useState(false)

  const [linkOpen, setLinkOpen] = useState(false)
  const [linkCode, setLinkCode] = useState<string | null>(null)
  const [linkExpiresAt, setLinkExpiresAt] = useState<string | null>(null)
  const [linkDeep, setLinkDeep] = useState<string | null>(null)
  const [linkBot, setLinkBot] = useState<string | null>(null)
  const [nowMs, setNowMs] = useState(() => Date.now())
  const [copied, setCopied] = useState(false)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/cabinet/telegram", { credentials: "include" })
      if (!res.ok) {
        toast.error("Не удалось загрузить настройки Telegram")
        return null
      }
      const data = (await res.json()) as StatusResponse
      setStatus(data)
      return data
    } catch {
      toast.error("Не удалось загрузить настройки Telegram")
      return null
    }
  }, [])

  useEffect(() => {
    void (async () => {
      setLoading(true)
      await load()
      setLoading(false)
    })()
  }, [load])

  useEffect(() => {
    if (!linkOpen || !linkExpiresAt) return
    const id = setInterval(() => setNowMs(Date.now()), 1000)
    return () => clearInterval(id)
  }, [linkOpen, linkExpiresAt])

  useEffect(() => {
    if (!linkOpen) {
      if (pollRef.current) {
        clearInterval(pollRef.current)
        pollRef.current = null
      }
      return
    }

    pollRef.current = setInterval(() => {
      void (async () => {
        const data = await load()
        if (data?.linked) {
          setLinkOpen(false)
          setLinkCode(null)
          toast.success("Telegram подключён")
        }
      })()
    }, 2500)

    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current)
        pollRef.current = null
      }
    }
  }, [linkOpen, load])

  async function startLink() {
    setBusy(true)
    try {
      const res = await fetch("/api/cabinet/telegram", {
        method: "POST",
        credentials: "include",
      })
      const data = (await res.json()) as LinkResponse
      if (!res.ok) {
        toast.error(data.error || "Не удалось создать код")
        return
      }
      setLinkCode(data.code)
      setLinkExpiresAt(data.expiresAt)
      setLinkDeep(data.deepLink)
      setLinkBot(data.botUsername)
      setNowMs(Date.now())
      setCopied(false)
      setLinkOpen(true)
    } catch {
      toast.error("Не удалось создать код")
    } finally {
      setBusy(false)
    }
  }

  async function unlink() {
    setBusy(true)
    try {
      const res = await fetch("/api/cabinet/telegram", {
        method: "DELETE",
        credentials: "include",
      })
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string }
        toast.error(data.error || "Не удалось отвязать")
        return
      }
      toast.success("Telegram отключён")
      await load()
    } catch {
      toast.error("Не удалось отвязать")
    } finally {
      setBusy(false)
    }
  }

  async function patchPrefs(patch: Partial<Prefs>) {
    if (!status) return
    const prev = status.prefs
    setStatus({ ...status, prefs: { ...prev, ...patch } })
    setPrefsBusy(true)
    try {
      const res = await fetch("/api/cabinet/telegram", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      })
      if (!res.ok) {
        setStatus({ ...status, prefs: prev })
        const data = (await res.json().catch(() => ({}))) as { error?: string }
        toast.error(data.error || "Не удалось сохранить")
        return
      }
      const data = (await res.json()) as { prefs: Prefs }
      setStatus((s) => (s ? { ...s, prefs: data.prefs } : s))
    } catch {
      setStatus({ ...status, prefs: prev })
      toast.error("Не удалось сохранить")
    } finally {
      setPrefsBusy(false)
    }
  }

  async function copyCode() {
    if (!linkCode) return
    try {
      await navigator.clipboard.writeText(linkCode)
      setCopied(true)
      toast.success("Код скопирован")
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error("Не удалось скопировать")
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner className="size-8" />
      </div>
    )
  }

  if (!status) {
    return (
      <p className="text-sm text-muted-foreground">Не удалось загрузить настройки уведомлений.</p>
    )
  }

  const remain =
    linkExpiresAt && linkOpen ? formatRemain(linkExpiresAt, nowMs) : null
  const expired =
    linkExpiresAt && linkOpen ? new Date(linkExpiresAt).getTime() <= nowMs : false

  return (
    <div className="max-w-xl space-y-4">
      <div className="flex items-center gap-2.5">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#229ED9] text-white">
          <TelegramGlyph className="size-4" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground">Telegram</p>
          <p className="text-xs text-muted-foreground">
            {status.linked
              ? status.username
                ? `Подключено: @${status.username}`
                : "Подключено"
              : "Уведомления не настроены"}
          </p>
        </div>
      </div>

      {!status.configured ? (
        <p className="text-sm text-muted-foreground">
          Бот уведомлений ещё не настроен на сервере. Когда он будет доступен, здесь появится кнопка
          подключения.
        </p>
      ) : !status.linked ? (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Мгновенные уведомления о релизах, оплатах и других событиях. В колокольчике кабинета
            по-прежнему всё.
          </p>
          <Button
            type="button"
            size="sm"
            className="bg-[#229ED9] text-white hover:bg-[#1b8bc0]"
            disabled={busy}
            onClick={() => void startLink()}
          >
            {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Link2 className="size-3.5" />}
            Подключить
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <Label htmlFor="tg-master" className="text-sm font-medium">
                Уведомления в Telegram
              </Label>
              <p className="text-xs text-muted-foreground">
                Мастер-выключатель. Колокольчик в кабинете не затрагивается.
              </p>
            </div>
            <Switch
              id="tg-master"
              checked={status.prefs.enabled}
              disabled={prefsBusy}
              onCheckedChange={(v) => void patchPrefs({ enabled: v })}
              aria-label={
                status.prefs.enabled
                  ? "Уведомления в Telegram включены"
                  : "Уведомления в Telegram выключены"
              }
            />
          </div>

          <div
            className={`space-y-2.5 ${
              status.prefs.enabled ? "" : "pointer-events-none opacity-45"
            }`}
          >
            <p className="text-xs font-medium text-muted-foreground">Что присылать</p>
            {PREF_ROWS.map((row) => (
              <div key={row.key} className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <Label htmlFor={`tg-${row.key}`} className="text-sm font-medium">
                    {row.title}
                  </Label>
                  <p className="text-xs text-muted-foreground">{row.description}</p>
                </div>
                <Switch
                  id={`tg-${row.key}`}
                  checked={status.prefs[row.key]}
                  disabled={prefsBusy || !status.prefs.enabled}
                  onCheckedChange={(v) => void patchPrefs({ [row.key]: v })}
                  aria-label={`${row.title}: ${status.prefs[row.key] ? "включено" : "выключено"}`}
                />
              </div>
            ))}
          </div>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-muted-foreground"
            disabled={busy}
            onClick={() => void unlink()}
          >
            {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Unlink className="size-3.5" />}
            Отключить Telegram
          </Button>
        </div>
      )}

      <Dialog
        open={linkOpen}
        onOpenChange={(open) => {
          setLinkOpen(open)
          if (!open) {
            setLinkCode(null)
            setLinkExpiresAt(null)
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Код привязки</DialogTitle>
            <DialogDescription>
              {linkBot
                ? `Отправьте боту @${linkBot}`
                : "Отправьте код боту уведомлений Parallax Music"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5">
            <div className="rounded-xl border border-border bg-muted/30 px-4 py-6 text-center">
              <p className="font-mono text-3xl font-bold tracking-[0.2em] text-emerald-400">
                {linkCode}
              </p>
              <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
                <Button type="button" variant="secondary" size="sm" onClick={() => void copyCode()}>
                  {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
                  Копировать
                </Button>
                {remain ? (
                  <span
                    className={`text-sm tabular-nums ${expired ? "text-destructive" : "text-muted-foreground"}`}
                  >
                    {expired ? "Истёк" : remain}
                  </span>
                ) : null}
              </div>
            </div>

            <ol className="list-decimal space-y-1.5 pl-5 text-sm text-muted-foreground">
              <li>Откройте бота{linkBot ? ` @${linkBot}` : ""}</li>
              <li>Отправьте код выше (или нажмите "Открыть бота")</li>
              <li>Готово</li>
            </ol>

            <div className="flex flex-col gap-2">
              {linkDeep ? (
                <Button asChild className="bg-[#229ED9] text-white hover:bg-[#1b8bc0]">
                  <a href={linkDeep} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="size-4" />
                    Открыть бота
                  </a>
                </Button>
              ) : null}
              {expired ? (
                <Button
                  type="button"
                  variant="outline"
                  disabled={busy}
                  onClick={() => void startLink()}
                >
                  Получить новый код
                </Button>
              ) : null}
              <Button type="button" variant="ghost" onClick={() => setLinkOpen(false)}>
                Отмена
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
