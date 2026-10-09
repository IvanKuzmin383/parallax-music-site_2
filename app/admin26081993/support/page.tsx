"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { formatDistanceToNow } from "date-fns"
import { ru } from "date-fns/locale"
import { Headset, Send } from "lucide-react"
import { toast } from "sonner"
import { AdminSectionNav } from "@/components/admin-section-nav"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

const POLL_MS = 10_000

type ThreadItem = {
  id: string
  userId: string
  userEmail: string
  userDisplayName: string
  status: "open" | "closed"
  lastMessageAt: string | null
  unreadForAdmin: number
  lastMessagePreview: string | null
}

type MessageItem = {
  id: string
  author: "user" | "admin"
  body: string
  createdAt: string
}

function relative(iso: string | null): string {
  if (!iso) return ""
  try {
    return formatDistanceToNow(new Date(iso), { addSuffix: true, locale: ru })
  } catch {
    return ""
  }
}

export default function AdminSupportPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [threads, setThreads] = useState<ThreadItem[]>([])
  const [statusFilter, setStatusFilter] = useState<"all" | "open" | "closed">("all")
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [messages, setMessages] = useState<MessageItem[]>([])
  const [draft, setDraft] = useState("")
  const [sending, setSending] = useState(false)
  const [statusBusy, setStatusBusy] = useState(false)
  const listRef = useRef<HTMLDivElement>(null)
  const lastCreatedAtRef = useRef<string | null>(null)
  const selectedIdRef = useRef<string | null>(null)
  selectedIdRef.current = selectedId

  const loadThreads = useCallback(async () => {
    const res = await fetch(
      `/api/admin/support/threads?status=${encodeURIComponent(statusFilter)}`,
      { credentials: "include" },
    )
    if (res.status === 401) {
      setIsAuthenticated(false)
      return
    }
    if (!res.ok) throw new Error("threads")
    const data = (await res.json()) as { threads?: ThreadItem[] }
    setThreads(data.threads ?? [])
    setIsAuthenticated(true)
  }, [statusFilter])

  const loadMessages = useCallback(
    async (threadId: string, opts?: { after?: string | null; full?: boolean }) => {
      const qs =
        !opts?.full && opts?.after
          ? `?after=${encodeURIComponent(opts.after)}`
          : ""
      const res = await fetch(
        `/api/admin/support/threads/${encodeURIComponent(threadId)}/messages${qs}`,
        { credentials: "include" },
      )
      if (res.status === 401) {
        setIsAuthenticated(false)
        return
      }
      if (!res.ok) throw new Error("messages")
      const data = (await res.json()) as { messages?: MessageItem[] }
      const next = data.messages ?? []
      if (opts?.full || !opts?.after) {
        setMessages(next)
      } else if (next.length > 0) {
        setMessages((prev) => {
          const ids = new Set(prev.map((m) => m.id))
          const merged = [...prev]
          for (const m of next) {
            if (!ids.has(m.id)) merged.push(m)
          }
          return merged
        })
      }
      const last = next[next.length - 1]
      if (last?.createdAt) lastCreatedAtRef.current = last.createdAt

      await fetch(`/api/admin/support/threads/${encodeURIComponent(threadId)}/read`, {
        method: "POST",
        credentials: "include",
      }).catch(() => {})

      setThreads((prev) =>
        prev.map((t) => (t.id === threadId ? { ...t, unreadForAdmin: 0 } : t)),
      )
    },
    [],
  )

  useEffect(() => {
    loadThreads()
      .catch(() => toast.error("Не удалось загрузить диалоги"))
      .finally(() => setLoading(false))
  }, [loadThreads])

  useEffect(() => {
    if (!selectedId) {
      setMessages([])
      lastCreatedAtRef.current = null
      return
    }
    lastCreatedAtRef.current = null
    void loadMessages(selectedId, { full: true }).catch(() =>
      toast.error("Не удалось загрузить переписку"),
    )
  }, [selectedId, loadMessages])

  useEffect(() => {
    if (!isAuthenticated) return

    let cancelled = false
    const tick = async () => {
      if (cancelled) return
      if (typeof document !== "undefined" && document.visibilityState !== "visible") {
        return
      }
      try {
        await loadThreads()
        const id = selectedIdRef.current
        if (id) {
          await loadMessages(id, {
            after: lastCreatedAtRef.current,
            full: !lastCreatedAtRef.current,
          })
        }
      } catch {
        // quiet poll
      }
    }

    const timer = window.setInterval(() => void tick(), POLL_MS)
    const onVis = () => {
      if (document.visibilityState === "visible") void tick()
    }
    document.addEventListener("visibilitychange", onVis)
    return () => {
      cancelled = true
      window.clearInterval(timer)
      document.removeEventListener("visibilitychange", onVis)
    }
  }, [isAuthenticated, loadThreads, loadMessages])

  useEffect(() => {
    const el = listRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages, selectedId])

  const selected = threads.find((t) => t.id === selectedId) ?? null

  const sendReply = async () => {
    if (!selectedId || !draft.trim() || sending) return
    const text = draft.trim()
    setSending(true)
    try {
      const res = await fetch(
        `/api/admin/support/threads/${encodeURIComponent(selectedId)}/messages`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ body: text }),
        },
      )
      const data = (await res.json().catch(() => ({}))) as {
        error?: string
        message?: MessageItem
      }
      if (!res.ok || !data.message) {
        toast.error(data.error || "Не удалось отправить")
        return
      }
      setDraft("")
      setMessages((prev) =>
        prev.some((m) => m.id === data.message!.id) ? prev : [...prev, data.message!],
      )
      lastCreatedAtRef.current = data.message.createdAt
      await loadThreads()
    } catch {
      toast.error("Не удалось отправить")
    } finally {
      setSending(false)
    }
  }

  const toggleStatus = async () => {
    if (!selected || statusBusy) return
    const next = selected.status === "open" ? "closed" : "open"
    setStatusBusy(true)
    try {
      const res = await fetch(
        `/api/admin/support/threads/${encodeURIComponent(selected.id)}`,
        {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: next }),
        },
      )
      if (!res.ok) {
        toast.error("Не удалось обновить статус")
        return
      }
      await loadThreads()
      toast.success(next === "closed" ? "Диалог закрыт" : "Диалог открыт")
    } catch {
      toast.error("Не удалось обновить статус")
    } finally {
      setStatusBusy(false)
    }
  }

  if (!isAuthenticated && !loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4 pt-4">
        <div className="w-full max-w-md space-y-4 text-center">
          <p className="text-muted-foreground">Необходима авторизация</p>
          <Button onClick={() => router.push("/admin26081993")}>
            Перейти на страницу входа
          </Button>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center pt-4">
        <p>Загрузка...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background pt-4">
      <div className="mx-auto w-full max-w-none space-y-4 px-4 pb-8">
        <AdminSectionNav active="support" />

        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 text-3xl font-bold">
              <Headset className="h-8 w-8" />
              Поддержка
            </h1>
            <p className="mt-1 text-muted-foreground">
              Диалоги из чата кабинета. Обновление каждые 10 секунд.
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {(
              [
                ["all", "Все"],
                ["open", "Открытые"],
                ["closed", "Закрытые"],
              ] as const
            ).map(([key, label]) => (
              <Button
                key={key}
                type="button"
                size="sm"
                variant={statusFilter === key ? "secondary" : "ghost"}
                onClick={() => setStatusFilter(key)}
              >
                {label}
              </Button>
            ))}
          </div>
        </div>

        <div className="grid min-h-[min(36rem,70vh)] gap-4 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]">
          <div className="overflow-hidden rounded-xl border border-border">
            <div className="cabinet-sidebar-scroll max-h-[min(36rem,70vh)] overflow-y-auto">
              {threads.length === 0 ? (
                <p className="px-4 py-10 text-center text-sm text-muted-foreground">
                  Диалогов пока нет
                </p>
              ) : (
                <ul className="divide-y divide-border">
                  {threads.map((t) => {
                    const active = t.id === selectedId
                    return (
                      <li key={t.id}>
                        <button
                          type="button"
                          className={cn(
                            "w-full border-l-2 border-transparent px-3 py-3 text-left transition-colors hover:bg-muted/60",
                            active && "border-l-primary bg-muted",
                            t.unreadForAdmin > 0 && !active && "bg-muted/30",
                          )}
                          onClick={() => setSelectedId(t.id)}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <p className="truncate text-sm font-semibold text-foreground">
                              {t.userDisplayName}
                            </p>
                            {t.unreadForAdmin > 0 ? (
                              <span className="shrink-0 rounded-full bg-amber-500 px-1.5 text-[10px] font-semibold text-black">
                                {t.unreadForAdmin}
                              </span>
                            ) : null}
                          </div>
                          <p className="truncate text-xs text-foreground/70">
                            {t.userEmail}
                          </p>
                          <p className="mt-1 line-clamp-2 text-xs text-foreground/85">
                            {t.lastMessagePreview || "-"}
                          </p>
                          <p className="mt-1 text-[11px] text-foreground/60">
                            {relative(t.lastMessageAt)}
                            {t.status === "closed" ? " · закрыт" : ""}
                          </p>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          </div>

          <div className="flex min-h-[min(36rem,70vh)] flex-col overflow-hidden rounded-xl border border-border">
            {!selected ? (
              <div className="flex flex-1 items-center justify-center p-6 text-sm text-muted-foreground">
                Выберите диалог слева
              </div>
            ) : (
              <>
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{selected.userDisplayName}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {selected.userEmail}
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={statusBusy}
                    onClick={() => void toggleStatus()}
                  >
                    {selected.status === "open" ? "Закрыть" : "Открыть снова"}
                  </Button>
                </div>

                <div
                  ref={listRef}
                  className="cabinet-sidebar-scroll flex-1 space-y-2 overflow-y-auto px-4 py-3"
                >
                  {messages.map((m) => (
                    <div
                      key={m.id}
                      className={cn(
                        "max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-snug",
                        m.author === "admin"
                          ? "ml-auto rounded-br-md bg-primary text-primary-foreground"
                          : "mr-auto rounded-bl-md bg-muted",
                      )}
                    >
                      <p className="whitespace-pre-wrap break-words">{m.body}</p>
                      <p
                        className={cn(
                          "mt-1 text-[10px]",
                          m.author === "admin"
                            ? "text-primary-foreground/70"
                            : "text-muted-foreground",
                        )}
                      >
                        {relative(m.createdAt)}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="border-t border-border p-3">
                  <div className="flex items-end gap-2">
                    <Textarea
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      placeholder="Ответ пользователю…"
                      rows={2}
                      maxLength={4000}
                      className="min-h-[2.75rem] max-h-32 flex-1 resize-none"
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault()
                          void sendReply()
                        }
                      }}
                    />
                    <Button
                      type="button"
                      size="icon"
                      className="h-10 w-10 shrink-0"
                      disabled={!draft.trim() || sending}
                      onClick={() => void sendReply()}
                      aria-label="Отправить"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
