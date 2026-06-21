"use client"

import { useState } from "react"
import Link from "next/link"
import { format } from "date-fns"
import { ru } from "date-fns/locale"
import { Plus } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { PageHeader } from "@/components/cabinet/shared/page-header"
import { StatusBadge } from "@/components/cabinet/shared/status-badge"
import { MOCK_TICKETS, TICKET_CATEGORIES } from "@/lib/cabinet/mock"

export default function SupportPage() {
  const [tickets, setTickets] = useState(MOCK_TICKETS)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [subject, setSubject] = useState("")
  const [category, setCategory] = useState<string>(TICKET_CATEGORIES[0])
  const [message, setMessage] = useState("")

  const createTicket = () => {
    if (!subject.trim() || !message.trim()) {
      toast.error("Заполните тему и сообщение")
      return
    }
    const newTicket = {
      id: `ticket-${Date.now()}`,
      subject: subject.trim(),
      category,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: "open" as const,
    }
    setTickets((prev) => [newTicket, ...prev])
    setDialogOpen(false)
    setSubject("")
    setMessage("")
    toast.success("Тикет создан (демо)")
  }

  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader title="Поддержка" description="Вопросы по дистрибуции, оплате и услугам">
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" /> Создать тикет
        </Button>
      </PageHeader>

      <div className="space-y-3">
        {tickets.map((ticket) => (
          <Link key={ticket.id} href={`/cabinet/support/${ticket.id}`}>
            <Card className="hover:border-primary/50 transition-colors">
              <CardContent className="pt-4 flex flex-wrap justify-between gap-2">
                <div>
                  <p className="font-medium">{ticket.subject}</p>
                  <p className="text-sm text-muted-foreground">
                    {ticket.category} · {format(new Date(ticket.createdAt), "d MMM yyyy", { locale: ru })}
                  </p>
                </div>
                <StatusBadge status={ticket.status} kind="ticket" />
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <p className="text-sm text-muted-foreground">
        Также можно написать в{" "}
        <a href="https://t.me/ParallaxMusic_RT" target="_blank" rel="noopener noreferrer" className="text-primary underline">
          Telegram
        </a>
        .
      </p>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Новый тикет</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Тема</Label>
              <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Категория</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TICKET_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Сообщение</Label>
              <Textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={4} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Отмена</Button>
            <Button onClick={createTicket}>Отправить</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
