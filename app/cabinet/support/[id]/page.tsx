"use client"

import { use } from "react"
import Link from "next/link"
import { format } from "date-fns"
import { ru } from "date-fns/locale"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { StatusBadge } from "@/components/cabinet/shared/status-badge"
import { MOCK_TICKETS } from "@/lib/cabinet/mock"

export default function SupportTicketPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const ticket = MOCK_TICKETS.find((t) => t.id === id)

  if (!ticket) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/cabinet/support"><ArrowLeft className="h-4 w-4 mr-2" />К тикетам</Link>
        </Button>
        <p className="text-muted-foreground">Тикет не найден</p>
      </div>
    )
  }

  return (
    <div className="max-w-2xl space-y-6">
      <Button variant="ghost" size="sm" asChild>
        <Link href="/cabinet/support"><ArrowLeft className="h-4 w-4 mr-2" />К тикетам</Link>
      </Button>

      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold">{ticket.subject}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {ticket.category} · {format(new Date(ticket.createdAt), "d MMMM yyyy", { locale: ru })}
          </p>
        </div>
        <StatusBadge status={ticket.status} kind="ticket" />
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Переписка</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {(ticket.messages ?? []).map((msg) => (
            <div
              key={msg.id}
              className={`rounded-lg p-3 text-sm ${msg.author === "support" ? "bg-muted ml-4" : "bg-card border border-border mr-4"}`}
            >
              <p className="text-xs text-muted-foreground mb-1">
                {msg.author === "support" ? "Поддержка" : "Вы"} ·{" "}
                {format(new Date(msg.createdAt), "d MMM HH:mm", { locale: ru })}
              </p>
              <p>{msg.text}</p>
            </div>
          ))}
          {!ticket.messages?.length ? (
            <p className="text-sm text-muted-foreground">Сообщений пока нет</p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  )
}
