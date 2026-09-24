"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { MessageCircle, Send, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

export const CABINET_OPEN_SUPPORT_CHAT = "cabinet-open-support-chat"

type ChatMessage = {
  id: string
  author: "user" | "support"
  text: string
  at: number
}

const WELCOME: ChatMessage = {
  id: "welcome",
  author: "support",
  text: "Здравствуйте! Напишите ваш вопрос — мы ответим в этом чате.",
  at: Date.now(),
}

export function openCabinetSupportChat() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(CABINET_OPEN_SUPPORT_CHAT))
  }
}

export function CabinetSupportChat() {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState("")
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME])
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onOpen = () => setOpen(true)
    window.addEventListener(CABINET_OPEN_SUPPORT_CHAT, onOpen)
    return () => window.removeEventListener(CABINET_OPEN_SUPPORT_CHAT, onOpen)
  }, [])

  useEffect(() => {
    if (!open) return
    const el = listRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [open, messages])

  const send = useCallback(() => {
    const text = draft.trim()
    if (!text) return
    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      author: "user",
      text,
      at: Date.now(),
    }
    setMessages((prev) => [...prev, userMsg])
    setDraft("")
  }, [draft])

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
              <p className="text-[11px] text-muted-foreground">Обычно отвечаем в рабочие часы</p>
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

          <div ref={listRef} className="cabinet-sidebar-scroll flex-1 space-y-2 overflow-y-auto px-3 py-3">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={cn(
                  "max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-snug",
                  msg.author === "user"
                    ? "ml-auto bg-primary text-primary-foreground rounded-br-md"
                    : "mr-auto bg-muted text-foreground rounded-bl-md",
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
                className="min-h-[2.75rem] max-h-24 flex-1 resize-none field-sizing-fixed py-2 text-sm"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault()
                    send()
                  }
                }}
              />
              <Button
                type="button"
                size="icon"
                className="h-10 w-10 shrink-0"
                onClick={send}
                disabled={!draft.trim()}
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
          "pointer-events-auto h-14 w-14 rounded-full shadow-lg shadow-primary/30",
          open && "bg-muted text-foreground hover:bg-muted/80",
        )}
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Закрыть чат поддержки" : "Открыть чат поддержки"}
      >
        {open ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
      </Button>
    </div>
  )
}
