"use client"

import { Suspense, useCallback, useEffect, useRef, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { MessageCircle, Send, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

export const CABINET_OPEN_SUPPORT_CHAT = "cabinet-open-support-chat"

const POLL_MS = 10_000

type ChatMessage = {
  id: string
  author: "user" | "support"
  text: string
  at: number
}

const WELCOME: ChatMessage = {
  id: "welcome",
  author: "support",
  text: "Здравствуйте! Напишите ваш вопрос - мы ответим в этом чате.",
  at: 0,
}

type ApiMessage = {
  id: string
  author: "user" | "admin"
  body: string
  createdAt: string
}

function mapApiMessage(m: ApiMessage): ChatMessage {
  return {
    id: m.id,
    author: m.author === "admin" ? "support" : "user",
    text: m.body,
    at: new Date(m.createdAt).getTime() || Date.now(),
  }
}

function mergeMessages(prev: ChatMessage[], incoming: ChatMessage[]): ChatMessage[] {
  const byId = new Map<string, ChatMessage>()
  for (const m of prev) {
    if (m.id !== "welcome") byId.set(m.id, m)
  }
  for (const m of incoming) {
    byId.set(m.id, m)
  }
  const list = [...byId.values()].sort((a, b) => a.at - b.at)
  return [WELCOME, ...list]
}

export function openCabinetSupportChat() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(CABINET_OPEN_SUPPORT_CHAT))
  }
}

function CabinetSupportChatInner() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState("")
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME])
  const [unread, setUnread] = useState(0)
  const [sending, setSending] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const lastCreatedAtRef = useRef<string | null>(null)
  const openRef = useRef(open)
  openRef.current = open

  const markRead = useCallback(async () => {
    try {
      await fetch("/api/cabinet/support/read", {
        method: "POST",
        credentials: "include",
      })
      setUnread(0)
    } catch {
      // ignore
    }
  }, [])

  const fetchMessages = useCallback(
    async (opts?: { after?: string | null; full?: boolean }) => {
      const qs =
        !opts?.full && opts?.after
          ? `?after=${encodeURIComponent(opts.after)}`
          : ""
      const res = await fetch(`/api/cabinet/support/messages${qs}`, {
        credentials: "include",
      })
      if (res.status === 401) return
      if (!res.ok) {
        throw new Error("load_failed")
      }
      const data = (await res.json()) as {
        messages?: ApiMessage[]
        unreadForUser?: number
      }
      const mapped = (data.messages ?? []).map(mapApiMessage)
      if (opts?.full || !opts?.after) {
        setMessages(mergeMessages([WELCOME], mapped))
      } else if (mapped.length > 0) {
        setMessages((prev) => mergeMessages(prev, mapped))
      }
      if (typeof data.unreadForUser === "number") {
        setUnread(openRef.current ? 0 : data.unreadForUser)
      }
      const last = data.messages?.[data.messages.length - 1]
      if (last?.createdAt) {
        lastCreatedAtRef.current = last.createdAt
      }
      setLoadError(null)
    },
    [],
  )

  useEffect(() => {
    const onOpen = () => setOpen(true)
    window.addEventListener(CABINET_OPEN_SUPPORT_CHAT, onOpen)
    return () => window.removeEventListener(CABINET_OPEN_SUPPORT_CHAT, onOpen)
  }, [])

  useEffect(() => {
    if (searchParams.get("support") === "1") {
      setOpen(true)
      const params = new URLSearchParams(searchParams.toString())
      params.delete("support")
      const qs = params.toString()
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
    }
  }, [searchParams, pathname, router])

  // Начальный бейдж
  useEffect(() => {
    void fetchMessages({ full: true }).catch(() => {
      // тихо: чат ещё может быть без миграции на окружении
    })
  }, [fetchMessages])

  // При открытии - полная загрузка + mark read
  useEffect(() => {
    if (!open) return
    lastCreatedAtRef.current = null
    void (async () => {
      try {
        await fetchMessages({ full: true })
        await markRead()
      } catch {
        setLoadError("Не удалось загрузить переписку")
      }
    })()
  }, [open, fetchMessages, markRead])

  // Polling 10с только когда открыт и вкладка видима
  useEffect(() => {
    if (!open) return

    let cancelled = false
    const tick = async () => {
      if (cancelled) return
      if (typeof document !== "undefined" && document.visibilityState !== "visible") {
        return
      }
      try {
        await fetchMessages({
          after: lastCreatedAtRef.current,
          full: !lastCreatedAtRef.current,
        })
        if (openRef.current) await markRead()
      } catch {
        // не шумим на каждом тике
      }
    }

    const id = window.setInterval(() => void tick(), POLL_MS)
    const onVis = () => {
      if (document.visibilityState === "visible") void tick()
    }
    document.addEventListener("visibilitychange", onVis)
    return () => {
      cancelled = true
      window.clearInterval(id)
      document.removeEventListener("visibilitychange", onVis)
    }
  }, [open, fetchMessages, markRead])

  useEffect(() => {
    if (!open) return
    const el = listRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [open, messages])

  const send = useCallback(async () => {
    const text = draft.trim()
    if (!text || sending) return
    setSending(true)
    setDraft("")
    try {
      const res = await fetch("/api/cabinet/support/messages", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: text }),
      })
      const data = (await res.json().catch(() => ({}))) as {
        error?: string
        message?: ApiMessage
      }
      if (!res.ok || !data.message) {
        setDraft(text)
        setLoadError(data.error || "Не удалось отправить")
        return
      }
      const mapped = mapApiMessage(data.message)
      setMessages((prev) => mergeMessages(prev, [mapped]))
      lastCreatedAtRef.current = data.message.createdAt
      setUnread(0)
      setLoadError(null)
    } catch {
      setDraft(text)
      setLoadError("Не удалось отправить")
    } finally {
      setSending(false)
    }
  }, [draft, sending])

  return (
    <div className="pointer-events-none fixed bottom-5 right-5 z-50 flex flex-col items-end gap-3">
      {open ? (
        <div
          className={cn(
            "pointer-events-auto flex h-[min(28rem,70vh)] w-[min(22rem,calc(100vw-2.5rem))] flex-col overflow-hidden",
            "rounded-2xl border border-border bg-card shadow-2xl shadow-black/40",
          )}
        >
          <div className="flex items-center justify-between gap-2 border-b border-border bg-muted/40 px-3 py-2.5">
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate">Поддержка</p>
              <p className="text-[11px] text-muted-foreground">
                Обычно отвечаем в рабочие часы
              </p>
            </div>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="h-8 w-8 shrink-0"
              onClick={() => setOpen(false)}
              aria-label="Закрыть чат"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div
            ref={listRef}
            className="cabinet-sidebar-scroll flex-1 space-y-2 overflow-y-auto px-3 py-3"
          >
            {loadError ? (
              <p className="text-center text-xs text-destructive">{loadError}</p>
            ) : null}
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={cn(
                  "max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-snug",
                  msg.author === "user"
                    ? "ml-auto rounded-br-md bg-primary text-primary-foreground"
                    : "mr-auto rounded-bl-md bg-muted text-foreground",
                )}
              >
                {msg.text}
              </div>
            ))}
          </div>

          <div className="border-t border-border p-2.5">
            <div className="flex items-end gap-2">
              <Textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Ваш вопрос…"
                rows={2}
                maxLength={4000}
                className="field-sizing-fixed min-h-[2.75rem] max-h-24 flex-1 resize-none py-2 text-sm"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault()
                    void send()
                  }
                }}
              />
              <Button
                type="button"
                size="icon"
                className="h-10 w-10 shrink-0"
                onClick={() => void send()}
                disabled={!draft.trim() || sending}
                aria-label="Отправить"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      <Button
        type="button"
        size="icon"
        className={cn(
          "pointer-events-auto relative h-14 w-14 rounded-full shadow-lg shadow-primary/30",
          open && "bg-muted text-foreground hover:bg-muted/80",
        )}
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Закрыть чат поддержки" : "Открыть чат поддержки"}
      >
        {open ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
        {!open && unread > 0 ? (
          <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-semibold leading-none text-black">
            {unread > 9 ? "9+" : unread}
          </span>
        ) : null}
      </Button>
    </div>
  )
}

export function CabinetSupportChat() {
  return (
    <Suspense fallback={null}>
      <CabinetSupportChatInner />
    </Suspense>
  )
}
